function generatePointValueDisplay (data, graphDataMapping, currency, usd_exchange_rate, decimals, timestamp, symbol, isRangeValueDisplay, initialTimestamp) {
  const eachDataPointValueDisplay = document.createElement('div');
  eachDataPointValueDisplay.classList.add('each-data-point-value-display');

  const eachDataPointValueDisplayTitle = document.createElement('div');
  eachDataPointValueDisplayTitle.classList.add('each-data-point-value-display-title');
  
  if (!isRangeValueDisplay) eachDataPointValueDisplayTitle.innerHTML = `${prettyDate(graphDataMapping[0].timestamp)}-${prettyDate(timestamp)}`;
  else eachDataPointValueDisplayTitle.innerHTML = `${prettyDate(initialTimestamp)}-${prettyDate(timestamp)}`;

  eachDataPointValueDisplay.appendChild(eachDataPointValueDisplayTitle);

  const legendItems = [
    { key: 'self_stake', label: 'Self-stake', color: 'green' },
    { key: 'withdraw', label: 'Withdraw', color: 'blue' },
    { key: 'ratio', label: 'Ratio', color: 'green' },
    { key: 'sold', label: 'Sold', color: 'yellow' }
  ];
  
  legendItems.forEach(item => eachDataPointValueDisplay.appendChild(generateLegendLine(data[item.key], item.label, item.color, currency, usd_exchange_rate, decimals, symbol)));

  return eachDataPointValueDisplay;
}