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
  if (value.includes('.')) return `${(parseInt(value) * 100)}%`;
  return `${parseInt(value / 1e16)}%`;
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

function generateValidatorRankingContent (response, sort_by, sortOrderMapping) {
  if (response.err || !response.success) return;
  const data = response.data.validators;

  document.getElementById('validators-main-wrapper').innerHTML = '';
  renderTableHeader(sort_by, sortOrderMapping[sort_by]);

  for (let i = 0; i < data.length; i++) {

    const validator = data[i];

    const tr = document.createElement('div');
    tr.classList.add('each-validator-wrapper');
    tr.id = validator.operator_address;
    const tdInfo = document.createElement('div');
    tdInfo.classList.add('each-validator-info-wrapper');
  
    const validatorImageDiv = document.createElement('div');
    validatorImageDiv.classList.add('validator-image');

    const rankingDiv = document.createElement('div');
    rankingDiv.classList.add('ranking-number-content', 'center');
    rankingDiv.textContent = i + 1;
  
    const img = document.createElement('img');
    img.src = validator.temporary_image_uri
      ? validator.temporary_image_uri
      : '/res/images/default_validator_photo.png';
  
    validatorImageDiv.appendChild(img);
  
    const textualInfoWrapper = document.createElement('div');
    textualInfoWrapper.classList.add('validator-textual-info-wrapper');
  
    const monikerDiv = document.createElement('div');
    monikerDiv.classList.add('validator-moniker');

    const validatorMonikerTextContentWrapper = document.createElement('div');
    validatorMonikerTextContentWrapper.classList.add('validator-moniker-text-content');
    const validatorMonikerInnerTextContent = document.createElement('span');
    validatorMonikerInnerTextContent.classList.add('validator-moniker-text');
    validatorMonikerInnerTextContent.innerHTML = validator.moniker;

    validatorMonikerTextContentWrapper.appendChild(validatorMonikerInnerTextContent);
    monikerDiv.appendChild(validatorMonikerTextContentWrapper);

    if (validator.inactivityIntervals && validator.inactivityIntervals.length > 0) {
      const inactivityDiv = document.createElement('div');
      inactivityDiv.classList.add('validator-inactivity-display', 'center');
      inactivityDiv.setAttribute('value', `${validator.inactivityIntervals}`);
  
      const warningImg = document.createElement('img');
      warningImg.src = '/res/images/warning.svg';
  
      inactivityDiv.appendChild(warningImg);
      monikerDiv.appendChild(inactivityDiv);
    }

    textualInfoWrapper.appendChild(monikerDiv);
  
    tdInfo.appendChild(rankingDiv);
    tdInfo.appendChild(validatorImageDiv);
    tdInfo.appendChild(textualInfoWrapper);
  
    const createPercentageSoldTd = (value) => {
      const td = document.createElement('div');
      const { color, check } = getScoreColor(value)
      td.classList.add('validator-each-numeric-info');
      td.classList.add('validator-percentage-sold');
      td.style.color = color;

      const span = document.createElement('span');
      span.innerHTML = `%${shortNumberFormat(value)}`;
      td.appendChild(span);
      if (check) {
        const checkImgContent = document.createElement('img');
        checkImgContent.classList.add('center');
        checkImgContent.src = '/res/images/check_green.svg';
        td.appendChild(checkImgContent);
      }
      return td;
    };

    const exchangeRate = document.getElementById('network-switch-header').getAttribute('current_chain_usd_exhange_rate');
    const currentChainSymbol = document.getElementById('network-switch-header').getAttribute('current_chain_symbol');
    const currentChainDecimals = document.getElementById('network-switch-header').getAttribute('current_chain_decimals');

    const createCurrencyTd = (value) => {
      const td = document.createElement('div');
      td.classList.add('validator-each-numeric-info');
      const { nativeValue, usdValue } = getValueWithDecimals(value, currentChainSymbol, exchangeRate, currentChainDecimals);
      
      const nativeContentDiv = document.createElement('div');
      nativeContentDiv.classList.add('validator-each-numeric-info-native')
      const usdContentDiv = document.createElement('div');
      usdContentDiv.classList.add('validator-each-numeric-info-usd')

      nativeContentDiv.innerHTML = nativeValue;
      usdContentDiv.innerHTML = usdValue;

      td.appendChild(nativeContentDiv);
      td.appendChild(usdContentDiv);
      return td;
    };

    const delegationTd = createCurrencyTd(validator.total_stake);
    const totalRewardsTd = createCurrencyTd(validator.total_withdraw);
    const totalSoldAmountTd = createCurrencyTd(validator.sold);
    const selfStakeTd = createCurrencyTd(validator.self_stake);
    const percentageSoldTd = createPercentageSoldTd(validator.percentage_sold);

    tr.appendChild(tdInfo);
    tr.appendChild(delegationTd);
    tr.appendChild(totalRewardsTd);
    tr.appendChild(selfStakeTd);
    tr.appendChild(totalSoldAmountTd);
    tr.appendChild(percentageSoldTd);

    tr.setAttribute('validator', JSON.stringify(validator));
    tr.classList.add('operator-address');
    document.getElementById('validators-main-wrapper').appendChild(tr);
  }
}


function renderValidators() {

  const sortOrderMapping = {
    total_stake: '',
    total_withdraw: '',
    sold: '',
    self_stake: '',
    percentage_sold: '',
  };

  document.getElementById('cancel').addEventListener('click', (event) => {
    document.getElementById('picker-main-wrapper').style.transform = 'perspective(1000px) rotateX(-90deg)';
    document.getElementById('picker-main-wrapper').style.opacity = 0;

    document.getElementById('picker-main-wrapper').children[document.getElementById('picker-main-wrapper').children.length - 1].style.transform = 'rotateX(0deg)';
  })

  document.addEventListener('click', (event) => {
    const isHeaderClickedChecker = event.target.classList.contains('each-table-header-wrapper') || event.target.parentNode.classList.contains('each-table-header-wrapper') || event.target.parentNode.parentNode.classList.contains('each-table-header-wrapper');
    const isApplyClickedChecker = event.target.classList.contains('apply') || event.target.parentNode.classList.contains('apply')
    if (!isHeaderClickedChecker && !isApplyClickedChecker) return;

    displaySkeleton();

    document.querySelector('.picker-main-wrapper').style.transform = 'perspective(1000px) rotateX(-90deg)';
    document.querySelector('.picker-main-wrapper').style.opacity = 0;
    
    let target = event.target;
    while (isHeaderClickedChecker && !target.classList.contains('each-table-header-wrapper')) target = target.parentNode;

    const sort_by = (target.id != 'apply') ? target.id : 'ratio';

    sortOrderMapping[sort_by] == 'desc'
      ? target.id 
        ? sortOrderMapping[sort_by] = 'asc' 
        : 'desc'
      : sort_by != 'percentage_sold'
        ? sortOrderMapping[sort_by] = 'desc'
        : sortOrderMapping[sort_by] = 'asc';

    const GET_VALIDATORS_API_ENDPOINT = 'validator/rank_validators';
    const BASE_URL = !window.location.href.includes('#') ? window.location.href : window.location.href.split('#')[0];
    
    const validatorsMainWrapper = document.getElementById('validators-main-wrapper');
    validatorsMainWrapper.setAttribute('sort_by', sort_by);
    validatorsMainWrapper.setAttribute('order', sortOrderMapping[sort_by]);

    const bottomDate = document.getElementById('periodic-query-bottom-timestamp').value;
    const topDate = document.getElementById('periodic-query-top-timestamp').value

    if (isApplyClickedChecker) {
      setCookie('selectedDateBottom', bottomDate, 7);
      setCookie('selectedDateTop', topDate, 7);
    }

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
    serverRequest(
      BASE_URL + GET_VALIDATORS_API_ENDPOINT + `?sort_by=${sort_by}&order=${sortOrderMapping[sort_by]}&bottom_timestamp=${bottomTimestamp}&top_timestamp=${topTimestamp}&chain_identifier=${chainIdentifier}&with_photos`,
      'GET',
      {},
      (response) => {
        generateValidatorRankingContent(response, sort_by, sortOrderMapping);
        rankingResponsesCache[bottomTimestamp + '.' + topTimestamp + '.' + chainIdentifier] = response;
      }
    )
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

    const monikerWrapper = target.children[0].children[2].children[0];
    animateOverflowMonikers(monikerWrapper);
  })

  document.addEventListener('click', (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('leaderboard-dropdown-option')) target = target.parentNode;
    if (!target.classList.contains('leaderboard-dropdown-option') || target.classList.contains('dropdown-option-selected') || target.classList.contains('leaderboard-dropdown-title')) return;

    target.parentNode.querySelectorAll('.leaderboard-dropdown-option').forEach(each => {
      each.classList.remove('dropdown-option-selected');
    });
    target.classList.add('dropdown-option-selected');

    const sortBy = target.getAttribute('leaderboard_sort_by');
    const leaderboardContent = document.getElementById(`leaderboard-content-${sortBy}`);
    
    leaderboardContent.parentNode.querySelectorAll('.each-leaderboard-table-wrapper').forEach(each => {
      each.classList.add('section-hidden');
    });
    leaderboardContent.classList.remove('section-hidden');
  })
}
