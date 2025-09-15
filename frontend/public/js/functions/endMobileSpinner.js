function endMobileSpinner () {
  const startButton = document.getElementById('mobile-intro-start-button');

  if (!startButton) return;

  startButton.classList.remove('display-none');

  const spinnerEl = document.querySelector('#mobile-intro-start-button-spinner');
  if (!spinnerEl)
    return console.log('spinnerEl not found');

  spinnerEl.remove();
}