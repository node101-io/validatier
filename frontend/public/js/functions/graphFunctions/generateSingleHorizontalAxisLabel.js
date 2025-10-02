const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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

function generateSingleHorizontalAxisLabel(labelMapping) {
  const {
    currentIntervalLeft,
    currentIntervalRight,
    columnToAppendHorizontalLabel,
  } = labelMapping;

  const horizontalAxisLabel = document.createElement("div");
  horizontalAxisLabel.classList.add("horizontal-axis-label");

  const horizontalAxisLabelCompact = document.createElement("div");
  horizontalAxisLabelCompact.classList.add(
    "horizontal-axis-label",
    "horizontal-axis-label-compact"
  );

  let formattedDateLeft = "";
  let formattedDateRight = "";

  if ((currentIntervalRight - currentIntervalLeft) / dayAsMilliseconds > 60) {
    formattedDateLeft = formatTimestampLarge(currentIntervalLeft);
    formattedDateRight = formatTimestampLarge(currentIntervalRight);
  } else {
    formattedDateLeft = formatTimestampLarge(currentIntervalLeft);
    formattedDateRight = formatTimestampLarge(currentIntervalRight);
  }

  horizontalAxisLabel.innerHTML = `${formattedDateLeft} - ${formattedDateRight}`;

  const compactLine1 = document.createElement("span");
  compactLine1.innerHTML = formattedDateLeft;
  const compactLine2 = document.createElement("span");
  compactLine2.innerHTML = formattedDateRight;
  horizontalAxisLabelCompact.appendChild(compactLine1);
  horizontalAxisLabelCompact.appendChild(compactLine2);

  columnToAppendHorizontalLabel.appendChild(horizontalAxisLabel);
  columnToAppendHorizontalLabel.appendChild(horizontalAxisLabelCompact);
}
