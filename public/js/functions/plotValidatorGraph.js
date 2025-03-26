
function prettyDate(timestamp) {
  const date = new Date(parseInt(timestamp));
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year.toString().slice(2)}`;
}

function addVerticalAxisLabels(graphWrapper, min, max, details, currency, decimals, usd_exchange_rate, symbol) {
  const step = (max - min) / (details - 1);
  let iter = min;
  
  const verticalAxisLabels = document.createElement('div');
  verticalAxisLabels.classList.add('vertical-axis-labels');

  while (iter <= max) {
    const eachVerticalLabel = document.createElement('div');
    eachVerticalLabel.classList.add('each-vertical-label');
    eachVerticalLabel.setAttribute('native', getValueWithDecimals(iter, symbol, usd_exchange_rate, decimals));
    eachVerticalLabel.setAttribute('usd', getValueWithDecimals(iter, 'usd', usd_exchange_rate, decimals));
    eachVerticalLabel.innerHTML = getValueWithDecimals(iter, currency, usd_exchange_rate, decimals);
    verticalAxisLabels.appendChild(eachVerticalLabel);
    iter += step;
  }

  graphWrapper.appendChild(verticalAxisLabels);
}

function generatePointAndLine(color, bottom) {
  const point = document.createElement('div');
  point.className = 'each-data-point';
  point.style.backgroundColor = color;
  point.style.bottom = `${bottom}%`;

  const line = document.createElement('div');
  line.className = 'each-data-line';
  line.style.backgroundColor = color;
  line.style.bottom = `${bottom}%`;

  return { point, line };
}

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

function getAngleBetweenTwoPoints (column1, column2, operatorAddress) {

  const deltaX = `--graph-column-width-${operatorAddress}`;
  const selfStakeDeltaY = column2.children[0].getBoundingClientRect().bottom - column1.children[0].getBoundingClientRect().bottom;

  const selfStakeHypotenuse = `calc(1px * sqrt(var(${deltaX}) * var(${deltaX}) + ${selfStakeDeltaY ** 2}))`;
  const selfStakeAngle = `atan(${selfStakeDeltaY} / var(${deltaX}))`;

  const withdrawDeltaY = column2.children[2].getBoundingClientRect().bottom - column1.children[2].getBoundingClientRect().bottom;
  
  const withdrawHypotenuse = `calc(1px * sqrt(var(${deltaX}) * var(${deltaX}) + ${withdrawDeltaY ** 2}))`;
  const withdrawAngle = `atan(${withdrawDeltaY} / var(${deltaX}))`;

  return {
    selfStakeHypotenuse,
    selfStakeAngle,
    withdrawHypotenuse,
    withdrawAngle
  };
}

function generateSingleHorizontalAxisLabel (timestamp) {
  const horizontalAxisLabel = document.createElement('div');
  horizontalAxisLabel.classList.add('horizontal-axis-label');
  horizontalAxisLabel.innerHTML = prettyDate(timestamp).split('/').slice(0, 2).join('/');
  return horizontalAxisLabel
}

function generatePointValueDisplay (data, graphDataMapping, currency, usd_exchange_rate, decimals, timestamp, symbol, isRangeValueDisplay, initialTimestamp) {
  const eachDataPointValueDisplay = document.createElement('div');
  eachDataPointValueDisplay.classList.add('each-data-point-value-display');

  const eachDataPointValueDisplayTitle = document.createElement('div');
  eachDataPointValueDisplayTitle.classList.add('each-data-point-value-display-title');
  
  if (!isRangeValueDisplay) eachDataPointValueDisplayTitle.innerHTML = `${prettyDate(Object.keys(graphDataMapping)[0])}-${prettyDate(timestamp)}`;
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

const validatorGraphEventListenersMapping = {};

function plotValidatorGraph(params) {
  const { operatorAddress, graphDataMapping, currency, decimals, usd_exchange_rate, symbol } = params;

  if (document.getElementById(`validator-graph-wrapper-${operatorAddress}`)) document.getElementById(`validator-graph-wrapper-${operatorAddress}`).remove();

  if (!validatorGraphEventListenersMapping[operatorAddress]) validatorGraphEventListenersMapping[operatorAddress] = [];
  else validatorGraphEventListenersMapping[operatorAddress].forEach(eachEventHandler => eachEventHandler.element.removeEventListener(eachEventHandler.event, eachEventHandler.handler));

  const validatorWrapper = document.getElementById(operatorAddress);
  const validatorsMainWrapper = document.getElementById('validators-main-wrapper');

  const values = Object.values(graphDataMapping);

  const minSelfStake = Math.min(...values.map(item => item.self_stake));
  const maxSelfStake = Math.max(...values.map(item => item.self_stake));
  const minWithdraw = Math.min(...values.map(item => item.withdraw));
  const maxWithdraw = Math.max(...values.map(item => item.withdraw));

  const minValue = Math.min(minSelfStake, minWithdraw);
  const maxValue = Math.max(maxSelfStake, maxWithdraw);
  
  const graphWrapper = document.createElement('div');
  graphWrapper.className = 'validator-graph-wrapper';
  graphWrapper.id = `validator-graph-wrapper-${operatorAddress}`;
  graphWrapper.setAttribute('operator_address', operatorAddress);

  const graphWrapperHorizontalLabelsBackgroundAbsolute = document.createElement('div');
  graphWrapperHorizontalLabelsBackgroundAbsolute.classList.add('graph-wrapper-horizontal-labels-background-absolute')
  graphWrapper.appendChild(graphWrapperHorizontalLabelsBackgroundAbsolute);
  addVerticalAxisLabels(graphWrapper, Math.min(minSelfStake, minWithdraw), Math.max(maxSelfStake, maxWithdraw), 5, currency, decimals, usd_exchange_rate, symbol);
  
  let isSelectingRange = false;
  let rangeInitialColumn;
  let rangeFinalColumn;
  let isSelectionDirectionToLeft = false;

  const graphMouseDownHandler = (event) => {
    rangeInitialColumn = '';
    rangeFinalColumn = '';
    document.querySelectorAll('.range-value-display').forEach(each => each.remove());
    document.querySelectorAll('.graph-range-paint-bar').forEach(each => each.style.width = '0');
    document.querySelectorAll('.each-data-indicator-vertical-line-visible').forEach(each => each.classList.remove('each-data-indicator-vertical-line-visible'));
    document.querySelectorAll('.range-edges-indicator').forEach(each => each.classList.remove('range-edges-indicator'));

    isSelectingRange = true;
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-graph-column-wrapper')) target = target.parentNode;
    rangeInitialColumn = target;
  }

  const graphMouseUpHandler = (event) => {
    isSelectingRange = false;
    if (!rangeInitialColumn || !rangeFinalColumn || (rangeInitialColumn == rangeFinalColumn)) {
      document.querySelectorAll('.graph-range-paint-bar').forEach(each => each.style.width = '0');
      document.querySelectorAll('.each-data-indicator-vertical-line-visible').forEach(each => each.classList.remove('each-data-indicator-vertical-line-visible'));
      document.querySelectorAll('.range-edges-indicator').forEach(each => each.classList.remove('range-edges-indicator'));
    } else {
      const deltaSelfStake = !isSelectionDirectionToLeft 
        ? rangeFinalColumn.getAttribute('self_stake') - rangeInitialColumn.getAttribute('self_stake') 
        : rangeInitialColumn.getAttribute('self_stake') - rangeFinalColumn.getAttribute('self_stake');
      
      const deltaWithdraw = !isSelectionDirectionToLeft 
        ? rangeFinalColumn.getAttribute('withdraw') - rangeInitialColumn.getAttribute('withdraw') 
        : rangeInitialColumn.getAttribute('withdraw') - rangeFinalColumn.getAttribute('withdraw');
      

      const initialTimestamp = !isSelectionDirectionToLeft ? rangeInitialColumn.getAttribute('timestamp') : rangeFinalColumn.getAttribute('timestamp');
      const timestamp = !isSelectionDirectionToLeft ? rangeFinalColumn.getAttribute('timestamp') : rangeInitialColumn.getAttribute('timestamp');

      if (!isSelectionDirectionToLeft) {
        rangeFinalColumn.nextSibling.children[7].style.width = '0px';
        rangeFinalColumn.nextSibling.children[8].style.width = '0px';

        rangeFinalColumn.nextSibling.children[6].classList.add('each-data-indicator-vertical-line-visible');
        rangeFinalColumn.nextSibling.children[6].classList.add('range-edges-indicator');  
      } else {
        rangeInitialColumn.children[7].style.width = '0px';
        rangeInitialColumn.children[8].style.width = '0px';
        rangeFinalColumn.previousSibling.children[7].style.width = '0px';
        rangeFinalColumn.previousSibling.children[8].style.width = '0px';

        rangeFinalColumn.children[6].classList.add('each-data-indicator-vertical-line-visible');
        rangeFinalColumn.children[6].classList.add('range-edges-indicator');  
      }

      rangeInitialColumn.children[6].classList.add('each-data-indicator-vertical-line-visible');
      rangeInitialColumn.children[6].classList.add('range-edges-indicator');
    
      const dataPointValueDisplay = generatePointValueDisplay({
        self_stake: deltaSelfStake,
        withdraw: deltaWithdraw,
        ratio: (deltaSelfStake ? deltaSelfStake : 0) / (deltaWithdraw ? deltaWithdraw : (10 ** decimals)),
        sold: (deltaWithdraw ? deltaWithdraw : 0) - (deltaSelfStake ? deltaSelfStake : 0)
      }, graphDataMapping, currency, usd_exchange_rate, decimals, timestamp, symbol, true, initialTimestamp);
      
      dataPointValueDisplay.classList.add('each-data-point-value-display-visible');
      dataPointValueDisplay.classList.add('range-value-display');
      dataPointValueDisplay.style.left = ((((rangeFinalColumn.getBoundingClientRect().left) - (rangeInitialColumn.getBoundingClientRect().left)) / 2) - 120) + 'px';
      rangeInitialColumn.appendChild(dataPointValueDisplay);
    }
  }

  graphWrapper.addEventListener('mousedown', graphMouseDownHandler);
  validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mousedown', handler: graphMouseDownHandler, element: graphWrapper });
  graphWrapper.addEventListener('mouseup', graphMouseUpHandler);
  validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mouseup', handler: graphMouseUpHandler, element: graphWrapper });

  Object.entries(graphDataMapping).forEach(([timestamp, data], index) => {
    const columnWrapper = document.createElement('div');
    columnWrapper.setAttribute('withdraw', data.withdraw);
    columnWrapper.setAttribute('self_stake', data.self_stake);
    columnWrapper.setAttribute('timestamp', timestamp); 
    columnWrapper.className = 'each-graph-column-wrapper';
  
    const selfStakeBottom = ((data.self_stake - minValue) / (maxValue - minValue)) * 100;
    const withdrawBottom = ((data.withdraw - minValue) / (maxValue - minValue)) * 100;
  
    const horizontalAxisLabel = generateSingleHorizontalAxisLabel(timestamp);

    const { point: selfStakePoint, line: selfStakeLine } = generatePointAndLine('lightgreen', selfStakeBottom);
    const { point: withdrawPoint, line: withdrawLine } = generatePointAndLine('lightcoral', withdrawBottom);

    const eachDataPointValueDisplay = generatePointValueDisplay(data, graphDataMapping, currency, usd_exchange_rate, decimals, timestamp, symbol);

    const eachDataIndicatorVerticalLine = document.createElement('div');
    eachDataIndicatorVerticalLine.classList.add('each-data-indicator-vertical-line');

    const eachDataDeltaVerticalLine = document.createElement('div');
    eachDataDeltaVerticalLine.classList.add('each-data-delta-vertical-line');
    eachDataDeltaVerticalLine.style.bottom = `${Math.min(selfStakeBottom, withdrawBottom)}%`;
    eachDataDeltaVerticalLine.style.height = `${Math.max(selfStakeBottom, withdrawBottom) - Math.min(selfStakeBottom, withdrawBottom)}%`

    const paintBarSelfStake = document.createElement('div');
    paintBarSelfStake.classList.add('graph-range-paint-bar');
    const paintBarWithdraw = document.createElement('div');
    paintBarWithdraw.classList.add('graph-range-paint-bar');

    columnWrapper.appendChild(selfStakePoint);
    columnWrapper.appendChild(selfStakeLine);
    columnWrapper.appendChild(withdrawPoint);
    columnWrapper.appendChild(withdrawLine);
    columnWrapper.appendChild(eachDataPointValueDisplay);
    columnWrapper.appendChild(eachDataDeltaVerticalLine);
    columnWrapper.appendChild(eachDataIndicatorVerticalLine);
    columnWrapper.appendChild(paintBarSelfStake);
    columnWrapper.appendChild(paintBarWithdraw);
    if (index % 10 == 0) columnWrapper.appendChild(horizontalAxisLabel);
  
    const columnMouseHandler = (event) => {

      const rect = columnWrapper.getBoundingClientRect();
      const left = event.clientX - rect.left;
      const right = rect.right - event.clientX;
      
      let hoveredColumnWrapper = columnWrapper;
      
      if (left > columnWrapper.offsetWidth / 2) hoveredColumnWrapper = hoveredColumnWrapper.nextSibling;

      columnWrapper.children[0].classList.add('each-data-point-hovered');
      columnWrapper.children[2].classList.add('each-data-point-hovered');
      if (!rangeInitialColumn || !rangeFinalColumn) columnWrapper.children[4].classList.add('each-data-point-value-display-visible');
      columnWrapper.children[5].classList.add('each-data-delta-vertical-line-visible');
      columnWrapper.children[6].classList.add('each-data-indicator-vertical-line-visible');

      if (index % 10 == 0) columnWrapper.children[9].classList.add('each-data-point-horizontal-label-hovered');

      if (!isSelectingRange || index == Object.values(graphDataMapping).length - 1) return;

      const deltaX = columnWrapper.getBoundingClientRect().width;

      let current = rangeInitialColumn;

      let target = event.target;
      while (!target.classList.contains('each-graph-column-wrapper')) target = target.parentNode;
      if (target != rangeInitialColumn) {
        while (current != target) {

          let selfStakeBottom;
          let withdrawBottom;

          if (target.getAttribute('timestamp') < rangeInitialColumn.getAttribute('timestamp')) {

            isSelectionDirectionToLeft = true;

            if (!current.previousSibling) break;

            rangeInitialColumn.children[7].style.width = '0px';
            rangeInitialColumn.children[8].style.width = '0px';
            let targetPrevious = target.previousSibling;
            
            while(targetPrevious) {
              if (targetPrevious.children[7]) targetPrevious.children[7].style.width = '0px';
              if (targetPrevious.children[8]) targetPrevious.children[8].style.width = '0px';
              targetPrevious = targetPrevious.previousSibling;
            }
            
            current.children[7].classList.add('graph-range-paint-bar-right');
            current.children[7].classList.remove('graph-range-paint-bar-left');

            current.children[8].classList.add('graph-range-paint-bar-right');
            current.children[8].classList.remove('graph-range-paint-bar-left');

            selfStakeBottom = ((current.nextSibling.getAttribute('self_stake') - minValue) / (maxValue - minValue)) * 100;
            withdrawBottom = ((current.nextSibling.getAttribute('withdraw') - minValue) / (maxValue - minValue)) * 100;
          } else {

            isSelectionDirectionToLeft = false;

            if (!current.nextSibling) break;

            let targetNext = target.nextSibling;
            while(targetNext) {
              targetNext.children[7].style.width = '0px';
              targetNext.children[8].style.width = '0px';
              targetNext = targetNext.nextSibling;
            }

            current.children[7].classList.add('graph-range-paint-bar-left');
            current.children[7].classList.remove('graph-range-paint-bar-right');

            current.children[8].classList.add('graph-range-paint-bar-left');
            current.children[8].classList.remove('graph-range-paint-bar-right');

            selfStakeBottom = ((current.getAttribute('self_stake') - minValue) / (maxValue - minValue)) * 100;
            withdrawBottom = ((current.getAttribute('withdraw') - minValue) / (maxValue - minValue)) * 100;
          }
          
          const { selfStakeHypotenuse, selfStakeAngle, withdrawHypotenuse, withdrawAngle } = getAngleBetweenTwoPoints(current, current.nextSibling, operatorAddress);

          current.children[7].style.width = selfStakeHypotenuse;
          current.children[7].style.bottom = (selfStakeBottom - 100) + '%';
          current.children[7].style.transform = `rotateZ(${selfStakeAngle}) skewX(${selfStakeAngle})`;
          current.children[7].style.backgroundColor = 'lightgreen';

          current.children[8].style.width = withdrawHypotenuse;
          current.children[8].style.bottom = (withdrawBottom - 100) + '%';
          current.children[8].style.transform = `rotateZ(${withdrawAngle}) skewX(${withdrawAngle})`;
          current.children[8].style.backgroundColor = 'lightcoral';
          
          if (current.getAttribute('self_stake') > current.getAttribute('withdraw')) {
            current.children[7].style.zIndex = '0';
            current.children[8].style.zIndex = '5';
          } else {
            current.children[7].style.zIndex = '5';
            current.children[8].style.zIndex = '0';
          }

          rangeFinalColumn = current;
          if (target.getAttribute('timestamp') < rangeInitialColumn.getAttribute('timestamp')) current = current.previousSibling;
          else current = current.nextSibling;
        }
      }

      const { selfStakeAngle, withdrawAngle } = getAngleBetweenTwoPoints(columnWrapper, columnWrapper.nextSibling, operatorAddress);

      if (target.getAttribute('timestamp') < rangeInitialColumn.getAttribute('timestamp')) {

        isSelectionDirectionToLeft = true;

        const { selfStakeHypotenuse, withdrawHypotenuse } = getAngleBetweenTwoPoints(columnWrapper, columnWrapper.nextSibling, operatorAddress);

        const selfStakeBottom = ((Object.values(graphDataMapping)[index + 1].self_stake - minValue) / (maxValue - minValue)) * 100;
        const withdrawBottom = ((Object.values(graphDataMapping)[index + 1].withdraw - minValue) / (maxValue - minValue)) * 100;    

        paintBarSelfStake.classList.add('graph-range-paint-bar-right');
        paintBarSelfStake.classList.remove('graph-range-paint-bar-left');

        paintBarWithdraw.classList.add('graph-range-paint-bar-right');
        paintBarWithdraw.classList.remove('graph-range-paint-bar-left');
        
        paintBarSelfStake.style.width = `calc((${right / deltaX}) * ${selfStakeHypotenuse.replace('calc', '')})`;
        paintBarSelfStake.style.bottom = (selfStakeBottom - 100) + '%';
        paintBarWithdraw.style.width = `calc((${right / deltaX}) * ${withdrawHypotenuse.replace('calc', '')})`;
        paintBarWithdraw.style.bottom = (withdrawBottom - 100) + '%';
      } else {

        isSelectionDirectionToLeft = false;
        
        const { selfStakeHypotenuse, withdrawHypotenuse } = getAngleBetweenTwoPoints(columnWrapper, columnWrapper.nextSibling, operatorAddress);

        paintBarSelfStake.classList.add('graph-range-paint-bar-left');
        paintBarSelfStake.classList.remove('graph-range-paint-bar-right');

        paintBarWithdraw.classList.add('graph-range-paint-bar-left');
        paintBarWithdraw.classList.remove('graph-range-paint-bar-right');

        paintBarSelfStake.style.width = `calc((${left / deltaX}) * ${selfStakeHypotenuse.replace('calc', '')})`;
        paintBarSelfStake.style.bottom = (selfStakeBottom - 100) + '%';
        paintBarWithdraw.style.width = `calc((${left / deltaX}) * ${withdrawHypotenuse.replace('calc', '')})`;
        paintBarWithdraw.style.bottom = (withdrawBottom - 100) + '%';
      }
      paintBarSelfStake.style.transform = `rotateZ(${selfStakeAngle}) skewX(${selfStakeAngle})`;
      paintBarSelfStake.style.backgroundColor = 'lightgreen';

      paintBarWithdraw.style.transform = `rotateZ(${withdrawAngle}) skewX(${withdrawAngle})`;
      paintBarWithdraw.style.backgroundColor = 'lightcoral'
    };

    const columnMouseLeaveHandler = (event) => {
      document.querySelectorAll('.each-data-point-hovered').forEach(each => each.classList.remove('each-data-point-hovered'));
      document.querySelectorAll('.each-data-point-value-display-visible').forEach(each => (!each.classList.contains('range-value-display')) ? each.classList.remove('each-data-point-value-display-visible') : '');
      document.querySelectorAll('.each-data-delta-vertical-line-visible').forEach(each => each.classList.remove('each-data-delta-vertical-line-visible'));
      document.querySelectorAll('.each-data-point-horizontal-label-hovered').forEach(each => each.classList.remove('each-data-point-horizontal-label-hovered'));
      document.querySelectorAll('.each-data-indicator-vertical-line-visible').forEach(each => (!each.classList.contains('range-edges-indicator')) ? each.classList.remove('each-data-indicator-vertical-line-visible') : '');
    }

    columnWrapper.addEventListener('mousemove', columnMouseHandler);
    validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mousemove', handler: columnMouseHandler, element: columnWrapper });
    columnWrapper.addEventListener('mouseleave', columnMouseLeaveHandler);
    validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mouseleave', handler: columnMouseLeaveHandler, element: columnWrapper });

    graphWrapper.appendChild(columnWrapper);
  });

  validatorsMainWrapper.insertBefore(graphWrapper, validatorWrapper.nextSibling);
    
  const columns = document.querySelectorAll('.each-graph-column-wrapper');
  document.documentElement.style.setProperty(
    `--graph-column-width-${operatorAddress}`,
    columns[0].getBoundingClientRect().width
  );

  for (let i = 0; i < columns.length - 1; i++) {
    
    const { selfStakeAngle, selfStakeHypotenuse, withdrawAngle, withdrawHypotenuse } = getAngleBetweenTwoPoints(columns[i], columns[i + 1], operatorAddress);
    
    columns[i].children[1].style.transform = `rotateZ(${selfStakeAngle})`;
    columns[i].children[1].style.width = `${selfStakeHypotenuse}`;
    columns[i].children[1].setAttribute('self_stake_hypotenuse', selfStakeHypotenuse);

    columns[i].children[3].style.transform = `rotateZ(${withdrawAngle})`;
    columns[i].children[3].style.width = `${withdrawHypotenuse}`;
    columns[i].children[3].setAttribute('withdraw_hypotenuse', withdrawHypotenuse);
  }
  
  columns[columns.length - 1].children[1].style.display = 'none';
  columns[columns.length - 1].children[3].style.display = 'none';
}

function handlePlotButtonClick () {
  document.addEventListener('click', async (event) => {
    if (!event.target.classList.contains('validator-plot-graph-button')) return;

    const bottomDate = document.getElementById('periodic-query-bottom-timestamp').value;
    const topDate = document.getElementById('periodic-query-top-timestamp').value

    const operatorAddress = event.target.getAttribute('operator-address');
    const bottomTimestamp = Math.floor(new Date(bottomDate).getTime());
    const topTimestamp = Math.floor(new Date(topDate).getTime());    
    const graphDataMapping = {};

    const currency = document.getElementById('currency-toggle').value == 'native' ? document.getElementById('network-switch-header').getAttribute('current_chain_symbol') : 'usd';
    const decimals = document.getElementById('network-switch-header').getAttribute('current_chain_decimals');
    const usd_exchange_rate = document.getElementById('network-switch-header').getAttribute('current_chain_usd_exhange_rate');
    const symbol = document.getElementById('network-switch-header').getAttribute('current_chain_symbol');
      
    const requestData = {
      operator_address: operatorAddress,
      bottom_timestamp: bottomTimestamp,
      top_timestamp: topTimestamp,
      decimals: document.getElementById('network-switch-header').getAttribute('current_chain_decimals')
    };
  
    const queryString = new URLSearchParams(requestData).toString();
    const eventSource = new EventSource(`/validator/get_graph_data?${queryString}`);

    const worker = new Worker('/js/functions/worker.js');

    worker.onmessage = (event) => {
      const { data } = event.data;
      graphDataMapping[data.timestamp] = data;
      plotValidatorGraph({ operatorAddress, graphDataMapping, currency, decimals, usd_exchange_rate, symbol });
    };
    
    eventSource.onmessage = (event) => {
      const response = JSON.parse(event.data);
      
      if (!response.success || response.err) return eventSource.close();
    
      worker.postMessage({
        action: 'processData',
        data: { responseData: response }
      });
    };

    eventSource.onerror = (err) => eventSource.close();
  });
      

  let isResizing = false;
  window.onresize = () => {
    if (isResizing) return;
    isResizing = true;

    const graphWrappersArray = document.querySelectorAll('.validator-graph-wrapper');
    setTimeout(() => {
  
      for (let i = 0; i < graphWrappersArray.length; i++) {
        const eachGraphWrapper = graphWrappersArray[i];
        const operatorAddress = eachGraphWrapper.getAttribute('operator_address');
        const columnWrapper = eachGraphWrapper.querySelector('.each-graph-column-wrapper');
        
        document.documentElement.style.setProperty(
          `--graph-column-width-${operatorAddress}`, 
          columnWrapper.getBoundingClientRect().width
        );
      }
      isResizing = false;
    }, 100);
  }
}