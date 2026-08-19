import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
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
