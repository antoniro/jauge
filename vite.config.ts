import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { allowedHosts: ['.ts.net'] },
  preview: { allowedHosts: ['.ts.net'] },
  build: {
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), fable: resolve(import.meta.dirname, 'fable.html') },
    },
  },
})
