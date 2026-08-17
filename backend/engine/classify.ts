import { config } from '../config';
import { lookupSink } from '../store/sinkRegistry';
import { inDegreeOf, markHolderStatus } from '../store/edges';
import type { RealTransfer } from '../chain/blockResults';

// Classification (docs/01 step 5, docs/04 CLASSIFY). Runs after contraction,
// for every 'propagate' transfer. Sink-ness is a property of the ADDRESS, not
// of one origin's slice — so classification updates ALL non-realized edges at
// the recipient (markHolderStatus), not just the origins touched this hop.
export function classifyRecipient(t: RealTransfer): void {
  // IBC-out (docs/01 "Yöntem A"): same-msg_index ibc_transfer event. Terminal —
  // money left cosmoshub, we only track this chain.
  if (t.is_ibc_out) {
    markHolderStatus(t.recipient, 'realized', 'ibc_out');
    return;
  }

  // Tier 1 (static list) or a previously-discovered Tier 2 address: reuse
  // whatever tier is on record rather than re-deriving it.
  const sink = lookupSink(t.recipient);
  if (sink) {
    markHolderStatus(t.recipient, sink.tier === 1 ? 'realized' : 'suspected', sink.kind);
    return;
  }

  // Tier 2 heuristic (single signal per lead dev: high in-degree only).
  if (inDegreeOf(t.recipient) >= config.tier2MinIndegree) {
    markHolderStatus(t.recipient, 'suspected', 'structural');
    return;
  }

  // else: stays in_flight — the status contraction already wrote.
}
