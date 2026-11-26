import { defineConfig } from '@playwright/test'

// Browser tests of the app's main flows, on fixed data (e2e/support.ts replaces the network).
// They run in the Chrome installed on the machine: no browser download needed.
const PORT = 4317
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list']],
  // pictures of each screen, compared with the last accepted ones. They depend on the machine's fonts,
  // so they are not kept in the repository: `npm run e2e:accept` takes new ones.
  snapshotPathTemplate: 'e2e/__shots__/{projectName}/{arg}{ext}',
  expect: { toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.001 } },
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    locale: 'fr-CA',
    timezoneId: 'America/Toronto',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } },
    { name: 'wide', use: { viewport: { width: 1440, height: 860 } } },
  ],
})
