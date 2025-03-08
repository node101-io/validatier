
function handleNetworkSwitch (currentNetwork) {
  const identifiersArray = ['cosmoshub', 'agoric', 'lava-mainnet', 'osmosis', 'celestia'];
  const networkSwitchDropdown = document.getElementById('network-switch-dropdown');

  const promises = [];
  for (let i = 0; i < identifiersArray.length; i++) {
    const eachIdentifier = identifiersArray[i];
    const promise = new Promise((resolve) => {
      serverRequest(
        `https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/cosmos/${eachIdentifier.trim()}.json`,
        'GET',
        {},
        (response => {
          return resolve({
            chainName: response.chainName,
            chainId: response.chainId,
            chainSymbolImageUrl: response.chainSymbolImageUrl  
          })
        })
      )
    })

    promises.push(promise);
  }

  function setSelectedChain (name, chainId, src) {
    document.getElementById('current-network-name').innerHTML = name;
    document.getElementById('current-network-chain-id').innerHTML = chainId;
    document.getElementById('current-network-img').src = src;
  }

  Promise.all(promises)
    .then(chains => {
      chains.forEach(eachChain => {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '10px';
        container.style.padding = '10px';
        container.id = eachChain.chainId;

        if (currentNetwork == eachChain.chainId) setSelectedChain(eachChain.chainName, eachChain.chainId, eachChain.chainSymbolImageUrl);

        container.addEventListener('click', () => {
          setSelectedChain(eachChain.chainName, eachChain.chainId, eachChain.chainSymbolImageUrl);
          networkSwitchDropdown.classList.remove('network-switch-dropdown-open');
          localStorage.setItem('selected-network-chain-id', eachChain.chainId);
        })

        const img = document.createElement('img');
        img.style.width = '40px'; img.style.height = '40px';
        img.src = eachChain.chainSymbolImageUrl;
        img.alt = eachChain.chainId;
        container.appendChild(img);
        
        const infoWrapper = document.createElement('div');
        infoWrapper.className = 'network-switch-network-info-wrapper';
        infoWrapper.style.flexDirection = 'row';
        infoWrapper.style.alignItems = 'center';
        infoWrapper.style.gap = '10px';
        
        const titleElement = document.createElement('div');
        titleElement.className = 'network-switch-network-title';
        titleElement.style.textWrap = 'nowrap';
        titleElement.innerHTML = eachChain.chainName;
        
        const chainIdElement = document.createElement('div');
        chainIdElement.className = 'network-switch-network-chain-id';
        chainIdElement.style.textWrap = 'nowrap';
        chainIdElement.innerHTML = eachChain.chainId;
        
        infoWrapper.appendChild(titleElement);
        infoWrapper.appendChild(chainIdElement);
        container.appendChild(infoWrapper);
        
        networkSwitchDropdown.appendChild(container);
      })
    })


  const networkSwitchHeader = document.getElementById('network-switch-header');
  networkSwitchHeader.addEventListener('click', (event) => {
    if (!networkSwitchDropdown.classList.contains('network-switch-dropdown-open')) networkSwitchDropdown.classList.add('network-switch-dropdown-open');
    else networkSwitchDropdown.classList.remove('network-switch-dropdown-open');
  })
}
