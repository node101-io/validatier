
import { bech32 } from 'bech32';

export const convertOperatorAddressToBech32 = function(operator_address: string, callback: (err: string | null, operator_address_bech_32: string | null) => any) {

  try {
    const decoded = bech32.decode(operator_address);
    
    const bech32Address = bech32.encode('cosmos', decoded.words);

    return callback(null, bech32Address);
  } catch (err) {
      return callback('bad_request', null);
  }
}
