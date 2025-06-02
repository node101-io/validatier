
import fs from 'fs';

function parseDate(dateStr: string): Date {
  const [month, day, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

export const findSkipDates = () => {
  const rawJson = fs.readFileSync('atom_price.json', 'utf-8');
  const data = JSON.parse(rawJson);
  const dateStrings = Object.keys(data);

  for (let i = 0; i < dateStrings.length - 1; i++) {
    const currentDate = parseDate(dateStrings[i]);
    const nextDate = parseDate(dateStrings[i + 1]);

    const diffInTime = nextDate.getTime() - currentDate.getTime();
    const diffInDays = diffInTime / (1000 * 60 * 60 * 24);

    if (diffInDays !== 1) {
      console.log(`Date gap found between ${dateStrings[i]} and ${dateStrings[i + 1]}`);
      break;
    } else {}
  }
}
