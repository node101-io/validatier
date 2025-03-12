function shortNumberFormat(num) {
  const sign = num < 0 ? '-' : '';
  num = Math.abs(num);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 10_000) return Math.floor(num / 1_000) + "K";

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

    const tr = document.createElement('tr');
    tr.classList.add('each-validator-wrapper');
    const tdInfo = document.createElement('td');
    tdInfo.style.display = 'flex';
    tdInfo.style.alignItems = 'center';
    tdInfo.style.gap = '20px';
  
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
    textualInfoWrapper.style.marginLeft = '-2px';
    textualInfoWrapper.classList.add('validator-textual-info-wrapper');
  
    const monikerDiv = document.createElement('div');
    monikerDiv.classList.add('validator-moniker');
    monikerDiv.textContent = validator.moniker;
  
    const operatorAddressDiv = document.createElement('div');
    operatorAddressDiv.classList.add('validator-operator-address');

    const operatorAddressContentDiv = document.createElement('div');
    operatorAddressContentDiv.classList.add('validator-operator-address-content');
    operatorAddressContentDiv.innerHTML = validator.operator_address;

    const operatorAddressIcon = document.createElement('div');
    operatorAddressIcon.classList.add('validator-operator-address-copy-button');

    const operatorAddressIconImageContent = document.createElement('img');
    operatorAddressIconImageContent.classList.add('center');
    operatorAddressIconImageContent.src = '/res/images/clipboard.svg';
    operatorAddressIcon.appendChild(operatorAddressIconImageContent);

    operatorAddressDiv.appendChild(operatorAddressContentDiv);
    operatorAddressDiv.appendChild(operatorAddressIcon);
  
    textualInfoWrapper.appendChild(monikerDiv);
    textualInfoWrapper.appendChild(operatorAddressDiv);
  
    tdInfo.appendChild(rankingDiv);
    tdInfo.appendChild(validatorImageDiv);
    tdInfo.appendChild(textualInfoWrapper);
  
    const createNumericTd = (value) => {
      const td = document.createElement('td');
      td.classList.add('validator-each-numeric-info');
      td.textContent = value;
      return td;
    };
  
    const selfStakeTd = createNumericTd(shortNumberFormat(validator.self_stake / 1e6) + ' ATOM');
    const withdrawTd = createNumericTd(shortNumberFormat(validator.withdraw / 1e6) + ' ATOM');
    const ratioTd = createNumericTd(shortNumberFormat(validator.ratio));
    const soldTd = createNumericTd(shortNumberFormat(validator.sold / 1e6) + ' ATOM');
  
    tr.appendChild(tdInfo);
    tr.appendChild(selfStakeTd);
    tr.appendChild(withdrawTd);
    tr.appendChild(ratioTd);
    tr.appendChild(soldTd);
  
    document.getElementById('validators-main-wrapper').appendChild(tr);
  }
}

const rankingResponsesCache = {};

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

    document.querySelector('.picker-main-wrapper').style.transform = 'perspective(1000px) rotateX(-90deg)';
    document.querySelector('.picker-main-wrapper').style.opacity = 0;
    
    let target = event.target;
    while (isHeaderClickedChecker && !target.classList.contains('each-table-header-wrapper')) target = target.parentNode;

    const sort_by = target.id ? target.id : 'ratio';

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

    const cacheResponse = rankingResponsesCache[bottomDate + '.' + topTimestamp];

    if (cacheResponse) {
      sortOrderMapping[sort_by] == 'desc'
        ? cacheResponse.data.sort((a, b) => (b[sort_by] || 0) - (a[sort_by] || 0))
        : cacheResponse.data.sort((a, b) => (a[sort_by] || 0) - (b[sort_by] || 0))
      return generateValidatorRankingContent(cacheResponse, sort_by, sortOrderMapping)
    };
    serverRequest(
      BASE_URL + GET_VALIDATORS_API_ENDPOINT + `?sort_by=${sort_by}&order=${sortOrderMapping[sort_by]}&bottom_timestamp=${bottomTimestamp}&top_timestamp=${topTimestamp}&with_photos`,
      'GET',
      {},
      (response) => {
        generateValidatorRankingContent(response, sort_by, sortOrderMapping);
        rankingResponsesCache[bottomDate + '.' + topTimestamp] = response;
      }
    )
  })


  document.body.addEventListener('click', (event) => {
    if (!event.target.classList.contains('validator-operator-address') && !event.target.parentNode.classList.contains('validator-operator-address') && !event.target.parentNode.parentNode.classList.contains('validator-operator-address')) return;
    let target = event.target;
    while (!target.classList.contains('validator-operator-address')) target = target.parentNode;
    navigator.clipboard.writeText(target.children[0].getAttribute('operator_address'));
    target.children[1].children[0].src = '/res/images/check.svg';
    setTimeout(() => {
      target.children[1].children[0].src = '/res/images/clipboard.svg';
    }, 1000);
  })


  document.body.addEventListener('mouseover', (event) => {
    if (!event.target.classList.contains('validator-operator-address') && !event.target.parentNode.classList.contains('validator-operator-address') && !event.target.parentNode.parentNode.classList.contains('validator-operator-address')) {
      
      document.querySelectorAll('.validator-operator-address-content-expanded').forEach(each => {
        setTimeout(() => {
          each.innerHTML = each.getAttribute('operator_address').slice(0,4) + '...' + each.getAttribute('operator_address').slice(each.getAttribute('operator_address').length - 4, each.getAttribute('operator_address').length)
        }, 0.5 * 1000);
        each.classList.remove('validator-operator-address-content-expanded');
      });
      document.querySelectorAll('.validator-operator-address-expanded').forEach(each => each.classList.remove('validator-operator-address-expanded'));  
    }
    document.querySelectorAll('.validator-operator-address-visible').forEach(each => each.classList.remove('validator-operator-address-visible'));
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-validator-wrapper')) target = target.parentNode;
    if (!target.classList.contains('each-validator-wrapper')) return;

    const operatorAddressWrapper = target.children[0].children[2].children[1];

    operatorAddressWrapper.classList.add('validator-operator-address-visible');
    operatorAddressWrapper.addEventListener('mouseover', (event) => {
      setTimeout(() => {
        operatorAddressWrapper.children[0].innerHTML = operatorAddressWrapper.children[0].getAttribute('operator_address');
        operatorAddressWrapper.children[0].classList.add('validator-operator-address-content-expanded');
        operatorAddressWrapper.classList.add('validator-operator-address-expanded');  
      }, 0.5 * 1000);
    })
  })
}
