export default interface Validator {
    id: number;
    moniker: string;
    temporary_image_uri: string;
    operator_address: string;
    percentage_sold?: number;
    sold?: number;
    average_total_stake?: number;
    reward?: number;
    self_stake?: number;
    commission?: number;
}
