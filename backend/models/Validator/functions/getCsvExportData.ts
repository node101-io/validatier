export const getCsvExportData = (
  rankings: Record<string, any[]>,
  callback: (
    err: string | null,
    csvExportData: any
  ) => any
) => {
  const csvExportData: Record<string, string> = {};

  for (const key in rankings) {
    if (!Object.prototype.hasOwnProperty.call(rankings, key)) continue;

    let csvString = '';
    const eachRanking = rankings[key];

    csvString += 'operator_address,moniker,total_stake,total_withdraw,sold,self_stake,percentage_sold\n';

    for (let j = 0; j < eachRanking.length; j++) {
      const eachValidator = eachRanking[j];
      const safeValidatorMoniker = (eachValidator.moniker.replace(',', '')).replace('"', '');
      csvString += `${eachValidator.operator_address || 'null'},${safeValidatorMoniker || 'null'},${eachValidator.total_stake},${eachValidator.total_withdraw},${eachValidator.sold},${eachValidator.self_stake},${eachValidator.percentage_sold}\n`
    }

    csvExportData[key] = csvString;
  }
  callback(null, csvExportData);
}
