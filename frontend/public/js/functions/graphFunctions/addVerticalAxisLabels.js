function addVerticalAxisLabels(
  graphWrapper,
  operatorAddress,
  min,
  max,
  details,
  currency,
  decimals,
  usd_exchange_rate,
  symbol,
  id,
  symbolArray,
  dataFields
) {
  if (
    document.getElementById(
      `${operatorAddress.replace("@", "\\@")}-graph-vertical-axis-labels${id || ""}`
    )
  )
    document
      .getElementById(
        `${operatorAddress.replace("@", "\\@")}-graph-vertical-axis-labels${id || ""}`
      )
      .remove();
  const verticalAxisLabels = document.createElement("div");
  verticalAxisLabels.classList.add("vertical-axis-labels");
  verticalAxisLabels.id = `${operatorAddress.replace("@", "\\@")}-graph-vertical-axis-labels${id || ""}`;

  let i = 0;
  const numDivisions = Math.ceil(5 / min.length);

  while (i < min.length) {
    const maxValue = max[i];
    const minValue = min[i];

    const step = (maxValue - minValue) / numDivisions;
    let iter = minValue;

    const verticalAxisSubWrapper = document.createElement("div");
    verticalAxisSubWrapper.classList.add("vertical-axis-sub-wrapper");
    verticalAxisSubWrapper.style.height = `${100 / numDivisions}%`;

    for (let j = 0; j <= numDivisions; j++) {
      const value = iter;

      const eachVerticalLabel = document.createElement("div");
      eachVerticalLabel.classList.add("each-vertical-label");

      const { nativeValue, usdValue } = getValueWithDecimals(
        value,
        symbol,
        usd_exchange_rate,
        decimals
      );
      if (dataFields[i] != "price") {
        eachVerticalLabel.innerHTML = !["%", "$"].includes(symbol)
          ? nativeValue.replace(symbol, "")
          : nativeValue.replace(symbol, symbolArray[id]);
      } else {
        eachVerticalLabel.innerHTML = `$${value}`;
      }

      verticalAxisSubWrapper.appendChild(eachVerticalLabel);
      iter += step;
    }

    verticalAxisLabels.appendChild(verticalAxisSubWrapper);
    i++;
  }

  graphWrapper.insertBefore(verticalAxisLabels, graphWrapper.children[0]);
}
