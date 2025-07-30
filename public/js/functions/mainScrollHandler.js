function mainScrollHandler() {
  const allMainWrapper = document.getElementById('all-main-wrapper');
  const introMainWrapper = document.getElementById('intro-main-wrapper');
  const selectedRange = document.getElementById('selected-range');
  const pickerMainWrapper = document.getElementById('picker-main-wrapper');

  const headerBannerWrapper = document.getElementById('header-banner-wrapper');
  const bannerTitle = document.getElementById('banner-title');

  const headerMainWrapper = document.getElementById('header-main-wrapper');
  const datePicker = document.getElementById('date-picker');
  const searchWrapper = document.querySelector('.search-wrapper');
  const innerMainWrapper = document.getElementById('inner-main-wrapper');

  allMainWrapper.addEventListener('scroll', (event) => {    
    if (window.location.href.includes('validator=')) return;

    const scrollThreshold = window.innerWidth <= 500
      ? 134
      : 234;

    const scrollNormalizer = scrollThreshold + 40;

    const scrollTop = event.target.scrollTop;
    introMainWrapper.style.transform = `translateY(-${Math.min(scrollTop, scrollNormalizer)}px)`;

    headerMainWrapper.style.height = `var(--header-main-wrapper-height)`;
    innerMainWrapper.style.marginTop = '150px';

    if (scrollTop < scrollThreshold) {
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

      headerMainWrapper.classList.remove('header-main-wrapper-main');
      headerMainWrapper.style.background = 'var(--header-main-background-initial)';
      datePicker.style.display = 'var(--date-picker-display-initial)';

      pickerMainWrapper.style.border = 'var(--picker-main-wrapper-border-size-initial) solid var(--general-main-wrapper-border-color)'
      pickerMainWrapper.style.borderTop = 'none';

      headerBannerWrapper.style.height = 'var(--header-banner-wrapper-height-initial)';
      headerBannerWrapper.style.marginLeft = 'var(--header-banner-wrapper-margin-left-initial)';
      bannerTitle.style.marginTop = 'var(--banner-title-content-margin-top-initial)';
      bannerTitle.style.fontSize = 'var(--banner-title-content-font-size-initial)';
    } else {
      searchWrapper.style.visibility = 'visible';
      bannerTitle.style.color = 'var(--banner-title-content-color-main)';
      document.documentElement.style.setProperty('--banner-logo-color', 'rgba(37, 0, 84, 1)');
      document.documentElement.style.setProperty('--selected-range-logo-color', 'rgba(124, 112, 195, 1)');

      selectedRange.style.background = 'var(--selected-range-background)';
      selectedRange.style.backdropFilter = 'var(--selected-range-backdrop-filter)';
      selectedRange.style.border = 'var(--selected-range-border-size) solid var(--selected-range-border-color)';
      selectedRange.style.color = 'var(--selected-range-color)';

      searchWrapper.style.opacity = `${Math.min(1 - ((scrollNormalizer - scrollTop) / (scrollNormalizer - scrollThreshold)), 1)}`;
      headerMainWrapper.style.height = `calc(var(--header-main-wrapper-height) * ${1 - 0.34 * Math.max(0, Math.min((scrollTop - scrollThreshold) / 100, 1))})`;
    
      headerMainWrapper.classList.add('header-main-wrapper-main');
      headerMainWrapper.style.background = 'var(--header-main-background)';
      datePicker.style.display = 'var(--date-picker-display)';

      pickerMainWrapper.style.border = 'var(--picker-main-wrapper-border-size) solid var(--general-main-wrapper-border-color)'
      pickerMainWrapper.style.borderTop = 'none';

      headerBannerWrapper.style.height = 'var(--header-banner-wrapper-height)';
      headerBannerWrapper.style.marginLeft = 'var(--header-banner-wrapper-margin-left)';
      bannerTitle.style.marginTop = 'var(--banner-title-content-margin-top)';
      bannerTitle.style.fontSize = 'var(--banner-title-content-font-size)';
    }
  });

  const startButton = document.getElementById('mobile-intro-start-button');
  const mobileMenuStartWrapper = document.getElementById('mobile-menu-start-wrapper');
  const mobileMenuTitleWrapper = document.getElementById('mobile-menu-title-wrapper');
  const mobileMenuDescriptionWrapper = document.getElementById('mobile-menu-description-wrapper');

  startButton.addEventListener('click', (event) => {
    document.querySelectorAll('.ellipse-left').forEach(eachEllipse => {
      eachEllipse.style.transform = 'translateX(-1000px)';
      eachEllipse.style.opacity = '0';
      eachEllipse.style.scale = '1.5';
    })
    document.querySelectorAll('.ellipse-right').forEach(eachEllipse => {
      eachEllipse.style.transform = 'translateX(1000px)';
      eachEllipse.style.opacity = '0';
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