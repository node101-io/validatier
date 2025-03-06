function flattenObject(obj) {
  const result = {};
  for (const key in obj) {
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      const flatObject = flattenObject(obj[key]);
      for (const innerKey in flatObject) {
        result[key + '.' + innerKey] = flatObject[innerKey];
      }
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

function downloadCSV(dataObject, filename) {
  if (!dataObject || !Array.isArray(dataObject.data) || dataObject.data.length === 0) {
    alert("No valid data provided to download.");
    return;
  }

  const data = dataObject.data.map(item => flattenObject(item));
  const keys = Object.keys(data[0]);
  const csvRows = [];

  csvRows.push(keys.join(","));

  for (const row of data) {
    const values = keys.map(key => row[key]);
    csvRows.push(values.join(","));
  }

  const csv = csvRows.join("\n");
  const link = document.createElement('a');
  link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  link.download = filename || 'data.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

