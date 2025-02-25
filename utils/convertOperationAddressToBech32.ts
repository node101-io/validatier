
import { bech32 } from "bech32";

export const convertOperationAddressToBech32 = function(operation_address: string, callback: (err: string | unknown | null, operation_address_bech_32: string | null) => any) {

  try {
    const decoded = bech32.decode(operation_address);
    
    const bech32Address = bech32.encode("cosmos", decoded.words);

    return callback(null, bech32Address);
  } catch (err) {
      return callback(err, null);
  }
}
