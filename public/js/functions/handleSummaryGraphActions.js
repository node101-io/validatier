
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
    
    if (!networkSwitchDropdown.classList.contains(openContentClassName)) {
      target.parentNode.querySelectorAll('.' + dropdownArrowClassName).forEach(each => {
        each.style.transform = 'rotateX(180deg)';
        each.style.marginTop = '-8px';
      });
      target.parentNode.querySelectorAll('.' + contentClassName).forEach(each => 
        each.classList.add(openContentClassName));
    }
    else {
      target.parentNode.querySelectorAll('.' + dropdownArrowClassName).forEach(each => {
        each.style.transform = 'rotateX(0deg)';
        each.style.marginTop = '2px';
      });
      target.parentNode.querySelectorAll('.' + contentClassName).forEach(each => 
        each.classList.remove(openContentClassName));
    };
  })
}

function createNetworkSummaryGraph () {
  const cacheSummaryGraphDataMapping = JSON.parse(document.body.getAttribute('cacheSummaryGraphDataMapping'));

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

  const targetCacheSummaryGraphData = cacheSummaryGraphDataMapping['all_time']['m'];
  document.documentElement.style.setProperty('--number-of-columns-summary', targetCacheSummaryGraphData.length);

  const dataFields = ['self_stake_sum', 'reward_sum', 'commission_sum'];
  const colors = ['rgba(255, 149, 0, 1)', 'rgba(50, 173, 230, 1)', 'rgba(88, 86, 214, 1)'];
  const graphDataMapping = {};
  const graphContainer = document.getElementById('network-summary-graph-container');
  const graphWrapper = plotValidatorGraph({ operatorAddress: 'summary', graphDataMapping, currency, decimals, usd_exchange_rate, symbol, validatorGraphEventListenersMapping, dataFields, colors, graphContainer });
  const graphWidth = window.getComputedStyle(graphWrapper, null).getPropertyValue("width").replace('px', '');

  const currentSumMapping = {
    self_stake_sum: 0,
    reward_sum: 0,
    commission_sum: 0,
  };

  for (let i = 0; i < targetCacheSummaryGraphData.length; i++) {
    const data = targetCacheSummaryGraphData[i];
    
    dataFields.forEach(eachDataField => {
      data[eachDataField] += currentSumMapping[eachDataField];
      currentSumMapping[eachDataField] = data[eachDataField];
    });
    
    graphDataMapping[i] = data;

    const timestamp = (new Date(data._id.year, (data._id.month || 1) - 1, (data._id.day || 1))).getTime()
  
    let { minValue, maxValue } = calculateMaxAndMinValue(graphDataMapping, dataFields);
  
    document.documentElement.style.setProperty(`--min-value-summary`, minValue);
    document.documentElement.style.setProperty(`--max-value-summary`, maxValue);
  
    if (maxValue == minValue) minValue = maxValue / 2;
  
    const insertedColumn = addColumnToExistingGraph({
      operatorAddress: 'summary',
      data: data,
      timestamp: timestamp,
      index: i,
      currency: currency,
      decimals: decimals,
      usd_exchange_rate: usd_exchange_rate,
      symbol: symbol,
      graphDataMapping,
      minValue,
      maxValue,
      graphWidth,
      dataFields: dataFields,
      colors: colors
    });
  
    if (
      insertedColumn.previousSibling &&
      insertedColumn.previousSibling.classList.contains('each-graph-column-wrapper')
    ) {
      adjustLineWidthAndAngle(insertedColumn.previousSibling, insertedColumn, 'summary', dataFields);
    } else {
      document.documentElement.style.setProperty('--column-height', insertedColumn.offsetHeight);
      addColumnEventListener('summary', dataFields, colors);
    }
  }
}
