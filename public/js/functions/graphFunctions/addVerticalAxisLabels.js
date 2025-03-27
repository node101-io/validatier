
function addVerticalAxisLabels(graphWrapper, operatorAddress, min, max, details, currency, decimals, usd_exchange_rate, symbol) {
  const step = (max - min) / (details - 1);
  let iter = min;
  
  if (document.getElementById(`${operatorAddress}-graph-vertical-axis-labels`)) document.getElementById(`${operatorAddress}-graph-vertical-axis-labels`).remove();
  const verticalAxisLabels = document.createElement('div');
  verticalAxisLabels.classList.add('vertical-axis-labels');
  verticalAxisLabels.id = `${operatorAddress}-graph-vertical-axis-labels`;

  while (iter <= max) {
    const eachVerticalLabel = document.createElement('div');
    eachVerticalLabel.classList.add('each-vertical-label');
    eachVerticalLabel.setAttribute('native', getValueWithDecimals(iter, symbol, usd_exchange_rate, decimals));
    eachVerticalLabel.setAttribute('usd', getValueWithDecimals(iter, 'usd', usd_exchange_rate, decimals));
    eachVerticalLabel.innerHTML = getValueWithDecimals(iter, currency, usd_exchange_rate, decimals);
    verticalAxisLabels.appendChild(eachVerticalLabel);
    iter += step;
  }

  graphWrapper.insertBefore(verticalAxisLabels, graphWrapper.children[0]);
}
