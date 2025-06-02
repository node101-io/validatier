
function changeSummaryGraph (target) {
  document.querySelectorAll('.each-sub-menu-link-content').forEach(eachLink => {
    eachLink.classList.remove('navbar-link-selected');
  });

  target.classList.add('navbar-link-selected');
  history.replaceState(null, '', `/${target.id != 'dashboard' ? target.id : ''}`);
  if (target.id != 'validators') {
    document.getElementById('validators-leaderboards-all-wrapper').classList.add('section-hidden');
    document.getElementById('network-summary-main-wrapper').classList.remove('section-hidden');
    document.getElementById('validator-details-main-wrapper').classList.add('section-hidden');
    document.getElementById('all-validators-main-wrapper').classList.remove('section-hidden');
  } else {
    document.getElementById('all-validators-main-wrapper').classList.remove('section-hidden');
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
    
  createNetworkSummaryGraph(dataFields, colors);
}

function resizeNavbar (navbarWrapper) {

  if (window.innerWidth < 1000) {
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

  if (window.innerWidth < 1000 && navbarWrapper.classList.contains('navbar-close')) {
    document.documentElement.style.setProperty("--navbar-width", "30px");
    navbarViewToggle.querySelector('span').classList.add('navbar-arrow-close');
  }

  navbarViewToggle.addEventListener('click', (event) => {
    setTimeout(() => {
      const graphWrappersArray = document.querySelectorAll('.validator-graph-wrapper');

      for (let i = 0; i < graphWrappersArray.length; i++) {
        const eachGraphWrapper = graphWrappersArray[i];
        const operatorAddress = eachGraphWrapper.getAttribute('operator_address');
        const graphWidth = eachGraphWrapper.parentNode.offsetWidth;
        
        document.documentElement.style.setProperty(
          `--graph-column-width-px-${operatorAddress.replace('\\@', '@')}`,
          `calc((${graphWidth - 10}px - var(--vertical-axis-labels-width)) / var(--number-of-columns-${operatorAddress}))`
        );
        document.documentElement.style.setProperty(
          `--graph-column-width-${operatorAddress.replace('\\@', '@')}`, 
          `calc((${graphWidth - 10} - var(--vertical-axis-labels-width-int)) / var(--number-of-columns-${operatorAddress}))`
        );
      }
    }, 0.25 * 1000);
    if (navbarWrapper.classList.contains('navbar-close')) {
      document.documentElement.style.setProperty("--navbar-width", "237px");
      navbarWrapper.classList.remove('navbar-close');
      navbarViewToggle.querySelector('span').classList.remove('navbar-arrow-close');
      
      if (window.innerWidth <= 1000)
        navbarViewToggle.style.left = 'calc(237px - 32px - (2 * var(--navbar-horizontal-padding)) + var(--navbar-view-toggle-left))';

      setCookie('isNavbarClose', '');
    } else {
      document.documentElement.style.setProperty("--navbar-width", "30px");
      navbarWrapper.classList.add('navbar-close');
      navbarViewToggle.querySelector('span').classList.add('navbar-arrow-close');
      navbarViewToggle.style.left = 'var(--navbar-view-toggle-left)';
      setCookie('isNavbarClose', true);
    }
  })

  document.addEventListener('click', (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-sub-menu-link-content') && target.id != 'network-summary-stat-percentage_sold') target = target.parentNode;
    if (!target.classList.contains('each-sub-menu-link-content') && target.id != 'network-summary-stat-percentage_sold') return;

    if (target.id == 'network-summary-stat-percentage_sold') return changeSummaryGraph(document.getElementById('percentage_sold_graph'));
    return changeSummaryGraph(target);
  })

  window.addEventListener('popstate', function(event) {
    const target = document.getElementById(window.location.pathname.replace('/', '') || '');
    return changeSummaryGraph(target);
  });

  window.addEventListener('resize', (event) => resizeNavbar(navbarWrapper));
}
