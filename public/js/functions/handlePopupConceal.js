function handlePopupConceal () {
  const items = document.querySelectorAll('.each-tooltip-info-hover-table');
  const validatorsDataColumn = document.getElementById('validators-data-column');

  validatorsDataColumn.addEventListener('scroll', (event) => {
    items.forEach((item, i) => {
      const { left: itemLeft } = item.getBoundingClientRect();
      const { left: wrapperLeft } = validatorsDataColumn.getBoundingClientRect();
      let addOn = 150;

      if ((itemLeft + 10) < (wrapperLeft + addOn)) {
        item.previousSibling.style.display = 'none';
      } else {
        item.previousSibling.style.display = 'flex';
      }
    });
  })
}