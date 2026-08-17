import { config } from "../config";
import { accountToOperator } from "./address";

// Parses a raw /block_results response into the list of REAL value transfers.
// Rules (docs/02, CLAUDE.md gotchas #1/#2):
//  - only `transfer` events (coin_spent/coin_received/accruals are noise or duplicates)
//  - in `results` (per-tx) a transfer must carry `msg_index`; without it it's fee/tip (ante)
//  - failed txs (code != 0) move no money
//  - finalizeBlockEvents: keep only transfers (rewards/commission/mint/coinbase are
//    accounting accruals inside modules, not money hitting a wallet)
//  - uatom only, amount as BigInt; empty/zero/foreign denoms skipped
//  - a withdraw_rewards/withdraw_commission event at the same msg_index tags the
//    transfer as a reward|commission claim (seed detection input for the taint engine)
//  - withdraw_commission events carry no `validator` attribute on this chain's SDK
//    version (only withdraw_rewards does) -> fall back to the sibling `message`
//    event's `sender` (MsgWithdrawValidatorCommission's signer = the validator's
//    own account address; same 20 bytes as operator_address, docs/02 gotcha #4)
//  - an ibc_transfer event at the same msg_index marks the transfer as IBC-out
//    (docs/01 "Yöntem A" — the recipient is the channel's escrow account; this
//    is the terminal-exit signal used by classification, task 6.4)

export interface WithdrawTag {
    kind: "reward" | "commission";
    validator: string; // cosmosvaloper1... from the event's `validator` attribute
}

export interface RealTransfer {
    sender: string;
    recipient: string;
    amount: bigint; // uatom
    msg_index: number | null; // null for finalize transfers
    source: "tx" | "finalize";
    tx_index: number | null; // position in results; null for finalize
    withdraw_tag: WithdrawTag | null;
    is_ibc_out: boolean; // true -> recipient is an IBC escrow account, terminal exit
}

// The shape of a cosmjs comet38.BlockResultsResponse, loosened to `unknown`
// input (chainClient.getBlockResults's cosmjs type) plus optional fields —
// this parser is also exercised directly against raw JSON fixtures in tests.
interface RawEvent {
    type: string;
    attributes?: Array<{ key: string; value?: string }>;
}

interface RawBlockResults {
    results?: Array<{ code: number; events?: RawEvent[] }> | null;
    finalizeBlockEvents?: RawEvent[] | null;
}

function attr(event: RawEvent, key: string): string | undefined {
    return event.attributes?.find((a) => a.key === key)?.value;
}

// "669446693uatom" or "12ibc/9FBA...,5uatom" -> the uatom part as BigInt.
// null = nothing to track (empty, zero, or no uatom component).
function uatomAmount(value: string | undefined): bigint | null {
    if (!value) return null;
    for (const part of value.split(",")) {
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

    (br.results ?? []).forEach((tx, txIndex) => {
        if (tx.code !== 0) return; // failed tx: msg events are discarded by the chain anyway
        const events = tx.events ?? [];

        // sender per msg_index, only for MsgWithdrawValidatorCommission — the
        // fallback source of `validator` when the withdraw_commission event omits it
        const commissionSenderByMsgIndex = new Map<number, string>();
        for (const e of events) {
            if (e.type !== "message") continue;
            if (attr(e, "action") !== WITHDRAW_COMMISSION_ACTION) continue;
            const mi = attr(e, "msg_index");
            const sender = attr(e, "sender");
            if (mi !== undefined && sender !== undefined) {
                commissionSenderByMsgIndex.set(Number(mi), sender);
            }
        }

        // One msg is either a reward or a commission withdrawal, never both.
        const tags = new Map<number, WithdrawTag>();
        // msg_indexes whose message emitted an ibc_transfer event (IBC-out signal)
        const ibcOutMsgIndexes = new Set<number>();
        for (const e of events) {
            if (e.type === "ibc_transfer") {
                const mi = attr(e, "msg_index");
                if (mi !== undefined) ibcOutMsgIndexes.add(Number(mi));
                continue;
            }
            if (
                e.type !== "withdraw_rewards" &&
                e.type !== "withdraw_commission"
            )
                continue;
            const mi = attr(e, "msg_index");
            if (mi === undefined) continue;
            const msg_index = Number(mi);
            let validator = attr(e, "validator");
            if (
                validator === undefined &&
                e.type === "withdraw_commission"
            ) {
                const sender = commissionSenderByMsgIndex.get(msg_index);
                if (sender !== undefined) {
                    try {
                        validator = accountToOperator(sender);
                    } catch {
                        validator = undefined; // malformed/foreign-prefix sender: skip, don't guess
                    }
                }
            }
            if (validator !== undefined) {
                tags.set(msg_index, {
                    kind:
                        e.type === "withdraw_rewards" ? "reward" : "commission",
                    validator,
                });
            }
        }

        for (const e of events) {
            if (e.type !== "transfer") continue;
            const miRaw = attr(e, "msg_index");
            if (miRaw === undefined) continue; // fee/tip machinery — NOT a message transfer
            const amount = uatomAmount(attr(e, "amount"));
            if (amount === null) continue;
            const sender = attr(e, "sender");
            const recipient = attr(e, "recipient");
            if (!sender || !recipient) continue;
            const msg_index = Number(miRaw);
            // multisend: several transfer events share one msg_index -> one record each
            out.push({
                sender,
                recipient,
                amount,
                msg_index,
                source: "tx",
                tx_index: txIndex,
                withdraw_tag: tags.get(msg_index) ?? null,
                is_ibc_out: ibcOutMsgIndexes.has(msg_index),
            });
        }
    });

    for (const e of br.finalizeBlockEvents ?? []) {
        if (e.type !== "transfer") continue;
        const amount = uatomAmount(attr(e, "amount"));
        if (amount === null) continue; // e.g. consumer_rewards_pool transfers with empty amount
        const sender = attr(e, "sender");
        const recipient = attr(e, "recipient");
        if (!sender || !recipient) continue;
        out.push({
            sender,
            recipient,
            amount,
            msg_index: null,
            source: "finalize",
            tx_index: null,
            withdraw_tag: null,
            is_ibc_out: false, // finalize transfers are protocol accruals, never IBC
        });
    }

    return out;
}

// ── Validator lifecycle events (task 10.1 follow-up) ───────────────────────
// Live-tracked so a brand-new validator's or a redirected-withdraw-address
// validator's very next reward claim resolves correctly, without waiting for
// the next periodic full re-sync (docs/01 origin-set: "override: each
// MsgSetWithdrawAddress updates withdraw_map").

export interface CreateValidatorEvent {
    operator: string; // cosmosvaloper1... from the event's `validator` attribute
    msg_index: number;
    tx_index: number;
}

export interface SetWithdrawAddressEvent {
    withdraw_address: string;
    // The event itself carries no delegator info — resolved from the sibling
    // `message` event (action=MsgSetWithdrawAddress) at the same msg_index.
    // null = unattributable (e.g. executed via an Interchain Account: the
    // inner message has no standalone `message` event) — never guessed.
    delegator: string | null;
    msg_index: number;
    tx_index: number;
}

const SET_WITHDRAW_ADDRESS_ACTION = "/cosmos.distribution.v1beta1.MsgSetWithdrawAddress";
const WITHDRAW_COMMISSION_ACTION = "/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission";

export function parseValidatorLifecycleEvents(raw: unknown): {
    createValidator: CreateValidatorEvent[];
    setWithdrawAddress: SetWithdrawAddressEvent[];
} {
    const br = raw as RawBlockResults;
    const createValidator: CreateValidatorEvent[] = [];
    const setWithdrawAddress: SetWithdrawAddressEvent[] = [];

    (br.results ?? []).forEach((tx, txIndex) => {
        if (tx.code !== 0) return;
        const events = tx.events ?? [];

        // sender per msg_index, only for the one action we need it for here
        const setWithdrawSenderByMsgIndex = new Map<number, string>();
        for (const e of events) {
            if (e.type !== "message") continue;
            if (attr(e, "action") !== SET_WITHDRAW_ADDRESS_ACTION) continue;
            const mi = attr(e, "msg_index");
            const sender = attr(e, "sender");
            if (mi !== undefined && sender !== undefined) {
                setWithdrawSenderByMsgIndex.set(Number(mi), sender);
            }
        }

        for (const e of events) {
            if (e.type === "create_validator") {
                const operator = attr(e, "validator");
                const mi = attr(e, "msg_index");
                if (operator && mi !== undefined) {
                    createValidator.push({
                        operator,
                        msg_index: Number(mi),
                        tx_index: txIndex,
                    });
                }
            } else if (e.type === "set_withdraw_address") {
                const withdraw_address = attr(e, "withdraw_address");
                const mi = attr(e, "msg_index");
                if (withdraw_address && mi !== undefined) {
                    const msg_index = Number(mi);
                    setWithdrawAddress.push({
                        withdraw_address,
                        delegator: setWithdrawSenderByMsgIndex.get(msg_index) ?? null,
                        msg_index,
                        tx_index: txIndex,
                    });
                }
            }
        }
    });

    return { createValidator, setWithdrawAddress };
}
