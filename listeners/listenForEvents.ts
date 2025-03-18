import async from 'async';
import CompositeEventBlock from '../models/CompositeEventBlock/CompositeEventBlock.js';
import Validator from '../models/Validator/Validator.js';
import Chain from '../models/Chain/Chain.js';
import getTxsByHeight from '../utils/getTxsByHeight.js';

const LISTENING_EVENTS = [
  '/cosmos.staking.v1beta1.MsgCreateValidator',
  '/cosmos.staking.v1beta1.MsgDelegate',
  '/cosmos.staking.v1beta1.MsgEditValidator',
  '/cosmos.staking.v1beta1.MsgUndelegate',
  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
  '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission'
];

export const listenForEvents = async (
  bottom_block_height: number,
  top_block_height: number,
  chain_identifier: string,
  final_callback: (err: string | null, success: Boolean) => any
) => {
  try {
    const chain = await Chain.findOne({ name: chain_identifier });
    if (!chain) throw new Error('not_found');

    const denom = chain.denom;
    const initialBottomBlock = bottom_block_height;
    let startTime = Date.now();

    const promises: Promise<void>[] = [];

    for (let height = bottom_block_height; height < top_block_height; height++) {
      if ((height - initialBottomBlock) % 100 === 0) {
        console.log(`${(Date.now() - startTime) / 1000}s`);
        startTime = Date.now();
      }

      promises.push(
        new Promise((resolve, reject) => {
          getTxsByHeight(chain.rpc_url, height, (err, decodedTxs) => {
            if (err) return reject(err);
            if (!decodedTxs) return resolve();

            const flattenedDecodedTxs = decodedTxs.flatMap(obj => obj.messages);
            if (!flattenedDecodedTxs.length) return resolve();

            async.timesSeries(
              flattenedDecodedTxs.length,
              (i, next) => {
                const eachMessage = flattenedDecodedTxs[i];
                if (!LISTENING_EVENTS.includes(eachMessage.typeUrl)) return next();

                if (['/cosmos.staking.v1beta1.MsgCreateValidator', '/cosmos.staking.v1beta1.MsgEditValidator'].includes(eachMessage.typeUrl)) {
                  const pubkey: ArrayBuffer = eachMessage.value.pubkey.value;
                  const byteArray = new Uint8Array(Object.values(pubkey).slice(2));
                  const pubkeyBase64 = btoa(String.fromCharCode(...byteArray));

                  Validator.saveValidator({
                    pubkey: pubkeyBase64,
                    operator_address: eachMessage.value.validatorAddress,
                    delegator_address: eachMessage.value.delegatorAddress,
                    keybase_id: eachMessage.value.description.identity,
                    moniker: eachMessage.value.description.moniker,
                    commission_rate: eachMessage.value.commission.rate,
                    chain_identifier: chain.name
                  }, (err, validator) => {
                    if (err) return reject(err);
                    console.log(`${eachMessage.typeUrl} | SAVED | ${validator?.operator_address}`);
                    resolve();
                  })
                } else if (['/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward', '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission'].includes(eachMessage.typeUrl)) {
                    
                }
              },
              (err) => {
                if (err) return reject(err);
                resolve();
              }
            )
          });
        });
        //       } else if (
        //         ['/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward', '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission'].includes(
        //           eachMessage.typeUrl
        //         )
        //       ) {
        //         await new Promise<void>((resolve, reject) => {
        //           CompositeEventBlock.saveCompositeEventBlock(
        //             {
        //               block_height: height,
        //               operator_address: eachMessage.value.validatorAddress,
        //               denom: denom,
        //               reward: parseInt(eachMessage.value.amount.amount)
        //             },
        //             (err, newCompositeEventBlock) => {
        //               if (err) return reject(err);
        //               console.log(`${eachMessage.typeUrl} | SAVED | ${newCompositeEventBlock?.operator_address}`);
        //               resolve();
        //             }
        //           );
        //         });
        //       } else if (
        //         ['/cosmos.staking.v1beta1.MsgDelegate', '/cosmos.staking.v1beta1.MsgUndelegate'].includes(eachMessage.typeUrl)
        //       ) {
        //         const selfStake =
        //           eachMessage.typeUrl === '/cosmos.staking.v1beta1.MsgDelegate'
        //             ? parseInt(eachMessage.value.amount.amount)
        //             : -parseInt(eachMessage.value.amount.amount);

        //         await new Promise<void>((resolve, reject) => {
        //           CompositeEventBlock.saveCompositeEventBlock(
        //             {
        //               block_height: height,
        //               operator_address: eachMessage.value.validatorAddress,
        //               denom: denom,
        //               self_stake: selfStake
        //             },
        //             (err, newCompositeEventBlock) => {
        //               if (err) return reject(err);
        //               console.log(`${eachMessage.typeUrl} | SAVED | ${newCompositeEventBlock?.operator_address}`);
        //               resolve();
        //             }
        //           );
        //         });
        //       }
        //     }
        //   } catch (error) {
        //     console.error(`Error processing block ${height}:`, error);
        //   }
        // })()
      );
    }

    Promise.allSettled(promises)
      .then(values => {
        for (const value of values)
          if (value.status !== 'fulfilled')
            console.error(`${value.reason}`);
      })
      .catch(err => {
        console.error(`${err}`);
      })
    return final_callback(null, true);
  } catch (err) {
    if (err) return final_callback(err.toString(), false);
  }
};
