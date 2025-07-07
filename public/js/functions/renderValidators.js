function shortNumberFormat(num) {
  const sign = num < 0 ? '-' : '';
  num = Math.abs(num);
  if (num >= 1000000) return sign + (num / 1000000).toFixed(1) + 'M';
  if (num >= 10000) return sign + Math.floor(num / 1000) + 'K';
  if (num >= 1000) return sign + num.toFixed(0).toString();
  if (num >= 100) return sign + num.toFixed(1).toString();
  if (num >= 0) return sign + num.toFixed(2).toString();
  return sign + num.toString();
}

function formatCommission(value) {
  if (value.includes('.')) return `${(parseFloat(value) * 100)}%`;
  return `${parseFloat(value / 1e16)}%`;
}

function getScoreColor (value) {
  if (value < 25) return { color: 'rgba(19, 167, 25, 1)', check: true };
  else if (value < 50) return { color: 'rgba(255, 111, 67, 1)', check: false };
  return { color: 'rgba(184, 34, 0, 1)', check: false };
}

function getValueWithDecimals(value, currency, exhange_rate, decimals) {
  const exchangeRate = exhange_rate || 0;
  const normalized = value / (10 ** decimals);
  return {
    nativeValue: currency != '%' ? `${shortNumberFormat(normalized)} ${currency}` : `${Math.round(value)}%`,
    usdValue: currency != '%' ? `$${shortNumberFormat(normalized * exchangeRate)}` : null
  };
}

function generateValidatorRankingContent(response, sort_by, sortOrderMapping) {
  if (response.err || !response.success) return;

  const data = response.data.validators;
  const mainWrapper = document.getElementById('validators-main-wrapper');
  mainWrapper.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.classList.add('validator-table-content')

  // renderTableHeader(sort_by, sortOrderMapping[sort_by]);

  const infoColumn = document.createElement('div');
  infoColumn.classList.add('validators-info-column');

  const infoTableHeader = document.createElement('div');
  infoTableHeader.classList.add('validator-table-header');
  
  const infoTableHeaderWrapper = document.createElement('div');
  infoTableHeaderWrapper.classList.add('each-table-header-wrapper', 'each-table-header-validator-info-header');
  
  const infoHeaderTitle = document.createElement('div');
  infoHeaderTitle.classList.add('each-table-header-title');
  infoHeaderTitle.innerHTML = 'Validators';

  infoTableHeaderWrapper.appendChild(infoHeaderTitle);
  infoTableHeader.appendChild(infoTableHeaderWrapper);
  infoColumn.appendChild(infoTableHeader)

  const dataColumn = document.createElement('div');
  dataColumn.classList.add('validators-data-column');

  const headers_array = [
    { name: 'Percentage Sold', id: 'percentage_sold', popup_text: '(Withdraw - Self Stake) / Withdraw' },
    { name: 'Avg Delegation', id: 'average_total_stake' },
    { name: 'Total Rewards', id: 'total_withdraw' },
    { name: 'Total Sold Amount', id: 'sold', popup_text: 'Total withdraw - Self stake' },
    { name: 'Self Stake', id: 'self_stake', popup_text: 'Validator\'s own stake on itself' },
  ];

  const exchangeRate = document.getElementById('network-switch-header').getAttribute('current_chain_usd_exhange_rate');
  const currentChainSymbol = document.getElementById('network-switch-header').getAttribute('current_chain_symbol');
  const currentChainDecimals = document.getElementById('network-switch-header').getAttribute('current_chain_decimals');

  const createPercentageSoldTd = (value) => {
    const td = document.createElement('div');
    const { color, check } = getScoreColor(value)
    td.classList.add('validator-each-numeric-info', 'validator-percentage-sold');
    td.style.color = color;

    const span = document.createElement('span');
    span.innerHTML = value <= 100 ? `%${shortNumberFormat(Math.max(value, 0))}` : `%100.0`;
    td.appendChild(span);

    if (check) {
      const checkImgContent = document.createElement('img');
      checkImgContent.classList.add('center');
      checkImgContent.src = '/res/images/check_green.svg';
      td.appendChild(checkImgContent);
    }
    return td;
  };

  const createCurrencyTd = (value) => {
    const td = document.createElement('div');
    td.classList.add('validator-each-numeric-info');
    const { nativeValue, usdValue } = getValueWithDecimals(value, currentChainSymbol, exchangeRate, currentChainDecimals);

    const nativeContentDiv = document.createElement('div');
    nativeContentDiv.classList.add('validator-each-numeric-info-native');
    nativeContentDiv.innerHTML = nativeValue;

    const usdContentDiv = document.createElement('div');
    usdContentDiv.classList.add('validator-each-numeric-info-usd');
    usdContentDiv.innerHTML = usdValue;

    td.appendChild(nativeContentDiv);
    td.appendChild(usdContentDiv);
    return td;
  };

  const tableHeader = document.createElement('div');
  tableHeader.classList.add('validator-table-header');

  for (const header of headers_array) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('each-table-header-wrapper', 'each-table-header-hover');
    wrapper.id = header.id;

    const titleContainer = document.createElement('div');
    titleContainer.classList.add('each-table-header-title');

    if (header.popup_text) {
      const popupWrapper = document.createElement('div');
      popupWrapper.classList.add('each-table-popup-wrapper');

      const popupContent = document.createElement('div');
      popupContent.classList.add('each-table-popup-info-content', 'center');
      const popupText = document.createElement('span');
      popupText.innerHTML = header.popup_text;
      popupContent.appendChild(popupText);

      const infoHover = document.createElement('div');
      infoHover.classList.add('each-tooltip-info-hover');
      infoHover.style.marginBottom = '-1px';

      const infoImg = document.createElement('img');
      infoImg.src = '/res/images/info.svg';
      infoHover.appendChild(infoImg);

      popupWrapper.appendChild(popupContent);
      popupWrapper.appendChild(infoHover);
      titleContainer.appendChild(popupWrapper);
    }

    const headerTitle = document.createElement('div');
    headerTitle.classList.add('each-table-header-title');
    headerTitle.innerHTML = header.name;
    titleContainer.appendChild(headerTitle);

    const sortIndicators = document.createElement('div');
    sortIndicators.classList.add('each-table-header-sort-indicators');

    const triangleUp = document.createElement('div');
    triangleUp.classList.add('triangle-up');
    const triangleDown = document.createElement('div');
    triangleDown.classList.add('triangle-down');

    header.id == sort_by 
      ? sortOrderMapping[sort_by] == 'desc' 
        ? triangleDown.style.borderTopColor = 'rgb(22, 22, 22)' 
        : triangleUp.style.borderBottomColor = 'rgb(22, 22, 22)'
      : '';

    sortIndicators.appendChild(triangleUp);
    sortIndicators.appendChild(triangleDown);

    wrapper.appendChild(titleContainer);
    wrapper.appendChild(sortIndicators);
    tableHeader.appendChild(wrapper);
  }

  dataColumn.appendChild(tableHeader);

  for (let i = 0; i < data.length; i++) {
    const validator = data[i];

    // === Info Column Cell ===
    const infoWrapper = document.createElement('div');
    infoWrapper.classList.add('each-validator-wrapper');
    infoWrapper.id = `${validator.operator_address}-info`;

    const tdInfo = document.createElement('div');
    tdInfo.classList.add('each-validator-info-wrapper');

    const validatorImageDiv = document.createElement('div');
    validatorImageDiv.classList.add('validator-image');

    const rankingDiv = document.createElement('div');
    rankingDiv.classList.add('ranking-number-content', 'center');
    const rankingDivSpan = document.createElement('span');
    rankingDivSpan.textContent = i + 1;
    rankingDiv.appendChild(rankingDivSpan);
    validatorImageDiv.appendChild(rankingDiv);

    const img = document.createElement('img');
    img.classList.add('validator-image-content');
    img.src = validator.temporary_image_uri || '/res/images/default_validator_photo.svg';
    if (!validator.temporary_image_uri)
      img.style.borderRadius = '0';
    validatorImageDiv.appendChild(img);

    const textualInfoWrapper = document.createElement('div');
    textualInfoWrapper.classList.add('validator-textual-info-wrapper');

    const monikerDiv = document.createElement('div');
    monikerDiv.classList.add('validator-moniker');

    const monikerTextContent = document.createElement('div');
    monikerTextContent.classList.add('validator-moniker-text-content');

    const monikerTextSpan = document.createElement('span');
    monikerTextSpan.classList.add('validator-moniker-text');
    monikerTextSpan.innerHTML = validator.moniker;
    monikerTextContent.appendChild(monikerTextSpan);
    monikerDiv.appendChild(monikerTextContent);

    if (validator.inactivityIntervals?.length > 0) {
      const inactivityDiv = document.createElement('div');
      inactivityDiv.classList.add('validator-inactivity-display', 'center');
      inactivityDiv.setAttribute('value', `${validator.inactivityIntervals}`);
      const warningImg = document.createElement('img');
      warningImg.src = '/res/images/warning.svg';
      inactivityDiv.appendChild(warningImg);
      monikerDiv.appendChild(inactivityDiv);
    }

    textualInfoWrapper.appendChild(monikerDiv);
    tdInfo.appendChild(validatorImageDiv);
    tdInfo.appendChild(textualInfoWrapper);
    infoWrapper.appendChild(tdInfo);

    // Metadata
    infoWrapper.setAttribute('validator', JSON.stringify(validator));
    infoWrapper.setAttribute('pubkey', validator.pubkey);
    infoWrapper.setAttribute('chain_identifier', validator.chain_identifier);
    infoWrapper.classList.add('operator-address');

    infoColumn.appendChild(infoWrapper);

    // === Data Column Cell ===
    const dataWrapper = document.createElement('div');
    dataWrapper.classList.add('each-validator-wrapper');
    dataWrapper.id = validator.operator_address;

    dataWrapper.setAttribute('validator', JSON.stringify(validator));
    dataWrapper.setAttribute('pubkey', validator.pubkey);
    dataWrapper.setAttribute('chain_identifier', validator.chain_identifier);
    dataWrapper.classList.add('operator-address');

    for (const header of headers_array) {
      let td;
      if (header.id === 'percentage_sold') {
        td = createPercentageSoldTd(validator.percentage_sold);
      } else {
        const value = header.id === 'sold' ? Math.max(0, validator[header.id]) : validator[header.id];
        td = createCurrencyTd(value);
      }
      dataWrapper.appendChild(td);
    }

    dataColumn.appendChild(dataWrapper);
  }

  wrapper.appendChild(infoColumn);
  wrapper.appendChild(dataColumn);

  mainWrapper.appendChild(wrapper)
}



function renderValidators() {

  const sortOrderMapping = {
    percentage_sold: 'desc',
    average_total_stake: 'asc',
    total_withdraw: 'asc',
    sold: 'asc',
    self_stake: 'asc',
  };

  document.addEventListener('click', (event) => {
    const isHeaderClickedChecker = event.target.classList.contains('each-table-header-wrapper') || event.target.parentNode.classList.contains('each-table-header-wrapper') || event.target.parentNode.parentNode.classList.contains('each-table-header-wrapper');
    if (!isHeaderClickedChecker) return;

    document.getElementById('selected-range').classList.remove('selected-range-open');
    document.getElementById('picker-main-wrapper').classList.remove('picker-main-wrapper-open');
    
    let target = event.target;
    while (isHeaderClickedChecker && !target.classList.contains('each-table-header-wrapper')) target = target.parentNode;

    const sort_by = target.id;

    sortOrderMapping[sort_by] == 'desc'
      ? target.id 
        ? sortOrderMapping[sort_by] = 'asc' 
        : 'desc'
      : sortOrderMapping[sort_by] = 'desc';
    
    const validatorsMainWrapper = document.getElementById('validators-main-wrapper');
    validatorsMainWrapper.setAttribute('sort_by', sort_by);
    validatorsMainWrapper.setAttribute('order', sortOrderMapping[sort_by]);

    const bottomDate = document.getElementById('periodic-query-bottom-timestamp').value;
    const topDate = document.getElementById('periodic-query-top-timestamp').value

    if (!bottomDate || !topDate) return;

    setCookie('selectedDateBottom', bottomDate, 7);
    setCookie('selectedDateTop', topDate, 7);

    const bottomTimestamp = Math.floor(new Date(bottomDate).getTime());
    const topTimestamp = Math.floor(new Date(topDate).getTime());

    const chainIdentifier = document.getElementById('network-switch-header').getAttribute('current_chain_identifier');

    const cacheResponse = rankingResponsesCache[bottomTimestamp + '.' + topTimestamp + '.' + chainIdentifier];

    document.getElementById('validators-main-wrapper').setAttribute('sort_by', sort_by);
    document.getElementById('validators-main-wrapper').setAttribute('order', sortOrderMapping[sort_by]);

    if (cacheResponse) {
      sortOrderMapping[sort_by] == 'desc'
        ? cacheResponse.data.validators.sort((a, b) => (b[sort_by] || 0) - (a[sort_by] || 0))
        : cacheResponse.data.validators.sort((a, b) => (a[sort_by] || 0) - (b[sort_by] || 0))

      return generateValidatorRankingContent(cacheResponse, sort_by, sortOrderMapping)
    };
    window.location.reload();
  })


  document.body.addEventListener('click', (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('validator-operator-address')) target = target.parentNode;
    if (!target.classList.contains('validator-operator-address')) return;

    navigator.clipboard.writeText(target.children[0].getAttribute('operator_address'));
    target.children[0].children[3].children[0].src = '/res/images/check.svg';
    setTimeout(() => {
      target.children[0].children[3].children[0].src = '/res/images/clipboard.svg';
    }, 1000);
  })

  document.addEventListener('mouseover', (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-validator-wrapper')) target = target.parentNode;
    if (!target.classList.contains('each-validator-wrapper')) return;
    
    document.querySelectorAll('.validator-moniker-text').forEach(each => {
      if (each.innerHTML == target.querySelector('.validator-moniker-text').innerHTML) return;
      each.style.animation = 'none';
      each.style.position = 'inline-block';
    })

    const monikerWrapper = target.children[0].children[1].children[0];
    animateOverflowMonikers(monikerWrapper);
  })

  // document.addEventListener('click', (event) => {
  //   let target = event.target;
  //   while (target != document.body && !target.classList.contains('leaderboard-dropdown-option')) target = target.parentNode;
  //   if (!target.classList.contains('leaderboard-dropdown-option') || target.classList.contains('dropdown-option-selected') || target.classList.contains('leaderboard-dropdown-title')) return;

  //   target.parentNode.querySelectorAll('.leaderboard-dropdown-option').forEach(each => {
  //     each.classList.remove('dropdown-option-selected');
  //   });
  //   target.classList.add('dropdown-option-selected');

  //   const sortBy = target.getAttribute('leaderboard_sort_by');
  //   const leaderboardContent = document.getElementById(`leaderboard-content-${sortBy}`);
    
  //   leaderboardContent.parentNode.querySelectorAll('.each-leaderboard-table-wrapper').forEach(each => {
  //     each.classList.add('section-hidden');
  //   });
  //   leaderboardContent.classList.remove('section-hidden');
  // })


  const leaderboardSortOrderMapping = {
    percentage_sold: 'asc',
    sold: 'asc'
  }

  document.addEventListener('click', (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-leaderboard-table-type-content')) target = target.parentNode;
    if (!target.classList.contains('each-leaderboard-table-type-content')) return;

    const type = target.getAttribute('type');
    const leaderboardTables = target.parentNode.parentNode.querySelectorAll('.each-leaderboard-table-wrapper');

    leaderboardTables.forEach(eachLeaderboardTable => {
      if (eachLeaderboardTable.id.includes(leaderboardSortOrderMapping[type])) {
        target.querySelector('.each-table-header-sort-indicators').children[0].className = 'triangle-up-big';
        eachLeaderboardTable.classList.add('section-hidden');
      }
      else {
        target.querySelector('.each-table-header-sort-indicators').children[0].className = 'triangle-down-big';
        eachLeaderboardTable.classList.remove('section-hidden');
      }
    })

    leaderboardSortOrderMapping[type] == 'asc'
      ? leaderboardSortOrderMapping[type] = 'desc'
      : leaderboardSortOrderMapping[type] = 'asc';
  })
}
