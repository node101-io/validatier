function prettyDate(timestamp) {
  const date = new Date(parseInt(timestamp));

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year.toString().slice(2)}`;
}
