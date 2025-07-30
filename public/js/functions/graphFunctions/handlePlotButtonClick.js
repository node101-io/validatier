
const suffixArray = ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th']

function changeSummaryGraph (target) {
  document.querySelectorAll('.each-sub-menu-link-content').forEach(eachLink => {
    eachLink.classList.remove('navbar-link-selected');
  });

  target.classList.add('navbar-link-selected');
  history.pushState({ page: 'dashboard' }, 'dashboard', `/${target.id != 'dashboard' ? target.id : ''}`);

  document.getElementById('all-validators-main-wrapper').classList.remove('section-hidden');
  document.getElementById('validators-leaderboards-all-wrapper').classList.remove('section-hidden');
  document.getElementById('network-summary-main-wrapper').classList.remove('section-hidden');
  document.getElementById('intro-main-wrapper').classList.remove('section-hidden');
  document.getElementById('validator-details-main-wrapper').classList.add('section-hidden');

  // const dataFields = JSON.parse(target.getAttribute('dataFields'));
  // const colors = JSON.parse(target.getAttribute('colors'));
  // const graphTitle = target.getAttribute('graph_title');
  // const graphDescription = target.getAttribute('graph_description');

  // if (!dataFields || !colors || !graphTitle || !graphDescription) return;

  // document.getElementById('summary-graph-title').innerHTML = graphTitle;
  // document.getElementById('summary-graph-description').innerHTML = graphDescription;
  
  // createNetworkSummaryGraph(dataFields, colors);

  const lastVisitedOperatorAddress = sessionStorage.getItem('last_visited_operator_address');
  if (!lastVisitedOperatorAddress) return;
  const headerHeight = getComputedStyle(document.documentElement)
      .getPropertyValue('--header-main-wrapper-height')
      .trim();


  const validatorFilterInput = document.getElementById('validator-filter-input');
  validatorFilterInput.value = '';
  
  document.getElementById('all-main-wrapper').scrollTo({
    top: document.getElementById(lastVisitedOperatorAddress).offsetTop + document.getElementById('all-validators-main-wrapper').offsetTop - parseInt(headerHeight),
    behavior: 'instant'
  })

  document.querySelectorAll('.each-validator-wrapper').forEach(each => {
    each.style.display = 'flex';
  });
}

function roundToFirstTwoDigits(number, method = 'floor') {
  if (number === 0) return 0;

  const isNegative = number < 0;
  number = Math.abs(number);

  const digits = Math.floor(Math.log10(number));
  const factor = Math.pow(10, digits);
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
  const rawMax = Math.max(...maxArray) * 1.1;

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
  { id: 'validator-stat-percentage-sold', field: 'percentage_sold', title: 'Percentage sold', usdContent: false, additional_class: 'summary-percentage-text-native', helperType: 'rank' },
  { id: 'validator-stat-self-stake', field: 'self_stake', title: 'Self Stake', usdContent: true, helperType: 'rank' },
  { id: 'validator-stat-commission-rate', title: 'Commission', field: 'commission_rate', usdContent: false, additional_class: 'summary-percentage-text-native', helperText: 'fee from rewards', helperType: 'text' }
];

function generateGraph (validator) {
  const selectedRange = document.getElementById('selected-range');

  const bannerTitle = document.getElementById('banner-title');

  const headerMainWrapper = document.getElementById('header-main-wrapper');
  const datePicker = document.getElementById('date-picker');
  const searchWrapper = document.querySelector('.search-wrapper');
  const innerMainWrapper = document.getElementById('inner-main-wrapper');
  
  searchWrapper.style.visibility = 'hidden';
  bannerTitle.style.color = 'var(--banner-title-content-color-main)';
  document.documentElement.style.setProperty('--banner-logo-color', 'rgba(37, 0, 84, 1)');
  document.documentElement.style.setProperty('--selected-range-logo-color', 'rgba(124, 112, 195, 1)');

  selectedRange.style.background = 'var(--selected-range-background)';
  selectedRange.style.backdropFilter = 'var(--selected-range-backdrop-filter)';
  selectedRange.style.border = 'var(--selected-range-border-size) solid var(--selected-range-border-color)';
  selectedRange.style.color = 'var(--selected-range-color)';

  headerMainWrapper.style.height = `75px`;
  headerMainWrapper.classList.add('header-main-wrapper-main');
  headerMainWrapper.style.background = 'var(--header-main-background)';

  const headerBannerWrapper = document.getElementById('header-banner-wrapper');
  headerBannerWrapper.style.height = 'var(--header-banner-wrapper-height)';
  headerBannerWrapper.style.marginLeft = 'var(--header-banner-wrapper-margin-left)';
  bannerTitle.style.marginTop = 'var(--banner-title-content-margin-top)';
  bannerTitle.style.fontSize = 'var(--banner-title-content-font-size)';
  datePicker.style.display = 'flex';
  innerMainWrapper.style.marginTop = '75px';

  if (typeof validator == 'string') validator = JSON.parse(validator);
  const summaryData = JSON.parse(document.body.getAttribute('summaryData'));
  const validators = JSON.parse(document.body.getAttribute('validators'));
  
  const operatorAddress = validator.operator_address;
  const pubkey = validator.pubkey;
  const chainIdentifier = validator.chain_identifier;

  const priceGraphData = JSON.parse(document.body.getAttribute('priceGraphData'));

  document.documentElement.style.setProperty(`--number-of-columns-${operatorAddress}`, 89);

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
      validatorDetailsImage.src = validator.temporary_image_uri || '/res/images/default_validator_photo.svg';
      if (!validator.temporary_image_uri)
        validatorDetailsImage.style.borderRadius = '0';
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
      document.getElementById(`${stat.id}-native`).innerHTML = '%' + (Math.round(shortNumberFormat(Math.min(Math.max(0.00, validator[stat.field]), 100)) * 100) / 100);
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
        const averageRank = Math.floor((ssRank + ssrRank) / 2);
        const suffix = suffixArray[parseInt(averageRank.toString()[averageRank.toString().length - 1])];
        
        document.getElementById(`${stat.id}-helper`).innerHTML = averageRank + `${suffix} out of ` + validators.length;
      } else {
        const rank = [...validators].sort((a, b) => a[stat.field] - b[stat.field]).findIndex(v => v.operator_address === validator.operator_address) + 1;
        const suffix = suffixArray[parseInt(rank.toString()[rank.toString().length - 1])];
        document.getElementById(`${stat.id}-helper`).innerHTML = (rank + `${suffix} out of ` + validators.length);
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
  const dataFields = ['price', 'total_sold', 'total_stake_sum'];
  const colors = ['rgba(50, 173, 230, 1)', 'rgba(88, 86, 214, 1)', 'rgba(255, 149, 0, 1)'];
    
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
    decimals: decimals,
    number_of_columns: priceGraphData.length
  };

  const graphWrapper = plotValidatorGraph({ type: 'validator', operatorAddress: operatorAddress.replace('@', '\\@'), decimals, usd_exchange_rate, symbol, validatorGraphEventListenersMapping, dataFields, graphContainer, summaryData });
  const graphWidth = window.getComputedStyle(graphWrapper, null).getPropertyValue('width').replace('px', '');

  const queryString = new URLSearchParams(requestData).toString();
  const eventSource = new EventSource(`/validator/get_graph_data?${queryString}`)

  const subplotGroupMapping = {
    number_of_groups: 3,
    total_stake_sum: 2,
    total_sold: 1,
    price: 0,
  };

  const subplotGroupArray = [
    ['price'],
    ['total_sold'],
    ['total_stake_sum']
  ];
  
  for (let i = 0; i < subplotGroupArray.length; i++) {
    const subplotSeperator = document.createElement('div');
    subplotSeperator.classList.add('subplot-seperator');
    subplotSeperator.style.zIndex = `${((subplotGroupArray.length - i + 1) * 10)}`;
    subplotSeperator.style.bottom = `calc(${(i / subplotGroupArray.length) * 100}% + ${(subplotGroupArray.length - i) * 10}px`;
    graphWrapper.appendChild(subplotSeperator);
  }

  let sumPrice = 0;
  let sumTotalStake = 0;
  let sumTotalSold = 0;
  let dataLength = 0;
  let inactivityIntervals = [];
  
  eventSource.onmessage = (event) => {
    const response = JSON.parse(event.data);
  
    if (!response.success || response.err) {
      eventSource.close();
      return;
    }
    const data = response.data;

    if (response.message == 'finished') {
      const averageMapping = {
        total_stake_sum: sumTotalStake / dataLength,
        price: sumPrice / dataLength,
        total_sold: sumTotalSold,
      }
      addColumnEventListener(operatorAddress.replace('@', '\\@'), dataFields, colors, symbol, usd_exchange_rate, decimals, summaryData, subplotGroupMapping, averageMapping);  
    
      document.querySelectorAll(`.column-wrapper-${operatorAddress}`).forEach(eachColumn => {
        const timestamp = eachColumn.getAttribute('timestamp');
        for (let i = 0; i < inactivityIntervals.length; i += 2) {
          if (
            inactivityIntervals[i] <= timestamp &&
            timestamp <= inactivityIntervals[i + 1]
          ) {
            eachColumn.classList.add('each-graph-column-wrapper-inactivity-indicator');
          }
        }
      });
      return;
    }

    if (response.isInactivityIntervals) {
      inactivityIntervals = response.data;
      return;
    }

    data.price = priceGraphData[data.index];
    graphDataMapping[data.index] = data;

    sumPrice += data.price;
    sumTotalStake += data.total_stake_sum;
    sumTotalSold = data.total_sold;
    dataLength++;

    dataFields.forEach(eachDataField => {
      const { nativeValue, usdValue } = getValueWithDecimals(data[eachDataField], eachDataField != 'percentage_sold' ? symbol : '%', usd_exchange_rate, decimals);
      const metric = document.getElementById(`validator-metric-${eachDataField}`);

      metric.querySelector('.each-metric-content-wrapper-content-value-native').innerHTML = eachDataField != 'price' ? nativeValue : '$' + data[eachDataField];
      if (eachDataField != 'price') metric.querySelector('.each-metric-content-wrapper-content-value-usd').innerHTML = usdValue;
    });

    const minValueArray = [];
    const maxValueArray = [];
    for (let i = 0; i < subplotGroupArray.length; i++) {
      const eachSubplotGroup = subplotGroupArray[i];

      let minValue;
      let maxValue;

      let { minValue: min, maxValue: max } = calculateMaxAndMinValue(graphDataMapping, eachSubplotGroup);
      
      // Değişmesi gerekirse buradan değiştir
      if (!['total_stake_sum', 'price'].includes(eachSubplotGroup[0])) minValue = min
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
      columnsPer: 18,
      subplotGroupMapping
    });
  
    if (
      insertedColumn.previousSibling &&
      insertedColumn.previousSibling.classList.contains('each-graph-column-wrapper')
    ) {
      adjustLineWidthAndAngle(insertedColumn.previousSibling, insertedColumn, operatorAddress.replace('@', '\\@'), dataFields, subplotGroupMapping);
    } else {
      document.documentElement.style.setProperty(`--column-height-${operatorAddress}`, insertedColumn.offsetHeight);
    }
  };
  

  eventSource.addEventListener('end', () => {
    eventSource.close();
  });

  eventSource.onerror = (err) => {
    eventSource.close()
  };
}

function handlePlotButtonClick () {

  document.body.addEventListener('click', async (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-leaderboard-table-validator-wrapper')) target = target.parentNode;
    if (!target.classList.contains('each-leaderboard-table-validator-wrapper')) return;

    document.getElementById(target.getAttribute('operator_address')).click();
  })

  document.body.addEventListener('click', async (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-validator-wrapper')) target = target.parentNode;
    if (!target.classList.contains('each-validator-wrapper')) return;

    const validator = JSON.parse(target.getAttribute('validator'));
    document.getElementById('network-summary-main-wrapper').classList.add('section-hidden');
    document.getElementById('all-validators-main-wrapper').classList.add('section-hidden');
    document.getElementById('validators-leaderboards-all-wrapper').classList.add('section-hidden');
    document.getElementById('intro-main-wrapper').classList.add('section-hidden');
    document.getElementById('validator-details-main-wrapper').classList.remove('section-hidden');

    history.pushState({ page: 'validator' }, 'validator', `/?validator=${validator.operator_address}`);
    sessionStorage.setItem('last_visited_operator_address', validator.operator_address);

    document.getElementById('all-main-wrapper').scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
    generateGraph(validator)
  });

  window.addEventListener('popstate', function(event) {
    const path = window.location.pathname.replace('/', '') || '';
    let target = document.body;
    if (path.includes('validator='))
      return document.getElementById(path.split('=')[1])?.click();
    return changeSummaryGraph(target);
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
