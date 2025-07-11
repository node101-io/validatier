function handlePopupConceal () {
  const innerMainWrapper = document.getElementById('inner-main-wrapper');
  const items = document.querySelectorAll('.each-tooltip-info-hover-table');

  document.getElementById('validators-data-column').addEventListener('scroll', (event) => {
    items.forEach((item, i) => {
      const { left } = item.getBoundingClientRect();
      let addOn = parseInt((window.innerWidth - innerMainWrapper.offsetWidth) / 2);

      if (left < (220 + addOn)) {
        item.previousSibling.style.display = 'none';
      } else {
        item.previousSibling.style.display = 'flex';
      }
    });
  })
}