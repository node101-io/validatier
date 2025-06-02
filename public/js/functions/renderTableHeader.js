
function renderTableHeader (sort_by, order) {
  const validatorsWrapper = document.getElementById('validators-main-wrapper');
  const headersArray = [
    { name: 'Percentage Sold', id: 'percentage_sold', popup_text: '(Withdraw - Self Stake) / Withdraw '},
    { name: 'Avg Delegation', id: 'average_total_stake' },
    { name: 'Total Rewards', id: 'total_withdraw' },
    { name: 'Total Sold Amount', id: 'sold', popup_text: 'Total withdraw - Self stake' },
    { name: 'Self Stake', id: 'self_stake', popup_text: 'Validator\'s own stake on itself' },
  ]
  const headersRow = document.createElement('div');
  headersRow.classList.add('validator-table-header')
  const tdValidators = document.createElement('div');
  tdValidators.classList.add('each-table-header-wrapper');
  tdValidators.classList.add('each-table-header-validator-info-header')

  const tdValidatorsTitle = document.createElement('div')
  tdValidatorsTitle.textContent = 'Validators';
  tdValidatorsTitle.classList.add('each-table-header-title');

  tdValidators.appendChild(tdValidatorsTitle);
  
  headersRow.appendChild(tdValidators);
  headersArray.forEach(header => {
    const td = document.createElement('div');
    td.classList.add('each-table-header-wrapper');
    const wrapperDiv = document.createElement('div');
    wrapperDiv.classList.add('each-table-header-wrapper');
    wrapperDiv.id = header.id;
    const titleDiv = document.createElement('div');
    titleDiv.classList.add('each-table-header-title');
    titleDiv.textContent = header.name;

    let popupWrapper;

    if (header.popup_text) {

      td.classList.add('each-table-header-hover')

      popupWrapper = document.createElement('div');
      popupWrapper.classList.add('each-table-popup-wrapper')
  
      const contentWrapper = document.createElement('div');
      contentWrapper.classList.add('each-table-popup-info-content', 'center');
      contentWrapper.innerHTML = header.popup_text
      contentWrapper.style.marginBottom = '5px';
  
      const tooltipWrapper = document.createElement('div');
      tooltipWrapper.classList.add('each-tooltip-info-hover', 'center');
  
      const infoIcon = document.createElement('img');
      infoIcon.src = '/res/images/info.svg';
      
      tooltipWrapper.appendChild(infoIcon);
      popupWrapper.appendChild(contentWrapper);
      popupWrapper.appendChild(tooltipWrapper);
    }

    const sortIndicatorsDiv = document.createElement('div');
    sortIndicatorsDiv.classList.add('each-table-header-sort-indicators');

    const triangleUp = document.createElement('div');
    triangleUp.classList.add('triangle-up');

    const triangleDown = document.createElement('div');
    triangleDown.classList.add('triangle-down');

    header.id == sort_by 
      ? order == 'desc' 
        ? triangleDown.style.borderTopColor = 'rgb(22, 22, 22)' 
        : triangleUp.style.borderBottomColor = 'rgb(22, 22, 22)'
      : '';

    sortIndicatorsDiv.appendChild(triangleUp);
    sortIndicatorsDiv.appendChild(triangleDown);
    if (header.popup_text) wrapperDiv.appendChild(popupWrapper);
    wrapperDiv.appendChild(titleDiv);
    wrapperDiv.appendChild(sortIndicatorsDiv);
    td.appendChild(wrapperDiv);
    headersRow.appendChild(td);
  });

  validatorsWrapper.appendChild(headersRow)
}


