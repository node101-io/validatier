import async from 'async';
import { request } from 'undici';
import { decodeTxRaw, Registry } from '@cosmjs/proto-signing';
import { defaultRegistryTypes } from '@cosmjs/stargate';
import { sha256 } from '@cosmjs/crypto';
import { toHex } from '@cosmjs/encoding';
import { getSpecificAttributeOfAnEventFromTxEventsArray } from './getSpecificAttributeOfAnEventFromTxEventsArray.js';
import { getOnlyNativeTokenValueFromCommissionOrRewardEvent } from '../listeners/functions/getOnlyNativeTokenValueFromCommissionOrRewardEvent.js';
import { convertOperatorAddressToBech32 } from './convertOperatorAddressToBech32.js';

interface DecodedMessage {
  typeUrl: string;
  value: any;
}

interface DecodedTx {
  messages: DecodedMessage[];
}

const MESSAGE_TYPES_TO_DECODE: string[] = [
  '/cosmos.staking.v1beta1.MsgCreateValidator',
  '/cosmos.staking.v1beta1.MsgDelegate',
  '/cosmos.staking.v1beta1.MsgEditValidator',
  '/cosmos.staking.v1beta1.MsgUndelegate',
  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
  '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission'
];

const WITHDRAW_EVENTS = [
  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
  '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission'
];

const registry = new Registry(defaultRegistryTypes);

const decodeTransactions = (base_url: string, txs: string[], callback: (err: string | null, result?: DecodedTx[]) => any) => {
  async.map(
    txs,
    (base64tx: string, cb: (err: string | null, result?: DecodedTx) => void) => {
      const tx = decodeTxRaw(Buffer.from(base64tx, 'base64'));
    
      const messages: DecodedMessage[] = [];

      const filteredMessages = tx.body.messages.filter((message) => MESSAGE_TYPES_TO_DECODE.includes(message.typeUrl))
      async.times(
        filteredMessages.length,
        (i, next) => {
          const message = filteredMessages[i];
          const preCheckDecodedMessage = registry.decode(message);
          
          convertOperatorAddressToBech32(preCheckDecodedMessage.validatorAddress, (err, bech32OperatorAddress) => {
            if (
              message.typeUrl != '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission' &&
              (err || bech32OperatorAddress != preCheckDecodedMessage.delegatorAddress)
            ) return next();
          
            if (!WITHDRAW_EVENTS.includes(message.typeUrl)) {
              messages.push({ typeUrl: message.typeUrl, value: registry.decode(message) });
              return next();
            };

            const sha256v = sha256(Buffer.from(base64tx ,'base64'));
            const txHash = toHex(sha256v);

            request(`${base_url}/tx?hash=0x${txHash.toUpperCase().trim()}`)
              .then(response => response.body.json())
              .then((data: any) => {

                const events = data.result.tx_result.events;
                
                // TODO: callbackten synce çevirme
                getSpecificAttributeOfAnEventFromTxEventsArray(
                  events,
                  ['withdraw_rewards', 'withdraw_commission'],
                  'amount',
                  (err, specificAttributeValue) => {
                    
                    if (err || !specificAttributeValue) return cb('bad_request', { messages });

                    const denom = 'uatom';
                    getOnlyNativeTokenValueFromCommissionOrRewardEvent(specificAttributeValue, denom, (err, nativeRewardOrCommissionValue) => {

                      const decodedMessage = registry.decode(message);
                      
                      decodedMessage.amount = {
                        denom: denom,
                        amount: nativeRewardOrCommissionValue
                      };

                      messages.push({
                        typeUrl: message.typeUrl,
                        value: decodedMessage,
                      });
                      
                      return next();
                    })
                  }
                )
              })
              .catch((err) => console.log(err));
            })
          },
          (err) => {
            cb(null, { messages });
          }
        )
    },
    (err, decodedTxs) => {
      if (err) return callback(err);
    
      const filteredTxs: DecodedTx[] = (decodedTxs || []).filter((tx): tx is DecodedTx => tx !== undefined && tx.messages.length > 0);
      callback(null, filteredTxs);
    }
  );
};

export default decodeTransactions;
