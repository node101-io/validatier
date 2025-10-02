function adjustLineWidthAndAngle(
  prevColumn,
  column,
  operatorAddress,
  dataFields,
  subplotGroupMapping
) {
  const angleHypotenuseMapping = getAngleBetweenTwoPoints(
    prevColumn,
    column,
    operatorAddress,
    dataFields,
    subplotGroupMapping
  );

  dataFields.forEach((eachDataField) => {
    const line = prevColumn.querySelector(
      `.${eachDataField}-graph-data-line-${operatorAddress}`
    );
    line.style.width = angleHypotenuseMapping[eachDataField].hypotenuse;
    line.style.transform = `rotateZ(${angleHypotenuseMapping[eachDataField].angle})`;
  });
}
