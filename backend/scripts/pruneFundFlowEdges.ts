import mongoose from 'mongoose';
import { config } from '../config';
import { FundFlowEdge } from '../models/FundFlowEdge/FundFlowEdge';

// One-time cleanup (2026-09-23): jobs/snapshot.ts used to write a FULL copy
// of every SQLite edge into `fund_flow_edges` every single day, forever, and
// nothing ever read it back (see snapshot.ts's header comment) — 578 daily
// copies had piled up to 8.2M documents. snapshot.ts no longer writes this
// collection at all; this just cleans up what already accumulated.
//
// Every version is by construction a FULL snapshot (snapshot.ts's
// `SELECT * FROM edges`, not a delta), so the latest version alone already
// has the complete picture — safe to delete every older version outright
// rather than dropping the whole collection.
//
// Usage: npm run build && node dist/scripts/pruneFundFlowEdges.js -- --yes

async function main(): Promise<void> {
    if (!process.argv.includes('--yes')) {
        console.error('refusing to run without --yes — this deletes every fund_flow_edges document ' +
            'below the latest version. Run: node dist/scripts/pruneFundFlowEdges.js -- --yes');
        process.exit(1);
    }

    await mongoose.connect(config.mongoUri);

    const latest = await FundFlowEdge.findOne().sort({ version: -1 }).select('version').lean();
    if (latest === null) {
        console.log('fund_flow_edges is already empty, nothing to prune');
        await mongoose.disconnect();
        return;
    }

    const before = await FundFlowEdge.countDocuments();
    const keeping = await FundFlowEdge.countDocuments({ version: latest.version });
    console.log(`latest version: ${latest.version} (${keeping} edges) — total docs before: ${before}`);

    const result = await FundFlowEdge.deleteMany({ version: { $lt: latest.version } });
    console.log(`deleted ${result.deletedCount} documents from older versions`);

    const after = await FundFlowEdge.countDocuments();
    console.log(`total docs after: ${after} (should equal ${keeping})`);

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error('prune failed:', err);
    process.exit(1);
});
