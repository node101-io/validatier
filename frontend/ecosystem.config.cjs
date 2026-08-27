// pm2 config for the frontend (TanStack Start SSR).
//
//   cd frontend
//   npm ci            # vite is a devDependency — dev deps must be installed
//   npm run build
//   pm2 start ecosystem.config.cjs
//   pm2 save
//
// `npm run build` emits only a fetch handler (dist/server/server.js), not a
// listening Node server. `vite preview` is what runs the Start SSR handler
// (via @tanstack/start-plugin-core's preview-server-plugin), so pm2 runs the
// vite binary directly — not `npm run preview`, which would swallow signals.
//
// exec_mode MUST be 'fork'. pm2's cluster mode uses cluster.fork() and only
// works for a plain Node HTTP server that pm2 controls; the vite CLI spawns
// its own workers and never binds the port under cluster mode. Do NOT add an
// `instances` field here — defining it flips pm2 back to cluster mode.
//
// After editing this file, reload it — `pm2 restart <name>` does NOT re-read
// it:  pm2 delete validatier-frontend && pm2 start ecosystem.config.cjs
//
// The API base URL is read from frontend/.env (BACKEND_API_URL) by
// src/server/env.ts. Point it at the API process you started with
// API_MONGO_URI when demoing against a copy DB (see backend/README.md).

module.exports = {
  apps: [
    {
      name: 'validatier-frontend',
      cwd: __dirname,
      script: 'node_modules/vite/bin/vite.js',
      // --host binds 0.0.0.0 (needed for remote access); --port sets the port.
      args: 'preview --port 3000 --host',
      exec_mode: 'fork',
      autorestart: true,
      env: { NODE_ENV: 'production' },
    },
  ],
};
