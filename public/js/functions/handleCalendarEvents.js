
const SELECTED_DATE_CLASS_NAME = 'selected-date';
const SELECTED_BOTTOM_DATE_ID = 'selected-date-bottom';
const SELECTED_TOP_DATE_ID = 'selected-date-top';

function updateDateInputs (bottomId, topId) {

  const bottomInput = document.getElementById('periodic-query-bottom-timestamp');
  const topInput = document.getElementById('periodic-query-top-timestamp');

  const bottomValue = parseInt(document.getElementById(bottomId).innerHTML);
  const topValue = parseInt(document.getElementById(topId).innerHTML);

  bottomInput.value = `2025-03-${bottomValue}`;
  topInput.value = `2025-03-${topValue}`;
}

function paintBlocksInBetween (bottomId, topId) {

  const bottom = document.getElementById(bottomId);
  const top = document.getElementById(topId);

  if (!bottom || !top) return;

  let iter = bottom.nextSibling;

  while (iter.id != top.id) {

    iter.classList.add('middle-date')
    iter = iter.nextSibling;
  }
}

function handleCalendarEvents () {

  document.addEventListener('click', (event) => {
    if (event.target.classList.contains('selected-range') || event.target.parentNode.classList.contains('selected-range') || event.target.parentNode.parentNode.classList.contains('selected-range')) {
      
      let target = event.target;
      while (!target.classList.contains('selected-range')) {
        target = target.parentNode;
      }

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
      event.target.appendChild(document.getElementById('left-wrapper-selected-check-mark'));  
    } else if (event.target.classList.contains('date')) {
      
      document.querySelectorAll('.middle-date').forEach(each => {
        each.classList.remove('middle-date');
      })

      event.target.classList.add(SELECTED_DATE_CLASS_NAME);
      
      let selectedDateBottom = document.getElementById(SELECTED_BOTTOM_DATE_ID);
      let selectedDateTop = document.getElementById(SELECTED_TOP_DATE_ID);

      if (!selectedDateBottom) event.target.id = SELECTED_BOTTOM_DATE_ID;
      if (selectedDateBottom && !selectedDateTop) {
        if (parseInt(event.target.innerHTML) < parseInt(selectedDateBottom.innerHTML)) {
          selectedDateBottom.classList.remove(SELECTED_DATE_CLASS_NAME)
          selectedDateBottom.id = '';
          event.target.id = SELECTED_BOTTOM_DATE_ID
        } else event.target.id = SELECTED_TOP_DATE_ID
      };

      if (selectedDateBottom && selectedDateTop) {
        selectedDateBottom.id = '';
        selectedDateBottom.classList.remove(SELECTED_DATE_CLASS_NAME)
        event.target.id = SELECTED_BOTTOM_DATE_ID;
        selectedDateTop.id = '';
        selectedDateTop.classList.remove(SELECTED_DATE_CLASS_NAME)
      }

      paintBlocksInBetween(SELECTED_BOTTOM_DATE_ID, SELECTED_TOP_DATE_ID);
      updateDateInputs(SELECTED_BOTTOM_DATE_ID, SELECTED_TOP_DATE_ID)
    } 
  })
}
