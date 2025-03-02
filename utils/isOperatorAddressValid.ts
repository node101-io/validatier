
export const isOperatorAddressValid = function (operator_address: string) {
  if (operator_address.length != 52 || !operator_address.includes('cosmosvaloper1')) return false;
  return true;
} 
