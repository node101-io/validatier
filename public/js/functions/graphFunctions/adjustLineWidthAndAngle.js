function adjustLineWidthAndAngle (prevColumn, column, operatorAddress, dataFields) {
  
  const angleHypotenuseMapping = getAngleBetweenTwoPoints(prevColumn, column, operatorAddress, dataFields);
  
  dataFields.forEach(eachDataField => {
    const line = prevColumn.querySelector(`.${eachDataField}-graph-data-line-${operatorAddress}`);
    line.style.width = angleHypotenuseMapping[eachDataField].hypotenuse;
    line.style.transform = `rotateZ(${angleHypotenuseMapping[eachDataField].angle})`;
  });
}