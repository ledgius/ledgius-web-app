/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// Serve dev favicons from public-dev/ during local development.
// Production build uses public/ (the default publicDir).
function devFavicons() {
  const devDir = path.resolve(__dirname, 'public-dev')
  return {
    name: 'dev-favicons',
    configureServer(server: { middlewares: { use: (fn: unknown) => void } }) {
      server.middlewares.use((req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (b: Buffer) => void }, next: () => void) => {
        if (req.url?.startsWith('/favicon-')) {
          const file = path.join(devDir, req.url)
          if (fs.existsSync(file)) {
            res.setHeader('Content-Type', 'image/png')
            res.end(fs.readFileSync(file))
            return
          }
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devFavicons()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
