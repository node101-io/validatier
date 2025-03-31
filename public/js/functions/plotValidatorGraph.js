
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
    rangeInitialColumn = '';
    rangeFinalColumn = '';
    document.querySelectorAll('.range-value-display').forEach(each => each.remove());
    document.querySelectorAll('.graph-range-paint-bar').forEach(each => each.style.width = '0');
    document.querySelectorAll('.each-data-indicator-vertical-line-visible').forEach(each => each.classList.remove('each-data-indicator-vertical-line-visible'));
    document.querySelectorAll('.range-edges-indicator').forEach(each => each.classList.remove('range-edges-indicator'));

    isSelectingRange = true;
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-graph-column-wrapper')) target = target.parentNode;

    if (target.classList.contains('each-graph-column-wrapper')) return rangeInitialColumn = target;
    return rangeInitialColumn = document.getElementById(`validator-graph-wrapper-${operatorAddress}`).querySelectorAll('.each-graph-column-wrapper')[0];
  }

  const graphMouseUpHandler = (event) => {
    isSelectingRange = false;
    if (!rangeInitialColumn || !rangeFinalColumn || (rangeInitialColumn == rangeFinalColumn)) {
      document.querySelectorAll('.graph-range-paint-bar').forEach(each => each.style.width = '0');
      document.querySelectorAll('.each-data-indicator-vertical-line-visible').forEach(each => each.classList.remove('each-data-indicator-vertical-line-visible'));
      document.querySelectorAll('.range-edges-indicator').forEach(each => each.classList.remove('range-edges-indicator'));
    } else {
      const deltaSelfStake = !isSelectionDirectionToLeft 
        ? rangeFinalColumn.getAttribute('self_stake') - rangeInitialColumn.getAttribute('self_stake') 
        : rangeInitialColumn.getAttribute('self_stake') - rangeFinalColumn.getAttribute('self_stake');
      
      const deltaWithdraw = !isSelectionDirectionToLeft 
        ? rangeFinalColumn.getAttribute('withdraw') - rangeInitialColumn.getAttribute('withdraw') 
        : rangeInitialColumn.getAttribute('withdraw') - rangeFinalColumn.getAttribute('withdraw');
      

      const initialTimestamp = !isSelectionDirectionToLeft ? rangeInitialColumn.getAttribute('timestamp') : rangeFinalColumn.getAttribute('timestamp');
      const timestamp = !isSelectionDirectionToLeft ? rangeFinalColumn.getAttribute('timestamp') : rangeInitialColumn.getAttribute('timestamp');

      if (!isSelectionDirectionToLeft) {
        rangeFinalColumn.nextSibling.children[9].style.width = '0px';
        rangeFinalColumn.nextSibling.children[10].style.width = '0px';
        rangeFinalColumn.nextSibling.children[11].style.width = '0px';

        rangeFinalColumn.nextSibling.children[8].classList.add('each-data-indicator-vertical-line-visible');
        rangeFinalColumn.nextSibling.children[8].classList.add('range-edges-indicator');  
      } else {
        rangeInitialColumn.children[9].style.width = '0px';
        rangeInitialColumn.children[10].style.width = '0px';
        rangeFinalColumn.previousSibling.children[9].style.width = '0px';
        rangeFinalColumn.previousSibling.children[10].style.width = '0px';
        rangeFinalColumn.previousSibling.children[11].style.width = '0px';

        rangeFinalColumn.children[8].classList.add('each-data-indicator-vertical-line-visible');
        rangeFinalColumn.children[8].classList.add('range-edges-indicator');  
      }

      rangeInitialColumn.children[8].classList.add('each-data-indicator-vertical-line-visible');
      rangeInitialColumn.children[8].classList.add('range-edges-indicator');
    
      const dataPointValueDisplay = generatePointValueDisplay({
        self_stake: deltaSelfStake,
        withdraw: deltaWithdraw,
        ratio: (deltaSelfStake ? deltaSelfStake : 0) / (deltaWithdraw ? deltaWithdraw : (10 ** decimals)),
        sold: (deltaWithdraw ? deltaWithdraw : 0) - (deltaSelfStake ? deltaSelfStake : 0)
      }, graphDataMapping, currency, usd_exchange_rate, decimals, timestamp, symbol, true, initialTimestamp);
      
      dataPointValueDisplay.classList.add('each-data-point-value-display-visible');
      dataPointValueDisplay.classList.add('range-value-display');
      dataPointValueDisplay.style.left = ((((rangeFinalColumn.getBoundingClientRect().left) - (rangeInitialColumn.getBoundingClientRect().left)) / 2) - 150) + 'px';
      rangeInitialColumn.appendChild(dataPointValueDisplay);
    }
  }

  graphWrapper.addEventListener('mousedown', graphMouseDownHandler);
  validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mousedown', handler: graphMouseDownHandler, element: graphWrapper });
  graphWrapper.addEventListener('mouseup', graphMouseUpHandler);
  validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mouseup', handler: graphMouseUpHandler, element: graphWrapper });

  validatorWrapper.nextSibling.appendChild(graphWrapper);
  return graphWrapper;
}
