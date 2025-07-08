
function isElementScrolled(element) {
  return element.scrollHeight > element.clientHeight && element.scrollTop > 0;
}

function handleValidatorSearch () {

  const validatorFilterInput = document.getElementById('validator-filter-input');

  const allMainWrapper = document.getElementById('all-main-wrapper');
  const allValidatorsMainWrapper = document.getElementById('all-validators-main-wrapper');
  validatorFilterInput.addEventListener('focus', (event) => {
    const headerHeight = getComputedStyle(document.documentElement)
      .getPropertyValue('--header-main-wrapper-height')
      .trim();
    allMainWrapper.scrollTo({
      top: allValidatorsMainWrapper.offsetTop - headerHeight.replace('px', ''),
      behavior: 'smooth'
    })
  })

  validatorFilterInput.addEventListener('keyup', (event) => {
    
    const monikers = Array.from(document.querySelectorAll('.validator-moniker')).map(each => each.children[0].children[0].innerHTML);
    const operatorAddresses = Array.from(document.querySelectorAll('.operator-address-search')).map(each => each.id);  

    document.documentElement.style.setProperty("--scrollbar-opacity", "1");
    if (!validatorFilterInput.value || validatorFilterInput.value.length <= 0) return document.querySelectorAll('.each-validator-wrapper').forEach(each => {
      each.style.display = 'flex';
    });
    document.querySelectorAll('.each-validator-wrapper').forEach(each => {
      each.style.display = 'none';
    });
    for (let i = 0; i < monikers.length; i++) {
      const eachMoniker = monikers[i].trim().toLowerCase();
      const eachOperatorAddress = operatorAddresses[i].trim().toLowerCase();

      if (
        eachMoniker.includes(validatorFilterInput.value.trim().toLowerCase()) || 
        eachOperatorAddress.includes(validatorFilterInput.value.trim().toLowerCase())
      ) {
        document.getElementById(operatorAddresses[i]).style.display = 'flex';
        document.getElementById(`${operatorAddresses[i]}-info`).style.display = 'flex';
      }
    }

    if (document.documentElement.scrollHeight <= document.documentElement.clientHeight) {
      document.documentElement.style.setProperty("--scrollbar-opacity", "0");
    }
  })

  document.addEventListener('click', (event) => {
    
    let target = event.target;
    while (target != document.body && target.id != 'search-wrapper') target = target.parentNode;
    if (target.id != 'search-wrapper') {
      if (window.innerWidth <= 900) {
        document.documentElement.style.setProperty("--validator-filter-input-content-wrapper-input-width", "0px");
        document.documentElement.style.setProperty("--validator-filter-input-wrapper-gap", '0px');
      }
      return;
    }

    if (window.innerWidth > 900) return;
    const searchWidth = `calc(${window.innerWidth}px - 60px - var(--date-picker-width) - 2 * var(--header-inputs-main-wrapper-gap) - 2 * var(--inner-main-wrapper-horizontal-padding))`
    document.documentElement.style.setProperty("--validator-filter-input-content-wrapper-input-width", searchWidth);
    document.documentElement.style.setProperty("--validator-filter-input-wrapper-gap", '10px');

    return;
  })
}
