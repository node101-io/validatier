
function getAngleBetweenTwoPoints (column1, column2, operatorAddress) {
  
  const self_stake_1 = column1.getAttribute('self_stake');
  const self_stake_2 = column2.getAttribute('self_stake');

  const withdraw_1 = column1.getAttribute('withdraw');
  const withdraw_2 = column2.getAttribute('withdraw');
  
  const commission_1 = column1.getAttribute('commission');
  const commission_2 = column2.getAttribute('commission');

  const deltaX = `--graph-column-width-${operatorAddress}`;

  const selfStakeDeltaY = `(
    (${(self_stake_2 - self_stake_1)} / 
    (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress})))
    * var(--column-height)
  )`

  const selfStakeHypotenuse = `calc(
    1px * sqrt(var(${deltaX}) * var(${deltaX}) + ((${selfStakeDeltaY}) * (${selfStakeDeltaY})))
  )`;
  const selfStakeAngle = `atan((${selfStakeDeltaY} * -1) / var(${deltaX}))`;

  const withdrawDeltaY = `(
    (
      ${(withdraw_2 - withdraw_1)} / 
      (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))
    )
    * var(--column-height)
  )`
  
  const withdrawHypotenuse = `calc(
    1px * sqrt(var(${deltaX}) * var(${deltaX}) + ((${withdrawDeltaY}) * (${withdrawDeltaY})))
  )`;
  const withdrawAngle = `atan((${withdrawDeltaY} * -1) / var(${deltaX}))`;


  const commissionDeltaY = `(
    (
      ${(commission_2 - commission_1)} / 
      (var(--max-value-${operatorAddress}) - var(--min-value-${operatorAddress}))
    )
    * var(--column-height)
  )`
  
  const commissionHypotenuse = `calc(
    1px * sqrt(var(${deltaX}) * var(${deltaX}) + ((${commissionDeltaY}) * (${commissionDeltaY})))
  )`;
  const commissionAngle = `atan((${commissionDeltaY} * -1) / var(${deltaX}))`;

  return {
    selfStakeHypotenuse,
    selfStakeAngle,
    withdrawHypotenuse,
    withdrawAngle,
    commissionHypotenuse,
    commissionAngle
  };
}
