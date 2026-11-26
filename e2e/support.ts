// What every test starts from: a fixed moment, fixed prices, fixed history, and a map with no tiles to wait for.
import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'

/** Thursday 26 November 2026, 16:30 in Quebec. */
export const NOW = new Date('2026-11-26T21:30:00Z')
const stations = readFileSync(new URL('./fixtures/stations.json', import.meta.url), 'utf8')
/** Every station gets the same short history: first seen on the 24th, two changes since. `{R}` is its current price. */
const history = (price: (fuel: string) => string) =>
  ['R', 'S', 'D'].map((f) => `2026-11-24T14:00:00Z,${f},${price(f)}\n`).join('') + '2026-11-25T15:10:00Z,R,144.9\n2026-11-26T12:40:00Z,R,141.9\n'

export async function prepare(page: Page) {
  await page.clock.setFixedTime(NOW)
  const data = 'https://raw.githubusercontent.com/antoniro/jauge/data/'
  await page.route(`${data}stations.json`, (r) => r.fulfill({ contentType: 'application/json', body: stations }))
  await page.route(`${data}meta.json`, (r) => r.fulfill({ json: { generatedAt: '2026-11-26T20:25:00Z', since: '2026-11-24T14:00:00Z', stations: 344 } }))
  await page.route(`${data}h/**`, (r) => r.fulfill({ contentType: 'text/plain', body: history(() => '139.9') }))
  // an empty map style: the map is ready at once and draws nothing behind our own layers
  await page.route('https://tiles.openfreemap.org/**', (r) =>
    r.request().url().includes('/styles/') ? r.fulfill({ json: { version: 8, sources: {}, layers: [] } }) : r.abort())
}

/** Opens the app as someone who already chose to look at Brossard. */
export async function openAtBrossard(page: Page) {
  await prepare(page)
  await page.addInitScript(() => {
    if (!localStorage.getItem('jauge.start')) localStorage.setItem('jauge.start', JSON.stringify({ kind: 'place', name: 'Brossard', lat: 45.45742, lon: -73.46451 }))
  })
  await page.goto('/')
}

/** Opens the app as someone standing in Brossard who lets the browser share their position. */
export async function openWithPosition(page: Page) {
  await prepare(page)
  await page.context().grantPermissions(['geolocation'])
  await page.context().setGeolocation({ latitude: 45.4574, longitude: -73.4645 })
  await page.addInitScript(() => { if (!localStorage.getItem('jauge.start')) localStorage.setItem('jauge.start', JSON.stringify({ kind: 'position' })) })
  await page.goto('/')
}
