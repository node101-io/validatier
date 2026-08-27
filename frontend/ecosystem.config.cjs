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
      instances: 1,
      autorestart: true,
      env: { NODE_ENV: 'production' },
    },
  ],
};
