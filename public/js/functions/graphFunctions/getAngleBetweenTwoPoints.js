
function getAngleBetweenTwoPoints (column1, column2, operatorAddress, dataFields, subplotGroupMapping) {
  
  const angleHypotenuseMapping = {};
  
  const deltaX = `--graph-column-width-${operatorAddress}`;

  dataFields.forEach(eachDataField => {

    const subPlotGroup = subplotGroupMapping ? subplotGroupMapping[eachDataField] : '';
    const minMaxAddOn = subplotGroupMapping ? `-${eachDataField != 'price' ? subPlotGroup : '1'}` : '';
    const numOfGroups = subplotGroupMapping ? subplotGroupMapping['number_of_groups'] : 1;

    const data_1 = column1.getAttribute(eachDataField);
    const data_2 = column2.getAttribute(eachDataField);

    const dataDeltaY = `(
      (${(data_2 - data_1)} / 
      (var(--max-value-${operatorAddress}${minMaxAddOn}) - var(--min-value-${operatorAddress}${minMaxAddOn})))
      * (var(--column-height-${operatorAddress}) / ${numOfGroups})
    )`;

    const angle = `atan((${dataDeltaY} * -1) / var(${deltaX}))`;

    const hypotenuse = `calc(
      1px * sqrt(var(${deltaX}) * var(${deltaX}) + ((${dataDeltaY}) * (${dataDeltaY})))
    )`;

    angleHypotenuseMapping[eachDataField] = {
      hypotenuse: hypotenuse,
      angle: angle
    }
  })

  return angleHypotenuseMapping;
}
