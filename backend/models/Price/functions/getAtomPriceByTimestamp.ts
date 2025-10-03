export const getAtomPriceByTimestamp = (
  body: {
    token: string,
    timestamp: number
  },
  callback: (
    err: string | null,
    price: number | null
  ) => any
) => {
  const { token, timestamp } = body;
  const date = new Date(timestamp).toLocaleDateString('en-GB').split('/').join('-');
  fetch(`https://api.coingecko.com/api/v3/coins/${token}/history?date=${date}`)
    .then(response => response.json())
    .then(response => {
      return callback(null, parseFloat(response.market_data.current_price.usd));
    })
    .catch(err => callback(err, null));
}