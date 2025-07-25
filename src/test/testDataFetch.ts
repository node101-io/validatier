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
  // { height: 5434269, description: 'delegate_sign_test' },
  // { height: 10355620, description: 'complete_redelegate that we may not consider' },
  // { height: 16985512, description: 'rate_limit_test' },
  // { height: 16985511, description: 'rate_limit_test' },
  // { height: 16985563, description: 'rate_limit_test' },
  // { height: 16985575, description: 'rate_limit_test' },
  // { height: 16985578, description: 'rate_limit_test' },
  // { height: 16985586, description: 'rate_limit_test' },
  // { height: 16985587, description: 'rate_limit_test' },
  // { height: 5200792, description: 'ignore_sensitive_events' },
  // { height: 12487454, description: 'set_withdraw_address' },
  // { height: 18152061, description: 'modify_withdraw_address' },
  // { height: 9866551, description: 'modify_withdraw_address' },
  // { height: 11767753, description: 'modify_withdraw_address' },
  // { height: 19639608, description: 'withdraw_commission' },
  // { height: 19642834, description: 'set_withdraw_address' },
  { height: 19633511, description: 'withdraw' },
];

// for (let i = 5401834; i < 5411792; i++) {
//   TEST_CASES.push({ height: i, description: '' })
// }

export function testDataFetch() {
  Chain.findChainByIdentifier({ chain_identifier: 'cosmoshub' }, (err, chain) => {
    if (!chain?.rpc_urls[0]) return console.log('no_rpc_url');

    async.timesSeries(TEST_CASES.length, (index, next) => {
      const { height, description } = TEST_CASES[index];
      getTxsByHeight(chain.rpc_urls[0], height, chain.denom, chain.bech32_prefix, 0, true, (err, results) => {
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
