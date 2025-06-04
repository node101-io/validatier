function roundToFirstTwoDigits(number, method = 'floor') {
  if (number === 0) return 0;

  const isNegative = number < 0;
  number = Math.abs(number);

  const digits = Math.floor(Math.log10(number));
  const factor = Math.pow(10, digits - 1);
  const twoDigits = number / factor;

  let roundedTwoDigits;
  if (method === 'floor') {
    roundedTwoDigits = Math.floor(twoDigits);
  } else if (method === 'ceil') {
    roundedTwoDigits = Math.ceil(twoDigits);
  } else {
    roundedTwoDigits = Math.round(twoDigits);
  }

  const rounded = roundedTwoDigits * factor;
  return isNegative ? -rounded : rounded;
}

function calculateMaxAndMinValue(graphDataMapping, dataFields) {
  const values = Object.values(graphDataMapping);

  const minArray = [];
  const maxArray = [];

  dataFields.forEach(eachDataField => {
    const min = Math.min(...values.map(item => item[eachDataField]));
    const max = Math.max(...values.map(item => item[eachDataField]));
    minArray.push(min);
    maxArray.push(max);
  });

  const rawMin = Math.min(...minArray);
  const rawMax = Math.max(...maxArray);

  return {
    minValue: roundToFirstTwoDigits(rawMin, rawMin <= 0 ? 'ceil' : 'floor'),
    maxValue: roundToFirstTwoDigits(rawMax, 'ceil'),
  };
}

const validatorGraphEventListenersMapping = {};
const validatorListenerVariablesMapping = {}

const validator_stats = [
  { id: 'validator-details-moniker', field: 'moniker' },
  { id: 'validator-details-operator-address', field: 'operator_address' },
  { id: 'validator-details-image', field: 'temporary_image_uri' },
  { id: 'validator-stat-percentage-sold', field: 'percentage_sold', title: 'Percentage sold', usdContent: false, additional_class: 'summary-percentage-text-native', type: 'percentage', helperType: 'percentage_change' },
  { id: 'validator-stat-self-stake', field: 'self_stake', title: 'Self Stake Amount', usdContent: true, helperType: 'rank' },
  { id: 'validator-stat-commission-rate', title: 'Commission', field: 'commission_rate', usdContent: false, additional_class: 'summary-percentage-text-native', helperType: 'text', helperText: 'fee from rewards' }
];

function generateGraph (validator) {
  if (typeof validator == 'string') validator = JSON.parse(validator);
  const summaryData = JSON.parse(document.body.getAttribute('summaryData'));
  const validators = JSON.parse(document.body.getAttribute('validators'));
  
  const operatorAddress = validator.operator_address;
  const pubkey = validator.pubkey;
  const chainIdentifier = validator.chain_identifier;

  document.documentElement.style.setProperty(`--number-of-columns-${operatorAddress}`, 49);

  const decimals = document.getElementById('network-switch-header').getAttribute('current_chain_decimals');
  const usd_exchange_rate = document.getElementById('network-switch-header').getAttribute('current_chain_usd_exhange_rate');
  const symbol = document.getElementById('network-switch-header').getAttribute('current_chain_symbol');
  const chainId = document.getElementById('network-switch-header').getAttribute('current_chain_id');
  const currency = 'native';

  document.getElementById('validator-details-website').href = `${validator.website || ''}`;
  document.getElementById('validator-details-explorer').href = `https://www.mintscan.io/cosmos/validators/${validator.operator_address || ''}`;
  document.getElementById('validator-details-stake').href = `https://wallet.keplr.app/chains/${chainIdentifier == 'cosmoshub' ? 'cosmos-hub' : chainIdentifier}?modal=validator&chain=${chainId}&validator_address=${validator.operator_address || ''}`;
  
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

    const { nativeValue, usdValue } = getValueWithDecimals(validator[stat.field], symbol, usd_exchange_rate, decimals)

    if (stat.field == 'commission_rate') {
      document.getElementById(`${stat.id}-native`).innerHTML = formatCommission(validator[stat.field]);
    } else if (stat.field == 'self_stake') {
      const wrapper = document.getElementById(`${stat.id}-native`);
      wrapper.children[0].innerHTML = nativeValue;
      wrapper.children[1].innerHTML = '%' + (shortNumberFormat(validator['self_stake_ratio']));
    } else {
      document.getElementById(`${stat.id}-native`).innerHTML = '%' + (shortNumberFormat(validator[stat.field]));
    }

    if (stat.usdContent) 
      document.getElementById(`${stat.id}-usd`).innerHTML = usdValue;

    if (stat.helperType == 'text')
     document.getElementById(`${stat.id}-helper`).innerHTML = stat.helperText;
    else if (stat.helperType == 'percentage_change')
      document.getElementById(`${stat.id}-helper`).innerHTML = '→' + Math.round((validator[stat.field] / summaryData[`initial_${stat.field}`]) * 100) + '%';
    else if (stat.helperType == 'rank') {
      if (stat.field == 'self_stake') {
        const ssRank = ([...validators].sort((a, b) => b['self_stake'] - a['self_stake']).findIndex(v => v.operator_address === validator.operator_address) + 1);
        const ssrRank = ([...validators].sort((a, b) => b['self_stake_ratio'] - a['self_stake_ratio']).findIndex(v => v.operator_address === validator.operator_address) + 1);
        document.getElementById(`${stat.id}-helper`).innerHTML = (Math.floor((ssRank + ssrRank) / 2)) + '/' + validators.length;
      } else {
        document.getElementById(`${stat.id}-helper`).innerHTML = ([...validators].sort((a, b) => b[stat.field] - a[stat.field]).findIndex(v => v.operator_address === validator.operator_address) + 1) + '/' + validators.length;
      }
    }
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
  const dataFields = ['total_stake_sum', 'total_withdraw_sum', 'total_sold'];
  const colors = ['rgba(255, 149, 0, 1)', 'rgba(50, 173, 230, 1)', 'rgba(88, 86, 214, 1)'];
    
  dataFields.forEach(eachDataField => {
    const metric = document.getElementById(`validator-metric-${eachDataField}`);
    metric.classList.remove('section-hidden');
  })

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

  const graphWrapper = plotValidatorGraph({ type: 'validator', operatorAddress: operatorAddress.replace('@', '\\@'), decimals, usd_exchange_rate, symbol, validatorGraphEventListenersMapping, dataFields, graphContainer, summaryData });
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

    dataFields.forEach(eachDataField => {
      const { nativeValue, usdValue } = getValueWithDecimals(data[eachDataField], eachDataField != 'percentage_sold' ? symbol : '%', usd_exchange_rate, decimals);
      const metric = document.getElementById(`validator-metric-${eachDataField}`);
      
      metric.querySelector('.each-metric-content-wrapper-content-value-native').innerHTML = eachDataField != 'price' ? nativeValue : '$' + data[eachDataField].toFixed(2);
      if (eachDataField != 'price') metric.querySelector('.each-metric-content-wrapper-content-value-usd').innerHTML = usdValue;
    });

    const subplotGroupMapping = {
      number_of_groups: 2,
      total_stake_sum: 0,
      total_withdraw_sum: 1,
      total_sold: 1,
    };

    const subplotGroupArray = [
      ['total_withdraw_sum', 'total_sold'],
      ['total_stake_sum']
    ];

    
    const minValueArray = [];
    const maxValueArray = [];
    for (let i = 0; i < subplotGroupArray.length; i++) {
      const eachSubplotGroup = subplotGroupArray[i];

      let minValue;
      let maxValue;

      let { minValue: min, maxValue: max } = calculateMaxAndMinValue(graphDataMapping, eachSubplotGroup);
      
      if (eachSubplotGroup[0] != 'total_stake_sum') minValue = min
      else minValue = 0;
      maxValue = max;

      minValueArray.push(minValue);
      maxValueArray.push(maxValue);
      
      document.documentElement.style.setProperty(`--min-value-${operatorAddress}-${i}`, minValue);
      document.documentElement.style.setProperty(`--max-value-${operatorAddress}-${i}`, maxValue);
    }
  
    const insertedColumn = addColumnToExistingGraph({
      type: 'validator',
      operatorAddress: operatorAddress.replace('@', '\\@'),
      data: data,
      timestamp: data.timestamp,
      index: data.index,
      currency: currency,
      decimals: decimals,
      usd_exchange_rate: usd_exchange_rate,
      symbol: symbol,
      minValue: minValueArray,
      maxValue: maxValueArray,
      graphWidth,
      dataFields: dataFields,
      colors: colors,
      columnsPer: 10,
      subplotGroupMapping
    });
  
    if (
      insertedColumn.previousSibling &&
      insertedColumn.previousSibling.classList.contains('each-graph-column-wrapper')
    ) {
      adjustLineWidthAndAngle(insertedColumn.previousSibling, insertedColumn, operatorAddress.replace('@', '\\@'), dataFields, subplotGroupMapping);
    } else {
      document.documentElement.style.setProperty(`--column-height-${operatorAddress}`, insertedColumn.offsetHeight);
      addColumnEventListener(operatorAddress.replace('@', '\\@'), dataFields, colors, symbol, usd_exchange_rate, decimals, summaryData, subplotGroupMapping);
    }
  };
  

  eventSource.addEventListener('end', () => {
    eventSource.close();
  });

  eventSource.onerror = (err) => eventSource.close();
}

function handlePlotButtonClick () {

  document.body.addEventListener('click', async (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-validator-wrapper')) target = target.parentNode;
    if (!target.classList.contains('each-validator-wrapper')) return;

    const validator = JSON.parse(target.getAttribute('validator'));
    document.getElementById('network-summary-main-wrapper').classList.add('section-hidden');
    document.getElementById('all-validators-main-wrapper').classList.add('section-hidden');
    document.getElementById('validators-leaderboards-all-wrapper').classList.add('section-hidden');
    document.getElementById('validator-details-main-wrapper').classList.remove('section-hidden');

    document.getElementById('inner-main-wrapper').scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
    history.pushState(null, '', `/?validator=${validator.operator_address}`);
    generateGraph(validator)
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
        const graphWidth = eachGraphWrapper.parentNode.offsetWidth;
  
        document.documentElement.style.setProperty(
          `--graph-column-width-px-${operatorAddress.replace('\\@', '@')}`,
          `calc((${graphWidth - 10}px - var(--vertical-axis-labels-width)) / var(--number-of-columns-${operatorAddress}))`
        );
        document.documentElement.style.setProperty(
          `--graph-column-width-${operatorAddress.replace('\\@', '@')}`, 
          `calc((${graphWidth - 10} - var(--vertical-axis-labels-width-int)) / var(--number-of-columns-${operatorAddress}))`
        );
      }
      isResizing = false;
    }, 10);
  }
}
