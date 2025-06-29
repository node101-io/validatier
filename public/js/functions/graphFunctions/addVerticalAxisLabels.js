
function addVerticalAxisLabels(graphWrapper, operatorAddress, min, max, details, currency, decimals, usd_exchange_rate, symbol) {
  const step = (max - min) / (details - 1);
  let iter = min;

  if (document.getElementById(`${operatorAddress.replace('@', '\\@')}-graph-vertical-axis-labels`)) document.getElementById(`${operatorAddress.replace('@', '\\@')}-graph-vertical-axis-labels`).remove();
  const verticalAxisLabels = document.createElement('div');
  verticalAxisLabels.classList.add('vertical-axis-labels');
  verticalAxisLabels.id = `${operatorAddress.replace('@', '\\@')}-graph-vertical-axis-labels`;

  while (iter < max) {
    
    const eachVerticalLabel = document.createElement('div');
    eachVerticalLabel.classList.add('each-vertical-label');
    const { nativeValue, usdValue } = getValueWithDecimals(iter, symbol, usd_exchange_rate, decimals);

    eachVerticalLabel.setAttribute('native', nativeValue);
    eachVerticalLabel.setAttribute('usd', usdValue);
    eachVerticalLabel.innerHTML = nativeValue;
    verticalAxisLabels.appendChild(eachVerticalLabel);
    iter += step;
  }

  graphWrapper.insertBefore(verticalAxisLabels, graphWrapper.children[0]);
}
