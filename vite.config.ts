import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const mockups = resolve(import.meta.dirname, 'fable.html')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // the app's tests; the collector's own tests run with Node (see package.json)
  test: { include: ['src/**/*.test.ts'] },
  server: { allowedHosts: ['.ts.net'] },
  preview: { allowedHosts: ['.ts.net'] },
  build: {
    rollupOptions: {
      // the design mockups are not kept in the repository; when they are on disk, they are built next to the app
      input: { main: resolve(import.meta.dirname, 'index.html'), ...(existsSync(mockups) ? { fable: mockups } : {}) },
    },
  },
})
