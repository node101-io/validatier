
const horizontalLabelDataMapping = {}

function addColumnToExistingGraph (params) {
  const { type, operatorAddress, data, timestamp, index, currency, decimals, usd_exchange_rate, symbol, minValue, maxValue, graphWidth, dataFields, colors, columnsPer, subplotGroupMapping } = params;
  const graphWrapper = document.getElementById(`validator-graph-wrapper-${operatorAddress}`);
  if (type != 'small') {
    if (dataFields[0] != 'percentage_sold')
      addVerticalAxisLabels(graphWrapper, operatorAddress, minValue, maxValue, 6, currency, decimals, usd_exchange_rate, symbol, null, null, dataFields)
    else
      for (let i = 0; i < minValue.length; i++) {
        addVerticalAxisLabels(graphWrapper, operatorAddress, [minValue[i]], [maxValue[i]], 6, currency, decimals, usd_exchange_rate, symbol, i, ['%', '$'], dataFields)
      }
  };
  
  const columnWrapper = document.createElement('div');
  columnWrapper.setAttribute('timestamp', timestamp);
  columnWrapper.setAttribute('index', index);
  columnWrapper.classList.add('each-graph-column-wrapper');
  columnWrapper.classList.add(`column-wrapper-${operatorAddress}`);
  if (dataFields[0] != 'percentage_sold')
    columnWrapper.classList.add(`column-wrapper-summary-subplot`);

  const addOnPx = type != 'small'
    ? dataFields[0] != 'percentage_sold'
      ? ''
      : ' - (var(--vertical-axis-labels-width) * 2)'
    : '';
  const addOnInt = type != 'small'
    ? dataFields[0] != 'percentage_sold'
      ? ''
      : ' - (var(--vertical-axis-labels-width-int) * 2)'
    : '';
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
   
    const value = data[eachDataField];
    columnWrapper.setAttribute(eachDataField, value);

    let bottom;
    if (!subplotGroupMapping) {
      bottom = `calc(((${value} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;
    } else {
      const subPlotGroup = subplotGroupMapping[eachDataField];
      const numberOfGroups = subplotGroupMapping['number_of_groups'];
      bottom = `calc(${(100 / numberOfGroups) * subPlotGroup}% + ((${value} - var(--min-value-${operatorAddress}-${eachDataField != 'price' ? subPlotGroup : '0'})) / (var(--max-value-${operatorAddress}-${eachDataField != 'price' ? subPlotGroup : '0'}) - var(--min-value-${operatorAddress}-${eachDataField != 'price' ? subPlotGroup : '0'}))) * ${100 / numberOfGroups}%)`;
    }
    const { point, line } = generatePointAndLine(colors[i], bottom);

    point.classList.add(`${eachDataField}-graph-data-element-${operatorAddress}`);
    point.classList.add(`${eachDataField}-graph-data-point-${operatorAddress}`);
    line.classList.add(`${eachDataField}-graph-data-element-${operatorAddress}`);
    line.classList.add(`${eachDataField}-graph-data-line-${operatorAddress}`);

    columnWrapper.appendChild(point);
    columnWrapper.appendChild(line);

    if (type != 'small') {
      const paintBar = document.createElement('div');
      paintBar.classList.add('graph-range-paint-bar', `paint-bar-${operatorAddress.replace('\\@', '@')}`, `${eachDataField}-graph-data-paint-bar-${operatorAddress}`);
      columnWrapper.appendChild(paintBar);  
    }
  })

  if (type != 'small') {

    if (!horizontalLabelDataMapping[operatorAddress]) {
      horizontalLabelDataMapping[operatorAddress] = {
        currentIntervalLeft: timestamp,
        currentIntervalRight: null,
        columnToAppendHorizontalLabel: null
      };
    }

    const linePer = columnsPer / 2;
    if (index % columnsPer == 0) {
      horizontalLabelDataMapping[operatorAddress].columnToAppendHorizontalLabel = columnWrapper;
    };
    if (index % linePer == 0 && index % columnsPer != 0) {
      const referenceLine = document.createElement('div');
      referenceLine.classList.add('each-data-vertical-reference-line');
      columnWrapper.appendChild(referenceLine);
      
      if (!horizontalLabelDataMapping[operatorAddress].currentIntervalLeft) {
        horizontalLabelDataMapping[operatorAddress].currentIntervalLeft = timestamp;
      } else if (!horizontalLabelDataMapping[operatorAddress].currentIntervalRight) {
        horizontalLabelDataMapping[operatorAddress].currentIntervalRight = timestamp;
        generateSingleHorizontalAxisLabel(horizontalLabelDataMapping[operatorAddress]);

        horizontalLabelDataMapping[operatorAddress] = {
          currentIntervalLeft: timestamp,
          currentIntervalRight: null,
          columnToAppendHorizontalLabel: null
        };
      }
    };
  }

  graphWrapper.appendChild(columnWrapper);

  dataFields.forEach(eachDataField => {
    const value = data[eachDataField];
    if (['price', 'total_stake_sum'].includes(eachDataField) && columnWrapper.previousSibling) {
      if (!columnWrapper.previousSibling.classList.contains('each-graph-column-wrapper')) {
        columnWrapper.setAttribute(`${eachDataField}_prefix_sum`, value);
      } else {
        const previousColumnPrefixSum = columnWrapper.previousSibling.getAttribute(`${eachDataField}_prefix_sum`);
        columnWrapper.setAttribute(`${eachDataField}_prefix_sum`, parseFloat(previousColumnPrefixSum) + value);
      }
    }
  });

  document.documentElement.style.setProperty(
    `--graph-column-width-${operatorAddress.replace('\\@', '@')}`, 
    `calc((${graphWidth}${addOnInt}) / var(--number-of-columns-${operatorAddress}))`
  );
  
  return columnWrapper;
}