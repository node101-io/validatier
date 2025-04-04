export const sendTelegramMessage = (message: string, callback: (err: string | null, success: Boolean) => any) => {
  
  fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage?chat_id=${process.env.TELEGRAM_CHAT_ID}&text=${encodeURIComponent(message)}`)
    .then(res => res.json())
    .then(res => {
      if (!res.ok)
        return callback('bad_request', false);
      return callback(null, true);
    })
    .catch(_ => callback('network_error', false));
}