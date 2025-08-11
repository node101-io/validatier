
let selectedDateBottom = getCookie('selectedDateBottom')
  ? getCookie('selectedDateBottom')
  : new Date().toISOString().split('T')[0]

let selectedDateTop = getCookie('selectedDateTop')
  ? getCookie('selectedDateTop')
  : ''

function removeAllEventListeners(eventListeners) {
  eventListeners.forEach(({ element, event, listener }) => {
    element.removeEventListener(event, listener);
  });
  eventListeners.length = 0;
}

function updateDateInputs () {
  document.getElementById('header-range-bottom-block').innerHTML = new Date(selectedDateBottom).toLocaleDateString('en-US')
  document.getElementById('periodic-query-bottom-timestamp').value = selectedDateBottom;
  document.getElementById('header-range-top-block').innerHTML = selectedDateTop ? new Date(selectedDateTop).toLocaleDateString('en-GB') : 'pending'
  document.getElementById('periodic-query-top-timestamp').value = selectedDateTop;

  if (selectedDateBottom && selectedDateTop) {
    const loadingWrapper = document.createElement('div');
    loadingWrapper.classList.add('date-picker-open-loading-wrapper');

    const loadingSpan = document.createElement('div');
    loadingSpan.innerHTML = 'Loading';
    
    loadingWrapper.appendChild(loadingSpan);
    loadingWrapper.appendChild(createSpinner(10));

    document.getElementById('picker-main-wrapper').appendChild(loadingWrapper);
    window.location.reload();
  }
}

function generateMonthContent (currentYearValue, currentMonthValue, startDay) {
  const currentChainFirstAvailableTime = document.getElementById('network-switch-header').getAttribute('current_chain_first_available_time');
  document.getElementById('month-wrapper').innerHTML = '';
  document.getElementById('current-month-and-year-display').innerHTML = new Date(currentYearValue, currentMonthValue - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const currentMonth = getMonthInfo(currentYearValue, currentMonthValue, startDay)
  for (let i = 0; i < currentMonth.days.length; i++) {
    const eachDay = currentMonth.days[i];
    if (i == 0) {
      let weekCount = 0;
      const previousMonth = getMonthInfo(currentYearValue, currentMonthValue - 1);
      while (weekCount < eachDay.dayIndex) {
        const prevDateToBePushed = previousMonth.days[previousMonth.days.length - (eachDay.dayIndex - weekCount)];
  
        const date = document.createElement('div');
        date.classList.add('date');
        date.style.color = '#888';
        date.innerHTML = prevDateToBePushed.date;

        if (
          new Date(currentYearValue, currentMonthValue - 1, eachDay.date).getTime() > new Date().getTime() ||
          new Date(currentChainFirstAvailableTime).getTime() > new Date(currentYearValue, currentMonthValue - 1, eachDay.date).getTime()
        ) {
          date.style.pointerEvents = 'none';
          date.style.cursor = 'var(--pointer-default-dark)';
        }

        const dayToBeUsedAsDayInTheId = prevDateToBePushed.date.toString().length == 1 ? '0' + (prevDateToBePushed.date).toString() : prevDateToBePushed.date;
        const monthToBeUsedInTheId = (currentMonthValue - 1).toString().length == 1 ? '0' + (currentMonthValue - 1).toString() : currentMonthValue - 1;
        
        date.setAttribute('date', `${currentYearValue}-${monthToBeUsedInTheId}-${dayToBeUsedAsDayInTheId}`);
  
        document.getElementById('month-wrapper').appendChild(date);
        weekCount++;
      }
    }

    const date = document.createElement('div');
    date.classList.add('date');
    date.innerHTML = eachDay.date;
    if (
      new Date(currentYearValue, currentMonthValue - 1, eachDay.date).getTime() > new Date().getTime() ||
      new Date(currentChainFirstAvailableTime).getTime() > new Date(currentYearValue, currentMonthValue - 1, eachDay.date).getTime()
    ) {
      date.style.color = '#888';
      date.style.pointerEvents = 'none';
      date.style.cursor = 'var(--pointer-default-dark)';
    }

    const dayToBeUsedAsDayInTheId = eachDay.date.toString().length == 1 ? '0' + (eachDay.date).toString() : eachDay.date;
    const monthToBeUsedInTheId = (currentMonthValue).toString().length == 1 ? '0' + (currentMonthValue).toString() : currentMonthValue;
    
    date.setAttribute('date', `${currentYearValue}-${monthToBeUsedInTheId}-${dayToBeUsedAsDayInTheId}`);
    
    document.getElementById('month-wrapper').appendChild(date);

    if (i == currentMonth.days.length - 1) {
      let weekCount = 0;
      const nextMonth = getMonthInfo(currentYearValue, currentMonthValue + 1);
      while (weekCount < (6 - eachDay.dayIndex)) {
        const nextDateToBePushed = nextMonth.days[weekCount];
  
        const date = document.createElement('div');
        date.classList.add('date');
        date.style.color = '#888';
        date.innerHTML = nextDateToBePushed.date;
        
        if (
          new Date(currentYearValue, currentMonthValue - 1, eachDay.date).getTime() > new Date().getTime() ||
          new Date(currentChainFirstAvailableTime).getTime() > new Date(currentYearValue, currentMonthValue - 1, eachDay.date).getTime()
        ) {
          date.style.pointerEvents = 'none';
          date.style.cursor = 'var(--pointer-default-dark)';
        }

        const dayToBeUsedAsDayInTheId = nextDateToBePushed.date.toString().length == 1 ? '0' + (nextDateToBePushed.date).toString() : nextDateToBePushed.date;
        const monthToBeUsedInTheId = (currentMonthValue + 1).toString().length == 1 ? '0' + (currentMonthValue + 1).toString() : currentMonthValue + 1;
        
        date.setAttribute('date', `${currentYearValue}-${monthToBeUsedInTheId}-${dayToBeUsedAsDayInTheId}`);
  
        document.getElementById('month-wrapper').appendChild(date);
        weekCount++;
      }
    }
  }
}

function paintBlocksInBetween () {

  document.querySelectorAll('.middle-date').forEach(each => each.classList.remove('middle-date'));
  document.querySelectorAll('.selected-date-bottom').forEach(each => each.classList.remove('selected-date-bottom'));
  document.querySelectorAll('.selected-date-top').forEach(each => each.classList.remove('selected-date-top'));

  if (document.querySelector(`div[date='${selectedDateBottom}']`)) document.querySelector(`div[date='${selectedDateBottom}']`).classList.add('selected-date-bottom');
  if (document.querySelector(`div[date='${selectedDateTop}']`)) document.querySelector(`div[date='${selectedDateTop}']`).classList.add('selected-date-top');

  const allDateElements = document.querySelectorAll('.date');
  for (let i = 0; i < allDateElements.length; i++) {
    const eachDate = allDateElements[i];
    if (selectedDateBottom < eachDate.getAttribute('date') && eachDate.getAttribute('date') < selectedDateTop) eachDate.classList.add('middle-date');
  }
}


function getMonthInfo(year, month, startDay = 'monday') {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const monthInfo = {
    month: `${month.toString().padStart(2, '0')}/${year}`,
    firstDayIndex: firstDay.getDay(),
    lastDayIndex: lastDay.getDay(),
    days: []
  };

  const adjustDayIndex = (dayIndex) => {
    if (startDay === 'monday') {
      return (dayIndex === 0) ? 6 : dayIndex - 1; 
    }
    return dayIndex; 
  };

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month - 1, day);
    const dayIndex = adjustDayIndex(date.getDay());

    monthInfo.days.push({
      date: day,
      dayIndex: dayIndex
    });
  }

  return monthInfo;
}

const eventListeners = [];

function handleCalendarEvents (currentYearValue, currentMonthValue, startDay) {

  removeAllEventListeners(eventListeners);

  const monthWrapper = document.getElementById('month-wrapper');
  monthWrapper.innerHTML = '';

  const clickEventListener = (event) => {

    if (event.target.classList.contains('selected-range') || event.target.parentNode.classList.contains('selected-range') || event.target.parentNode.parentNode.classList.contains('selected-range')) {
      
      let target = event.target;
      while (!target.classList.contains('selected-range')) target = target.parentNode;

      if (!target.classList.contains('selected-range-open')) {
        target.classList.add('selected-range-open');
        target.parentNode.classList.add('date-picker-open');
        target.nextSibling.classList.add('picker-main-wrapper-open');
  
        target.children[target.children.length - 1].style.transform = 'rotateX(180deg) translateY(5px)';
      } else {
        target.classList.remove('selected-range-open')
        target.parentNode.classList.remove('date-picker-open');
        target.nextSibling.classList.remove('picker-main-wrapper-open');
  
        target.children[target.children.length - 1].style.transform = 'rotateX(0deg)';
      }

    } else if (event.target.classList.contains('left-wrapper-each-choice') && !event.target.classList.contains('selected')) { 
      event.target.parentNode.childNodes.forEach(eachLeftWrapperChoice => {
        eachLeftWrapperChoice.classList.remove('selected');
      })
      event.target.classList.add('selected');
      document.getElementById('header-selected-range-description').innerHTML = event.target.innerHTML;

      selectedDateBottom = getDateRange(new Date().toISOString().split('T')[0])[event.target.id].bottom;
      selectedDateTop = getDateRange(new Date().toISOString().split('T')[0])[event.target.id].top;
      
      setCookie('specificRange', event.target.id, 7);
      setCookie('specificRangeName', event.target.innerHTML, 7);
      setCookie('selectedDateBottom', selectedDateBottom, 7);
      setCookie('selectedDateTop', selectedDateTop, 7);

      generateMonthContent(new Date().getFullYear(), new Date().getMonth() + 1, startDay);
      paintBlocksInBetween();
      updateDateInputs();
    } else if (event.target.classList.contains('date')) {

      if ((new Date(event.target.getAttribute('date')).getTime()) > (new Date().getTime())) return;

      document.querySelectorAll('.left-wrapper-each-choice').forEach(eachLeftWrapperChoice => {
        eachLeftWrapperChoice.classList.remove('selected');
      })
      document.getElementById('custom').classList.add('selected');
      document.getElementById('header-selected-range-description').innerHTML = 'Custom';

      setCookie('specificRange', 'custom', 7);
      setCookie('specificRangeName', 'Custom', 7);

      if (!selectedDateBottom) {
        selectedDateBottom = event.target.getAttribute('date');
        selectedDateTop = '';
      }
      else if (selectedDateBottom && !selectedDateTop) {
        if (event.target.getAttribute('date') < selectedDateBottom) {
          selectedDateBottom = event.target.getAttribute('date');
          selectedDateTop = '';
        }
        else {
          selectedDateTop = event.target.getAttribute('date');
        }
      } else if (selectedDateBottom && selectedDateTop) {
        selectedDateBottom = event.target.getAttribute('date');
        selectedDateTop = '';
      }

      paintBlocksInBetween();
      updateDateInputs();
    } else {
      let target = event.target;
      while (target != document.documentElement && !target.classList.contains('date-picker')) target = target.parentNode;
      if (target.classList.contains('date-picker')) return;
      document.getElementById('selected-range').classList.remove('selected-range-open');
      document.getElementById('selected-range').parentNode.classList.remove('date-picker-open');
      document.getElementById('picker-main-wrapper').classList.remove('picker-main-wrapper-open');
    }
  }

  const changeEventListener = (event) => {
    
    if (!event.target.classList.contains('each-date-input')) return;

    if (event.target.id == 'periodic-query-bottom-timestamp') {
      selectedDateBottom = event.target.value;
      if (event.target.value > document.getElementById('periodic-query-top-timestamp').value) {
        selectedDateTop = '';
        document.getElementById('periodic-query-top-timestamp').value = '';
      }
    }
    else if (event.target.id == 'periodic-query-top-timestamp') {
      if (event.target.value < document.getElementById('periodic-query-bottom-timestamp').value) {
        document.getElementById('periodic-query-top-timestamp').value = '';
        selectedDateTop = '';
        selectedDateBottom = event.target.value;
      } else selectedDateTop = event.target.value;
    }
    paintBlocksInBetween();
    updateDateInputs();
  }

  const previousMonthListener = (event) => {
    currentMonthValue--;
    if (currentMonthValue == 0) {
      currentMonthValue = 12;
      currentYearValue--;
    }
    handleCalendarEvents(currentYearValue, currentMonthValue, 'monday');
  }

  const nextMonthListener = (event) => {
    currentMonthValue++;
    if (currentMonthValue == 13) {
      currentMonthValue = 1;
      currentYearValue++;
    }
    handleCalendarEvents(currentYearValue, currentMonthValue, 'monday');
  }

  generateMonthContent(currentYearValue, currentMonthValue, startDay);
  paintBlocksInBetween();

  document.addEventListener('focusout', changeEventListener);
  eventListeners.push({ element: document, event: 'focusout', listener: changeEventListener })

  document.getElementById('previous-month').addEventListener('click', previousMonthListener);
  eventListeners.push({ element: document.getElementById('previous-month'), event: 'click', listener: previousMonthListener });
  
  document.getElementById('next-month').addEventListener('click', nextMonthListener);
  eventListeners.push({ element: document.getElementById('next-month'), event: 'click', listener: nextMonthListener });
  
  document.addEventListener('click', clickEventListener);
  eventListeners.push({ element: document, event: 'click', listener: clickEventListener });
}
