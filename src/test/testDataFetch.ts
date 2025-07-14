import async from "async";
import Chain from "../models/Chain/Chain.js";
import getTxsByHeight from "../utils/getTxsByHeight.js";

const testSeperation = '-------------------------------------------------------------------------------------------------';

const TEST_CASES = [
  // { height: 9636026, description: 'complete_redelegation' },
  // { height: 6489032, description: 'complete_unbonding' },
  // { height: 17224685, description: 'create_validator + auto_withdraw + delegation + manual_withdraw' },
  // { height: 9421602, description: 'delegate + withdraw' },
  // { height: 8772784, description: 'withdraw_reward + withdraw_commission + delegate' },
  // { height: 8772711, description: 'withdraw_reward + withdraw_commission + delegate (failed)' },
  // { height: 18152061, description: 'modify_withdraw_address' },
  // { height: 9866551, description: 'modify_withdraw_address' },
  // { height: 11767753, description: 'modify_withdraw_address' },
  // { height: 5434269, description: 'delegate_sign_test' },
  // { height: 5401833, description: 'missing_delegate_test' } 
  // { height: 5159118, description: 'complete_undelegate + auto claim reward' }
  { height: 10355620, description: 'complete_redelegate that we may not consider' }
];

// for (let i = 5401834; i < 5411792; i++) {
//   TEST_CASES.push({ height: i, description: '' })
// }

export function testDataFetch() {
  Chain.findChainByIdentifier({ chain_identifier: 'cosmoshub' }, (err, chain) => {
    if (!chain?.rpc_url) return console.log('no_rpc_url');

    async.timesSeries(TEST_CASES.length, (index, next) => {
      const { height, description } = TEST_CASES[index];
      getTxsByHeight(chain.rpc_url, height, chain.denom, chain.bech32_prefix, 0, true, (err, results) => {
        console.log(`############### Block: ${height} - ${description} ###############`);
        if (err) console.log(err);
        else {
          results.decodedTxs.forEach((eachTx: any) => {
            eachTx.messages.forEach((eachMessage: any) => {
              console.log(eachMessage);
            });
          });
        }
        console.log(testSeperation);
        next();
      });
    }, (err) => {
      console.log('DONE');
    });
  });
}
