
function handleNavbar () {
  const navbarViewToggle = document.getElementById('navbar-view-toggle');
  const navbarWrapper = document.getElementById('navbar-wrapper');

  navbarViewToggle.addEventListener('click', (event) => {
    if (navbarWrapper.classList.contains('navbar-close')) {
      document.documentElement.style.setProperty("--navbar-width", "237px");
      navbarWrapper.classList.remove('navbar-close');
      setCookie('isNavbarClose', '');
    } else {
      document.documentElement.style.setProperty("--navbar-width", "50px");
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
  })
}
