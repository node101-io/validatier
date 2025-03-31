
function addColumnEventListener (operatorAddress) {

  const columnMouseHandler = (event) => {

    const visibleClassName = `visible-${operatorAddress}`;

    document.querySelectorAll(`.${visibleClassName}`).forEach(each => {
      if (!each.classList.contains('range-value-display') && !each.classList.contains('range-edges-indicator')) {
        each.classList.remove('each-data-point-hovered')
        each.classList.remove('each-data-point-value-display-visible')
        each.classList.remove('each-data-delta-vertical-line-visible')
        each.classList.remove('each-data-point-horizontal-label-hovered')
        each.classList.remove('each-data-indicator-vertical-line-visible')
      }
    })

    let target = event.target;
    while (target != document.body && !target.classList.contains('each-graph-column-wrapper')) target = target.parentNode;
    if (!target.classList.contains('each-graph-column-wrapper')) return;
    
    const columnWrapper = target;
    const index = columnWrapper.getAttribute('index');

    const rect = columnWrapper.getBoundingClientRect();
    const left = event.clientX - rect.left;
    const right = rect.right - event.clientX;
    
    columnWrapper.children[0].classList.add('each-data-point-hovered', visibleClassName);
    columnWrapper.children[2].classList.add('each-data-point-hovered', visibleClassName);
    columnWrapper.children[4].classList.add('each-data-point-hovered', visibleClassName);
    
    if (!validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn || !validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn)
      columnWrapper.children[6].classList.add('each-data-point-value-display-visible', visibleClassName);
    
    columnWrapper.children[7].classList.add('each-data-delta-vertical-line-visible', visibleClassName);
    columnWrapper.children[8].classList.add('each-data-indicator-vertical-line-visible', visibleClassName);

    if (index % 10 == 0) columnWrapper.children[12].classList.add('each-data-point-horizontal-label-hovered', visibleClassName);
    
    if (!validatorListenerVariablesMapping[operatorAddress].isSelectingRange) return;
    const deltaX = columnWrapper.getBoundingClientRect().width;

    let current = validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn;

    if (target != validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn) {
      while (current != target) {
        let selfStakeBottom;
        let withdrawBottom;
        let commissionBottom;
        if (target.getAttribute('timestamp') < validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.getAttribute('timestamp')) {
          validatorListenerVariablesMapping[operatorAddress].isSelectionDirectionToLeft = true;
          if (!current.previousSibling) break;
          validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.children[9].style.width = '0px';
          validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.children[10].style.width = '0px';
          validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.children[11].style.width = '0px';
          let targetPrevious = target.previousSibling;
          
          while(targetPrevious) {
            if (targetPrevious.children[9]) targetPrevious.children[9].style.width = '0px';
            if (targetPrevious.children[10]) targetPrevious.children[10].style.width = '0px';
            if (targetPrevious.children[11]) targetPrevious.children[11].style.width = '0px';
            targetPrevious = targetPrevious.previousSibling;
          }
          
          current.children[9].classList.add('graph-range-paint-bar-right');
          current.children[9].classList.remove('graph-range-paint-bar-left');
          current.children[10].classList.add('graph-range-paint-bar-right');
          current.children[10].classList.remove('graph-range-paint-bar-left');
          current.children[11].classList.add('graph-range-paint-bar-right');
          current.children[11].classList.remove('graph-range-paint-bar-left');
          selfStakeBottom = `calc(((${current.nextSibling.getAttribute('self_stake')} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;
          withdrawBottom = `calc(((${current.nextSibling.getAttribute('withdraw')} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;
          commissionBottom = `calc(((${current.nextSibling.getAttribute('commission')} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;
        } else {
          validatorListenerVariablesMapping[operatorAddress].isSelectionDirectionToLeft = false;
          if (!current.nextSibling) break;
          let targetNext = target.nextSibling;
          while(targetNext) {
            targetNext.children[9].style.width = '0px';
            targetNext.children[10].style.width = '0px';
            targetNext.children[11].style.width = '0px';
            targetNext = targetNext.nextSibling;
          }
          current.children[9].classList.add('graph-range-paint-bar-left');
          current.children[9].classList.remove('graph-range-paint-bar-right');
          current.children[10].classList.add('graph-range-paint-bar-left');
          current.children[10].classList.remove('graph-range-paint-bar-right');
          current.children[11].classList.add('graph-range-paint-bar-left');
          current.children[11].classList.remove('graph-range-paint-bar-right');

          selfStakeBottom = `calc(((${current.getAttribute('self_stake')} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;
          withdrawBottom = `calc(((${current.getAttribute('withdraw')} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;
          commissionBottom = `calc(((${current.getAttribute('commission')} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;
        }
        
        const { selfStakeHypotenuse, selfStakeAngle, withdrawHypotenuse, withdrawAngle, commissionHypotenuse, commissionAngle } = getAngleBetweenTwoPoints(current, current.nextSibling, operatorAddress);
        current.children[9].style.width = selfStakeHypotenuse;
        current.children[9].style.bottom = `calc((${selfStakeBottom.replace('calc', '')}) - 100%)`;
        current.children[9].style.transform = `rotateZ(${selfStakeAngle}) skewX(${selfStakeAngle})`;
        current.children[9].style.backgroundColor = 'lightgreen';
        current.children[9].style.zIndex = '0';

        current.children[10].style.width = withdrawHypotenuse;
        current.children[10].style.bottom = `calc((${withdrawBottom.replace('calc', '')}) - 100%)`;
        current.children[10].style.transform = `rotateZ(${withdrawAngle}) skewX(${withdrawAngle})`;
        current.children[10].style.backgroundColor = 'lightcoral';
        current.children[10].style.zIndex = '5';

        current.children[11].style.width = commissionHypotenuse;
        current.children[11].style.bottom = `calc((${commissionBottom.replace('calc', '')}) - 100%)`;
        current.children[11].style.transform = `rotateZ(${commissionAngle}) skewX(${commissionAngle})`;
        current.children[11].style.backgroundColor = 'orange';
        current.children[11].style.zIndex = '3';

        validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn = current;
        if (target.getAttribute('timestamp') < validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.getAttribute('timestamp')) current = current.previousSibling;
        else current = current.nextSibling;
      }
    }

    const { selfStakeAngle, withdrawAngle, commissionAngle } = getAngleBetweenTwoPoints(columnWrapper, columnWrapper.nextSibling, operatorAddress);
    if (target.getAttribute('timestamp') < validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.getAttribute('timestamp')) {
      validatorListenerVariablesMapping[operatorAddress].isSelectionDirectionToLeft = true;
      const { selfStakeHypotenuse, withdrawHypotenuse, commissionHypotenuse } = getAngleBetweenTwoPoints(columnWrapper, columnWrapper.nextSibling, operatorAddress);
      const selfStakeBottom = `calc(((${current.nextSibling.getAttribute('self_stake')} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;
      const withdrawBottom = `calc(((${current.nextSibling.getAttribute('withdraw')} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;          
      const commissionBottom = `calc(((${current.nextSibling.getAttribute('commission')} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;          

      
      paintBarSelfStake.classList.add('graph-range-paint-bar-right');
      paintBarSelfStake.classList.remove('graph-range-paint-bar-left');
      paintBarWithdraw.classList.add('graph-range-paint-bar-right');
      paintBarWithdraw.classList.remove('graph-range-paint-bar-left');
      paintBarCommission.classList.add('graph-range-paint-bar-right');
      paintBarCommission.classList.remove('graph-range-paint-bar-left');
      
      paintBarSelfStake.style.width = `calc((${right / deltaX}) * ${selfStakeHypotenuse.replace('calc', '')})`;
      paintBarSelfStake.style.bottom = `calc((${selfStakeBottom.replace('calc', '')}) - 100%)`;
      paintBarWithdraw.style.width = `calc((${right / deltaX}) * ${withdrawHypotenuse.replace('calc', '')})`;
      paintBarWithdraw.style.bottom = `calc((${withdrawBottom.replace('calc', '')}) - 100%)`;
      paintBarCommission.style.width = `calc((${right / deltaX}) * ${commissionHypotenuse.replace('calc', '')})`;
      paintBarCommission.style.bottom = `calc((${commissionBottom.replace('calc', '')}) - 100%)`;
    } else {
      validatorListenerVariablesMapping[operatorAddress].isSelectionDirectionToLeft = false;
      
      const { selfStakeHypotenuse, withdrawHypotenuse, commissionHypotenuse } = getAngleBetweenTwoPoints(columnWrapper, columnWrapper.nextSibling, operatorAddress);
      paintBarSelfStake.classList.add('graph-range-paint-bar-left');
      paintBarSelfStake.classList.remove('graph-range-paint-bar-right');
      paintBarWithdraw.classList.add('graph-range-paint-bar-left');
      paintBarWithdraw.classList.remove('graph-range-paint-bar-right');
      paintBarCommission.classList.add('graph-range-paint-bar-left');
      paintBarCommission.classList.remove('graph-range-paint-bar-right');
      
      paintBarSelfStake.style.width = `calc((${left / deltaX}) * ${selfStakeHypotenuse.replace('calc', '')})`;
      paintBarSelfStake.style.bottom = `calc((${selfStakeBottom.replace('calc', '')}) - 100%)`;
      paintBarWithdraw.style.width = `calc((${left / deltaX}) * ${withdrawHypotenuse.replace('calc', '')})`;
      paintBarWithdraw.style.bottom = `calc((${withdrawBottom.replace('calc', '')}) - 100%)`;
      paintBarCommission.style.width = `calc((${left / deltaX}) * ${commissionHypotenuse.replace('calc', '')})`;
      paintBarCommission.style.bottom = `calc((${commissionBottom.replace('calc', '')}) - 100%)`;
    }
    paintBarSelfStake.style.transform = `rotateZ(${selfStakeAngle}) skewX(${selfStakeAngle})`;
    paintBarSelfStake.style.backgroundColor = 'lightgreen';
    paintBarWithdraw.style.transform = `rotateZ(${withdrawAngle}) skewX(${withdrawAngle})`;
    paintBarWithdraw.style.backgroundColor = 'lightcoral';
    paintBarCommission.style.transform = `rotateZ(${commissionAngle}) skewX(${commissionAngle})`;
    paintBarCommission.style.backgroundColor = 'orange';
  };

  document.body.addEventListener('mousemove', columnMouseHandler);
  validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mousemove', handler: columnMouseHandler, element: document.body });
}