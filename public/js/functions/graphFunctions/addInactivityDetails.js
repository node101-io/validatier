function formatTimestampToDate(timestamp) {
  if (!timestamp) return 'today';
  const date = new Date(timestamp);
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
}

function addInactivityDetails(operatorAddress, response) {
  const inactivityIntervals = response.data;
  const validatorInactivityWrapper = document.getElementById(`${operatorAddress}-inactivity-wrapper`);

  if (!inactivityIntervals.length) {
    const eachDetailWrapper = document.createElement('div');
    eachDetailWrapper.classList.add('validator-activeness-always-content');
    eachDetailWrapper.innerHTML = 'Validator was always active';
    return validatorInactivityWrapper.appendChild(eachDetailWrapper);
  }

  for (let i = 0; i < inactivityIntervals.length; i += 2) {
    const eachDetailText = `${formatTimestampToDate(inactivityIntervals[i])} - ${formatTimestampToDate(inactivityIntervals[i + 1] || '')}`
  
    const eachDetailWrapper = document.createElement('div');
    eachDetailWrapper.classList.add('each-inactivity-line-display-content');
    eachDetailWrapper.innerHTML = eachDetailText;
    validatorInactivityWrapper.appendChild(eachDetailWrapper);
  }
}