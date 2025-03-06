
function renderTableHeader (sort_by, order) {
  const validatorsWrapper = document.getElementById('validators-main-wrapper');

  const headersArray = [
      { name: 'Self stake', id: 'self_stake' },
      { name: 'Withdraw', id: 'withdraw' },
      { name: 'Ratio', id: 'ratio' },
      { name: 'Sold', id: 'sold' },
  ];
  const headersRow = document.createElement('tr');
  const tdValidators = document.createElement('td');
  tdValidators.textContent = 'Validators';
  headersRow.appendChild(tdValidators);
  headersArray.forEach(header => {
    const td = document.createElement('td');
    const wrapperDiv = document.createElement('div');
    wrapperDiv.classList.add('each-table-header-wrapper');
    wrapperDiv.id = header.id;
    const titleDiv = document.createElement('div');
    titleDiv.classList.add('each-table-header-title');
    titleDiv.textContent = header.name;
    const sortIndicatorsDiv = document.createElement('div');
    sortIndicatorsDiv.classList.add('each-table-header-sort-indicators');

    const triangleUp = document.createElement('div');
    triangleUp.classList.add('triangle-up');

    const triangleDown = document.createElement('div');
    triangleDown.classList.add('triangle-down');

    header.id == sort_by 
      ? order == 'desc' 
        ? triangleDown.style.filter = 'brightness(1)' 
        : triangleUp.style.filter = 'brightness(1)'
      : '';

    sortIndicatorsDiv.appendChild(triangleUp);
    sortIndicatorsDiv.appendChild(triangleDown);
    wrapperDiv.appendChild(titleDiv);
    wrapperDiv.appendChild(sortIndicatorsDiv);
    td.appendChild(wrapperDiv);
    headersRow.appendChild(td);
  });

  validatorsWrapper.appendChild(headersRow)
}


