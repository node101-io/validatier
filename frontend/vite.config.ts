import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // `vite preview` (how the app is served in prod, see ecosystem.config.cjs)
  // rejects requests whose Host header it doesn't recognise. nginx proxies the
  // public domain to it, so that domain has to be whitelisted here.
  preview: { allowedHosts: ['validatier-demo.node101.io'] },
  plugins: [
    devtools(),
    tailwindcss(),
    // docs/05-frontend-data-layer.md: no static export anymore — every route
    // is rendered server-side per request straight from MongoDB (via
    // loadDashboard), so there's nothing to prerender at build time.
    tanstackStart(),
    viteReact(),
  ],
})

export default config
