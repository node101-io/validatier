import { MODULE_ACCOUNT_SET } from '../chain/moduleAccounts';
import { isTainted } from '../store/edges';
import { processSeedTransfer, type BlockCtx } from './seed';
import type { RealTransfer } from '../chain/blockResults';

// Per-transfer decision gate — docs/01 steps 1..3. Order matters:
// seed BEFORE module exclusion (the seed transfer itself comes FROM the
// distribution module and must not be swallowed by the exclusion rule).
export type TransferDisposition =
  | 'seeded' // consumed as seed inflow (reward/commission claim)
  | 'excluded' // touches a module account — protocol noise (restake, fees, mint...)
  | 'untainted' // sender holds no traced money — unreachable from any validator
  | 'propagate'; // tainted sender — contraction applies (task 6.3)

export function processTransfer(t: RealTransfer, ctx: BlockCtx): TransferDisposition {
  // 1. SEED? (distribution -> withdrawAddr with a matching validator tag)
  if (processSeedTransfer(t, ctx)) return 'seeded';

  // 2. EXCLUDE? any other transfer touching a module account is protocol
  // machinery, not a wallet-to-wallet hop. This also drops foreign delegator
  // claims (sender = distribution) that the seed guard rejected.
  if (MODULE_ACCOUNT_SET.has(t.sender) || MODULE_ACCOUNT_SET.has(t.recipient)) {
    return 'excluded';
  }

  // 3. TAINTED? money leaving an address we never traced is not ours to follow.
  if (!isTainted(t.sender)) return 'untainted';

  // 4. contraction (haircut + re-anchor) — task 6.3 plugs in here.
  return 'propagate';
}
