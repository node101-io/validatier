
function handleSummaryGraphActions() {

  const headerClassName = 'each-network-summary-network-graph-content-dropdown-header';
  const contentClassName = 'each-network-summary-network-graph-content-dropdown-content';
  const openContentClassName = 'each-network-summary-network-graph-content-dropdown-content-open';
  const dropdownArrowClassName = 'each-network-summary-network-graph-content-dropdown-arrow';

  document.body.addEventListener('click', (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-network-summary-select-option')) target = target.parentNode;

    if (!target.classList.contains('each-network-summary-select-option')) return;
    document.querySelector('.each-network-summary-select-option-selected').classList.remove('each-network-summary-select-option-selected');
    target.classList.add('each-network-summary-select-option-selected');
  })

  document.body.addEventListener('click', (event) => {
    
    let target = event.target;
    while (target != document.body && (!target.classList.contains(headerClassName) && !target.classList.contains(contentClassName))) target = target.parentNode;
    
    if (!target.classList.contains(headerClassName) && !target.classList.contains(contentClassName)) {
      target.parentNode.querySelectorAll('.' + dropdownArrowClassName).forEach(each => {
        each.style.transform = 'rotateX(0deg)';
        each.style.marginTop = '2px';
      });
      target.parentNode.querySelectorAll('.' + contentClassName).forEach(each => 
        each.classList.remove(openContentClassName));
      return;
    };

    if (target.classList.contains(contentClassName)) return;

    const networkSwitchDropdown = target.nextSibling;
    
    if (!networkSwitchDropdown.classList.contains(openContentClassName)) {
      target.parentNode.querySelectorAll('.' + dropdownArrowClassName).forEach(each => {
        each.style.transform = 'rotateX(180deg)';
        each.style.marginTop = '-8px';
      });
      target.parentNode.querySelectorAll('.' + contentClassName).forEach(each => 
        each.classList.add(openContentClassName));
    }
    else {
      target.parentNode.querySelectorAll('.' + dropdownArrowClassName).forEach(each => {
        each.style.transform = 'rotateX(0deg)';
        each.style.marginTop = '2px';
      });
      target.parentNode.querySelectorAll('.' + contentClassName).forEach(each => 
        each.classList.remove(openContentClassName));
    };
  })
}
