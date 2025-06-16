export const getPercentageSold = (
  body: {
    sold: number,
    self_stake: number,
    total_withdraw: number
  }
) => {
  const { sold, self_stake, total_withdraw } = body;
  return Math.min(
    (
      Math.max((sold - self_stake), 0) / total_withdraw
    ) * 100,
    100
  )
}