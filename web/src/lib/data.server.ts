import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { MetaJson, SummaryJson, ValidatorDetailJson, ValidatorsJson } from "@/types/data";

// public/ is served as-is and also readable straight off disk at build/SSR
// time — reading here avoids an HTTP round-trip during prerender (docs/05).
const DATA_DIR = join(process.cwd(), "public", "data");

function readJson<T>(relPath: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, relPath), "utf-8")) as T;
}

export function readMeta(): MetaJson {
  return readJson<MetaJson>("meta.json");
}

export function readSummary(): SummaryJson {
  return readJson<SummaryJson>("summary.json");
}

export function readValidators(): ValidatorsJson {
  return readJson<ValidatorsJson>("validators.json");
}

// null (not thrown) when the address has no file — docs/05: only validators
// with total_withdraw > 0 get a file, and an unknown address is a plain 404.
export function readValidatorDetail(operatorAddress: string): ValidatorDetailJson | null {
  // bech32 charset only (docs/05: filename == operator_address, no encoding) —
  // rejects anything that could escape DATA_DIR (e.g. "../../etc/passwd").
  if (!/^cosmosvaloper1[a-z0-9]+$/.test(operatorAddress)) return null;
  const path = join(DATA_DIR, "validator", `${operatorAddress}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as ValidatorDetailJson;
}
