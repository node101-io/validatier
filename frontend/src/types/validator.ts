// Mirrors the ValidatorRow shape from docs/05-static-json-contract.md — the
// object embedded in validators.json and validator/<address>.json.
export default interface Validator {
  moniker: string;
  temporary_image_uri: string | null;
  operator_address: string;
  website: string | null;
  commission: number;
  average_total_stake: number;
  total_withdraw: number;
  sold: number;
  percentage_sold: number;
  leading_exchange: string | null;
}
