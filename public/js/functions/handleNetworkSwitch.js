
const rankingResponsesCache = {};

function setSelectedChain (pretty_name, chainId, src, name) {
  document.getElementById('current-network-name').innerHTML = pretty_name;
  document.getElementById('current-network-chain-id').innerHTML = chainId;
  document.getElementById('current-network-img').src = src;
  document.getElementById('network-switch-header').setAttribute('chain_identifier', name);
}

function handleNetworkSwitch (currentNetwork) {

  const networkSwitchInput = document.getElementById('network-switch-input');
  networkSwitchInput.addEventListener('keyup', (event) => {
    if (!networkSwitchInput.value || networkSwitchInput.value.length < 3) return document.querySelectorAll('.each-chain-wrapper').forEach(each => each.style.display = 'flex');
    document.querySelectorAll('.each-chain-wrapper').forEach(each => {
      if (each.children[1].children[0].innerHTML.includes(networkSwitchInput.value) || each.children[1].children[1].innerHTML.includes(networkSwitchInput.value)) {
        each.style.display = 'flex';
      } else {
        each.style.display = 'none';
      }
    });
  })

  const networkSwitchHeader = document.getElementById('network-switch-header');
  const networkSwitchDropdown = document.getElementById('network-switch-dropdown');
  networkSwitchHeader.addEventListener('click', (event) => {
    if (!networkSwitchDropdown.classList.contains('network-switch-dropdown-open')) {
      document.getElementById('network-switch-dropdown-arrow').style.transform = 'rotateX(180deg)';
      document.getElementById('network-switch-dropdown-arrow').style.marginTop = '-10px';
      networkSwitchDropdown.classList.add('network-switch-dropdown-open');
    }
    else {
      document.getElementById('network-switch-dropdown-arrow').style.transform = 'rotateX(0deg)';
      document.getElementById('network-switch-dropdown-arrow').style.marginTop = '0px';
      networkSwitchDropdown.classList.remove('network-switch-dropdown-open');
    };
  })

  document.body.addEventListener('click', (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-chain-wrapper')) target = target.parentNode;
    if (!target.classList.contains('each-chain-wrapper')) return;

    setSelectedChain(target.getAttribute('pretty_name'), target.getAttribute('chain_id'), target.getAttribute('image'));
    networkSwitchDropdown.classList.remove('network-switch-dropdown-open');
    setCookie('network', target.getAttribute('name'), 7);
        
    const bottomDate = document.getElementById('periodic-query-bottom-timestamp').value;
    const topDate = document.getElementById('periodic-query-top-timestamp').value

    
    setCookie('selectedDateBottom', bottomDate, 7);
    setCookie('selectedDateTop', topDate, 7);

    const bottomTimestamp = Math.floor(new Date(bottomDate).getTime());
    const topTimestamp = Math.floor(new Date(topDate).getTime());

    const GET_VALIDATORS_API_ENDPOINT = 'validator/rank_validators';
    const BASE_URL = !window.location.href.includes('#') ? window.location.href : window.location.href.split('#')[0];
  
    const chainIdentifier = target.getAttribute('name');
    const chainSymbol = target.getAttribute('symbol');
    const chainDecimals = target.getAttribute('decimals');

    const cacheResponse = rankingResponsesCache[bottomDate + '.' + topTimestamp + '.' + chainIdentifier];
    
    document.getElementById('network-switch-header').setAttribute('current_chain_identifier', chainIdentifier);
    document.getElementById('network-switch-header').setAttribute('current_chain_symbol', chainSymbol);
    document.getElementById('network-switch-header').setAttribute('current_chain_decimals', chainDecimals);

    if (cacheResponse) return generateValidatorRankingContent(cacheResponse, 'ratio', 'desc');

    displaySkeleton();

    serverRequest(
      BASE_URL + GET_VALIDATORS_API_ENDPOINT + `?sort_by=ratio&order=desc&bottom_timestamp=${bottomTimestamp}&top_timestamp=${topTimestamp}&chain_identifier=${chainIdentifier}&with_photos`,
      'GET',
      {},
      (response) => {
        generateValidatorRankingContent(response, 'ratio', 'desc');
        rankingResponsesCache[bottomDate + '.' + topTimestamp + '.' + chainIdentifier] = response;
      }
    )
  })
}
