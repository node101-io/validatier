import { MODULE_ACCOUNT_SET } from '../chain/moduleAccounts';
import { isTainted } from '../store/edges';
import { processSeedTransfer, type BlockCtx } from './seed';
import { applyContraction } from './contraction';
import { classifyRecipient } from './classify';
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
  if (processSeedTransfer(t, ctx)) {
    // Classify the seed recipient too (deviates from docs/01's literal
    // "continue" — confirmed with the user): a validator can withdraw
    // DIRECTLY to a known sink (2 real validators withdraw straight to
    // Kraken) with no further hop to trigger classification. Without this,
    // that edge would sit at in_flight forever and sold% would show 0%
    // for money that plainly already reached an exchange.
    classifyRecipient(t);
    return 'seeded';
  }

  // 2. EXCLUDE? any other transfer touching a module account is protocol
  // machinery, not a wallet-to-wallet hop. This also drops foreign delegator
  // claims (sender = distribution) that the seed guard rejected.
  if (MODULE_ACCOUNT_SET.has(t.sender) || MODULE_ACCOUNT_SET.has(t.recipient)) {
    return 'excluded';
  }

  // 3. TAINTED? money leaving an address we never traced is not ours to follow.
  if (!isTainted(t.sender)) return 'untainted';

  // 4. CONTRACTION: haircut across origins + re-anchor to the recipient.
  applyContraction(t.sender, t.recipient, t.amount, ctx);

  // 5. CLASSIFY: is the recipient a known/discovered sink, or IBC-out?
  classifyRecipient(t);
  return 'propagate';
}
