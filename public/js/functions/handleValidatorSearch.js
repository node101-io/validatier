
function handleValidatorSearch () {
  const validatorFilterInput = document.getElementById('validator-filter-input');
  const monikers = Array.from(document.querySelectorAll('.validator-moniker')).map(each => each.children[0].children[0].innerHTML);
  const operatorAddresses = Array.from(document.querySelectorAll('.validator-operator-address-content')).map(each => each.getAttribute('operator_address'));
  
  validatorFilterInput.addEventListener('keyup', (event) => {
    if (!validatorFilterInput.value || validatorFilterInput.value.length <= 0) return document.querySelectorAll('.each-validator-wrapper').forEach(each => {
      each.style.display = 'flex';
      each.nextSibling.style.display = 'unset';
    });
    document.querySelectorAll('.each-validator-wrapper').forEach(each => {
      each.style.display = 'none';
      each.nextSibling.style.display = 'none';
    });
    for (let i = 0; i < monikers.length; i++) {
      const eachMoniker = monikers[i].trim().toLowerCase();
      const eachOperatorAddress = operatorAddresses[i].trim().toLowerCase();

      if (
        eachMoniker.includes(validatorFilterInput.value.trim().toLowerCase()) || 
        eachOperatorAddress.includes(validatorFilterInput.value.trim().toLowerCase())
      ) {
        document.getElementById(operatorAddresses[i]).style.display = 'flex';
        document.getElementById(operatorAddresses[i]).nextSibling.style.display = 'unset';
      }
    }
  })
}
