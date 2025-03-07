
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
    rankingDiv.classList.add('absolute-ranking-number-content', 'center');
    rankingDiv.textContent = i + 1;
  
    const img = document.createElement('img');
    img.src = validator.temporary_image_uri
      ? validator.temporary_image_uri
      : '/res/images/default_validator_photo.png';
  
    validatorImageDiv.appendChild(rankingDiv);
    validatorImageDiv.appendChild(img);
  
    const textualInfoWrapper = document.createElement('div');
    textualInfoWrapper.classList.add('validator-textual-info-wrapper');
  
    const monikerDiv = document.createElement('div');
    monikerDiv.classList.add('validator-moniker');
    monikerDiv.textContent = validator.moniker;
  
    const operatorAddressDiv = document.createElement('div');
    operatorAddressDiv.classList.add('validator-operator-address');
    operatorAddressDiv.textContent = validator.operator_address;
  
    textualInfoWrapper.appendChild(monikerDiv);
    textualInfoWrapper.appendChild(operatorAddressDiv);
  
    tdInfo.appendChild(validatorImageDiv);
    tdInfo.appendChild(textualInfoWrapper);
  
    const createNumericTd = (value) => {
      const td = document.createElement('td');
      td.classList.add('validator-each-numeric-info');
      td.textContent = value;
      return td;
    };
  
    const selfStakeTd = createNumericTd((validator.self_stake / 1e6).toFixed(2) + ' ATOM');
    const withdrawTd = createNumericTd((validator.withdraw / 1e6).toFixed(2) + ' ATOM');
    const ratioTd = createNumericTd(validator.ratio.toFixed(2));
    const soldTd = createNumericTd((validator.sold / 1e6).toFixed(2) + ' ATOM');
  
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
    const BASE_URL = window.location.href;
    
    document.getElementById('export-sort-by').innerHTML = sort_by;
    document.getElementById('export-order').innerHTML = sortOrderMapping[sort_by];

    const bottomDate = document.getElementById('periodic-query-bottom-timestamp').value;
    const topDate = document.getElementById('periodic-query-top-timestamp').value

    if (isApplyClickedChecker) document.cookie = `${bottomDate}.${topDate}`;

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
      BASE_URL + GET_VALIDATORS_API_ENDPOINT + `?sort_by=${sort_by}&order=${sortOrderMapping[sort_by]}&bottom_timestamp=${bottomTimestamp}&top_timestamp=${topTimestamp}&with_photos=true`,
      'GET',
      {},
      (response) => {
        generateValidatorRankingContent(response, sort_by, sortOrderMapping);
        rankingResponsesCache[bottomDate + '.' + topTimestamp] = response;
      }
    )
  })
}
