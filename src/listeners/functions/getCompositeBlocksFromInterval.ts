import async from 'async';
import { DecodedMessage } from '../../utils/decodeTxs.js';
import { convertOperatorAddressToBech32 } from '../../utils/convertOperatorAddressToBech32.js';
import { ChainInterface } from '../../models/Chain/Chain.js';
import { setWithdrawAddress } from '../../utils/levelDb.js';

function initializeCompositeBlock () {
  return {
    self_stake: 0,
    reward: 0,
    commission: 0,
    total_stake: 0,
    total_withdraw: 0,
    balance_change: 0,
    slash: 0
  }
}

export const getCompositeBlocksFromInterval = (
  ctx: {
    chain: ChainInterface,
    withdrawAddressMapping: Record<string, string[]>
  },
  flattenedDecodedTxsByBlock: {
    block_height: number;
    flattenedDecodedTxs: DecodedMessage[];
  }[],
  callback: (
    err: string | null,
    mapResults: {
      validatorMap: Record<string, any>,
      compositeEventBlockMap: Record<string, any>,
    } | null
  ) => any
) => {

  const validatorMap: Record<string, any> = {};
  const compositeEventBlockMap: Record<string, any> = {};

  const { chain, withdrawAddressMapping } = ctx;

  async.timesSeries(
    flattenedDecodedTxsByBlock.length,
    (i, next1) => {

      const { block_height, flattenedDecodedTxs } = flattenedDecodedTxsByBlock[i];

      async.timesSeries(
        flattenedDecodedTxs.length,
        (j, next2) => {
          const eachMessage = flattenedDecodedTxs[j];

          const key = eachMessage.value.validatorAddress || '';

          if (!key && eachMessage.value.validatorSrcAddress && eachMessage.value.validatorDstAddress) {
            if (!compositeEventBlockMap[eachMessage.value.validatorSrcAddress]) {
              compositeEventBlockMap[eachMessage.value.validatorSrcAddress] = initializeCompositeBlock();
            }
            if (!compositeEventBlockMap[eachMessage.value.validatorDstAddress]) {
              compositeEventBlockMap[eachMessage.value.validatorDstAddress] = initializeCompositeBlock();
            }
          } else if (key && !compositeEventBlockMap[key]) {
            compositeEventBlockMap[key] = initializeCompositeBlock();
          }

          if (
            [
              'create_validator',
            ].includes(eachMessage.typeUrl)
          ) {
            if (!eachMessage.value.pubkey || !eachMessage.value.description.moniker)
              return next2(new Error(`no_pubkey_or_moniker:${eachMessage.typeUrl}:${block_height}`));

            const pubkey: ArrayBuffer = eachMessage.value.pubkey.value;
            const byteArray = new Uint8Array(Object.values(pubkey).slice(2));
            const pubkeyBase64 = btoa(String.fromCharCode(...byteArray));

            const delegatorAddress = eachMessage.value.delegatorAddress 
              ? eachMessage.value.delegatorAddress 
              : convertOperatorAddressToBech32(eachMessage.value.validatorAddress, chain.bech32_prefix);

            validatorMap[key] = {
              pubkey: pubkeyBase64,
              operator_address: eachMessage.value.validatorAddress,
              delegator_address: delegatorAddress,
              keybase_id: eachMessage.value.description.identity,
              moniker: eachMessage.value.description.moniker,
              website: eachMessage.value.description.website,
              details: eachMessage.value.description.details,
              security_contant: eachMessage.value.description.securityContact,
              commission_rate: eachMessage.value.commission.rate,
              chain_identifier: chain.name,
              created_at: eachMessage.time,
            };
            if (eachMessage.value.value.denom && eachMessage.value.value.amount) {
              compositeEventBlockMap[key].self_stake += parseInt(eachMessage.value.value.amount);
              compositeEventBlockMap[key].total_stake += parseInt(eachMessage.value.value.amount);
            }

            return setWithdrawAddress(chain.name, eachMessage.value.validatorAddress, delegatorAddress, (err, success) => {
              if (err || !success) return next2(new Error(`${err}:withdraw_address_set_failed:create_validator:${block_height}`));
              return next2();
            })
          }
          const bech32OperatorAddress = eachMessage.value.validatorAddress ? convertOperatorAddressToBech32(eachMessage.value.validatorAddress, chain.bech32_prefix) : '';
          if (
            [
              'withdraw_rewards',
              'withdraw_commission'
            ].includes(eachMessage.typeUrl)
          ) {
            if (
              (
                eachMessage.typeUrl == 'withdraw_rewards' &&
                !eachMessage.value.delegatorAddress
              ) ||
              !eachMessage.value.validatorAddress ||
              !eachMessage.value.amount
            ) {
              console.log(eachMessage)
              return next2(new Error(`neccessary_values_missing:${eachMessage.typeUrl}:${block_height}`));
            }

            compositeEventBlockMap[key].total_withdraw += parseInt(eachMessage.value.amount);
            if (eachMessage.typeUrl == 'withdraw_commission') 
              compositeEventBlockMap[key].commission += parseInt(eachMessage.value.amount);
            else if (bech32OperatorAddress == eachMessage.value.delegatorAddress)
              compositeEventBlockMap[key].reward += parseInt(eachMessage.value.amount);

            return next2();
          
          } else if (
            [
              'delegate',
              'complete_unbonding',
            ].includes(eachMessage.typeUrl)
          ) {
            if (!eachMessage.value.delegatorAddress || !eachMessage.value.validatorAddress || !eachMessage.value.amount) {
              console.log(eachMessage)
              return next2(new Error(`neccessary_values_missing:${eachMessage.typeUrl}:${block_height}`));
            }

            const stakeAmount = parseInt(eachMessage.value.amount);

            compositeEventBlockMap[key].total_stake += eachMessage.typeUrl == 'delegate'
              ? stakeAmount 
              : (stakeAmount * -1);

            if (bech32OperatorAddress == eachMessage.value.delegatorAddress) 
              compositeEventBlockMap[key].self_stake += eachMessage.typeUrl == 'delegate'
                ? stakeAmount 
                : (stakeAmount * -1);

            return next2();
          } else if (
            ['complete_redelegation'].includes(eachMessage.typeUrl)
          ) {

            if (!eachMessage.value.validatorSrcAddress || !eachMessage.value.validatorDstAddress || !eachMessage.value.delegatorAddress || !eachMessage.value.amount) {
              console.log(eachMessage)
              return next2(new Error(`neccessary_values_missing:${eachMessage.typeUrl}:${block_height}`));
            }

            const bech32SrcOperatorAddress = convertOperatorAddressToBech32(eachMessage.value.validatorSrcAddress, chain.bech32_prefix);
            const bech32DstOperatorAddress = convertOperatorAddressToBech32(eachMessage.value.validatorDstAddress, chain.bech32_prefix);

            const value = parseInt(eachMessage.value.amount);

            compositeEventBlockMap[eachMessage.value.validatorSrcAddress].total_stake += (value * -1);
            if (bech32SrcOperatorAddress == eachMessage.value.delegatorAddress)
              compositeEventBlockMap[eachMessage.value.validatorSrcAddress].self_stake += (value * -1);

            compositeEventBlockMap[eachMessage.value.validatorDstAddress].total_stake += value;
            if (bech32DstOperatorAddress == eachMessage.value.delegatorAddress)
              compositeEventBlockMap[eachMessage.value.validatorDstAddress].self_stake += value;

            return next2();
          } else if (['slash'].includes(eachMessage.typeUrl)) {
            if (!eachMessage.value.amount) {
              console.log(eachMessage)
              return next2(new Error(`neccessary_values_missing:${eachMessage.typeUrl}:${block_height}`));
            }
            compositeEventBlockMap[key].slash += eachMessage.value.amount;
            return next2();
          } else if (
            eachMessage.typeUrl == 'transfer'
          ) {

            const senderValidatorAddresses = withdrawAddressMapping[eachMessage.value.validatorAddressSender];
            const recipientValidatorAddresses = withdrawAddressMapping[eachMessage.value.validatorAddressRecipient];

            const amount = parseInt(eachMessage.value.amount);
            if (senderValidatorAddresses && senderValidatorAddresses.length) {
              const remainder = amount % senderValidatorAddresses.length
              senderValidatorAddresses.forEach((eachValidatorAddress, i) => {
                if (!compositeEventBlockMap[eachValidatorAddress])
                  compositeEventBlockMap[eachValidatorAddress] = initializeCompositeBlock();
                compositeEventBlockMap[eachValidatorAddress].balance_change -= Math.floor(amount / senderValidatorAddresses.length);
                if (i == 0 && remainder)
                  compositeEventBlockMap[eachValidatorAddress].balance_change -= remainder;
              })
            }
          
            if (recipientValidatorAddresses && recipientValidatorAddresses.length) {
              const remainder = amount % recipientValidatorAddresses.length
              recipientValidatorAddresses.forEach((eachValidatorAddress, i) => {
                if (!compositeEventBlockMap[eachValidatorAddress])
                  compositeEventBlockMap[eachValidatorAddress] = initializeCompositeBlock();
                compositeEventBlockMap[eachValidatorAddress].balance_change += Math.floor(amount / recipientValidatorAddresses.length);
                if (i == 0 && remainder)
                  compositeEventBlockMap[eachValidatorAddress].balance_change += remainder;
              })
            }

            return next2();
          } else if (eachMessage.typeUrl == 'set_withdraw_address') {
            const operatorAddressFormat = convertOperatorAddressToBech32(eachMessage.value.delegatorAddress, `${chain.bech32_prefix}valoper`);
            if (!operatorAddressFormat)
              return next2(new Error(`address_conversion_failed:set_withdraw_address:${block_height}`));
            setWithdrawAddress(chain.name, operatorAddressFormat, eachMessage.value.withdrawAddress, (err, success) => {
              if (err || !success) return next2(new Error(`withdraw_address_set_failed:set_withdraw_address:${block_height}`));
              
              if (!withdrawAddressMapping[eachMessage.value.withdrawAddress])
                withdrawAddressMapping[eachMessage.value.withdrawAddress] = [];
              if (!withdrawAddressMapping[eachMessage.value.withdrawAddress].includes(operatorAddressFormat))
                withdrawAddressMapping[eachMessage.value.withdrawAddress].push(operatorAddressFormat);

              return next2();
            });
          } else {
            return next2();
          }
        },
        (err) => {
          if (err) return next1(new Error(err.toString()));
          return next1();
        }
      )
    },
    (err) => {
      if (err) return callback(err.toString(), null);
      return callback(null, { validatorMap, compositeEventBlockMap });
    }
  )
}