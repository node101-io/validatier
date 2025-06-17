const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatTimestampLarge(timestamp) {
  const date = new Date(timestamp);

  const shortYear = date.getFullYear().toString().slice(-2);
  return `${months[date.getMonth()]} '${shortYear}`;
}

function formatTimestampSmall(timestamp) {
  const date = new Date(timestamp);

  return `${date.getDate()} ${months[date.getMonth()]}`;
}

const dayAsMilliseconds = 86400000;

function generateSingleHorizontalAxisLabel (labelMapping) {
  const { currentIntervalLeft, currentIntervalRight, columnToAppendHorizontalLabel } = labelMapping;

  const horizontalAxisLabel = document.createElement('span');
  horizontalAxisLabel.classList.add('horizontal-axis-label');

  if ((currentIntervalRight - currentIntervalLeft) / dayAsMilliseconds > 60)
    horizontalAxisLabel.innerHTML = `
      ${formatTimestampLarge(currentIntervalLeft)} - ${formatTimestampLarge(currentIntervalRight)}
    `;
  else
    horizontalAxisLabel.innerHTML = `
      ${formatTimestampSmall(currentIntervalLeft)} - ${formatTimestampSmall(currentIntervalRight)}
    `;

  columnToAppendHorizontalLabel.appendChild(horizontalAxisLabel);
}
