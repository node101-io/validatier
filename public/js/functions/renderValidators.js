function shortNumberFormat(num) {
  const sign = num < 0 ? '-' : '';
  num = Math.abs(num);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 10_000) return Math.floor(num / 1_000) + 'K';

  if (num >= 1_000) return num.toFixed(0);
  if (num >= 100) return num.toFixed(1);
  if (num >= 0) return num.toFixed(2);

  return sign + num.toString();
}

function getValueWithDecimals(value, currency, exhange_rate, decimals) {
  const exchangeRate = exhange_rate ? exhange_rate : 0;
  if (currency.toLowerCase().trim() != 'usd') return `${shortNumberFormat(value / (10 ** decimals))} ${currency}`
  return `${shortNumberFormat((value / (10 ** decimals)) * exchangeRate)} $`
}

function createValidatorDetails(validator, activeValidatorHistory) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('each-validator-details-content-wrapper');
  
  const infoDetails = document.createElement('div');
  infoDetails.classList.add('each-validator-info-details-content');
  
  // Stake Button
  const stakeButton = document.createElement('a');
  stakeButton.classList.add('validator-action-button');
  stakeButton.href = `https://wallet.keplr.app/chains/${validator.chain_identifier}?modal=validator&chain=${validator.chain_id}&validator_address=${validator.operator_address}`;
  stakeButton.target = '_blank';
  stakeButton.textContent = 'Stake';
  infoDetails.appendChild(stakeButton);
  
  // Validator Operator Address
  const operatorAddressDiv = document.createElement('div');
  operatorAddressDiv.classList.add('validator-operator-address');
  
  const addressContent = document.createElement('div');
  addressContent.classList.add('validator-operator-address-content');
  
  const start = document.createElement('div');
  start.textContent = validator.operator_address.slice(0, 4);
  addressContent.appendChild(start);
  
  const hiddenPart = document.createElement('div');
  hiddenPart.classList.add('hidden-part');
  
  const middleStart = document.createElement('span');
  middleStart.classList.add('middle-address');
  middleStart.textContent = validator.operator_address.slice(4, (validator.operator_address.length - 4) / 2);
  
  const dots = document.createElement('span');
  dots.classList.add('dots');
  dots.textContent = '....';
  
  const middleEnd = document.createElement('span');
  middleEnd.classList.add('middle-address');
  middleEnd.textContent = validator.operator_address.slice((validator.operator_address.length - 4) / 2, validator.operator_address.length - 4);
  
  hiddenPart.append(middleStart, dots, middleEnd);
  addressContent.appendChild(hiddenPart);
  
  const end = document.createElement('div');
  end.textContent = validator.operator_address.slice(validator.operator_address.length - 4);
  addressContent.appendChild(end);
  
  // Copy Button
  const copyButton = document.createElement('div');
  copyButton.classList.add('validator-operator-address-copy-button');
  const copyImg = document.createElement('img');
  copyImg.src = '/res/images/clipboard.svg';
  copyButton.appendChild(copyImg);
  addressContent.appendChild(copyButton);
  
  operatorAddressDiv.appendChild(addressContent);
  infoDetails.appendChild(operatorAddressDiv);
  
  // Textual Info
  const textualInfoWrapper = document.createElement('div');
  textualInfoWrapper.classList.add('validator-details-textual-info-wrapper');
  
  const websiteInfo = document.createElement('div');
  websiteInfo.classList.add('each-validator-details-textual-info');
  websiteInfo.textContent = `Website: ${validator.website}`;
  
  const descriptionInfo = document.createElement('div');
  descriptionInfo.classList.add('each-validator-details-textual-info');
  descriptionInfo.textContent = `Description: ${validator.description}`;
  
  textualInfoWrapper.append(websiteInfo, descriptionInfo);
  infoDetails.appendChild(textualInfoWrapper);
  
  // Inactivity Checker
  const inactivityWrapper = document.createElement('div');
  inactivityWrapper.classList.add('validator-details-inactivity-wrapper');
  
  let eachValidatorInactivity = [];
  let isCurrentlyActive = true;
  
  activeValidatorHistory.forEach(month => {
      month.active_validators.forEach(day => {
          if (!day.pubkeys.includes(validator.pubkey) && isCurrentlyActive) {
              isCurrentlyActive = false;
              eachValidatorInactivity.push(`${day.day}/${month.month}/${month.year}`);
          } else if (day.pubkeys.includes(validator.pubkey) && !isCurrentlyActive) {
              isCurrentlyActive = true;
              eachValidatorInactivity.push(`${day.day}/${month.month}/${month.year}`);
          }
      });
  });
  
  if (eachValidatorInactivity.length > 0) {
      const inactivityTitle = document.createElement('div');
      inactivityTitle.classList.add('each-inactivity-line-display-content', 'center');
      inactivityTitle.textContent = 'Validator inactivity intervals';
      inactivityWrapper.appendChild(inactivityTitle);
      
      for (let i = 0; i < eachValidatorInactivity.length; i += 2) {
          const inactivityLine = document.createElement('div');
          inactivityLine.classList.add('each-inactivity-line-display-content', 'center');
          inactivityLine.textContent = `from ${eachValidatorInactivity[i]} to ${eachValidatorInactivity[i + 1] ? eachValidatorInactivity[i + 1] : 'today'}`;
          inactivityWrapper.appendChild(inactivityLine);
      }
  } else {
      const alwaysActive = document.createElement('div');
      alwaysActive.classList.add('validator-activeness-always-content', 'center');
      alwaysActive.textContent = 'Validator was always active';
      inactivityWrapper.appendChild(alwaysActive);
  }
  
  infoDetails.appendChild(inactivityWrapper);
  wrapper.appendChild(infoDetails);
  
  return wrapper;
}


function generateValidatorRankingContent (response, sort_by, sortOrderMapping) {
  if (response.err || !response.success) return;
  const data = response.data.validators;
  const activeValidatorHistory = response.data.activeValidatorHistory; 

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
  
    const createRatioTd = (value) => {
      const td = document.createElement('div');
      td.classList.add('validator-each-numeric-info');
      td.classList.add('validator-ratio');
      td.textContent = value;
      return td;
    };

    const exchangeRate = document.getElementById('network-switch-header').getAttribute('current_chain_usd_exhange_rate');
    const currentChainSymbol = document.getElementById('network-switch-header').getAttribute('current_chain_symbol');
    const currentChainDecimals = document.getElementById('network-switch-header').getAttribute('current_chain_decimals');

    const createCurrencyTd = (value) => {
      const td = document.createElement('div');
      td.setAttribute('native', getValueWithDecimals(value, currentChainSymbol, exchangeRate, currentChainDecimals));
      td.setAttribute('usd', getValueWithDecimals(value, 'usd', exchangeRate, currentChainDecimals));
      td.classList.add('validator-each-numeric-info');

      const currency = document.getElementById('currency-toggle').value == 'native' ? currentChainSymbol : 'usd';

      td.textContent = getValueWithDecimals(value, currency, exchangeRate, currentChainDecimals);
      return td;
    };

    const totalStakeTd = createCurrencyTd(validator.total_stake);
    const totalWithdrawTd = createCurrencyTd(validator.total_withdraw);
    const selfStakeTd = createCurrencyTd(validator.self_stake);
    const rewardTd = createCurrencyTd(validator.reward);
    const commissionTd = createCurrencyTd(validator.commission);
    const ratioTd = createRatioTd(shortNumberFormat(validator.ratio));
    const soldTd = createCurrencyTd(validator.sold);
  
    tr.appendChild(tdInfo);
    tr.appendChild(totalStakeTd);
    tr.appendChild(totalWithdrawTd);
    tr.appendChild(selfStakeTd);
    tr.appendChild(rewardTd);
    tr.appendChild(commissionTd);
    tr.appendChild(ratioTd);
    tr.appendChild(soldTd);
  
    document.getElementById('validators-main-wrapper').appendChild(tr);

    const detailsWrapper = createValidatorDetails(validator, activeValidatorHistory);
    document.getElementById('validators-main-wrapper').appendChild(detailsWrapper);

    const eachValidatorSeperatorDiv = document.createElement('div');
    eachValidatorSeperatorDiv.classList.add('each-validator-wrapper-seperator-line');
    document.getElementById('validators-main-wrapper').appendChild(eachValidatorSeperatorDiv)
  }
}


function renderValidators() {

  const sortOrderMapping = {
    total_stake: '',
    total_withdraw: '',
    self_stake: '',
    reward: '',
    commission: '',
    ratio: '',
    sold: ''
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
      ? target.id ? sortOrderMapping[sort_by] = 'asc' : 'desc'
      : sortOrderMapping[sort_by] = 'desc'

    const GET_VALIDATORS_API_ENDPOINT = 'validator/rank_validators';
    const BASE_URL = !window.location.href.includes('#') ? window.location.href : window.location.href.split('#')[0];
    
    document.getElementById('export-sort-by').innerHTML = sort_by;
    document.getElementById('export-order').innerHTML = sortOrderMapping[sort_by];

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

    if (cacheResponse) {
      sortOrderMapping[sort_by] == 'desc'
        ? cacheResponse.data.sort((a, b) => (b[sort_by] || 0) - (a[sort_by] || 0))
        : cacheResponse.data.sort((a, b) => (a[sort_by] || 0) - (b[sort_by] || 0))

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

  document.body.addEventListener('mouseover', (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-validator-wrapper')) target = target.parentNode;
    
    document.querySelectorAll('.validator-moniker-text').forEach(each => {
      if (each.innerHTML == target.querySelector('.validator-moniker-text').innerHTML) return;
      each.style.animation = 'none';
      each.style.position = 'inline-block';
    })

    const monikerWrapper = target.children[0].children[2].children[0];
    animateOverflowMonikers(monikerWrapper);
  })
}
