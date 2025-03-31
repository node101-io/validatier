function addColumnToExistingGraph (params) {

  const { operatorAddress, data, timestamp, index, currency, decimals, usd_exchange_rate, symbol, graphDataMapping, minValue, maxValue, graphWidth } = params;
  const graphWrapper = document.getElementById(`validator-graph-wrapper-${operatorAddress}`);
  
  addVerticalAxisLabels(graphWrapper, operatorAddress, minValue, maxValue, 5, currency, decimals, usd_exchange_rate, symbol);
  
  const columnWrapper = document.createElement('div');
  columnWrapper.setAttribute('withdraw', data.withdraw);
  columnWrapper.setAttribute('self_stake', data.self_stake);
  columnWrapper.setAttribute('commission', data.commission);
  columnWrapper.setAttribute('timestamp', timestamp);
  columnWrapper.setAttribute('index', index);
  columnWrapper.classList.add('each-graph-column-wrapper');
  columnWrapper.classList.add(`column-wrapper-${operatorAddress}`);

  const selfStakeBottom = `calc(((${data.self_stake} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;
  const withdrawBottom = `calc(((${data.withdraw} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;  
  const commissionBottom = `calc(((${data.commission} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;  

  const horizontalAxisLabel = generateSingleHorizontalAxisLabel(timestamp);

  const { point: selfStakePoint, line: selfStakeLine } = generatePointAndLine('lightgreen', selfStakeBottom);
  const { point: withdrawPoint, line: withdrawLine } = generatePointAndLine('lightcoral', withdrawBottom);
  const { point: commissionPoint, line: commissionLine } = generatePointAndLine('orange', commissionBottom);
  
  const eachDataPointValueDisplay = generatePointValueDisplay(data, graphDataMapping, currency, usd_exchange_rate, decimals, timestamp, symbol);
  const eachDataIndicatorVerticalLine = document.createElement('div');
  eachDataIndicatorVerticalLine.classList.add('each-data-indicator-vertical-line');
  const eachDataDeltaVerticalLine = document.createElement('div');
  eachDataDeltaVerticalLine.classList.add('each-data-delta-vertical-line');
  
  const paintBarSelfStake = document.createElement('div');
  paintBarSelfStake.classList.add('graph-range-paint-bar', `paint-bar-${operatorAddress}`);
  const paintBarWithdraw = document.createElement('div');
  paintBarWithdraw.classList.add('graph-range-paint-bar', `paint-bar-${operatorAddress}`);
  const paintBarCommission = document.createElement('div');
  paintBarCommission.classList.add('graph-range-paint-bar', `paint-bar-${operatorAddress}`);

  selfStakePoint.classList.add(`self_stake-graph-data-element-${operatorAddress}`);
  selfStakeLine.classList.add(`self_stake-graph-data-element-${operatorAddress}`);
  
  withdrawPoint.classList.add(`withdraw-graph-data-element-${operatorAddress}`);
  withdrawLine.classList.add(`withdraw-graph-data-element-${operatorAddress}`);
  
  commissionPoint.classList.add(`commission-graph-data-element-${operatorAddress}`);
  commissionLine.classList.add(`commission-graph-data-element-${operatorAddress}`);

  columnWrapper.appendChild(selfStakePoint);
  columnWrapper.appendChild(selfStakeLine);
  columnWrapper.appendChild(withdrawPoint);
  columnWrapper.appendChild(withdrawLine);
  columnWrapper.appendChild(commissionPoint);
  columnWrapper.appendChild(commissionLine);
  columnWrapper.appendChild(eachDataPointValueDisplay);
  columnWrapper.appendChild(eachDataDeltaVerticalLine);
  columnWrapper.appendChild(eachDataIndicatorVerticalLine);
  columnWrapper.appendChild(paintBarSelfStake);
  columnWrapper.appendChild(paintBarWithdraw);
  columnWrapper.appendChild(paintBarCommission);
  if (index % 10 == 0) columnWrapper.appendChild(horizontalAxisLabel);

  graphWrapper.appendChild(columnWrapper);

  document.documentElement.style.setProperty(
    `--graph-column-width-${operatorAddress}`, 
    `calc((${graphWidth} - var(--vertical-axis-labels-width-int)) / ${graphWrapper.children.length - 3})`
  );
  
  return columnWrapper;
}