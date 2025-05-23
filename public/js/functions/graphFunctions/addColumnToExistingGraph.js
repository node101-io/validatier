function addColumnToExistingGraph (params) {
  const { type, operatorAddress, data, timestamp, index, currency, decimals, usd_exchange_rate, symbol, graphDataMapping, minValue, maxValue, graphWidth, dataFields, colors, columnsPer } = params;
  
  const graphWrapper = document.getElementById(`validator-graph-wrapper-${operatorAddress}`);
  if (type != 'small') addVerticalAxisLabels(graphWrapper, operatorAddress, minValue, maxValue, 10, currency, decimals, usd_exchange_rate, symbol);
  
  const columnWrapper = document.createElement('div');
  columnWrapper.setAttribute('timestamp', timestamp);
  columnWrapper.setAttribute('index', index);
  columnWrapper.classList.add('each-graph-column-wrapper');
  columnWrapper.classList.add(`column-wrapper-${operatorAddress}`);

  const addOnPx = type != 'small' ? ' - var(--vertical-axis-labels-width)' : '';
  const addOnInt = type != 'small' ? ' - var(--vertical-axis-labels-width-int)' : '';
  document.documentElement.style.setProperty(
    `--graph-column-width-px-${operatorAddress.replace('\\@', '@')}`,
    `calc((${graphWidth}px${addOnPx}) / var(--number-of-columns-${operatorAddress}))`
  );
  columnWrapper.style.width = `var(--graph-column-width-px-${operatorAddress.replace('\\@', '@')})`;

  if (type != 'small') {
    const eachDataIndicatorVerticalLine = document.createElement('div');
    eachDataIndicatorVerticalLine.classList.add('each-data-indicator-vertical-line');
    const eachDataDeltaVerticalLine = document.createElement('div');
    eachDataDeltaVerticalLine.classList.add('each-data-delta-vertical-line');
  
    columnWrapper.appendChild(eachDataDeltaVerticalLine);
    columnWrapper.appendChild(eachDataIndicatorVerticalLine);
  }

  dataFields.forEach((eachDataField, i) => {
    columnWrapper.setAttribute(eachDataField, data[eachDataField]);
    const bottom = `calc(((${data[eachDataField]} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;
    const { point, line } = generatePointAndLine(colors[i], bottom);

    point.classList.add(`${eachDataField}-graph-data-element-${operatorAddress}`);
    line.classList.add(`${eachDataField}-graph-data-element-${operatorAddress}`);
    line.classList.add(`${eachDataField}-graph-data-line-${operatorAddress}`);

    columnWrapper.appendChild(point);
    columnWrapper.appendChild(line);

    if (type != 'small') {
      const paintBar = document.createElement('div');
      paintBar.classList.add('graph-range-paint-bar', `paint-bar-${operatorAddress.replace('\\@', '@')}`);
      columnWrapper.appendChild(paintBar);  
    }
  })

  if (type != 'small') {
    const horizontalAxisLabel = generateSingleHorizontalAxisLabel(timestamp);
    const linePer = columnsPer / 2;
    if (index % columnsPer == 0) columnWrapper.appendChild(horizontalAxisLabel);
    if (index % linePer == 0 && index % columnsPer != 0) {
      const referenceLine = document.createElement('div');
      referenceLine.classList.add('each-data-vertical-reference-line');
      columnWrapper.appendChild(referenceLine);
    };
  }

  graphWrapper.appendChild(columnWrapper);

  document.documentElement.style.setProperty(
    `--graph-column-width-${operatorAddress.replace('\\@', '@')}`, 
    `calc((${graphWidth}${addOnInt}) / var(--number-of-columns-${operatorAddress}))`
  );
  
  return columnWrapper;
}