function generatePointAndLine(color, bottom) {
  const point = document.createElement("div");
  point.className = "each-data-point";
  point.style.backgroundColor = color;
  point.style.bottom = `${bottom}`;

  const line = document.createElement("div");
  line.className = "each-data-line";
  line.style.backgroundColor = color;
  line.style.bottom = `${bottom}`;

  return { point, line };
}
