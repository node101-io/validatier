import { config } from './config';

// Entrypoint. Wiring (connections -> block loop -> schedulers) is added task
// by task; for now this only proves the scaffold builds and config loads.
async function main(): Promise<void> {
  // No secrets in logs (MONGO_URI stays out).
  console.log(
    `validatier backend: config OK — denom=${config.denom}, decimals=${config.decimals}, ` +
      `rpc=${config.rpcUrls.length} url(s), lcd=${config.lcdUrls.length} url(s), ` +
      `max_depth=${config.maxDepth}, tier2_min_indegree=${config.tier2MinIndegree}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
