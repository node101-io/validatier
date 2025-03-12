function createSpinner(size) {

  const spinner = document.createElement('div');
  spinner.classList.add('spinner')
  spinner.style.width = size + 'px';
  spinner.style.height = size + 'px';

  return spinner;
}
