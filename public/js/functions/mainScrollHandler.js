function mainScrollHandler() {
  const allMainWrapper = document.getElementById('all-main-wrapper');
  const introMainWrapper = document.getElementById('intro-main-wrapper');
  const selectedRange = document.getElementById('selected-range');

  const bannerTitle = document.getElementById('banner-title');

  const headerMainWrapper = document.getElementById('header-main-wrapper');
  const datePicker = document.getElementById('date-picker');
  const searchWrapper = document.getElementById('search-wrapper');

  allMainWrapper.addEventListener('scroll', (event) => {    
    if (window.location.href.includes('validator=')) return;
    const scrollTop = event.target.scrollTop;
    introMainWrapper.style.transform = `translateY(-${Math.min(scrollTop, 273)}px)`;

    if (scrollTop < 234) {
      bannerTitle.style.color = 'var(--banner-title-content-color-initial)';
      document.documentElement.style.setProperty('--banner-logo-color', 'rgba(245, 245, 255, 1)');
      document.documentElement.style.setProperty('--selected-range-logo-color', 'rgba(255, 255, 255, 1)');

      selectedRange.style.background = 'var(--selected-range-background-initial)';
      selectedRange.style.backdropFilter = 'var(--selected-range-backdrop-filter-initial)';
      selectedRange.style.border = 'var(--selected-range-border-size-initial) solid var(--selected-range-border-color-initial)';
      selectedRange.style.color = 'var(--selected-range-color-initial)';

      searchWrapper.style.visibility = 'hidden';
      searchWrapper.style.opacity = '0';
      headerMainWrapper.style.height = `var(--header-main-wrapper-height)`
    } else {
      searchWrapper.style.visibility = 'visible';
      bannerTitle.style.color = 'var(--banner-title-content-color-main)';
      document.documentElement.style.setProperty('--banner-logo-color', 'rgba(37, 0, 84, 1)');
      document.documentElement.style.setProperty('--selected-range-logo-color', 'rgba(124, 112, 195, 1)');
    
      selectedRange.style.background = 'var(--selected-range-background)';
      selectedRange.style.backdropFilter = 'var(--selected-range-backdrop-filter)';
      selectedRange.style.border = 'var(--selected-range-border-size) solid var(--selected-range-border-color)';
      selectedRange.style.color = 'var(--selected-range-color)';

      searchWrapper.style.opacity = `${Math.min(1 - ((273 - scrollTop) / (273 - 234)), 1)}`;
      headerMainWrapper.style.height = `calc(var(--header-main-wrapper-height) - ${Math.min(scrollTop - 234, 50)}px)`
    }

    if (scrollTop < 273) {
      headerMainWrapper.classList.remove('header-main-wrapper-main');
      headerMainWrapper.style.background = 'var(--header-main-background-initial)';
      datePicker.style.background = 'var(--date-picker-display-initial)';
    } else {
      headerMainWrapper.classList.add('header-main-wrapper-main');
      headerMainWrapper.style.background = 'var(--header-main-background)';
      datePicker.style.background = 'var(--date-picker-display)';
    }
  });

  const startButton = document.getElementById('mobile-intro-start-button');
  const mobileMenuStartWrapper = document.getElementById('mobile-menu-start-wrapper');
  const mobileMenuTitleWrapper = document.getElementById('mobile-menu-title-wrapper');
  const mobileMenuDescriptionWrapper = document.getElementById('mobile-menu-description-wrapper');

  startButton.addEventListener('click', (event) => {
    document.querySelectorAll('.ellipse-left').forEach(eachEllipse => {
      eachEllipse.style.transform = 'translateX(-1000px)';
      eachEllipse.style.scale = '1.5';
    })
    document.querySelectorAll('.ellipse-right').forEach(eachEllipse => {
      eachEllipse.style.transform = 'translateX(1000px)';
      eachEllipse.style.scale = '1.5';
    })

    document.querySelectorAll('.mobile-animate-star').forEach(eachStar => {
      eachStar.style.opacity = '0';
    })

    mobileMenuStartWrapper.style.opacity = '0';
    mobileMenuDescriptionWrapper.style.opacity = '0';

    document.querySelectorAll('.falling-star').forEach(eachFallingStar => {
      eachFallingStar.style.opacity = '1';
      eachFallingStar.style.transform = 'translate(400px, 400px)';
      eachFallingStar.querySelector('.falling-star-star').style.animation = 'spin 2s linear infinite';
      eachFallingStar.querySelector('.falling-star-trail').style.transform = 'translate(-90px, -90px)';
    })

    setTimeout(() => {
      mobileMenuStartWrapper.style.display = 'none';
    }, 2 * 1000);

    setCookie('isStartClicked', 'true', (1 / 24))
  })
}