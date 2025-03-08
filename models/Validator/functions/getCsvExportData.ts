
export const getCsvExportData = (
  rankings: any,
  callback: (
    err: string | null,
    csvExportData: any
  ) => any
) => {

  for (const key in rankings) {
    if (!Object.prototype.hasOwnProperty.call(rankings, key)) continue;

    let csvString = '';
    const eachRanking = rankings[key];

    csvString += 'operator_address,moniker,self_stake,withdraw,ratio,sold\n';

    for (let j = 0; j < eachRanking.length; j++) {
      const eachValidator = eachRanking[j];
      const safeValidatorMoniker = (eachValidator.moniker.replace(',', '')).replace('"', '');
      csvString += `${eachValidator.operator_address},${safeValidatorMoniker},${eachValidator.self_stake},${eachValidator.withdraw},${eachValidator.ratio},${eachValidator.sold} \n`
    }

    rankings[key] = csvString;
  }
  callback(null, rankings);
}
