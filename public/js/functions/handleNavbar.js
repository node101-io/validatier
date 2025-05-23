
function resizeAllGraphs() {
  const graphWrappersArray = document.querySelectorAll('.validator-graph-wrapper');
  setTimeout(() => {

    for (let i = 0; i < graphWrappersArray.length; i++) {
      const eachGraphWrapper = graphWrappersArray[i];
      const operatorAddress = eachGraphWrapper.getAttribute('operator_address');
      const columnWrapper = eachGraphWrapper.querySelector('.each-graph-column-wrapper');
      if (!columnWrapper) return;
      
      const graphWidth = eachGraphWrapper.getBoundingClientRect().width;
      document.documentElement.style.setProperty(
        `--graph-column-width-px-${operatorAddress.replace('\\@', '@')}`,
        `calc((${graphWidth - 10}px - var(--vertical-axis-labels-width)) / var(--number-of-columns-${operatorAddress}))`
      );
      document.documentElement.style.setProperty(
        `--graph-column-width-${operatorAddress.replace('\\@', '@')}`, 
        `calc((${graphWidth - 10} - var(--vertical-axis-labels-width-int)) / var(--number-of-columns-${operatorAddress}))`
      );
    }
    isResizing = false;
  }, 10);
}

function resizeNavbar (navbarWrapper) {
  if (window.innerWidth < 900) {
    document.documentElement.style.setProperty("--navbar-width", "36px");
    document.getElementById('all-main-wrapper').style.marginLeft = '76px';
    return navbarWrapper.classList.add('navbar-close');
  }
  document.documentElement.style.setProperty("--navbar-width", "237px");
  document.getElementById('all-main-wrapper').style.marginLeft = '0px';
  return navbarWrapper.classList.remove('navbar-close');
}

function handleNavbar () {
  const navbarViewToggle = document.getElementById('navbar-view-toggle');
  const navbarWrapper = document.getElementById('navbar-wrapper');

  if (window.innerWidth < 900 && navbarWrapper.classList.contains('navbar-close')) {
    document.getElementById('all-main-wrapper').style.marginLeft = '76px';
    document.documentElement.style.setProperty("--navbar-width", "30px");
  }

  navbarViewToggle.addEventListener('click', (event) => {
    if (navbarWrapper.classList.contains('navbar-close')) {
      document.documentElement.style.setProperty("--navbar-width", "237px");
      navbarWrapper.classList.remove('navbar-close');
      setCookie('isNavbarClose', '');
    } else {
      document.documentElement.style.setProperty("--navbar-width", "30px");
      navbarWrapper.classList.add('navbar-close');
      setCookie('isNavbarClose', true);
    }
  })

  document.addEventListener('click', (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-sub-menu-link-content')) target = target.parentNode;
    if (!target.classList.contains('each-sub-menu-link-content')) return;

    document.querySelectorAll('.each-sub-menu-link-content').forEach(eachLink => {
      eachLink.classList.remove('navbar-link-selected');
    });

    target.classList.add('navbar-link-selected');
    history.replaceState(null, '', `/${target.id}`);
    if (target.id != 'validators') {
      document.getElementById('validators-leaderboards-all-wrapper').classList.add('section-hidden');
      document.getElementById('network-summary-main-wrapper').classList.remove('section-hidden');
      document.getElementById('validator-details-main-wrapper').classList.add('section-hidden');
    } else {
      document.getElementById('validators-leaderboards-all-wrapper').classList.remove('section-hidden');
      document.getElementById('network-summary-main-wrapper').classList.add('section-hidden');
      document.getElementById('validator-details-main-wrapper').classList.add('section-hidden');
    }

    const dataFields = JSON.parse(target.getAttribute('dataFields'));
    const colors = JSON.parse(target.getAttribute('colors'));
    const graphTitle = target.getAttribute('graph_title');
    const graphDescription = target.getAttribute('graph_description');

    if (!dataFields || !colors || !graphTitle || !graphDescription) return;

    document.getElementById('summary-graph-title').innerHTML = graphTitle;
    document.getElementById('summary-graph-description').innerHTML = graphDescription;
    
    const selectedOption = document.querySelector('.each-network-summary-select-option-selected');
    const by = selectedOption.getAttribute('option');
    
    createNetworkSummaryGraph(dataFields, colors, by);
  })

  window.addEventListener('resize', (event) => resizeNavbar(navbarWrapper));
}
