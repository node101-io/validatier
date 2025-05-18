
function handleCurrencyToggle () {

  document.body.addEventListener('click', (event) => {

    let target = event.target;
    while (target != document.body && !target.classList.contains('each-currency-switch-wrapper')) target = target.parentNode;
    if (!target.classList.contains('each-currency-switch-wrapper')) return;

    const currencyToggle = document.getElementById('currency-toggle');

    currencyToggle.value = target.getAttribute('value');
    target.parentNode.querySelectorAll('.general-choice-radio-button-inner-circle')
      .forEach(each => {
        if (each.getAttribute('value') == target.getAttribute('value')) return each.style.display = 'unset';
        return each.style.display = 'none';
      })

    document.querySelectorAll('.validator-each-numeric-info').forEach(each => (!each.classList.contains('validator-ratio')) ? each.innerHTML = each.getAttribute(currencyToggle.value) : '');
    document.querySelectorAll('.each-vertical-label').forEach(each => each.innerHTML = each.getAttribute(currencyToggle.value));
    setCookie('currency_type', currencyToggle.value, 7);
  })
}
