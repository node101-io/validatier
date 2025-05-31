
export const getOnlyNativeTokenValueFromAmountString = function (value: string, denom: string) {

  const splitString: string[] = value.split(',');

  for (let i = 0; i < splitString.length; i++) {
    const eachWithdrawChunk: string = splitString[i];

    if (!eachWithdrawChunk.includes(denom)) continue;

    const nativeTokenAmount: string = eachWithdrawChunk.replace(denom, '');
    return nativeTokenAmount;
  }
  return null;
}
