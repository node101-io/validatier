
import { bech32 } from 'bech32';

export const convertOperatorAddressToBech32 = function(operator_address: string, bech32_prefix: string) {
  try {
    
    const decoded = bech32.decode(operator_address);

    const bech32Address = bech32.encode(bech32_prefix, decoded.words);

    return bech32Address
  } catch (err) {
      return null;
  }
}
