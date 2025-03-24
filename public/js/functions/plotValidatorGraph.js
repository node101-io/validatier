
const PERIOD_INVERVAL = 25;

function prettyDate(timestamp) {
  const date = new Date(parseInt(timestamp));
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function addVerticalAxisLabels(graphWrapper, min, max, details, currency, decimals, usd_exchange_rate) {
  const step = (max - min) / (details - 1);
  let iter = min;
  
  const verticalAxisLabels = document.createElement('div');
  verticalAxisLabels.classList.add('vertical-axis-labels');

  while (iter <= max) {
    const eachVerticalLabel = document.createElement('div');
    eachVerticalLabel.classList.add('each-vertical-label');
    eachVerticalLabel.innerHTML = getValueWithDecimals(iter, currency, usd_exchange_rate, decimals);
    verticalAxisLabels.appendChild(eachVerticalLabel);
    iter += step;
  }

  graphWrapper.appendChild(verticalAxisLabels);
}


function generateLegendLine (data, label, color) {
  const eachDataPointValueDisplayLine = document.createElement('div');
  eachDataPointValueDisplayLine.classList.add('each-data-point-value-display-each-line');

  const eachDataPointValueDisplayLegendBall = document.createElement('div');
  eachDataPointValueDisplayLegendBall.classList.add('each-data-point-value-display-legend-ball');
  eachDataPointValueDisplayLegendBall.style.backgroundColor = color;
  
  const eachDataPointValueDisplayLegendText = document.createElement('div');
  eachDataPointValueDisplayLegendText.classList.add('each-data-point-value-display-legend-text');
  eachDataPointValueDisplayLegendText.innerHTML = `${label}: ${data}`;

  eachDataPointValueDisplayLine.appendChild(eachDataPointValueDisplayLegendBall);
  eachDataPointValueDisplayLine.appendChild(eachDataPointValueDisplayLegendText);

  return eachDataPointValueDisplayLine;
}

function getAngleBetweenTwoPoints (column1, column2) {

  const selfStakeDeltaX = column1.getBoundingClientRect().width;
  const selfStakeDeltaY = column2.children[0].getBoundingClientRect().bottom - column1.children[0].getBoundingClientRect().bottom;

  const selfStakeHypotenuse = Math.sqrt((selfStakeDeltaX ** 2) + (selfStakeDeltaY ** 2));
  const selfStakeAngle = Math.atan(selfStakeDeltaY / selfStakeDeltaX) * (180 / Math.PI);

  const withdrawDeltaX = column1.getBoundingClientRect().width;
  const withdrawDeltaY = column2.children[2].getBoundingClientRect().bottom - column1.children[2].getBoundingClientRect().bottom;

  const withdrawHypotenuse = Math.sqrt((withdrawDeltaX ** 2) + (withdrawDeltaY ** 2));
  const withdrawAngle = Math.atan(withdrawDeltaY / withdrawDeltaX) * (180 / Math.PI);

  return {
    selfStakeHypotenuse,
    selfStakeAngle,
    withdrawHypotenuse,
    withdrawAngle
  };
}

const validatorGraphEventListenersMapping = {};

function plotValidatorGraph(params) {
  const { operatorAddress, graphDataMapping, currency, decimals, usd_exchange_rate } = params;

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
  
  Object.entries(graphDataMapping).forEach(([timestamp, data]) => {
    const columnWrapper = document.createElement('div');
    columnWrapper.className = 'each-graph-column-wrapper';
  
    const selfStakeBottom = ((data.self_stake - minValue) / (maxValue - minValue)) * 100;
    const withdrawBottom = ((data.withdraw - minValue) / (maxValue - minValue)) * 100;
  
    const horizontalAxisLabel = document.createElement('div');
    horizontalAxisLabel.classList.add('horizontal-axis-label');
    horizontalAxisLabel.innerHTML = prettyDate(timestamp).split('/').slice(0, 2).join('/');

    const selfStakePoint = document.createElement('div');
    selfStakePoint.className = 'each-data-point';
    selfStakePoint.style.backgroundColor = 'darkblue';
    selfStakePoint.style.bottom = `${selfStakeBottom}%`;
  
    const selfStakeLine = document.createElement('div');
    selfStakeLine.className = 'each-data-line';
    selfStakeLine.style.backgroundColor = 'lightcoral';
    selfStakeLine.style.bottom = `${selfStakeBottom}%`;
  
    const withdrawPoint = document.createElement('div');
    withdrawPoint.className = 'each-data-point';
    withdrawPoint.style.backgroundColor = 'darkgreen';
    withdrawPoint.style.bottom = `${withdrawBottom}%`;
  
    const withdrawLine = document.createElement('div');
    withdrawLine.className = 'each-data-line';
    withdrawLine.style.backgroundColor = 'lightcoral';
    withdrawLine.style.bottom = `${withdrawBottom}%`;

    const eachDataPointValueDisplay = document.createElement('div');
    eachDataPointValueDisplay.classList.add('each-data-point-value-display');
    eachDataPointValueDisplay.style.bottom = `calc(${Math.max(selfStakeBottom, withdrawBottom)}% + 10px)`;

    const eachDataPointValueDisplayTitle = document.createElement('div');
    eachDataPointValueDisplayTitle.classList.add('each-data-point-value-display-title');
    
    eachDataPointValueDisplayTitle.innerHTML = prettyDate(timestamp);

    const prettySelfStake = getValueWithDecimals(data.self_stake, currency, usd_exchange_rate, decimals);
    const prettyWithdraw = getValueWithDecimals(data.withdraw, currency, usd_exchange_rate, decimals);
    const prettyRatio = shortNumberFormat(data.ratio);
    const prettySold = getValueWithDecimals(data.sold, currency, usd_exchange_rate, decimals);

    const legendLineSelfStake = generateLegendLine(prettySelfStake, 'self-stake', 'blue');
    const legendLineWithdraw = generateLegendLine(prettyWithdraw, 'withdraw', 'red');

    eachDataPointValueDisplay.appendChild(eachDataPointValueDisplayTitle);
    eachDataPointValueDisplay.appendChild(legendLineSelfStake);
    eachDataPointValueDisplay.appendChild(legendLineWithdraw);

    const eachDataPointDifferenceDisplay = document.createElement('div');
    eachDataPointDifferenceDisplay.classList.add('each-data-point-difference-display');
    eachDataPointDifferenceDisplay.style.bottom = `${(Math.max(selfStakeBottom, withdrawBottom) + Math.min(selfStakeBottom, withdrawBottom)) / 2}%`;

    const legendLineRatio = generateLegendLine(prettyRatio, 'ratio', 'green');
    const legendLineSold = generateLegendLine(prettySold, 'sold', 'yellow');

    eachDataPointDifferenceDisplay.appendChild(legendLineRatio);
    eachDataPointDifferenceDisplay.appendChild(legendLineSold);

    const eachDataDeltaVerticalLine = document.createElement('div');
    eachDataDeltaVerticalLine.classList.add('each-data-delta-vertical-line');
    eachDataDeltaVerticalLine.style.bottom = `${Math.min(selfStakeBottom, withdrawBottom)}%`;
    eachDataDeltaVerticalLine.style.height = `${Math.max(selfStakeBottom, withdrawBottom) - Math.min(selfStakeBottom, withdrawBottom)}%`

    addVerticalAxisLabels(graphWrapper, Math.min(minSelfStake, minWithdraw), Math.max(maxSelfStake, maxWithdraw), 5, currency, decimals, usd_exchange_rate);

    columnWrapper.appendChild(selfStakePoint);
    columnWrapper.appendChild(selfStakeLine);
    columnWrapper.appendChild(withdrawPoint);
    columnWrapper.appendChild(withdrawLine);
    columnWrapper.appendChild(eachDataPointValueDisplay);
    columnWrapper.appendChild(eachDataDeltaVerticalLine);
    columnWrapper.appendChild(eachDataPointDifferenceDisplay);
    columnWrapper.appendChild(horizontalAxisLabel);
  
    const columnMouseHandler = (event) => {
  
      const rect = columnWrapper.getBoundingClientRect();
      const left = event.clientX - rect.left;
      
      let hoveredColumnWrapper = columnWrapper;
      
      if (left > columnWrapper.offsetWidth / 2) hoveredColumnWrapper = hoveredColumnWrapper.nextSibling;

      columnWrapper.children[4].classList.add('each-data-point-value-display-visible');
      columnWrapper.children[5].classList.add('each-data-delta-vertical-line-visible');
      columnWrapper.children[6].classList.add('each-data-point-difference-display-visible');
    };

    const columnMouseLeaveHandler = (event) => {
      document.querySelectorAll('.each-data-point-value-display-visible').forEach(each => each.classList.remove('each-data-point-value-display-visible'));
      document.querySelectorAll('.each-data-delta-vertical-line-visible').forEach(each => each.classList.remove('each-data-delta-vertical-line-visible'));
      document.querySelectorAll('.each-data-point-difference-display-visible').forEach(each => each.classList.remove('each-data-point-difference-display-visible'));
    }

    columnWrapper.addEventListener('mousemove', columnMouseHandler);
    validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mousemove', handler: columnMouseHandler, element: columnWrapper });
    columnWrapper.addEventListener('mouseleave', columnMouseLeaveHandler);
    validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mouseleave', handler: columnMouseLeaveHandler, element: columnWrapper });

    graphWrapper.appendChild(columnWrapper);
  });


  validatorsMainWrapper.insertBefore(graphWrapper, validatorWrapper.nextSibling);
    
  const columns = document.querySelectorAll('.each-graph-column-wrapper');
  for (let i = 0; i < columns.length - 1; i++) {
    
    const { selfStakeAngle, selfStakeHypotenuse, withdrawAngle, withdrawHypotenuse } = getAngleBetweenTwoPoints(columns[i], columns[i + 1]);
    
    columns[i].children[1].style.transform = `rotateZ(${selfStakeAngle}deg)`;
    columns[i].children[1].style.width = `${selfStakeHypotenuse}px`;
    columns[i].children[3].style.transform = `rotateZ(${withdrawAngle}deg)`;
    columns[i].children[3].style.width = `${withdrawHypotenuse}px`;

  }
  
  columns[columns.length - 1].children[1].style.display = 'none';
  columns[columns.length - 1].children[3].style.display = 'none';
}

function handlePlotButtonClick (socket) {
  document.addEventListener('click', async (event) => {
    if (!event.target.classList.contains('validator-plot-graph-button')) return;

    const bottomDate = document.getElementById('periodic-query-bottom-timestamp').value;
    const topDate = document.getElementById('periodic-query-top-timestamp').value

    const operatorAddress = event.target.getAttribute('operator-address');
    const bottomTimestamp = Math.floor(new Date(bottomDate).getTime());
    const topTimestamp = Math.floor(new Date(topDate).getTime());


    let iter = bottomTimestamp;
    const step = (topTimestamp - bottomTimestamp) / PERIOD_INVERVAL;
    
    const graphDataMapping = {};

    const currency = document.getElementById('currency-toggle').value == 'native' ? document.getElementById('network-switch-header').getAttribute('current_chain_symbol') : 'usd';
    const decimals = document.getElementById('network-switch-header').getAttribute('current_chain_decimals');
    const usd_exchange_rate = document.getElementById('network-switch-header').getAttribute('current_chain_usd_exhange_rate');

    while (iter < topTimestamp) {
      
      const requestData = {
        operator_address: operatorAddress,
        bottom_timestamp: bottomTimestamp,
        top_timestamp: iter + step,
        decimals: document.getElementById('network-switch-header').getAttribute('current_chain_decimals')
      };
    
      try {
        const response = await new Promise((resolve, reject) => {
          socket.emit('getTotalPeriodicSelfStakeAndWithdraw', requestData);
    
          socket.once('response', (response) => {
            if (!response.success || response.err) {
              reject(new Error(response.err || 'Error with the response'));
            }
            resolve(response);
          });
        });
    
        
        graphDataMapping[iter] = {
          self_stake: response.data.self_stake,
          withdraw: response.data.withdraw,
          ratio: response.data.ratio,
          sold: response.data.sold
        };
    
      } catch (error) { return console.error('Error in response:', error) }
      plotValidatorGraph({ operatorAddress, graphDataMapping, currency, decimals, usd_exchange_rate });

      iter = iter + step;
    }    
  })
}
