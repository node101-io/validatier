import { config } from '../config';

// Parses a raw /block_results response into the list of REAL value transfers.
// Rules (docs/02, CLAUDE.md gotchas #1/#2):
//  - only `transfer` events (coin_spent/coin_received/accruals are noise or duplicates)
//  - in txs_results a transfer must carry `msg_index`; without it it's fee/tip (ante)
//  - failed txs (code != 0) move no money
//  - finalize_block_events: keep only transfers (rewards/commission/mint/coinbase are
//    accounting accruals inside modules, not money hitting a wallet)
//  - uatom only, amount as BigInt; empty/zero/foreign denoms skipped
//  - a withdraw_rewards/withdraw_commission event at the same msg_index tags the
//    transfer as a reward|commission claim (seed detection input for the taint engine)

// The withdraw event names the exact validator the claim belongs to — this is
// what makes seed attribution exact (no pro-rata even for shared wallets).
export interface WithdrawTag {
  kind: 'reward' | 'commission';
  validator: string; // cosmosvaloper1... from the event's `validator` attribute
}

export interface RealTransfer {
  sender: string;
  recipient: string;
  amount: bigint; // uatom
  msg_index: number | null; // null for finalize transfers
  source: 'tx' | 'finalize';
  tx_index: number | null; // position in txs_results; null for finalize
  withdraw_tag: WithdrawTag | null;
}

interface RawEvent {
  type: string;
  attributes?: Array<{ key: string; value?: string }>;
}

interface RawBlockResults {
  txs_results?: Array<{ code: number; events?: RawEvent[] }> | null;
  finalize_block_events?: RawEvent[] | null;
}

function attr(event: RawEvent, key: string): string | undefined {
  return event.attributes?.find((a) => a.key === key)?.value;
}

// "669446693uatom" or "12ibc/9FBA...,5uatom" -> the uatom part as BigInt.
// null = nothing to track (empty, zero, or no uatom component).
function uatomAmount(value: string | undefined): bigint | null {
  if (!value) return null;
  for (const part of value.split(',')) {
    const m = /^(\d+)(.+)$/.exec(part.trim());
    if (m && m[2] === config.denom) {
      const amount = BigInt(m[1]);
      return amount > 0n ? amount : null;
    }
  }
  return null;
}

export function parseBlockResults(raw: unknown): RealTransfer[] {
  const br = raw as RawBlockResults;
  const out: RealTransfer[] = [];

  (br.txs_results ?? []).forEach((tx, txIndex) => {
    if (tx.code !== 0) return; // failed tx: msg events are discarded by the chain anyway
    const events = tx.events ?? [];

    // One msg is either a reward or a commission withdrawal, never both.
    const tags = new Map<number, WithdrawTag>();
    for (const e of events) {
      if (e.type !== 'withdraw_rewards' && e.type !== 'withdraw_commission') continue;
      const mi = attr(e, 'msg_index');
      const validator = attr(e, 'validator');
      if (mi !== undefined && validator !== undefined) {
        tags.set(Number(mi), {
          kind: e.type === 'withdraw_rewards' ? 'reward' : 'commission',
          validator,
        });
      }
    }

    for (const e of events) {
      if (e.type !== 'transfer') continue;
      const miRaw = attr(e, 'msg_index');
      if (miRaw === undefined) continue; // fee/tip machinery — NOT a message transfer
      const amount = uatomAmount(attr(e, 'amount'));
      if (amount === null) continue;
      const sender = attr(e, 'sender');
      const recipient = attr(e, 'recipient');
      if (!sender || !recipient) continue;
      const msg_index = Number(miRaw);
      // multisend: several transfer events share one msg_index -> one record each
      out.push({
        sender,
        recipient,
        amount,
        msg_index,
        source: 'tx',
        tx_index: txIndex,
        withdraw_tag: tags.get(msg_index) ?? null,
      });
    }
  });

  for (const e of br.finalize_block_events ?? []) {
    if (e.type !== 'transfer') continue;
    const amount = uatomAmount(attr(e, 'amount'));
    if (amount === null) continue; // e.g. consumer_rewards_pool transfers with empty amount
    const sender = attr(e, 'sender');
    const recipient = attr(e, 'recipient');
    if (!sender || !recipient) continue;
    out.push({
      sender,
      recipient,
      amount,
      msg_index: null,
      source: 'finalize',
      tx_index: null,
      withdraw_tag: null,
    });
  }

  return out;
}
