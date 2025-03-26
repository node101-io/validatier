self.onmessage = (event) => {
  const { action, data } = event.data;

  if (action === 'processData') {
    const { responseData } = data;

    self.postMessage({ 
      success: true, 
      data: {
        self_stake: responseData.data.self_stake,
        withdraw: responseData.data.withdraw,
        ratio: responseData.data.ratio,
        sold: responseData.data.sold,
        timestamp: responseData.data.timestamp
      }
    });
  }
};