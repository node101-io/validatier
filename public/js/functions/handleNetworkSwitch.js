
function setSelectedChain (name, chainId, src) {
  document.getElementById('current-network-name').innerHTML = name;
  document.getElementById('current-network-chain-id').innerHTML = chainId;
  document.getElementById('current-network-img').src = src;
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
    if (!networkSwitchDropdown.classList.contains('network-switch-dropdown-open')) networkSwitchDropdown.classList.add('network-switch-dropdown-open');
    else networkSwitchDropdown.classList.remove('network-switch-dropdown-open');
  })
}
