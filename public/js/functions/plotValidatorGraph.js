
function plotValidatorGraph(params) {
  const { operatorAddress, graphDataMapping, currency, decimals, usd_exchange_rate, symbol } = params;

  if (document.getElementById(`validator-graph-wrapper-${operatorAddress}`)) document.getElementById(`validator-graph-wrapper-${operatorAddress}`).remove();

  if (!validatorGraphEventListenersMapping[operatorAddress]) validatorGraphEventListenersMapping[operatorAddress] = [];
  else validatorGraphEventListenersMapping[operatorAddress].forEach(eachEventHandler => eachEventHandler.element.removeEventListener(eachEventHandler.event, eachEventHandler.handler));

  const validatorWrapper = document.getElementById(operatorAddress);
  
  const graphWrapper = document.createElement('div');
  graphWrapper.className = 'validator-graph-wrapper';
  graphWrapper.id = `validator-graph-wrapper-${operatorAddress}`;
  graphWrapper.setAttribute('operator_address', operatorAddress);

  const legendWrapper = generateGraphVisibilityLegend({ operatorAddress });
  graphWrapper.appendChild(legendWrapper);

  const graphWrapperHorizontalLabelsBackgroundAbsolute = document.createElement('div');
  graphWrapperHorizontalLabelsBackgroundAbsolute.classList.add('graph-wrapper-horizontal-labels-background-absolute')
  graphWrapper.appendChild(graphWrapperHorizontalLabelsBackgroundAbsolute);

  const graphMouseDownHandler = (event) => {
    document.querySelectorAll(`.paint-bar-${operatorAddress}`).forEach(each => each.style.width = '0');
    document.querySelectorAll(`.range-edge-${operatorAddress}`).forEach(each => each.classList.remove('range-edges-indicator'));
    document.querySelectorAll(`.range-value-display-${operatorAddress}`).forEach(each => each.classList.remove('each-data-point-value-display-visible'));


    document.querySelectorAll(`.visible-${operatorAddress}`).forEach(each => {
      each.classList.remove('each-data-point-hovered');
      each.classList.remove('each-data-point-value-display-visible');
      each.classList.remove('each-data-delta-vertical-line-visible');
      each.classList.remove('each-data-point-horizontal-label-hovered');
      each.classList.remove('each-data-indicator-vertical-line-visible');
    })

    validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn = '';
    validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn = '';

    validatorListenerVariablesMapping[operatorAddress].isSelectingRange = true;
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-graph-column-wrapper')) target = target.parentNode;

    if (target.classList.contains('each-graph-column-wrapper')) return validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn = target;
    return validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn = document.getElementById(`validator-graph-wrapper-${operatorAddress}`).querySelectorAll('.each-graph-column-wrapper')[0];
  }

  const graphMouseUpHandler = (event) => {
    validatorListenerVariablesMapping[operatorAddress].isSelectingRange = false;
    if (!validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn || !validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn || (validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn == validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn)) {
      document.querySelectorAll(`.paint-bar-${operatorAddress}`).forEach(each => each.style.width = '0');
      document.querySelectorAll(`.range-edge-${operatorAddress}`).forEach(each => each.classList.remove('range-edges-indicator'));
    } else {
      const deltaSelfStake = !validatorListenerVariablesMapping[operatorAddress].isSelectionDirectionToLeft 
        ? validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.getAttribute('self_stake') - validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.getAttribute('self_stake') 
        : validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.getAttribute('self_stake') - validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.getAttribute('self_stake');
      
      const deltaWithdraw = !validatorListenerVariablesMapping[operatorAddress].isSelectionDirectionToLeft 
        ? validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.getAttribute('withdraw') - validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.getAttribute('withdraw') 
        : validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.getAttribute('withdraw') - validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.getAttribute('withdraw');
      

      const initialTimestamp = !validatorListenerVariablesMapping[operatorAddress].isSelectionDirectionToLeft ? validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.getAttribute('timestamp') : validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.getAttribute('timestamp');
      const timestamp = !validatorListenerVariablesMapping[operatorAddress].isSelectionDirectionToLeft ? validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.getAttribute('timestamp') : validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.getAttribute('timestamp');

      if (!validatorListenerVariablesMapping[operatorAddress].isSelectionDirectionToLeft) {
        validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.nextSibling.children[9].style.width = '0px';
        validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.nextSibling.children[10].style.width = '0px';
        validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.nextSibling.children[11].style.width = '0px';

        validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.nextSibling.children[8].classList.add('each-data-indicator-vertical-line-visible');
        validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.nextSibling.children[8].classList.add('range-edges-indicator', `range-edge-${operatorAddress}`);
      } else {
        validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.children[9].style.width = '0px';
        validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.children[10].style.width = '0px';
        validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.previousSibling.children[9].style.width = '0px';
        validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.previousSibling.children[10].style.width = '0px';
        validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.previousSibling.children[11].style.width = '0px';

        validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.children[8].classList.add('each-data-indicator-vertical-line-visible');
        validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.children[8].classList.add('range-edges-indicator', `range-edge-${operatorAddress}`);
      }

      validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.children[8].classList.add('each-data-indicator-vertical-line-visible');
      validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.children[8].classList.add('range-edges-indicator', `range-edge-${operatorAddress}`);
    
      const dataPointValueDisplay = generatePointValueDisplay({
        self_stake: deltaSelfStake,
        withdraw: deltaWithdraw,
        ratio: (deltaSelfStake ? deltaSelfStake : 0) / (deltaWithdraw ? deltaWithdraw : (10 ** decimals)),
        sold: (deltaWithdraw ? deltaWithdraw : 0) - (deltaSelfStake ? deltaSelfStake : 0)
      }, graphDataMapping, currency, usd_exchange_rate, decimals, timestamp, symbol, true, initialTimestamp);
      
      dataPointValueDisplay.classList.add('each-data-point-value-display-visible');
      dataPointValueDisplay.classList.add('range-value-display', `range-value-display-${operatorAddress}`);
      dataPointValueDisplay.style.left = ((((validatorListenerVariablesMapping[operatorAddress].rangeFinalColumn.getBoundingClientRect().left) - (validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.getBoundingClientRect().left)) / 2) - 150) + 'px';
      validatorListenerVariablesMapping[operatorAddress].rangeInitialColumn.appendChild(dataPointValueDisplay);
    }
  }

  graphWrapper.addEventListener('mousedown', graphMouseDownHandler);
  validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mousedown', handler: graphMouseDownHandler, element: graphWrapper });
  graphWrapper.addEventListener('mouseup', graphMouseUpHandler);
  validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mouseup', handler: graphMouseUpHandler, element: graphWrapper });

  validatorWrapper.nextSibling.appendChild(graphWrapper);
  return graphWrapper;
}
