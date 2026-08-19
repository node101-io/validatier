import path from 'node:path';
import dotenv from 'dotenv';

// Loaded once per process — same requireEnv-fail-loud pattern as the backend
// (backend/config.ts): a misconfigured server should error at startup, not
// silently point at nothing.
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name} (see .env.example)`);
  }
  return value;
}

export const env = {
  // backend/api/server.ts — the dashboard HTTP API (Node-to-Node fetch during
  // SSR, never exposed to the browser).
  backendApiUrl: requireEnv('BACKEND_API_URL').replace(/\/+$/, ''),
};
