import AdmZip from 'adm-zip';

export const getCsvZipBuffer = (csvExportData: any, callback: (err: string | null, zipBuffer: Buffer) => any) => {
  const zip = new AdmZip();
  for (const [filename, content] of Object.entries(csvExportData)) zip.addFile(filename, Buffer.from(String(content), "utf-8"));
  return callback(null, zip.toBuffer());
}
