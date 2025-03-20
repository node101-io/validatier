
import { bech32 } from 'bech32';

export const convertOperatorAddressToBech32 = function(operator_address: string, chain_identifier: string) {
  try {
    
    const decoded = bech32.decode(operator_address);

    const bech32Address = bech32.encode(chain_identifier, decoded.words);

    return bech32Address
  } catch (err) {
      return null;
  }
}
