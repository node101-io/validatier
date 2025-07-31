import async from 'async';
import CompositeEventBlock from '../models/CompositeEventBlock/CompositeEventBlock.js';
import Validator from '../models/Validator/Validator.js';
import Chain, { ChainInterface } from '../models/Chain/Chain.js';
import getTxsByHeight, { RETRY_TOTAL } from '../utils/getTxsByHeight.js';
import { DecodedMessage } from '../utils/decodeTxs.js';
import { ActiveValidatorsInterface } from '../models/ActiveValidators/ActiveValidators.js';
import { bulkSave, clearChainData, getBatchData, getValidatorsOfWithdrawAddress, getWithdrawAddressMappingForChain, setWithdrawAddress } from '../utils/levelDb.js';
import { getCompositeBlocksFromInterval } from './functions/getCompositeBlocksFromInterval.js';

export const LISTENING_EVENTS = [
  'create_validator',
  'delegate',
  'complete_unbonding',
  'complete_redelegation',
  'withdraw_rewards',
  'withdraw_commission',
  'slash',
  'transfer',
  'set_withdraw_address'
];

interface ListenForEventsResult {
  success: boolean,
  inserted_validator_addresses?: string[] | null,
  saved_composite_events_operator_addresses?: string[] | null,
  new_active_set_last_updated_block_time?: number | null,
  saved_active_validators?: ActiveValidatorsInterface | null
}

export const listenForEvents = (
  body: {
    bottom_block_height: number,
    top_block_height: number,
    chain: ChainInterface
  },
  final_callback: (err: string | null, result: ListenForEventsResult) => any
) => {

  const { bottom_block_height, top_block_height, chain } = body;

  const promises: Promise<void>[] = [];  
  let timestamp: Date;

  getWithdrawAddressMappingForChain(chain.name, (err, withdrawAddressMapping) => {
    if (err || !withdrawAddressMapping) return final_callback(err, { success: false });

    const flattenedDecodedTxsByBlock: {
      block_height: number;
      flattenedDecodedTxs: DecodedMessage[];
    }[] = [];

    for (let height = bottom_block_height; height < top_block_height; height++) {

      let fetch_time = false;
      if (height == top_block_height - 1)
        fetch_time = true;

      promises.push(
        new Promise ((resolve, reject) => {
          
          const h = height;

          getTxsByHeight(
            chain.rpc_urls[h % chain.rpc_urls.length],
            height,
            chain.denom,
            chain.bech32_prefix,
            0,
            fetch_time,
            (err, result) => {
              
              const { time, decodedTxs } = result;

              if (err) return reject({ err: err, block_height: h });

              if (time) timestamp = new Date(time);

              if (!decodedTxs || decodedTxs.length <= 0) return resolve();

              const flattenedDecodedTxs: DecodedMessage[] = decodedTxs.flatMap((obj: { messages: DecodedMessage }) => obj.messages);

              flattenedDecodedTxsByBlock.push({
                block_height: h,
                flattenedDecodedTxs: flattenedDecodedTxs
              });
              return resolve();
            })
          }
        )
      );
    }

    const result: ListenForEventsResult = {
      inserted_validator_addresses: null,
      saved_composite_events_operator_addresses: null,
      saved_active_validators: null,
      new_active_set_last_updated_block_time: null,
      success: true
    }

    console.time(`${chain.name} | Processed through ${bottom_block_height} to ${top_block_height}`);
    
    Promise.allSettled(promises)
      .then(values => {
        console.timeEnd(`${chain.name} | Processed through ${bottom_block_height} to ${top_block_height}`);

        const sortedBlocks = flattenedDecodedTxsByBlock.sort((a, b) => a.block_height - b.block_height);
        getCompositeBlocksFromInterval(
          { chain, withdrawAddressMapping },
          sortedBlocks,
          (err, mapResults) => {

            console.log('1')
            if (err || !mapResults) return final_callback(`get_composite_blocks_from_interval: ${err}`, { success: false });

            const { validatorMap, compositeEventBlockMap } = mapResults;

            const rejectedValues = values.filter(each => each.status == 'rejected')
            if (rejectedValues.length)
              return final_callback(`${rejectedValues.map((each: any) => each.reason.block_height)} | rejected for ${RETRY_TOTAL} times\nJSON: ${JSON.stringify(rejectedValues)}`, { success: false })

            console.log('2')
            Validator.saveManyValidators(validatorMap, (err, validators) => {
              if (err) return final_callback(`save_many_validators_failed: ${err}`, { success: false });
              
              bulkSave({
                chain_identifier: chain.name,
                saveMapping: compositeEventBlockMap
              }, (err, success) => {

                console.log('3')
                if (err || !success) return final_callback(err, { success: false });
                const insertedValidatorAddresses = validators?.insertedValidators 
                  ? validators?.insertedValidators.map(validator => 
                    `${validator.operator_address.slice(0,4)}...${validator.operator_address.slice(validator.operator_address.length - 4, validator.operator_address.length)}`
                  )
                  : [];
                result.inserted_validator_addresses = insertedValidatorAddresses;
                if (!timestamp) return final_callback('no_timestamp_available', { success: false });
                const blockTimestamp = new Date(timestamp).getTime();

                console.log('4')
                
                console.log({ chain_identifier: chain.name, block_height: top_block_height, block_time: timestamp })
                Validator.updateLastVisitedBlock({ chain_identifier: chain.name, block_height: top_block_height, block_time: timestamp }, (err, updated_chain) => {
                  if (err) return final_callback(`update_last_visited_block_failed: ${err}`, { success: false });

                  console.log('5')
                  if (
                    new Date(timestamp).toLocaleDateString('en-US') ==
                    new Date(chain.active_set_last_updated_block_time).toLocaleDateString('en-US')
                  ) return final_callback(null, result);

                  getBatchData(chain.name, (err, data) => {
                    if (err) return final_callback(`get_batch_data_failed: ${err}`, { success: false });
                    const day = new Date(blockTimestamp).getDate();
                    const month = new Date(blockTimestamp).getMonth();
                    const year = new Date(blockTimestamp).getFullYear();
                    
                    const saveManyCompositeEventBlocksBody = {
                      chain_identifier: chain.name,
                      day: day,
                      month: month,
                      year: year,
                      block_height: top_block_height,
                      saveMapping: data
                    };
                    CompositeEventBlock.saveManyCompositeEventBlocks(saveManyCompositeEventBlocksBody, (err, savedCompositeEventBlocks) => {
                      if (err) return final_callback(`save_many_blocks_failed: ${err}`, { success: false });
                      Validator
                        .updateActiveValidatorList({
                          chain_identifier: chain.name,
                          chain_rpc_url: chain.rpc_urls[0],
                          height: top_block_height,
                          day: day,
                          month: month,
                          year: year,
                          active_validators_pubkeys_array: null
                        }, (err, savedActiveValidators) => {
                          if (err) return final_callback(`update_active_validators_failed: ${err}`, { success: false });
                          const savedCompositeEventsOperatorAddresses = savedCompositeEventBlocks?.map(each => 
                            `${each.operator_address.slice(0,4)}...${each.operator_address.slice(each.operator_address.length - 4, each.operator_address.length)}`
                          );
                          result.saved_composite_events_operator_addresses = savedCompositeEventsOperatorAddresses;
                          Chain.updateTimeOfLastActiveSetSave({ chain_identifier: chain.name, time: blockTimestamp, height: top_block_height }, (err, activeSetUpdatedChain) => {
                            if (err) return final_callback(`update_last_active_set_data_save_failed: ${err}`, { success: false });
                            result.new_active_set_last_updated_block_time = blockTimestamp;
                            result.saved_active_validators = savedActiveValidators;
                            clearChainData(chain.name, (err, success) => {
                              if (err || !success) return final_callback(`clear_chain_data_failed: ${err}`, { success: false });
                              return final_callback(null, result);
                            })
                          })
                        })
                    })
                })
              })
            })
          })
      })
    })
  });
};
