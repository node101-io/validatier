import { MongoClient } from 'mongodb';
import { config } from '../config';
import { chainClient } from '../chain/client';
import { parseBlockResults, RealTransfer } from '../chain/blockResults';

// Debug tool: pull raw on-chain transfer data for a validator/height and lay
// it next to what's recorded in Mongo, to check whether a suspiciously tiny
// `sold_atom` is a genuine small reward/commission claim, a reward<->commission
// mixup (blockResults.ts withdraw_tag / engine/seed.ts crediting), or just a
// timing skew between validator_stats (daily) and fund_flow_edges (frequent).
//
// Usage:
//   npm run inspect-tx -- find --validator "Binance Node"
//   npm run inspect-tx -- inspect --height 21500000 --validator cosmosvaloper1...
//   npm run inspect-tx -- inspect --height 21500000 --json

function uatomToAtom(v: string | bigint): string {
  return (Number(v) / 10 ** config.decimals).toFixed(6);
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function withMongo<T>(fn: (db: import('mongodb').Db) => Promise<T>): Promise<T> {
  const client = new MongoClient(config.mongoUri);
  await client.connect();
  try {
    return await fn(client.db());
  } finally {
    await client.close();
  }
}

async function cmdFind(): Promise<void> {
  const query = argValue('--validator');
  if (!query) {
    console.error('usage: find --validator <moniker-or-operator_address>');
    process.exit(1);
  }

  await withMongo(async (db) => {
    const validator = query.startsWith('cosmosvaloper')
      ? await db.collection('validators').findOne({ operator_address: query })
      : await db.collection('validators').findOne({ moniker: new RegExp(`^${query}$`, 'i') });

    if (!validator) {
      console.error(`no validator matching "${query}"`);
      process.exit(1);
    }
    const operator_address = validator.operator_address as string;
    console.log(`validator: ${validator.moniker}  ${operator_address}`);
    console.log(`delegator_address: ${validator.delegator_address ?? '(none)'}`);

    const latestVersionDoc = await db
      .collection('fund_flow_edges')
      .find({ published: true })
      .sort({ version: -1 })
      .limit(1)
      .next();
    const version = latestVersionDoc?.version;
    console.log(`\nlatest published fund_flow_edges version: ${version}`);

    const edges = await db
      .collection('fund_flow_edges')
      .find({ version, origin: operator_address, status: 'realized' })
      .sort({ weight: 1 })
      .toArray();

    console.log(`\nrealized edges for ${operator_address} (smallest weight first):`);
    console.table(
      edges.map((e) => ({
        holder: e.holder,
        weight_uatom: e.weight,
        weight_atom: uatomToAtom(e.weight),
        sink_kind: e.sink_kind,
        last_update_height: e.last_update_height,
        last_update_timestamp: e.last_update_timestamp,
      }))
    );

    const statsRows = await db
      .collection('validator_stats')
      .find({ operator_address })
      .sort({ year: -1, month: -1 })
      .limit(1)
      .toArray();

    if (statsRows.length === 0) {
      console.log('\nno validator_stats doc for this validator');
      return;
    }
    const stats = statsRows[0];
    let lastIdx = -1;
    for (let i = 0; i < 31; i++) {
      if (stats.timestamp[i] != null) lastIdx = i;
    }
    if (lastIdx === -1) {
      console.log('\nvalidator_stats doc has no populated day');
      return;
    }
    console.log(
      `\nlatest validator_stats day (${stats.year}-${stats.month}-${lastIdx + 1}):`
    );
    console.table([
      {
        block_height: stats.block_height[lastIdx],
        timestamp: stats.timestamp[lastIdx],
        total_withdrawn_reward_atom: uatomToAtom(stats.total_withdrawn_reward[lastIdx] ?? '0'),
        total_withdrawn_commission_atom: uatomToAtom(
          stats.total_withdrawn_commission[lastIdx] ?? '0'
        ),
      },
    ]);

    if (edges.length > 0) {
      const newestEdge = edges.reduce((a, b) =>
        a.last_update_timestamp > b.last_update_timestamp ? a : b
      );
      if (newestEdge.last_update_timestamp > stats.timestamp[lastIdx]) {
        console.log(
          '\n>> fund_flow_edges has updates newer than the latest validator_stats snapshot ' +
            '-- sold_atom > total_withdrawn_atom in the dashboard may just be this staleness gap.'
        );
      }
    }
  });
}

async function cmdInspect(): Promise<void> {
  const heightRaw = argValue('--height');
  if (!heightRaw) {
    console.error('usage: inspect --height <n> [--validator <operator_address>] [--json]');
    process.exit(1);
  }
  const height = Number(heightRaw);
  const validatorFilter = argValue('--validator');
  const asJson = process.argv.includes('--json');

  const [block, blockResults] = await Promise.all([
    chainClient.getBlock(height),
    chainClient.getBlockResults(height),
  ]);

  const timestamp = Math.floor(new Date(block.block.header.time as unknown as string).getTime() / 1000);
  console.log(`height ${height}  timestamp ${timestamp}  (${new Date(timestamp * 1000).toISOString()})`);

  const transfers: RealTransfer[] = parseBlockResults(blockResults);
  const relevant = validatorFilter
    ? transfers.filter((t) => t.withdraw_tag?.validator === validatorFilter)
    : transfers;

  if (relevant.length === 0) {
    console.log(
      validatorFilter
        ? `no transfers tagged for validator ${validatorFilter} at this height`
        : 'no real transfers at this height'
    );
    return;
  }

  console.table(
    relevant.map((t) => ({
      sender: t.sender,
      recipient: t.recipient,
      amount_uatom: t.amount.toString(),
      amount_atom: uatomToAtom(t.amount),
      msg_index: t.msg_index,
      withdraw_tag: t.withdraw_tag ? `${t.withdraw_tag.kind} (${t.withdraw_tag.validator})` : null,
      is_ibc_out: t.is_ibc_out,
      source: t.source,
    }))
  );

  if (asJson) {
    console.log(JSON.stringify(relevant, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
  }
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (cmd === 'find') await cmdFind();
  else if (cmd === 'inspect') await cmdInspect();
  else {
    console.error('usage: inspect-tx <find|inspect> ...');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('inspect-tx failed:', err);
  process.exit(1);
});
