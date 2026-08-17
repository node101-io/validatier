import path from 'path';
import { connectMongo, disconnectMongo } from '../db/mongo';
import { exportStaticJson } from './exportJson';

// CLI entry (npm run export-json). Manual, one-shot for now (docs/05, plan
// step A3) — wiring this into dailyJobs.ts is a later step, not needed until
// the frontend actually consumes the output.
async function main(): Promise<void> {
  const outDir = process.argv[2] ?? path.resolve(__dirname, '..', '..', 'data');

  await connectMongo();
  try {
    const result = await exportStaticJson(outDir);
    console.log(
      `export-json: wrote ${result.validatorsIncluded} validator files to ${result.outDir} ` +
        `(${result.validatorsSkipped} skipped, total_withdraw == 0)`
    );
  } finally {
    await disconnectMongo();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
