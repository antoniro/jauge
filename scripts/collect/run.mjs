// Fetches the Régie de l'énergie's feed and updates the data folder: the current prices, and one line per price change.
// Usage: node scripts/collect/run.mjs <data folder>     (formats: docs/data.md)
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { diff, historyFile, historyLine, looksBroken, stamp, toStations } from './lib.mjs'

const FEED = 'https://regieessencequebec.ca/stations.geojson.gz'
const out = process.argv[2]
if (!out) { console.error('Usage: node scripts/collect/run.mjs <data folder>'); process.exit(2) }

async function fetchFeed() {
  let last
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(FEED, { signal: AbortSignal.timeout(30_000) })
      if (!res.ok) throw new Error(`the feed answered ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      // fetch may already have undone the gzip
      const text = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf).toString('utf8') : buf.toString('utf8')
      return JSON.parse(text)
    } catch (e) { last = e; await new Promise((r) => setTimeout(r, attempt * 2000)) }
  }
  throw last
}

const read = (file) => (existsSync(join(out, file)) ? JSON.parse(readFileSync(join(out, file), 'utf8')) : null)

const feed = toStations(await fetchFeed())
if (!feed.generatedAt) throw new Error('the feed does not say when it was generated')
const at = stamp(feed.generatedAt)
const previous = read('stations.json'), meta = read('meta.json')

if (previous?.generatedAt === at) { console.log(`Nothing new: the feed is still the one of ${at}.`); process.exit(0) }
if (looksBroken(previous?.stations.length ?? 0, feed.stations.length)) {
  throw new Error(`the feed has ${feed.stations.length} stations, the last run had ${previous?.stations.length}: not recording that`)
}

const { changes, stations } = diff(previous?.stations, feed.stations, at)
// The feed is regenerated every few minutes even when no price moved. Saving each of those would mean a commit every
// run for nothing, so a quiet feed is only saved every half hour, which keeps "how fresh is this" honest for the app.
const quietFor = previous ? new Date(at) - new Date(previous.generatedAt) : Infinity
if (changes.length === 0 && quietFor < 30 * 60_000) { console.log(`${at}: no price changed.`); process.exit(0) }
for (const c of changes) {
  const file = join(out, historyFile(c.id, at))
  mkdirSync(dirname(file), { recursive: true })
  appendFileSync(file, historyLine(at, c.fuel, c.price))
}
mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'stations.json'), JSON.stringify({ generatedAt: at, stations }))
writeFileSync(join(out, 'meta.json'), JSON.stringify({
  generatedAt: at, since: meta?.since ?? at, stations: stations.length, changes: changes.length, skipped: feed.skipped,
}, null, 2) + '\n')
console.log(`${at}: ${stations.length} stations, ${changes.length} price changes, ${feed.skipped.length} set aside.`)
