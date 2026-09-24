import mongoose from 'mongoose';
import { config } from '../config';
import { FundFlowEdge } from '../models/FundFlowEdge/FundFlowEdge';

// One-time cleanup (2026-09-23): the old versioned schema had 5 indexes,
// all keyed on the now-removed `version` field ({version,origin,holder},
// {version,origin,last_update_timestamp}, {version,holder}, {version,status},
// {published,version}) — none of them useful anymore since nothing queries
// fund_flow_edges by version, but Mongoose does not drop obsolete indexes on
// its own when a schema changes, only adds missing ones. Measured on Atlas:
// these 5 dead indexes were ~2.1GB combined, plus write overhead maintaining
// them on every insert/update. `syncIndexes()` drops any index not declared
// in the current schema and creates any declared one that's missing — exits
// with the collection holding exactly the 4 indexes FundFlowEdge.ts defines.
//
// Usage: npm run build && node dist/scripts/syncFundFlowEdgeIndexes.js -- --yes

async function main(): Promise<void> {
    if (!process.argv.includes('--yes')) {
        console.error('refusing to run without --yes — this drops every fund_flow_edges index ' +
            'not declared in the current schema. Run: node dist/scripts/syncFundFlowEdgeIndexes.js -- --yes');
        process.exit(1);
    }

    await mongoose.connect(config.mongoUri);

    const before = await FundFlowEdge.collection.indexes();
    console.log('indexes before:', before.map((i) => i.name));

    const result = await FundFlowEdge.syncIndexes();
    console.log('syncIndexes result (indexes dropped/created):', result);

    const after = await FundFlowEdge.collection.indexes();
    console.log('indexes after:', after.map((i) => i.name));

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error('sync failed:', err);
    process.exit(1);
});
