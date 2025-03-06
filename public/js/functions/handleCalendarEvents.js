
const SELECTED_DATE_CLASS_NAME = 'selected-date';
const SELECTED_BOTTOM_DATE_ID = 'selected-date-bottom';
const SELECTED_TOP_DATE_ID = 'selected-date-top';

let selectedDateBottom = new Date().toISOString().split('T')[0];
let selectedDateTop = '';

const eventListeners = [];

function removeAllEventListeners() {
  eventListeners.forEach(({ element, event, listener }) => {
    element.removeEventListener(event, listener);
  });
  eventListeners.length = 0;
}

function updateDateInputs () {
  if (selectedDateBottom) {
    document.getElementById('header-range-bottom-block').innerHTML = new Date(selectedDateBottom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    document.getElementById('periodic-query-bottom-timestamp').value = selectedDateBottom;
  }
  if (selectedDateTop) {
    document.getElementById('header-range-top-block').innerHTML = new Date(selectedDateTop).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    document.getElementById('periodic-query-top-timestamp').value = selectedDateTop;
  }
}

function paintBlocksInBetween () {

  document.querySelectorAll('.middle-date').forEach(each => each.classList.remove('middle-date'));
  document.querySelectorAll('.selected-date').forEach(each => each.classList.remove('selected-date'));

  if (document.querySelector(`div[date="${selectedDateBottom}"]`)) document.querySelector(`div[date="${selectedDateBottom}"]`).classList.add('selected-date');
  if (document.querySelector(`div[date="${selectedDateTop}"]`)) document.querySelector(`div[date="${selectedDateTop}"]`).classList.add('selected-date');

  const allDateElements = document.querySelectorAll('.date');
  for (let i = 0; i < allDateElements.length; i++) {
    const eachDate = allDateElements[i];
    if (selectedDateBottom < eachDate.getAttribute('date') && eachDate.getAttribute('date') < selectedDateTop) eachDate.classList.add('middle-date');
  }
}


function getMonthInfo(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const monthInfo = {
      month: `${month.toString().padStart(2, '0')}/${year}`,
      firstDayIndex: firstDay.getDay(), 
      lastDayIndex: lastDay.getDay(), 
      days: []
  };

  for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month - 1, day);
      monthInfo.days.push({
          date: day,
          dayIndex: date.getDay()
      });
  }

  return monthInfo;
}

function handleCalendarEvents (currentYearValue, currentMonthValue) {
  
  removeAllEventListeners();

  const monthWrapper = document.getElementById('month-wrapper');
  monthWrapper.innerHTML = '';

  const clickEventListener = (event) => {
    if (event.target.classList.contains('selected-range') || event.target.parentNode.classList.contains('selected-range') || event.target.parentNode.parentNode.classList.contains('selected-range')) {
      
      let target = event.target;
      while (!target.classList.contains('selected-range')) target = target.parentNode;

      if (target.nextSibling.style.opacity == 0) {
        target.nextSibling.style.transform = 'perspective(1000px) rotateX(0deg)';
        target.nextSibling.style.opacity = 1;
  
        target.children[target.children.length - 1].style.transform = 'rotateZ(180deg) translateY(5px)';
      } else {
        target.nextSibling.style.transform = 'perspective(1000px) rotateX(-90deg)';
        target.nextSibling.style.opacity = 0;
  
        target.children[target.children.length - 1].style.transform = 'rotateZ(0deg)';
      }

    } else if (event.target.classList.contains('left-wrapper-each-choice')) {
      event.target.parentNode.childNodes.forEach(eachLeftWrapperChoice => {
        eachLeftWrapperChoice.classList.remove('selected');
      })
      event.target.classList.add('selected');
      document.getElementById('header-selected-range-description').innerHTML = event.target.innerHTML;
      event.target.appendChild(document.getElementById('left-wrapper-selected-check-mark'));

      selectedDateBottom = getDateRange(new Date().toISOString().split('T')[0])[event.target.id].bottom;
      selectedDateTop = getDateRange(new Date().toISOString().split('T')[0])[event.target.id].top;

      paintBlocksInBetween();
      updateDateInputs();
    } else if (event.target.classList.contains('date')) {

      if (!selectedDateBottom) selectedDateBottom = event.target.getAttribute('date');
      else if (selectedDateBottom && !selectedDateTop) {
        if (event.target.getAttribute('date') < selectedDateBottom) selectedDateBottom = event.target.getAttribute('date');
        else selectedDateTop = event.target.getAttribute('date');
      } else if (selectedDateBottom && selectedDateTop) {
        selectedDateBottom = event.target.getAttribute('date');
        selectedDateTop = '';
      }

      paintBlocksInBetween();
      updateDateInputs();
    }
  }

  const previousMonthListener = (event) => {
    currentMonthValue -= 1; 
    handleCalendarEvents(currentYearValue, currentMonthValue);
  }

  const nextMonthListener = (event) => {
    currentMonthValue += 1; 
    handleCalendarEvents(currentYearValue, currentMonthValue);
  }

  document.getElementById('current-month-and-year-display').innerHTML = new Date(currentYearValue, currentMonthValue - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const currentMonth = getMonthInfo(currentYearValue, currentMonthValue)
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

        const dayToBeUsedAsDayInTheId = prevDateToBePushed.date.toString().length == 1 ? '0' + (prevDateToBePushed.date).toString() : prevDateToBePushed.date;
        const monthToBeUsedInTheId = (currentMonthValue - 1).toString().length == 1 ? '0' + (currentMonthValue - 1).toString() : currentMonthValue - 1;
        
        date.setAttribute('date', `${currentYearValue}-${monthToBeUsedInTheId}-${dayToBeUsedAsDayInTheId}`);
  
        monthWrapper.appendChild(date);
        weekCount++;
      }
    }

    const date = document.createElement('div');
    date.classList.add('date');
    date.innerHTML = eachDay.date;

    const dayToBeUsedAsDayInTheId = eachDay.date.toString().length == 1 ? '0' + (eachDay.date).toString() : eachDay.date;
    const monthToBeUsedInTheId = (currentMonthValue).toString().length == 1 ? '0' + (currentMonthValue).toString() : currentMonthValue;
    
    date.setAttribute('date', `${currentYearValue}-${monthToBeUsedInTheId}-${dayToBeUsedAsDayInTheId}`);
    
    monthWrapper.appendChild(date);

    if (i == currentMonth.days.length - 1) {
      let weekCount = 0;
      const nextMonth = getMonthInfo(currentYearValue, currentMonthValue + 1);
      while (weekCount < (6 - eachDay.dayIndex)) {
        const nextDateToBePushed = nextMonth.days[weekCount];
  
        const date = document.createElement('div');
        date.classList.add('date');
        date.style.color = '#888';
        date.innerHTML = nextDateToBePushed.date;
        
        const dayToBeUsedAsDayInTheId = nextDateToBePushed.date.toString().length == 1 ? '0' + (nextDateToBePushed.date).toString() : nextDateToBePushed.date;
        const monthToBeUsedInTheId = (currentMonthValue + 1).toString().length == 1 ? '0' + (currentMonthValue + 1).toString() : currentMonthValue + 1;
        
        date.setAttribute('date', `${currentYearValue}-${monthToBeUsedInTheId}-${dayToBeUsedAsDayInTheId}`);
  
        monthWrapper.appendChild(date);
        weekCount++;
      }
    }
  }

  paintBlocksInBetween();
  updateDateInputs();


  document.getElementById('previous-month').addEventListener('click', previousMonthListener);
  eventListeners.push({ element: document.getElementById('previous-month'), event: 'click', listener: previousMonthListener });
  
  document.getElementById('next-month').addEventListener('click', nextMonthListener);
  eventListeners.push({ element: document.getElementById('next-month'), event: 'click', listener: nextMonthListener });
  
  document.addEventListener('click', clickEventListener);
  eventListeners.push({ element: document, event: 'click', listener: clickEventListener });
}
