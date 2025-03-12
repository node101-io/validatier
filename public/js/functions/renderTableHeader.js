
function renderTableHeader (sort_by, order) {
  const validatorsWrapper = document.getElementById('validators-main-wrapper');

  const headersArray = [
      { name: 'Self stake', id: 'self_stake' },
      { name: 'Withdraw', id: 'withdraw' },
      { name: 'Ratio', id: 'ratio', popup_text: 'self stake / withdraw' },
      { name: 'Sold', id: 'sold', popup_text: 'withdraw - self stake' },
  ];
  const headersRow = document.createElement('tr');
  const tdValidators = document.createElement('td');
  tdValidators.textContent = 'Validators';
  tdValidators.style.paddingLeft = '40px';
  tdValidators.classList.add('each-table-header-title');
  headersRow.appendChild(tdValidators);
  headersArray.forEach(header => {
    const td = document.createElement('td');
    if (header.id == 'sold') td.style.paddingRight = '20px';
    const wrapperDiv = document.createElement('div');
    wrapperDiv.classList.add('each-table-header-wrapper');
    wrapperDiv.id = header.id;
    const titleDiv = document.createElement('div');
    titleDiv.classList.add('each-table-header-title');
    titleDiv.textContent = header.name;

    let popupWrapper;

    if (header.popup_text) {
      popupWrapper = document.createElement('div');
      popupWrapper.classList.add('each-table-popup-wrapper')
  
      const contentWrapper = document.createElement('div');
      contentWrapper.classList.add('each-table-popup-info-content', 'center');
      contentWrapper.innerHTML = header.popup_text
      contentWrapper.style.bottom = '200%';
      contentWrapper.style.left = '-60px';  

      const arrowWrapper = document.createElement('div');
      arrowWrapper.classList.add('each-table-popup-info-arrow')
  
      const tooltipWrapper = document.createElement('div');
      tooltipWrapper.classList.add('each-tooltip-info-hover', 'center');
      tooltipWrapper.style.marginBottom = '-7px';
      tooltipWrapper.style.marginLeft = '-5px';
  
      const infoIcon = document.createElement('img');
      infoIcon.src = '/res/images/info.svg';
      
      tooltipWrapper.appendChild(infoIcon);
      contentWrapper.appendChild(arrowWrapper);
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
    wrapperDiv.appendChild(titleDiv);
    if (header.popup_text) wrapperDiv.appendChild(popupWrapper);
    wrapperDiv.appendChild(sortIndicatorsDiv);
    td.appendChild(wrapperDiv);
    headersRow.appendChild(td);
  });

  validatorsWrapper.appendChild(headersRow)
}


