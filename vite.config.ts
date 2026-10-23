import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

import pkg from './package.json' with { type: 'json' }

// Baked in at build time so the UI and /api/health report exactly what the
// running image was built from. package.json is the source of truth for the
// version; CI passes the commit (see Dockerfile / release.yml).
const APP_VERSION = pkg.version
const APP_COMMIT = (process.env.APP_COMMIT || '').slice(0, 7)

const config = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_COMMIT__: JSON.stringify(APP_COMMIT),
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
