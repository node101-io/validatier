function generateSingleHorizontalAxisLabel (timestamp) {
  const horizontalAxisLabel = document.createElement('div');
  horizontalAxisLabel.classList.add('horizontal-axis-label');
  horizontalAxisLabel.innerHTML = prettyDate(timestamp);
  return horizontalAxisLabel
}
