import { fromBech32, toBech32 } from "@cosmjs/encoding";
import { config } from "../config";

export function operatorToAccount(operator: string): string {
    const { prefix, data } = fromBech32(operator); // validates checksum too
    const expected = `${config.bech32Prefix}valoper`;
    if (prefix !== expected) {
        throw new Error(
            `operatorToAccount: expected ${expected}1... address, got "${operator}"`,
        );
    }
    return toBech32(config.bech32Prefix, data);
}
