
function handleSummaryGraphActions() {

  const headerClassName = 'each-network-summary-network-graph-content-dropdown-header';
  const contentClassName = 'each-network-summary-network-graph-content-dropdown-content';
  const openContentClassName = 'each-network-summary-network-graph-content-dropdown-content-open';
  const dropdownArrowClassName = 'each-network-summary-network-graph-content-dropdown-arrow';

  document.body.addEventListener('click', (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-network-summary-select-option')) target = target.parentNode;
    if (!target.classList.contains('each-network-summary-select-option')) return;

    document.querySelector('.each-network-summary-select-option-selected').classList.remove('each-network-summary-select-option-selected');
    target.classList.add('each-network-summary-select-option-selected');

    const networkSummaryGraphContainer = document.getElementById('network-summary-graph-container');
    const currentDataFields = JSON.parse(networkSummaryGraphContainer.getAttribute('currentDataFields'));
    const currentColors = JSON.parse(networkSummaryGraphContainer.getAttribute('currentColors'));
    createNetworkSummaryGraph(currentDataFields, currentColors, target.getAttribute('option'))
  })

  document.body.addEventListener('click', (event) => {
    
    let target = event.target;
    while (target != document.body && (!target.classList.contains(headerClassName) && !target.classList.contains(contentClassName))) target = target.parentNode;
    
    if (!target.classList.contains(headerClassName) && !target.classList.contains(contentClassName)) {
      target.parentNode.querySelectorAll('.' + dropdownArrowClassName).forEach(each => {
        each.style.transform = 'rotateX(0deg)';
        each.style.marginTop = '2px';
      });
      target.parentNode.querySelectorAll('.' + contentClassName).forEach(each => 
        each.classList.remove(openContentClassName));
      return;
    };

    if (target.classList.contains(contentClassName)) return;

    const networkSwitchDropdown = target.nextSibling;
    const dropdownArrow = networkSwitchDropdown.parentNode.querySelector('.each-network-summary-network-graph-content-dropdown-arrow')
    
    if (!networkSwitchDropdown.classList.contains(openContentClassName)) {
      dropdownArrow.style.marginTop = '4px';
      dropdownArrow.style.transform = 'rotateX(180deg)';

      target.parentNode.querySelectorAll('.' + contentClassName).forEach(each => 
        each.classList.add(openContentClassName));
    }
    else {
      dropdownArrow.style.marginTop = '2px';
      dropdownArrow.style.transform = 'rotateX(0deg)';

      target.parentNode.querySelectorAll('.' + contentClassName).forEach(each => 
        each.classList.remove(openContentClassName));
    };
  })
}

function createNetworkSummaryGraph (dataFields, colors, by) {
  const summaryData = JSON.parse(document.body.getAttribute('summaryData'));
  const targetCacheSummaryGraphData = JSON.parse(document.body.getAttribute('summaryGraphData'))[by.toLowerCase()];

  document.querySelectorAll('.each-network-summary-network-graph-content-each-dropdown').forEach(each => each.classList.add('section-hidden'));
  document.querySelectorAll('.each-metric-content-wrapper').forEach(each => each.classList.add('section-hidden'));
  dataFields.forEach(eachDataField => {
    document.getElementById(`summary-graph-dropdown-option-${eachDataField}`).classList.remove('section-hidden');
    document.getElementById(`summary-metric-${eachDataField}`).classList.remove('section-hidden');
  });

  const currency = 'native';
  const decimals = document.getElementById('network-switch-header').getAttribute('current_chain_decimals');
  const usd_exchange_rate = document.getElementById('network-switch-header').getAttribute('current_chain_usd_exhange_rate');
  const symbol = document.getElementById('network-switch-header').getAttribute('current_chain_symbol');

  validatorListenerVariablesMapping['summary'] = {
    isSelectingRange: false,
    rangeInitialColumn: '',
    rangeFinalColumn: '',
    isSelectionDirectionToLeft: false
  }

  document.documentElement.style.setProperty('--number-of-columns-summary', targetCacheSummaryGraphData.length - 1);

  const graphDataMapping = {};
  const graphContainer = document.getElementById('network-summary-graph-container');
  const graphWrapper = plotValidatorGraph({ type: 'summary', operatorAddress: 'summary', decimals, usd_exchange_rate, symbol, validatorGraphEventListenersMapping, dataFields, graphContainer, summaryData });
  const graphWidth = window.getComputedStyle(graphContainer, null).getPropertyValue("width").replace('px', '');

  let columnsPer = Math.round(targetCacheSummaryGraphData.length / 5);
  columnsPer = columnsPer % 2 == 0 ? columnsPer : columnsPer + 1;
  
  const currentSumMapping = {};
  for (let i = 0; i < targetCacheSummaryGraphData.length; i++) {
    const data = targetCacheSummaryGraphData[i];
    
    dataFields.forEach(eachDataField => {
      if (!currentSumMapping[eachDataField]) currentSumMapping[eachDataField] = 0;
      data[eachDataField] += currentSumMapping[eachDataField];
      currentSumMapping[eachDataField] = data[eachDataField];

      const { nativeValue, usdValue } = getValueWithDecimals(currentSumMapping[eachDataField], eachDataField != 'percentage_sold' ? symbol : '%', usd_exchange_rate, decimals);
      const metric = document.getElementById(`summary-metric-${eachDataField}`);
      
      metric.querySelector('.each-metric-content-wrapper-content-value-native').innerHTML = nativeValue;
      metric.querySelector('.each-metric-content-wrapper-content-value-usd').innerHTML = usdValue;
      
      metric.querySelector('.percentage-change-value-content').innerHTML = '';
      const arrow = document.createElement('img');
      arrow.src = '/res/images/pretty_arrow.svg';
      metric.querySelector('.percentage-change-value-content').appendChild(arrow);
      const text = document.createElement('span');
      text.innerHTML = Math.round((currentSumMapping[eachDataField] / summaryData[`initial_${eachDataField}`]) * 100) + '%';
      metric.querySelector('.percentage-change-value-content').appendChild(text);
    });
    
    graphDataMapping[i] = data;

    const timestamp = (new Date(data._id.year, (data._id.month || 1) - 1, (data._id.day || 1))).getTime();
  
    let { minValue, maxValue } = calculateMaxAndMinValue(graphDataMapping, dataFields);
  
    document.documentElement.style.setProperty(`--min-value-summary`, minValue);
    document.documentElement.style.setProperty(`--max-value-summary`, maxValue);
  
    if (maxValue == minValue) minValue = maxValue / 2;

    const insertedColumn = addColumnToExistingGraph({
      type: 'summary',
      operatorAddress: 'summary',
      data: data,
      timestamp: timestamp,
      index: i,
      currency: currency,
      decimals: decimals,
      usd_exchange_rate: usd_exchange_rate,
      symbol: dataFields[0] != 'percentage_sold' ? symbol : '%',
      graphDataMapping,
      minValue,
      maxValue,
      graphWidth,
      dataFields: dataFields,
      colors: colors,
      by: by.toLowerCase(),
      columnsPer
    });
  
    if (
      insertedColumn.previousSibling &&
      insertedColumn.previousSibling.classList.contains('each-graph-column-wrapper')
    ) {
      adjustLineWidthAndAngle(insertedColumn.previousSibling, insertedColumn, 'summary', dataFields);
    } else {
      document.documentElement.style.setProperty('--column-height-summary', insertedColumn.offsetHeight);
      addColumnEventListener('summary', dataFields, colors, symbol, usd_exchange_rate, decimals, summaryData);
    }
  }

  const graphColumns = graphWrapper.querySelectorAll('.each-graph-column-wrapper');
  const lastColumn = graphColumns[graphColumns.length - 1];
  lastColumn.classList.add('each-graph-column-wrapper-last');
}

function createSmallGraphs () {
  const smallGraphData = JSON.parse(document.body.getAttribute('smallGraphData'));
  const graphsDataFields = [
    ['self_stake_sum'],
    ['average_self_stake_ratio'],
  ];
  const colors = ['rgba(88, 86, 214, 1)'];

  graphsDataFields.forEach(dataFields => {

    const operatorAddress = dataFields[0];
    document.documentElement.style.setProperty(`--number-of-columns-${operatorAddress}`, smallGraphData.length - 1);

    const graphDataMapping = {};
    const graphContainer = document.getElementById(`small-graph-${operatorAddress}`);
    const graphWrapper = plotValidatorGraph({ type: 'small', operatorAddress, decimals: null, usd_exchange_rate: null, symbol: null, validatorGraphEventListenersMapping: null, dataFields, graphContainer });
    const graphWidth = window.getComputedStyle(graphWrapper, null).getPropertyValue("width").replace('px', '');
    
    const currentSumMapping = {};

    for (let i = 0; i < smallGraphData.length; i++) {
      const data = smallGraphData[i];

      dataFields.forEach(eachDataField => {
        if (!currentSumMapping[eachDataField]) currentSumMapping[eachDataField] = 0;
        data[eachDataField] += currentSumMapping[eachDataField];
        currentSumMapping[eachDataField] = data[eachDataField];
      });

      graphDataMapping[i] = data;    
      let { minValue, maxValue } = calculateMaxAndMinValue(graphDataMapping, dataFields);
    
      document.documentElement.style.setProperty(`--min-value-${operatorAddress}`, minValue);
      document.documentElement.style.setProperty(`--max-value-${operatorAddress}`, maxValue);
    
      if (maxValue == minValue) minValue = maxValue / 2;
    
      const insertedColumn = addColumnToExistingGraph({
        type: 'small',
        operatorAddress,
        data: data,
        timestamp: null,
        index: i,
        currency: null,
        decimals: null,
        usd_exchange_rate: null,
        symbol: null,
        graphDataMapping,
        minValue,
        maxValue,
        graphWidth,
        dataFields: dataFields,
        colors: colors,
        by: null
      });
    
      if (
        insertedColumn.previousSibling &&
        insertedColumn.previousSibling.classList.contains('each-graph-column-wrapper')
      ) {
        adjustLineWidthAndAngle(insertedColumn.previousSibling, insertedColumn, operatorAddress, dataFields);
      } else {
        document.documentElement.style.setProperty(`--column-height-${operatorAddress}`, insertedColumn.offsetHeight);
      }
    }

    const graphColumns = graphWrapper.querySelectorAll('.each-graph-column-wrapper');
    const lastColumn = graphColumns[graphColumns.length - 1];
    lastColumn.classList.add('each-graph-column-wrapper-last');
  })
}
