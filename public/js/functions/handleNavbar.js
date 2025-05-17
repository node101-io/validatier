
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
}
