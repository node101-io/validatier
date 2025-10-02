export default interface Validator {
  id: number;
  moniker: string;
  temporary_image_uri: string;
  operator_address: string;
  percentage_sold?: number;
  sold?: number;
  total_withdraw?: number;
  average_total_stake?: number;
  reward?: number;
  self_stake?: number;
  commission?: number;
  pubkey: string;
}
