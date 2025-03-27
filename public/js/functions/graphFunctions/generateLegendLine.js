function generateLegendLine (data, label, color, currency, usd_exchange_rate, decimals, symbol) {

  const prettyValue = getValueWithDecimals(data, currency, usd_exchange_rate, decimals);

  const eachDataPointValueDisplayLine = document.createElement('div');
  eachDataPointValueDisplayLine.classList.add('each-data-point-value-display-each-line');

  const eachDataPointValueDisplayLegendBall = document.createElement('div');
  eachDataPointValueDisplayLegendBall.classList.add('each-data-point-value-display-legend-ball');
  eachDataPointValueDisplayLegendBall.style.backgroundColor = color;
  
  const eachDataPointValueDisplayLegendText = document.createElement('div');
  eachDataPointValueDisplayLegendText.classList.add('each-data-point-value-display-legend-text');
  eachDataPointValueDisplayLegendText.setAttribute('native', `${label}: ${getValueWithDecimals(data, symbol, usd_exchange_rate, decimals)}`);
  eachDataPointValueDisplayLegendText.setAttribute('usd', `${label}: ${getValueWithDecimals(data, 'usd', usd_exchange_rate, decimals)}`);
  eachDataPointValueDisplayLegendText.innerHTML = `${label}: ${prettyValue}`;

  eachDataPointValueDisplayLine.appendChild(eachDataPointValueDisplayLegendBall);
  eachDataPointValueDisplayLine.appendChild(eachDataPointValueDisplayLegendText);

  return eachDataPointValueDisplayLine;
}
