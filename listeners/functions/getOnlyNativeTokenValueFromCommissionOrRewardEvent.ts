
export const getOnlyNativeTokenValueFromCommissionOrRewardEvent = function (value: string, callback: (err: string | null, nativeRewardOrCommissionValue: string) => any) {

  const splitString: string[] = value.split(',');

  for (let i = 0; i < splitString.length; i++) {
    const eachWithdrawChunk: string = splitString[i];
    
    if (!eachWithdrawChunk.includes('uatom')) continue;

    const nativeTokenAmount: string = eachWithdrawChunk.replace('uatom', '');
    return callback(null, nativeTokenAmount);
  }
  return callback(null, '0');
}
