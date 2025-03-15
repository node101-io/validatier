
export const isOperatorAddressValid = function (operator_address: string) {
  if (typeof operator_address != 'string') return false;
  return true;
} 

export const isPubkeyValid = function (pubkey: string) {
  if (typeof pubkey != 'string') return false;
  return true;
}

export const isTxHashValid = function (txHash: string) {
  if (typeof txHash != 'string') return false;
  return true;
}
