
function renderValidators() {


  const sortOrderMapping = {
    self_stake: '',
    withdraw: '',
    ratio: '',
    sold: ''
  }

  document.addEventListener('click', (event) => {
    
    if (!event.target.classList.contains('each-table-header-wrapper') && !event.target.parentNode.classList.contains('each-table-header-wrapper') && !event.target.parentNode.parentNode.classList.contains('each-table-header-wrapper')) return;

    let target = event.target;
    while (!target.classList.contains('each-table-header-wrapper')) target = target.parentNode;

    const sort_by = target.id;

    sortOrderMapping[sort_by] == 'desc'
      ? sortOrderMapping[sort_by] = 'asc'
      : sortOrderMapping[sort_by] = 'desc'

    const GET_VALIDATORS_API_ENDPOINT = 'validator/rank_validators';
    const BASE_URL = window.location.href;
    
    const validatorsWrapper = document.getElementById('validators-main-wrapper');

    serverRequest(
      BASE_URL + GET_VALIDATORS_API_ENDPOINT + `?sort_by=${sort_by}&order=${sortOrderMapping[sort_by]}`,
      'GET',
      {},
      (response) => {
        
        if (response.err || !response.success) return;
        const data = response.data;      

        validatorsWrapper.innerHTML = '';
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
        
          validatorsWrapper.appendChild(tr);
          
        }
      }
    )

  })
}
