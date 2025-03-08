function handleTooltipEvents () {
  document.addEventListener('mousemove', (event) => {
    if (event.target.classList.contains('each-tooltip-info-hover') || event.target.parentNode.classList.contains('each-tooltip-info-hover') || event.target.parentNode.parentNode.classList.contains('each-tooltip-info-hover')) {
      let target = event.target;
      while (!target.classList.contains('each-tooltip-info-hover')) target = target.parentNode;
      document.querySelectorAll('.each-table-popup-info-content-hover').forEach(each => each.classList.remove('each-table-popup-info-content-hover'))
      target.previousSibling.classList.add('each-table-popup-info-content-hover');
    } else {
      document.querySelectorAll('.each-table-popup-info-content-hover').forEach(each => each.classList.remove('each-table-popup-info-content-hover'))
    }
  })
}