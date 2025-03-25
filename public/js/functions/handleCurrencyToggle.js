
function handleCurrencyToggle () {
  const currencyToggle = document.getElementById('currency-toggle');

  currencyToggle.addEventListener('change', (err) => {
    currencyToggle.value == 'native' ? currencyToggle.value = 'usd' : currencyToggle.value = 'native';

    document.querySelectorAll('.validator-each-numeric-info').forEach(each => (!each.classList.contains('validator-ratio')) ? each.innerHTML = each.getAttribute(currencyToggle.value) : '');
    document.querySelectorAll('.each-vertical-label').forEach(each => each.innerHTML = each.getAttribute(currencyToggle.value));
    document.querySelectorAll('.each-data-point-value-display-legend-text').forEach(each => each.innerHTML = each.getAttribute(currencyToggle.value));
    setCookie('currency_type', currencyToggle.value, 7);
  })
}
