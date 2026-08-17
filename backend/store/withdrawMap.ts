import type { Database, Statement } from 'better-sqlite3';
import { getSqlite } from '../db/sqlite';

// SQLite primitives for the origin-set (docs/04 `withdraw_map`).
// One operator has exactly ONE current withdraw address (one row); one address
// may belong to MANY operators (commingled treasury) — hence the (addr, op) PK.

interface Stmts {
  insert: Statement;
  deleteByOperator: Statement;
  selectOperators: Statement;
  selectAddress: Statement;
  applyOverrideTxn: (operator: string, newAddress: string) => void;
}

let stmts: Stmts | null = null;

function s(): Stmts {
  if (stmts) return stmts;
  const db: Database = getSqlite();
  const insert = db.prepare(
    'INSERT OR IGNORE INTO withdraw_map (withdraw_address, operator_address) VALUES (?, ?)'
  );
  const deleteByOperator = db.prepare('DELETE FROM withdraw_map WHERE operator_address = ?');
  stmts = {
    insert,
    deleteByOperator,
    selectOperators: db.prepare(
      'SELECT operator_address FROM withdraw_map WHERE withdraw_address = ?'
    ),
    selectAddress: db.prepare(
      'SELECT withdraw_address FROM withdraw_map WHERE operator_address = ?'
    ),
    // override = delete old (op, addr) row + insert the new one, atomically
    applyOverrideTxn: db.transaction((operator: string, newAddress: string) => {
      deleteByOperator.run(operator);
      insert.run(newAddress, operator);
    }),
  };
  return stmts;
}

export function setDefault(operator: string, defaultAddress: string): void {
  s().insert.run(defaultAddress, operator);
}

export function applyOverride(operator: string, newAddress: string): void {
  s().applyOverrideTxn(operator, newAddress);
}

// Commingled address -> multiple operators; that's why this returns an array.
export function operatorsFor(withdrawAddress: string): string[] {
  return (s().selectOperators.all(withdrawAddress) as Array<{ operator_address: string }>).map(
    (r) => r.operator_address
  );
}

export function withdrawAddressOf(operator: string): string | null {
  const row = s().selectAddress.get(operator) as { withdraw_address: string } | undefined;
  return row?.withdraw_address ?? null;
}
