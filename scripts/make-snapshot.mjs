// Downloads the Régie de l'énergie feed and writes the compact snapshot the mockups use.
// Usage: node scripts/make-snapshot.mjs [outFile]
// The real collector (scripts/collect/run.mjs) uses the same conversion and also records price changes.
import { gunzipSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { toStations } from './collect/lib.mjs'

const FEED = 'https://regieessencequebec.ca/stations.geojson.gz'
const out = process.argv[2] ?? 'public/data/stations.json'

const res = await fetch(FEED)
if (!res.ok) throw new Error(`Feed returned ${res.status}`)
const buf = Buffer.from(await res.arrayBuffer())
// fetch may already have decoded the gzip transfer encoding
const text = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf).toString('utf8') : buf.toString('utf8')
const { generatedAt, stations } = toStations(JSON.parse(text))
writeFileSync(out, JSON.stringify({ generatedAt: generatedAt ?? new Date().toISOString(), stations }))
console.log(`${stations.length} stations → ${out}`)
