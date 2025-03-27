function adjustLineWidthAndAngle (prevColumn, column, operatorAddress) {
  
  const { selfStakeAngle, selfStakeHypotenuse, withdrawAngle, withdrawHypotenuse, commissionAngle, commissionHypotenuse } = getAngleBetweenTwoPoints(prevColumn, column, operatorAddress);

  prevColumn.children[1].style.width = selfStakeHypotenuse;
  prevColumn.children[1].style.transform = `rotateZ(${selfStakeAngle})`;

  prevColumn.children[3].style.width = withdrawHypotenuse;
  prevColumn.children[3].style.transform = `rotateZ(${withdrawAngle})`;

  prevColumn.children[5].style.width = commissionHypotenuse;
  prevColumn.children[5].style.transform = `rotateZ(${commissionAngle})`;
}