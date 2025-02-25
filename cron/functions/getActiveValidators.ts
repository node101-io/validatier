
import axios from "axios";

const NUMBER_OF_ACTIVE_VALIDATORS_TO_BE_FETCHED = 5;
const REST_API_BASE_URL = 'https://rest.cosmos.directory/cosmoshub';
const REST_API_ENDPOINT = `cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=${NUMBER_OF_ACTIVE_VALIDATORS_TO_BE_FETCHED}`;

interface ConsensusPubKey {
  "@type": string;
  key: string;
}

interface Description {
  moniker: string;
  identity: string;
  website: string;
  security_contact: string;
  details: string;
}

interface CommissionRates {
  rate: string;
  max_rate: string;
  max_change_rate: string;
}

interface Commission {
  commission_rates: CommissionRates;
  update_time: string;
}

export interface ValidatorResponse {
  operator_address: string;
  consensus_pubkey: ConsensusPubKey;
  jailed: boolean;
  status: string;
  tokens: string;
  delegator_shares: string;
  description: Description;
  unbonding_height: string;
  unbonding_time: string;
  commission: Commission;
  min_self_delegation: string;
  unbonding_on_hold_ref_count: string;
  unbonding_ids: string[];
  validator_bond_shares: string;
  liquid_shares: string;
}

interface Pagination {
  next_key: string | null;
  total: string;
}

interface GetActiveValidatorsInterface {
  validators: ValidatorResponse[],
  pagination: Pagination
}

export const getActiveValidators = (callback: (validators: ValidatorResponse[]) => any) => {
  axios.get(`${REST_API_BASE_URL}/${REST_API_ENDPOINT}`)
    .then((response) => {
      const data: GetActiveValidatorsInterface = response.data;
      return callback(data.validators);
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
}
