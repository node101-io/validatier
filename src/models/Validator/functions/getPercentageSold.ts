export const getPercentageSold = (
  body: {
    sold: number,
    self_stake: number,
    total_withdraw: number
  }
) => {
  const { sold, self_stake, total_withdraw } = body;
  return Math.max(
    Math.min(
      (
        Math.max((sold + total_withdraw - self_stake), 0) / total_withdraw
      ) * 100,
      100
    ),
    0
  )
}

export const getPercentageSoldWithoutRounding = (
  body: {
    sold: number,
    self_stake: number,
    total_withdraw: number
  }
) => {
  const { sold, self_stake, total_withdraw } = body;
  if (total_withdraw <= 0) return 100;
  return ((sold + total_withdraw - self_stake) / total_withdraw) * 100;
}