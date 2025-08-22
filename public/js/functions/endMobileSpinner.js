function endMobileSpinner () {
  const startButton = document.getElementById('mobile-intro-start-button');

  if (!startButton)
    return console.log('startButton not found');

  const textEl = startButton.querySelector('#mobile-intro-start-button-text');
  if (!textEl)
    return console.log('textEl not found');

  const spinnerEl = startButton.querySelector('#mobile-intro-start-button-spinner');
  if (!spinnerEl)
    return console.log('spinnerEl not found');

  spinnerEl.remove();
  textEl.style.display = 'block';

  startButton.removeAttribute('disabled');
}