
function plotValidatorGraph(params) {
  const { type, operatorAddress, decimals, usd_exchange_rate, symbol, dataFields, graphContainer } = params;

  if (document.getElementById(`validator-graph-wrapper-${operatorAddress}`)) document.getElementById(`validator-graph-wrapper-${operatorAddress}`).remove();
  
  const graphWrapper = document.createElement('div');
  type != 'small'
    ? graphWrapper.classList.add('validator-graph-wrapper') 
    : graphWrapper.classList.add('validator-graph-wrapper-small');
  
  graphWrapper.id = `validator-graph-wrapper-${operatorAddress}`;
  graphWrapper.setAttribute('operator_address', operatorAddress);

  const graphWrapperHorizontalLabelsBackgroundAbsolute = document.createElement('div');
  if (type != 'small') {
    graphWrapperHorizontalLabelsBackgroundAbsolute.classList.add('graph-wrapper-horizontal-labels-background-absolute')
    graphWrapper.appendChild(graphWrapperHorizontalLabelsBackgroundAbsolute);  

    if (!validatorGraphEventListenersMapping[operatorAddress]) validatorGraphEventListenersMapping[operatorAddress] = [];
    else validatorGraphEventListenersMapping[operatorAddress].forEach(eachEventHandler => eachEventHandler.element.removeEventListener(eachEventHandler.event, eachEventHandler.handler));  
  
    dataFields.forEach(eachDataField => {
      const key = operatorAddress == 'summary' ? 'summary' : 'validator';
      const metric = document.getElementById(`${key}-metric-${eachDataField}`);
      
      const dropdownOptionId = `${key}-graph-dropdown-option-${eachDataField}`;
      const dropdownOption = document.getElementById(dropdownOptionId);

      document.addEventListener('click', (event) => {
        let target = event.target;
        while (target != document.body && ![metric.id, dropdownOption.id].includes(target.id)) target = target.parentNode;
        if (![metric.id, dropdownOption.id].includes(target.id)) return;

        if (metric.classList.contains('each-metric-content-wrapper-faded')) {
          document.querySelectorAll(`.${eachDataField}-graph-data-line-${operatorAddress}`).forEach(eachElement => {
            eachElement.style.opacity = '1';
          })
          dropdownOption.classList.add('dropdown-option-checked');
          metric.classList.remove('each-metric-content-wrapper-faded');
        }
        else {
          document.querySelectorAll(`.${eachDataField}-graph-data-line-${operatorAddress}`).forEach(eachElement => {
            eachElement.style.opacity = '0.2';
          })
          dropdownOption.classList.remove('dropdown-option-checked');
          metric.classList.add('each-metric-content-wrapper-faded');
        }
      })
    })
  }

  const graphMouseDownHandler = (event) => {
    document.querySelectorAll(`.paint-bar-${operatorAddress}`).forEach(each => {
      each.style.width = '0';
      each.style.borderRight = `none`;
    });
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

        const { nativeValue, usdValue } = getValueWithDecimals(deltaValue, symbol, usd_exchange_rate, decimals);
        const key = operatorAddress == 'summary' ? 'summary' : 'validator';
        const metric = document.getElementById(`${key}-metric-${eachDataField}`);

        metric.querySelector('.each-metric-content-wrapper-content-value-native').innerHTML = nativeValue;
        metric.querySelector('.each-metric-content-wrapper-content-value-usd').innerHTML = usdValue;
      })

      const initialTimestamp = !validatorListenerVariablesMapping[operatorAddressM].isSelectionDirectionToLeft ? validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn.getAttribute('timestamp') : validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn.getAttribute('timestamp');
      const timestamp = !validatorListenerVariablesMapping[operatorAddressM].isSelectionDirectionToLeft ? validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn.getAttribute('timestamp') : validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn.getAttribute('timestamp');

      if (!validatorListenerVariablesMapping[operatorAddressM].isSelectionDirectionToLeft) {
        validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn.nextSibling.querySelectorAll('.graph-range-paint-bar').forEach(eachPaintBar => {
          eachPaintBar.style.width = '0px';
          eachPaintBar.style.borderRight = `none`;
        });

        validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn.nextSibling.querySelector('.each-data-indicator-vertical-line').classList.add('each-data-indicator-vertical-line-visible', 'range-edges-indicator', `range-edge-${operatorAddressM}`);
      } else {
        validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn.querySelectorAll('.graph-range-paint-bar').forEach(eachPaintBar => {
          eachPaintBar.style.width = '0px';
          eachPaintBar.style.borderRight = `none`;
        });

        validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn.previousSibling.querySelectorAll('.graph-range-paint-bar').forEach(eachPaintBar => {
          eachPaintBar.style.width = '0px';
          eachPaintBar.style.borderRight = `none`;
        });

        validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn.querySelector('.each-data-indicator-vertical-line').classList.add('each-data-indicator-vertical-line-visible', 'range-edges-indicator', `range-edge-${operatorAddressM}`);
      }

      validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn.querySelector('each-data-indicator-vertical-line-visible', 'range-edges-indicator', `range-edge-${operatorAddressM}`);      
    }
  }

  if (type != 'small') {
    graphWrapper.addEventListener('mousedown', graphMouseDownHandler);
    validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mousedown', handler: graphMouseDownHandler, element: graphWrapper });
    graphWrapper.addEventListener('mouseup', graphMouseUpHandler);
    validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mouseup', handler: graphMouseUpHandler, element: graphWrapper });  
  }

  graphContainer.appendChild(graphWrapper);
  return graphWrapper;
}
