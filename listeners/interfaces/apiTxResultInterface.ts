export interface CosmosTx {
  tx: {
    body: {
      messages: {
        '@type': string;
        delegator_address?: string;
        validator_address?: string;
        amount?: {
          denom: string,
          amount: string
        };
      }[];
      memo: string;
      timeout_height: string;
    };
    auth_info: {
      signer_infos: {
        public_key: {
          '@type': string;
          key: string;
        };
        mode_info: {
          single: {
            mode: string;
          };
        };
        sequence: string;
      }[];
      fee: {
        amount: {
          denom: string;
          amount: string;
        }[];
        gas_limit: string;
        payer: string;
        granter: string;
      };
    };
    signatures: string[];
  };
  tx_response: {
    height: string;
    txhash: string;
    codespace: string;
    code: number;
    data: string;
    raw_log: string;
    info: string;
    gas_wanted: string;
    gas_used: string;
    tx: {
      '@type': string;
      body: {
        messages: {
          '@type': string;
          delegator_address: string;
          validator_address: string;
        }[];
        memo: string;
        timeout_height: string;
      };
      auth_info: {
        signer_infos: {
          public_key: {
            '@type': string;
            key: string;
          };
          mode_info: {
            single: {
              mode: string;
            };
          };
          sequence: string;
        }[];
        fee: {
          amount: {
            denom: string;
            amount: string;
          }[];
          gas_limit: string;
          payer: string;
          granter: string;
        };
      };
      signatures: string[];
    };
    timestamp: string;
    events: {
      type: string;
      attributes: {
        key: string;
        value: string;
        index: boolean;
      }[];
    }[];
  };
}