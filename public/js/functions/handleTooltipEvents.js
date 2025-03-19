function handleTooltipEvents () {
  document.body.addEventListener('mousemove', (event) => {
    if (!event.target.classList.contains('each-tooltip-info-hover') && !event.target.parentNode.classList.contains('each-tooltip-info-hover') && !event.target.parentNode.parentNode.classList.contains('each-tooltip-info-hover')) return document.querySelectorAll('.each-table-popup-info-content-hover').forEach(each => {
      each.classList.remove('each-table-popup-info-content-hover');
      setTimeout(() => {
        each.style.left = '0px';
        each.style.top = '0px';
      }, 0.25 * 1000);
    });
    let target = event.target;
    while (!target.classList.contains('each-tooltip-info-hover')) target = target.parentNode;
    document.querySelectorAll('.each-table-popup-info-content-hover').forEach(each => each.classList.remove('each-table-popup-info-content-hover'))

    target.previousSibling.style.left = event.pageX + 5 + 'px';
    target.previousSibling.style.top = event.pageY + 5 + 'px';
    target.previousSibling.classList.add('each-table-popup-info-content-hover');
  })

  document.body.addEventListener('mousemove', (event) => {
    let target = event.target;
    while (target != document.body && !target.classList.contains('validator-inactivity-display')) target = target.parentNode;
    if (!target.classList.contains('validator-inactivity-display')) return document.querySelectorAll('.inactivity-display-content').forEach(each => {
      each.style.display = 'none'
    });
    const inactivityIntervals = target.getAttribute('value').split(',');

    const inactivityDisplayContent = document.querySelector('.inactivity-display-content');
    inactivityDisplayContent.innerHTML = '';
    inactivityDisplayContent.style.display = 'flex';
    
    inactivityDisplayContent.style.left = (event.pageX - 200) + 'px';
    inactivityDisplayContent.style.top = event.pageY + 20 + 'px';

    let i = 0;
    while (i < inactivityIntervals.length - 1) {
      const eachInactivityValue = document.createElement('div');
      if (i == 0) {
        const eachInactivityTitle = document.createElement('div');
        eachInactivityTitle.innerHTML = 'Validator was inactive!';
        inactivityDisplayContent.appendChild(eachInactivityTitle);
      }
      eachInactivityValue.innerHTML = `From ${new Date(parseInt(inactivityIntervals[i])).toLocaleDateString('en-GB')} to ${new Date(parseInt(inactivityIntervals[i + 1])).toLocaleDateString('en-GB')}`
      inactivityDisplayContent.appendChild(eachInactivityValue);
      i += 2;
    }

    document.body.appendChild(inactivityDisplayContent);
  })
}