export const getPercentageSold = (
  body: {
    sold: number,
    self_stake: number,
    total_withdraw: number
  }
) => {
  const { sold, self_stake, total_withdraw } = body;
  if (total_withdraw <= 0 || sold <= 0) return 0;
  const percentage = (Math.max(sold, 0) / total_withdraw) * 100;
  return Math.max(Math.min(percentage, 100), 0);
}

export const getPercentageSoldWithoutRounding = (
  body: {
    sold: number,
    self_stake: number,
    total_withdraw: number
  }
) => {
  const { sold, self_stake, total_withdraw } = body;
  if (total_withdraw <= 0 || sold <= 0) return 0;
  return (sold / total_withdraw) * 100;
}