
function insertValidator (validatorMoniker, operator_address, imageSrc) {
  const eachValidator = document.createElement('a');
  eachValidator.style.display = 'flex';
  eachValidator.style.margin = '10px';
  eachValidator.style.alignItems = 'center';
  eachValidator.style.gap = '10px';
  eachValidator.href = '#' + operator_address;

  eachValidator.addEventListener('click', (event) => {
    document.getElementById(operator_address).style.scale = '1.2';
    setTimeout(() => {
      document.getElementById(operator_address).style.scale = '1';
    }, 0.25 * 1000)
  })

  const validatorImageWrapper = document.createElement('div');
  validatorImageWrapper.classList.add('validator-image');
  
  const img = document.createElement('img');
  img.style.width = '30px'; img.style.height = '30px';
  img.src = imageSrc;

  validatorImageWrapper.appendChild(img);

  const textualInfoWrapper = document.createElement('div');
  textualInfoWrapper.classList.add('validator-textual-info-wrapper');

  const moniker = document.createElement('div');
  moniker.classList.add('validator-moniker');
  moniker.innerHTML = validatorMoniker.length < 15 ? validatorMoniker : validatorMoniker.slice(0, 12) + '...';

  textualInfoWrapper.appendChild(moniker);

  eachValidator.appendChild(validatorImageWrapper);
  eachValidator.appendChild(textualInfoWrapper);

  document.getElementById('validator-filter-input-result-wrapper').appendChild(eachValidator);
}

function handleValidatorSearch () {
  const validatorFilterInput = document.getElementById('validator-filter-input');
  const monikers = Array.from(document.querySelectorAll('.validator-moniker')).map(each => each.innerHTML);
  const operatorAddresses = Array.from(document.querySelectorAll('.validator-operator-address')).map(each => each.innerHTML);
  const images = Array.from(document.querySelectorAll('.validator-image-content')).map(each => each.src);

  document.addEventListener('mouseup', (event) => {
    if (!event.target.classList || (!event.target.classList.contains('validator-filter-input') && !event.target.classList.contains('validator-filter-input-result-wrapper') && !event.target.parentNode.classList.contains('validator-filter-input-result-wrapper') && !event.target.parentNode.parentNode.classList.contains('validator-filter-input-result-wrapper'))) {
      document.getElementById('validator-dropdown-icon').style.transform = 'rotateX(0deg)';
      document.getElementById('validator-filter-input-result-wrapper').classList.remove('validator-filter-input-result-wrapper-open');
    }
  })

  validatorFilterInput.addEventListener('mouseup', (event) => {
    document.getElementById('validator-dropdown-icon').style.transform = 'rotateX(180deg)';
    document.getElementById('validator-filter-input-result-wrapper').classList.add('validator-filter-input-result-wrapper-open');
  })

  validatorFilterInput.addEventListener('keydown', (event) => {
    const preInputWrapper = document.getElementById('validator-filter-result-pre-input-animation-wrapper');
    if (!preInputWrapper) return;
    const inputLength = validatorFilterInput.value.length;
    preInputWrapper.children[inputLength].style.transform = 'translateY(10px)';
    preInputWrapper.children[inputLength].style.height = '25px';
    setTimeout(() => {
      preInputWrapper.children[inputLength].style.transform = 'translateY(0px)';
      preInputWrapper.children[inputLength].style.height = '30px';
    }, 0.25 * 1000)
  })

  validatorFilterInput.addEventListener('keyup', (event) => {
    if (!validatorFilterInput.value) {

      document.getElementById('validator-filter-input-result-wrapper').innerHTML = '';
      
      const parentWrapper = document.createElement('div');
      parentWrapper.id = 'validator-filter-result-pre-input-animation-wrapper';
      parentWrapper.classList.add('center');
      parentWrapper.style.gap = '10px';
      parentWrapper.style.height = '100%';
  
  
      for (let i = 0; i < 3; i++) {
        const ball = document.createElement('div');
        ball.classList.add('each-pre-input-animation-ball');
        parentWrapper.appendChild(ball);
      }
    
      document.getElementById('validator-filter-input-result-wrapper').appendChild(parentWrapper);
    } else {
      if (validatorFilterInput.value.length < 4) return;
      document.getElementById('validator-filter-input-result-wrapper').innerHTML = '';
      for (let i = 0; i < monikers.length; i++) {
        const eachMoniker = monikers[i];
        const eachOperatorAddress = operatorAddresses[i];
  
        if (
          eachMoniker.includes(validatorFilterInput.value.trim().toLowerCase()) || 
          eachOperatorAddress.includes(validatorFilterInput.value.trim().toLowerCase())
        ) {
          insertValidator(monikers[i], operatorAddresses[i], images[i]);
        }
      }
    }
  })
}
