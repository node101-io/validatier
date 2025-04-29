
const rankingResponsesCache = {};

function setSelectedChain (pretty_name, symbol, src, name) {
  document.querySelectorAll('.current-network-name').forEach(each => each.innerHTML = pretty_name);
  document.querySelectorAll('.current-network-img').forEach(each => each.src = src);
  document.querySelectorAll('.network-switch-header').forEach(each => each.setAttribute('chain_identifier', name));
}

function handleNetworkSwitch () {

  const bottomDate = document.getElementById('periodic-query-bottom-timestamp').value;
  const topDate = document.getElementById('periodic-query-top-timestamp').value;
  const chainIdentifier = document.getElementById('network-switch-header').getAttribute('current_chain_identifier');

  const bottomTimestamp = Math.floor((new Date(bottomDate)).getTime());
  const topTimestamp = Math.floor((new Date(topDate)).getTime());

  const validatorsMainWrapper = document.getElementById('validators-main-wrapper');

  const response = {
    success: true,
    data: {
      validators: JSON.parse(validatorsMainWrapper.getAttribute('validators')),
      activeValidatorHistory: JSON.parse(validatorsMainWrapper.getAttribute('activeValidatorHistory'))
    }
  };

  rankingResponsesCache[bottomTimestamp + '.' + topTimestamp + '.' + chainIdentifier] = response;

  const networkSwitchInput = document.getElementById('network-switch-input');
  networkSwitchInput.addEventListener('keyup', (event) => {
    if (!networkSwitchInput.value || networkSwitchInput.value.length <= 0) return document.querySelectorAll('.each-chain-wrapper').forEach(each => each.style.display = 'flex');
    document.querySelectorAll('.each-chain-wrapper').forEach(each => {
      const eachTextContent = each.children[1].children[0].innerHTML.trim().toLowerCase();
      if (eachTextContent.includes(networkSwitchInput.value.trim().toLowerCase())) {
        each.style.display = 'flex';
      } else {
        each.style.display = 'none';
      }
    });
  })

  document.body.addEventListener('click', (event) => {
    
    let target = event.target;
    while (target != document.body && (!target.classList.contains('network-switch-header') && !target.classList.contains('network-switch-dropdown'))) target = target.parentNode;
    
    if (!target.classList.contains('network-switch-header') && !target.classList.contains('network-switch-dropdown')) {
      target.parentNode.querySelectorAll('.network-switch-dropdown-arrow').forEach(each => {
        each.style.transform = 'rotateX(0deg)';
        each.style.marginTop = '2px';
      });
      target.parentNode.querySelectorAll('.network-switch-dropdown').forEach(each => 
        each.classList.remove('network-switch-dropdown-open'));
      return;
    };

    if (target.classList.contains('network-switch-dropdown')) return;

    const networkSwitchDropdown = target.nextSibling;
    
    if (!networkSwitchDropdown.classList.contains('network-switch-dropdown-open')) {
      target.parentNode.querySelectorAll('.network-switch-dropdown-arrow').forEach(each => {
        each.style.transform = 'rotateX(180deg)';
        each.style.marginTop = '-8px';
      });
      target.parentNode.querySelectorAll('.network-switch-dropdown').forEach(each => 
        each.classList.add('network-switch-dropdown-open'));
    }
    else {
      target.parentNode.querySelectorAll('.network-switch-dropdown-arrow').forEach(each => {
        each.style.transform = 'rotateX(0deg)';
        each.style.marginTop = '2px';
      });
      target.parentNode.querySelectorAll('.network-switch-dropdown').forEach(each => 
        each.classList.remove('network-switch-dropdown-open'));
    };
  })

  document.body.addEventListener('click', (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-chain-wrapper')) target = target.parentNode;
    if (!target.classList.contains('each-chain-wrapper')) return;

    const networkSwitchDropdown = target.parentNode.parentNode;

    setSelectedChain(target.getAttribute('pretty_name'), target.getAttribute('symbol'), target.getAttribute('image'));
    networkSwitchDropdown.classList.remove('network-switch-dropdown-open');
    setCookie('network', target.getAttribute('name'), 7);
        
    const bottomDate = document.getElementById('periodic-query-bottom-timestamp').getAttribute('value');
    const topDate = document.getElementById('periodic-query-top-timestamp').getAttribute('value');
    
    setCookie('selectedDateBottom', bottomDate, 7);
    setCookie('selectedDateTop', topDate, 7);

    const bottomTimestamp = Math.floor(new Date(bottomDate).getTime());
    const topTimestamp = Math.floor(new Date(topDate).getTime());

    const GET_VALIDATORS_API_ENDPOINT = 'validator/rank_validators';
    const BASE_URL = !window.location.href.includes('#') ? window.location.href : window.location.href.split('#')[0];
  
    const chainIdentifier = target.getAttribute('name');
    const chainSymbol = target.getAttribute('symbol');
    const chainDecimals = target.getAttribute('decimals');
    const usdExchangeRate = target.getAttribute('usd_exchange_rate');
    const firstAvailableTime = target.getAttribute('first_available_time');

    const cacheResponse = rankingResponsesCache[bottomTimestamp + '.' + topTimestamp + '.' + chainIdentifier];
    
    document.getElementById('network-switch-header').setAttribute('current_chain_identifier', chainIdentifier);
    document.getElementById('network-switch-header').setAttribute('current_chain_symbol', chainSymbol);
    document.getElementById('network-switch-header').setAttribute('current_chain_decimals', chainDecimals);
    document.getElementById('network-switch-header').setAttribute('current_chain_usd_exhange_rate', usdExchangeRate);
    document.getElementById('network-switch-header').setAttribute('current_chain_first_available_time', firstAvailableTime);

    if (cacheResponse) return generateValidatorRankingContent(cacheResponse, 'ratio', 'desc');

    displaySkeleton();

    serverRequest(
      BASE_URL + GET_VALIDATORS_API_ENDPOINT + `?sort_by=ratio&order=desc&bottom_timestamp=${bottomTimestamp}&top_timestamp=${topTimestamp}&chain_identifier=${chainIdentifier}&with_photos`,
      'GET',
      {},
      (response) => {
        generateValidatorRankingContent(response, 'ratio', 'desc');
        rankingResponsesCache[bottomTimestamp + '.' + topTimestamp + '.' + chainIdentifier] = response;
      }
    )
  })
}
