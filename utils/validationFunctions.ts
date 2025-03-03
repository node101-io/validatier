
export const isOperatorAddressValid = function (operator_address: string) {
  if (typeof operator_address != 'string' || operator_address.trim().length != 52 || !operator_address.includes('cosmosvaloper1')) return false;
  return true;
} 

export const isPubkeyValid = function (pubkey: string) {
  if (typeof pubkey != 'string' || pubkey.trim().length != 44) return false;
  return true;
}

export const isTxHashValid = function (txHash: string) {
  if (typeof txHash != 'string' || txHash.trim().length != 64) return false;
  return true;
}
