import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // the app's tests; the collector's own tests run with Node (see package.json)
  test: { include: ['src/**/*.test.ts'] },
  server: { allowedHosts: ['.ts.net'] },
  preview: { allowedHosts: ['.ts.net'] },
  build: {
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), fable: resolve(import.meta.dirname, 'fable.html') },
    },
  },
})
