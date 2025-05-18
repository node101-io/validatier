
function plotValidatorGraph(params) {
  const { operatorAddress, graphDataMapping, currency, decimals, usd_exchange_rate, symbol, dataFields, colors, graphContainer } = params;

  if (document.getElementById(`validator-graph-wrapper-${operatorAddress}`)) document.getElementById(`validator-graph-wrapper-${operatorAddress}`).remove();

  if (!validatorGraphEventListenersMapping[operatorAddress]) validatorGraphEventListenersMapping[operatorAddress] = [];
  else validatorGraphEventListenersMapping[operatorAddress].forEach(eachEventHandler => eachEventHandler.element.removeEventListener(eachEventHandler.event, eachEventHandler.handler));
  
  const graphWrapper = document.createElement('div');
  graphWrapper.className = 'validator-graph-wrapper';
  graphWrapper.id = `validator-graph-wrapper-${operatorAddress}`;
  graphWrapper.setAttribute('operator_address', operatorAddress);

  const graphWrapperHorizontalLabelsBackgroundAbsolute = document.createElement('div');
  graphWrapperHorizontalLabelsBackgroundAbsolute.classList.add('graph-wrapper-horizontal-labels-background-absolute')
  graphWrapper.appendChild(graphWrapperHorizontalLabelsBackgroundAbsolute);

  const graphMouseDownHandler = (event) => {
    document.querySelectorAll(`.paint-bar-${operatorAddress}`).forEach(each => each.style.width = '0');
    document.querySelectorAll(`.range-edge-${operatorAddress}`).forEach(each => each.classList.remove('range-edges-indicator'));

    document.querySelectorAll(`.visible-${operatorAddress}`).forEach(each => {
      each.classList.remove('each-data-point-hovered');
      each.classList.remove('each-data-delta-vertical-line-visible');
      each.classList.remove('each-data-point-horizontal-label-hovered');
      each.classList.remove('each-data-indicator-vertical-line-visible');
    })

    const operatorAddressM = operatorAddress.replace('\\@', '@');

    validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn = '';
    validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn = '';

    validatorListenerVariablesMapping[operatorAddressM].isSelectingRange = true;
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-graph-column-wrapper')) target = target.parentNode;

    if (target.classList.contains('each-graph-column-wrapper')) return validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn = target;
    return validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn = document.getElementById(`validator-graph-wrapper-${operatorAddressM}`).querySelectorAll('.each-graph-column-wrapper')[0];
  }

  const graphMouseUpHandler = (event) => {
    const operatorAddressM = operatorAddress.replace('\\@', '@');

    validatorListenerVariablesMapping[operatorAddressM].isSelectingRange = false;
    if (!validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn || !validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn || (validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn == validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn)) {
      document.querySelectorAll(`.paint-bar-${operatorAddress}`).forEach(each => each.style.width = '0');
      document.querySelectorAll(`.range-edge-${operatorAddress}`).forEach(each => each.classList.remove('range-edges-indicator'));
    } else {
      const deltaMapping = {}
      dataFields.forEach(eachDataField => {
        const deltaValue = !validatorListenerVariablesMapping[operatorAddressM].isSelectionDirectionToLeft 
          ? validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn.getAttribute(eachDataField) - validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn.getAttribute(eachDataField) 
          : validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn.getAttribute(eachDataField) - validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn.getAttribute(eachDataField);

        deltaMapping[eachDataField] = deltaValue;
      })

      const initialTimestamp = !validatorListenerVariablesMapping[operatorAddressM].isSelectionDirectionToLeft ? validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn.getAttribute('timestamp') : validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn.getAttribute('timestamp');
      const timestamp = !validatorListenerVariablesMapping[operatorAddressM].isSelectionDirectionToLeft ? validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn.getAttribute('timestamp') : validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn.getAttribute('timestamp');

      if (!validatorListenerVariablesMapping[operatorAddressM].isSelectionDirectionToLeft) {
        validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn.nextSibling.querySelectorAll('.graph-range-paint-bar').forEach(eachPaintBar => {
          eachPaintBar.style.width = '0px';
        });

        validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn.nextSibling.querySelector('.each-data-indicator-vertical-line').classList.add('each-data-indicator-vertical-line-visible', 'range-edges-indicator', `range-edge-${operatorAddressM}`);
      } else {
        validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn.querySelectorAll('.graph-range-paint-bar').forEach(eachPaintBar => {
          eachPaintBar.style.width = '0px';
        });

        validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn.previousSibling.querySelectorAll('.graph-range-paint-bar').forEach(eachPaintBar => {
          eachPaintBar.style.width = '0px';
        });

        validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn.querySelector('.each-data-indicator-vertical-line').classList.add('each-data-indicator-vertical-line-visible', 'range-edges-indicator', `range-edge-${operatorAddressM}`);
      }

      validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn.querySelector('each-data-indicator-vertical-line-visible', 'range-edges-indicator', `range-edge-${operatorAddressM}`);      
    }
  }

  graphWrapper.addEventListener('mousedown', graphMouseDownHandler);
  validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mousedown', handler: graphMouseDownHandler, element: graphWrapper });
  graphWrapper.addEventListener('mouseup', graphMouseUpHandler);
  validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mouseup', handler: graphMouseUpHandler, element: graphWrapper });

  graphContainer.appendChild(graphWrapper);
  return graphWrapper;
}
