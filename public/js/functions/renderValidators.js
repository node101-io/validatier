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

function generateValidatorRankingContent (response, sort_by, sortOrderMapping) {
  if (response.err || !response.success) return;
  const data = response.data; 

  document.getElementById('validators-main-wrapper').innerHTML = '';
  renderTableHeader(sort_by, sortOrderMapping[sort_by]);

  for (let i = 0; i < data.length; i++) {

    const validator = data[i];

    const tr = document.createElement('div');
    tr.classList.add('each-validator-wrapper');
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
  
    const operatorAddressDiv = document.createElement('div');
    operatorAddressDiv.classList.add('validator-operator-address');
    
    const operatorAddressContentDiv = document.createElement('div');
    operatorAddressContentDiv.classList.add('validator-operator-address-content');
    
    operatorAddressContentDiv.setAttribute('operator_address', validator.operator_address);

    const firstFourSpan = document.createElement('div');
    firstFourSpan.innerHTML = validator.operator_address.slice(0, 4);

    const hiddenPartDiv = document.createElement('div');
    hiddenPartDiv.classList.add('hidden-part');

    const dotsSpan = document.createElement('span');
    dotsSpan.classList.add('dots');
    dotsSpan.innerHTML = '........';

    const middleSpan = document.createElement('span');
    middleSpan.classList.add('middle-address');
    middleSpan.innerHTML = validator.operator_address.slice(4, validator.operator_address.length - 4);

    const lastFourSpan = document.createElement('div');
    lastFourSpan.innerHTML = validator.operator_address.slice(validator.operator_address.length - 4);

    const operatorAddressIcon = document.createElement('div');
    operatorAddressIcon.classList.add('validator-operator-address-copy-button', 'center');
    
    const operatorAddressIconImageContent = document.createElement('img');
    operatorAddressIconImageContent.classList.add('center');
    operatorAddressIconImageContent.src = '/res/images/clipboard.svg';
    
    hiddenPartDiv.appendChild(dotsSpan);
    hiddenPartDiv.appendChild(middleSpan);
    
    operatorAddressContentDiv.appendChild(firstFourSpan);
    operatorAddressContentDiv.appendChild(hiddenPartDiv);
    operatorAddressContentDiv.appendChild(lastFourSpan);
    operatorAddressIcon.appendChild(operatorAddressIconImageContent);
    operatorAddressContentDiv.appendChild(operatorAddressIcon);
    operatorAddressDiv.appendChild(operatorAddressContentDiv);
  
    textualInfoWrapper.appendChild(monikerDiv);
    textualInfoWrapper.appendChild(operatorAddressDiv);
  
    tdInfo.appendChild(rankingDiv);
    tdInfo.appendChild(validatorImageDiv);
    tdInfo.appendChild(textualInfoWrapper);
  
    const createNumericTd = (value) => {
      const td = document.createElement('div');
      td.classList.add('validator-each-numeric-info');
      td.textContent = value;
      return td;
    };
  
    const selfStakeTd = createNumericTd(shortNumberFormat(validator.self_stake / 1e6) + ' Atom');
    const withdrawTd = createNumericTd(shortNumberFormat(validator.withdraw / 1e6) + ' Atom');
    const ratioTd = createNumericTd(shortNumberFormat(validator.ratio));
    const soldTd = createNumericTd(shortNumberFormat(validator.sold / 1e6) + ' Atom');
  
    tr.appendChild(tdInfo);
    tr.appendChild(selfStakeTd);
    tr.appendChild(withdrawTd);
    tr.appendChild(ratioTd);
    tr.appendChild(soldTd);
  
    document.getElementById('validators-main-wrapper').appendChild(tr);
    
    const eachValidatorSeperatorDiv = document.createElement('div');
    eachValidatorSeperatorDiv.classList.add('each-validator-wrapper-seperator-line');
    document.getElementById('validators-main-wrapper').appendChild(eachValidatorSeperatorDiv)
  }
}


function renderValidators() {

  const sortOrderMapping = {
    self_stake: '',
    withdraw: '',
    ratio: '',
    sold: ''
  };

  document.addEventListener('click', (event) => {
    const isHeaderClickedChecker = event.target.classList.contains('each-table-header-wrapper') || event.target.parentNode.classList.contains('each-table-header-wrapper') || event.target.parentNode.parentNode.classList.contains('each-table-header-wrapper');
    const isApplyClickedChecker = event.target.classList.contains('apply') || event.target.parentNode.classList.contains('apply')
    if (!isHeaderClickedChecker && !isApplyClickedChecker) return;

    document.querySelectorAll('.validator-image').forEach(each => each.classList.add('skeleton-image'));
    document.querySelectorAll('.validator-moniker').forEach(each => each.classList.add('skeleton-text'));
    document.querySelectorAll('.validator-each-numeric-info').forEach(each => each.classList.add('skeleton-text'));
    document.querySelectorAll('.validator-operator-address').forEach(each => each.remove());
    document.querySelectorAll('.validator-inactivity-display').forEach(each => each.remove());

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

    const bottomTimestamp = Math.floor(new Date(bottomDate).getTime() / 1000);
    const topTimestamp = Math.floor(new Date(topDate).getTime() / 1000);

    const chainIdentifier = document.getElementById('network-switch-header').getAttribute('current_chain_identifier');

    const cacheResponse = rankingResponsesCache[bottomDate + '.' + topTimestamp + '.' + chainIdentifier];

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
        rankingResponsesCache[bottomDate + '.' + topTimestamp + '.' + chainIdentifier] = response;
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
    if (!event.target.classList.contains('each-validator-wrapper') && !event.target.classList.contains('validator-moniker')) return;

    const monikerWrapper = event.target.children[0].children[2].children[0];
    animateOverflowMonikers(monikerWrapper);
  })

  document.body.addEventListener('mouseover', (event) => {

    document.querySelectorAll('.validator-operator-address-visible').forEach(each => each.classList.remove('validator-operator-address-visible'));
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-validator-wrapper')) target = target.parentNode;
    if (!target.classList.contains('each-validator-wrapper')) return;
    
    const operatorAddressWrapper = target.children[0].children[2].children[1];
    operatorAddressWrapper.classList.add('validator-operator-address-visible');
  })
}
