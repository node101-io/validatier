
function calculateMaxAndMinValue (graphDataMapping, dataFields) {
  const values = Object.values(graphDataMapping);

  const minArray = [];
  const maxArray = [];
  
  dataFields.forEach(eachDataField => {
    const min = Math.min(...values.map(item => item[eachDataField]));
    const max = Math.max(...values.map(item => item[eachDataField]));
    minArray.push(min);
    maxArray.push(max);
  })

  const minValue = Math.min(...minArray);
  const maxValue = Math.max(...maxArray);
  return { minValue, maxValue }
}

const validatorGraphEventListenersMapping = {};
const validatorListenerVariablesMapping = {}

const validator_stats = [
  { id: 'validator-details-moniker', field: 'moniker' },
  { id: 'validator-details-operator-address', field: 'operator_address' },
  { id: 'validator-details-image', field: 'temporary_image_uri' },
  { id: 'validator-stat-percentage-sold', field: 'percentage_sold', title: 'Percentage sold', usdContent: false, additional_class: 'summary-percentage-text-native', percentageChange: '17.3%', type: 'percentage' },
  { id: 'validator-stat-self-stake', field: 'self_stake', title: 'Self Stake Amount', usdContent: true },
  { id: 'validator-stat-self-stake-ratio', field: 'self_stake_ratio', title: 'Average Self Stake Ratio', usdContent: false, additional_class: 'summary-percentage-text-native', type: 'percentage' },
  { id: 'validator-stat-commission-rate', title: 'Commission', field: 'commission_rate', usdContent: false, helperText: 'fee from rewards', additional_class: 'summary-percentage-text-native' }
];

function generateGraph (validator) {
  if (typeof validator == 'string') validator = JSON.parse(validator);
  const operatorAddress = validator.operator_address;
  const pubkey = validator.pubkey;
  const chainIdentifier = validator.chain_identifier;

  document.documentElement.style.setProperty(`--number-of-columns-${operatorAddress}`, 50);

  const decimals = document.getElementById('network-switch-header').getAttribute('current_chain_decimals');
  const usd_exchange_rate = document.getElementById('network-switch-header').getAttribute('current_chain_usd_exhange_rate');
  const symbol = document.getElementById('network-switch-header').getAttribute('current_chain_symbol');
  const currency = 'native';

  validator_stats.forEach(stat => {
    if (stat.field == 'operator_address') {
      const validatorOperatorAddressContent = document.getElementById('validator-details-operator-address');
      validatorOperatorAddressContent.setAttribute('operator_address', validator[stat.field]);

      validatorOperatorAddressContent.children[0].innerHTML = validator.operator_address.slice(0,4);
      validatorOperatorAddressContent.children[1].children[0].innerHTML = validator.operator_address.slice(4, (validator.operator_address.length - 4) / 2);
      validatorOperatorAddressContent.children[1].children[2].innerHTML = validator.operator_address.slice((validator.operator_address.length - 4) / 2, validator.operator_address.length - 4);
      validatorOperatorAddressContent.children[2].innerHTML = validator.operator_address.slice(validator.operator_address.length - 4, validator.operator_address.length);
      return;
    } else if (stat.field == 'moniker') {
      const validatorDetailsMoniker = document.getElementById(stat.id);
      validatorDetailsMoniker.innerHTML = validator[stat.field];
      return;
    } else if (stat.field == 'temporary_image_uri') {
      const validatorDetailsImage = document.getElementById(stat.id);
      validatorDetailsImage.src = validator.temporary_image_uri || '/res/images/default_validator_photo.png';
      return;
    }
    document.getElementById(`${stat.id}-native`).innerHTML = stat.field == 'commission_rate'
      ? (formatCommission(validator[stat.field]))
      : stat.type == 'percentage' ? '%' + (shortNumberFormat(validator[stat.field])) : getValue(validator[stat.field], symbol);
    if (stat.usdContent) document.getElementById(`${stat.id}-usd`).innerHTML = getValue(validator[stat.field], 'usd');
  });
  

  const bottomDate = document.getElementById('periodic-query-bottom-timestamp').value;
  const topDate = document.getElementById('periodic-query-top-timestamp').value
  const bottomTimestamp = Math.floor(new Date(bottomDate).getTime());
  const topTimestamp = Math.floor(new Date(topDate).getTime());   
  
  validatorListenerVariablesMapping[operatorAddress] = {
    isSelectingRange: false,
    rangeInitialColumn: '',
    rangeFinalColumn: '',
    isSelectionDirectionToLeft: false
  }
  
  const graphDataMapping = {};
  const dataFields = ['total_stake', 'total_withdraw', 'total_sold'];
  const colors = ['rgba(255, 149, 0, 1)', 'rgba(50, 173, 230, 1)', 'rgba(88, 86, 214, 1)'];
    
  const graphContainer = document.getElementById('validator-graph-container');
  graphContainer.innerHTML = '';

  const requestData = {
    chain_identifier: chainIdentifier,
    operator_address: operatorAddress,
    pubkey: pubkey,
    bottom_timestamp: bottomTimestamp,
    top_timestamp: topTimestamp,
    decimals: decimals
  };

  const graphWrapper = plotValidatorGraph({ operatorAddress: operatorAddress.replace('@', '\\@'), graphDataMapping, currency, decimals, usd_exchange_rate, symbol, validatorGraphEventListenersMapping, dataFields, colors, graphContainer });
  const graphWidth = window.getComputedStyle(graphWrapper, null).getPropertyValue("width").replace('px', '');

  const queryString = new URLSearchParams(requestData).toString();
  const eventSource = new EventSource(`/validator/get_graph_data?${queryString}`)
  
  eventSource.onmessage = (event) => {
    const response = JSON.parse(event.data);
  
    if (!response.success || response.err) {
      eventSource.close();
      return;
    }    
    const data = response.data;
    
    if (response.isInactivityIntervals) {
      for (let j = 0; j < response.data.length; j += 2) {
        
        const inactivityDisplayBackgroundArea = document.createElement('div');
        inactivityDisplayBackgroundArea.classList.add('inactivity-display-background-area');

        const start = response.data[j];
        const end = response.data[j + 1] ?? topTimestamp;

        const left = ((start - bottomTimestamp) / (topTimestamp - bottomTimestamp)) * 100;
        const width = ((end - start) / (topTimestamp - bottomTimestamp) * 100);

        inactivityDisplayBackgroundArea.style.left = `calc(${left}% + var(--vertical-axis-labels-width))`;
        inactivityDisplayBackgroundArea.style.width = `calc(${width}% - var(--vertical-axis-labels-width))`;
        graphWrapper.insertBefore(inactivityDisplayBackgroundArea, graphWrapper.children[0]);
      }
      
      return;
    }
    graphDataMapping[data.index] = data;
  
    let { minValue, maxValue } = calculateMaxAndMinValue(graphDataMapping, dataFields);
  
    document.documentElement.style.setProperty(`--min-value-${operatorAddress}`, minValue);
    document.documentElement.style.setProperty(`--max-value-${operatorAddress}`, maxValue);
  
    if (maxValue == minValue) minValue = maxValue / 2;
  
    const insertedColumn = addColumnToExistingGraph({
      operatorAddress: operatorAddress.replace('@', '\\@'),
      data: data,
      timestamp: data.timestamp,
      index: data.index,
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
      adjustLineWidthAndAngle(insertedColumn.previousSibling, insertedColumn, operatorAddress.replace('@', '\\@'), dataFields);
    } else {
      document.documentElement.style.setProperty('--column-height', insertedColumn.offsetHeight);
      addColumnEventListener(operatorAddress.replace('@', '\\@'), dataFields, colors);
    }
  };
  

  eventSource.addEventListener('end', () => {
    eventSource.close();
  });

  eventSource.onerror = (err) => eventSource.close();

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
        if (!columnWrapper) return;
        
        document.documentElement.style.setProperty(
          `--graph-column-width-${operatorAddress}`, 
          columnWrapper.getBoundingClientRect().width
        );
      }
      isResizing = false;
    }, 10);
  }
}

function handlePlotButtonClick () {

  document.body.addEventListener('click', async (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-validator-wrapper')) target = target.parentNode;
    if (!target.classList.contains('each-validator-wrapper')) return;

    const validator = JSON.parse(target.getAttribute('validator'));
    document.getElementById('network-summary-main-wrapper').classList.add('section-hidden');
    document.getElementById('validator-details-main-wrapper').classList.remove('section-hidden');
    document.getElementById('all-main-wrapper').scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
    history.pushState(null, '', `/?validator=${validator.operator_address}`);
    generateGraph(validator)
  });
}
