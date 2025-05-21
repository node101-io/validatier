
function addColumnEventListener (operatorAddress, dataFields, colors, currency, exchange_rate, decimals) {
  const columnMouseHandler = (event) => {
    const visibleClassName = `visible-${operatorAddress}`;
    document.querySelectorAll(`.${visibleClassName}`).forEach(each => {
      if (!each.classList.contains('range-value-display') && !each.classList.contains('range-edges-indicator')) {
        each.classList.remove('each-data-point-hovered')
        each.classList.remove('each-data-delta-vertical-line-visible')
        each.classList.remove('each-data-point-horizontal-label-hovered')
        each.classList.remove('each-data-indicator-vertical-line-visible')
      }
    })

    let target = event.target;
    while (target != document.body && !target.classList.contains(`column-wrapper-${operatorAddress}`)) target = target.parentNode;
    if (!target.classList.contains(`column-wrapper-${operatorAddress}`)) return;
    
    const columnWrapper = target;
    const index = columnWrapper.getAttribute('index');

    const rect = columnWrapper.getBoundingClientRect();
    const left = event.clientX - rect.left;
    const right = rect.right - event.clientX;
    
    columnWrapper.querySelectorAll('.each-data-point').forEach(eachDataPoint => {
      eachDataPoint.classList.add('each-data-point-hovered', visibleClassName.replace('\\@', '@'));
    })
    
    const operatorAddressM = operatorAddress.replace('\\@', '@');
    
    columnWrapper.querySelector('.each-data-delta-vertical-line').classList.add('each-data-delta-vertical-line-visible', visibleClassName.replace('\\@', '@'));
    columnWrapper.querySelector('.each-data-indicator-vertical-line').classList.add('each-data-indicator-vertical-line-visible', visibleClassName.replace('\\@', '@'));

    if (!validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn || !validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn)
      dataFields.forEach(eachDataField => {
        const { nativeValue, usdValue } = getValueWithDecimals(columnWrapper.getAttribute(eachDataField), currency, exchange_rate, decimals);
        const key = operatorAddress == 'summary' ? 'summary' : 'validator';
        const metric = document.getElementById(`${key}-metric-${eachDataField}`);

        metric.querySelector('.each-metric-content-wrapper-content-value-native').innerHTML = nativeValue;
        metric.querySelector('.each-metric-content-wrapper-content-value-usd').innerHTML = usdValue;
      });
    
    if (!validatorListenerVariablesMapping[operatorAddressM].isSelectingRange) return;
    const deltaX = columnWrapper.getBoundingClientRect().width;

    let current = validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn;

    if (target != validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn) {
      while (current != target) {
        const bottomMapping = {}
        dataFields.forEach(eachDataField => {
          bottomMapping[eachDataField] = '';
        })
        if (target.getAttribute('timestamp') < validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn.getAttribute('timestamp')) {
          validatorListenerVariablesMapping[operatorAddressM].isSelectionDirectionToLeft = true;
          if (!current.previousSibling) break;
          validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn.querySelectorAll('.graph-range-paint-bar').forEach(eachPaintBar => {
            eachPaintBar.style.width = '0px';
            eachPaintBar.style.borderRight = `none`;
          })
          let targetPrevious = target.previousSibling;
          
          while(targetPrevious) {
            targetPrevious.querySelectorAll('.graph-range-paint-bar').forEach(eachPaintBar => {
              eachPaintBar.style.width = '0px';
              eachPaintBar.style.borderRight = `none`;
            })
            targetPrevious = targetPrevious.previousSibling;
          }
          current.querySelectorAll('.graph-range-paint-bar').forEach(eachPaintBar => {
            eachPaintBar.classList.add('graph-range-paint-bar-right')
            eachPaintBar.classList.remove('graph-range-paint-bar-left')
          })

          dataFields.forEach(eachDataField => {
            bottomMapping[eachDataField] = `calc(((${current.nextSibling.getAttribute(eachDataField)} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;
          })
        } else {
          validatorListenerVariablesMapping[operatorAddressM].isSelectionDirectionToLeft = false;
          if (!current.nextSibling) break;
          let targetNext = target.nextSibling;
          while(targetNext) {
            targetNext.querySelectorAll('.graph-range-paint-bar').forEach(eachPaintBar => {
              eachPaintBar.style.width = '0px';
              eachPaintBar.style.borderRight = `none`;
            });
            targetNext = targetNext.nextSibling;
          }

          current.querySelectorAll('.graph-range-paint-bar').forEach(eachPaintBar => {
            eachPaintBar.classList.add('graph-range-paint-bar-left');
            eachPaintBar.classList.remove('graph-range-paint-bar-right');
          })

          dataFields.forEach(eachDataField => {
            bottomMapping[eachDataField] = `calc(((${current.getAttribute(eachDataField)} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;
          })
        }
        
        const angleHypotenuseMapping = getAngleBetweenTwoPoints(current, current.nextSibling, operatorAddress, dataFields);

        const dataMapping = {};
        dataFields.forEach(eachDataField => {
          dataMapping[eachDataField] = parseFloat(current.getAttribute(eachDataField));
        });
        const sortedKeys = Object.entries(dataMapping)
          .sort(([, valA], [, valB]) => valB - valA)
          .map(([key]) => key);

        current.querySelectorAll('.each-data-line').forEach((eachLine, i) => {
          const dataField = dataFields[i];
          eachLine.style.zIndex = `${(sortedKeys.indexOf(dataField) + 1) * 10}`;
        })

        current.querySelectorAll('.graph-range-paint-bar').forEach((eachPaintBar, i) => {
          const dataField = dataFields[i];
          const color = colors[i];

          eachPaintBar.style.width = angleHypotenuseMapping[dataField].hypotenuse;
          eachPaintBar.style.bottom = `calc((${bottomMapping[dataField].replace('calc', '')}) - 100%)`;
          eachPaintBar.style.transform = `rotateZ(${angleHypotenuseMapping[dataField].angle}) skewX(${angleHypotenuseMapping[dataField].angle})`;
          eachPaintBar.style.backgroundColor = color;
          eachPaintBar.style.borderRight = `1px solid ${color}`;
          
          eachPaintBar.style.zIndex = `${(sortedKeys.indexOf(dataField) + 1) * 10}`;
        })

        validatorListenerVariablesMapping[operatorAddressM].rangeFinalColumn = current;
        if (target.getAttribute('timestamp') < validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn.getAttribute('timestamp')) current = current.previousSibling;
        else current = current.nextSibling;
      }
    }

    const angleHypotenuseMappingAnglesOnly = getAngleBetweenTwoPoints(current, current.nextSibling, operatorAddress, dataFields);
    
    if (target.getAttribute('timestamp') < validatorListenerVariablesMapping[operatorAddressM].rangeInitialColumn.getAttribute('timestamp')) {
      validatorListenerVariablesMapping[operatorAddressM].isSelectionDirectionToLeft = true;
      const angleHypotenuseMappingHypotenuseOnly = getAngleBetweenTwoPoints(current, current.nextSibling, operatorAddress, dataFields);
      
      const bottomMapping = {}
      dataFields.forEach(eachDataField => {
        bottomMapping[eachDataField] = `calc(((${columnWrapper.nextSibling.getAttribute(eachDataField)} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;
      });

      columnWrapper.querySelectorAll('.graph-range-paint-bar').forEach(eachPaintBar => {
        eachPaintBar.classList.add('graph-range-paint-bar-right');
        eachPaintBar.classList.remove('graph-range-paint-bar-left');
      })
            
      columnWrapper.querySelectorAll('.graph-range-paint-bar').forEach((eachPaintBar, i) => {
        const hypotenuse = angleHypotenuseMappingHypotenuseOnly[dataFields[i]].hypotenuse;
        eachPaintBar.style.width = `calc((${right / deltaX}) * ${hypotenuse.replace('calc', '')})`;
        eachPaintBar.style.bottom = `calc((${bottomMapping[dataFields[i]].replace('calc', '')}) - 100%)`;  
      });
    } else {
      validatorListenerVariablesMapping[operatorAddressM].isSelectionDirectionToLeft = false;
      
      const angleHypotenuseMappingHypotenuseOnly = getAngleBetweenTwoPoints(current, current.nextSibling, operatorAddress, dataFields);
      
      const bottomMapping = {}
      dataFields.forEach(eachDataField => {
        bottomMapping[eachDataField] = `calc(((${columnWrapper.getAttribute(eachDataField)} - var(--min-value-${operatorAddress})) / (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))) * 100%)`;
      });
      
      columnWrapper.querySelectorAll('.graph-range-paint-bar').forEach(eachPaintBar => {
        eachPaintBar.classList.add('graph-range-paint-bar-left');
        eachPaintBar.classList.remove('graph-range-paint-bar-right');
      })

      columnWrapper.querySelectorAll('.graph-range-paint-bar').forEach((eachPaintBar, i) => {
        const hypotenuse = angleHypotenuseMappingHypotenuseOnly[dataFields[i]].hypotenuse;
        eachPaintBar.style.width = `calc((${left / deltaX}) * ${hypotenuse.replace('calc', '')})`;
        eachPaintBar.style.bottom = `calc((${bottomMapping[dataFields[i]].replace('calc', '')}) - 100%)`;  
      })
    }

    columnWrapper.querySelectorAll('.graph-range-paint-bar').forEach((eachPaintBar, i) => {
      const angle = angleHypotenuseMappingAnglesOnly[dataFields[i]].angle;
      eachPaintBar.style.transform = `rotateZ(${angle}) skewX(${angle})`;
      eachPaintBar.style.backgroundColor = colors[i];
    });
  };

  document.body.addEventListener('mousemove', columnMouseHandler);
  validatorGraphEventListenersMapping[operatorAddress].push({ event: 'mousemove', handler: columnMouseHandler, element: document.body });
}