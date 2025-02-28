
// const MOCKUP_VALUE = "169ibc/B011C1A0AD5E717F674BA59FD8E05B2F946E4FD41C9CB3311C95F7ED4B815620,37070ibc/B38AAA0F7A3EC4D7C8E12DFA33FF93205FE7A42738A4B0590E2FF15BC60A612B,100uatom";

export const getOnlyNativeTokenValueFromCommissionOrRewardEvent = function (value: string, callback: (err: string | null, nativeRewardOrCommissionValue: string | null) => any) {
  
  const splitString = value.split(",");

  splitString.forEach(eachWithdrawChunk => {
    if (eachWithdrawChunk.includes("uatom")) {

      const nativeTokenAmount = eachWithdrawChunk.replace("uatom", "");
      return callback(null, nativeTokenAmount);
    }
  })
  return callback("native_token_not_found", null)
}
