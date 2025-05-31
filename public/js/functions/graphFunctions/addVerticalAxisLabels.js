
function addVerticalAxisLabels(graphWrapper, operatorAddress, min, max, details, currency, decimals, usd_exchange_rate, symbol) {
  
  if (document.getElementById(`${operatorAddress.replace('@', '\\@')}-graph-vertical-axis-labels`)) document.getElementById(`${operatorAddress.replace('@', '\\@')}-graph-vertical-axis-labels`).remove();
  const verticalAxisLabels = document.createElement('div');
  verticalAxisLabels.classList.add('vertical-axis-labels');
  verticalAxisLabels.id = `${operatorAddress.replace('@', '\\@')}-graph-vertical-axis-labels`;

  let i = 0;
  const numDivisions = Math.ceil(5 / min.length);

  while (i < min.length) {
    const maxValue = max[i];
    const minValue = min[i];

    const step = (maxValue - minValue) / numDivisions;
    let iter = minValue;

    // Fix floating point issues
    for (let j = 0; j <= numDivisions; j++) {
      const value = iter;

      const eachVerticalLabel = document.createElement('div');
      eachVerticalLabel.classList.add('each-vertical-label');

      const { nativeValue, usdValue } = getValueWithDecimals(value, symbol, usd_exchange_rate, decimals);

      eachVerticalLabel.setAttribute('native', nativeValue);
      eachVerticalLabel.setAttribute('usd', usdValue);
      eachVerticalLabel.innerHTML = nativeValue;

      verticalAxisLabels.appendChild(eachVerticalLabel);
      iter += step;
    }

  i++;
}

  graphWrapper.insertBefore(verticalAxisLabels, graphWrapper.children[0]);
}
