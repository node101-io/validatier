function downloadCSV(rankings, filename = "data.csv") {

  let csvString = '';

  for (let i = 0; i < rankings.length; i++) {
    const eachRanking = rankings[i];

    csvString += 'operator_address,moniker,self_stake,withdraw,ratio,sold\n';

    for (let j = 0; j < eachRanking.length; j++) {
      const eachValidator = eachRanking[j];
      const safeValidatorMoniker = (eachValidator.moniker.replace(',', '')).replace('"', '');
      csvString += `${eachValidator.operator_address},${safeValidatorMoniker},${eachValidator.self_stake},${eachValidator.withdraw},${eachValidator.ratio},${eachValidator.sold} \n`
    }
    csvString += ', , , , , \n , , , , , \n'
  }

  const blob = new Blob([csvString], { type: "text/csv" });
  
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
}
