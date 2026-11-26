// Downloads the Régie de l'énergie feed and writes a compact snapshot for the app.
// Usage: node scripts/make-snapshot.mjs [outFile]
import { gunzipSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const FEED = 'https://regieessencequebec.ca/stations.geojson.gz'
const out = process.argv[2] ?? 'public/data/stations.json'
const fuelKey = { 'Régulier': 'R', 'Super': 'S', 'Diesel': 'D' }

const res = await fetch(FEED)
if (!res.ok) throw new Error(`Feed returned ${res.status}`)
const buf = Buffer.from(await res.arrayBuffer())
// fetch may already have decoded the gzip transfer encoding
const text = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf).toString('utf8') : buf.toString('utf8')
const feed = JSON.parse(text)

const stations = []
for (const f of feed.features) {
  const p = f.properties
  const [lon, lat] = f.geometry.coordinates
  const prices = {}
  for (const x of p.Prices ?? []) {
    const k = fuelKey[x.GasType]
    if (!k || !x.IsAvailable || !x.Price) continue
    prices[k] = Number(String(x.Price).replace('¢', '').replace(',', '.'))
  }
  const id = createHash('sha1').update(`${p.Address}|${lat.toFixed(5)}|${lon.toFixed(5)}`).digest('base64url').slice(0, 10)
  const brand = !p.brand || p.brand === 'Aucun' ? null : p.brand
  stations.push({ id, n: p.Name, b: brand, a: p.Address, r: p.Region, lat: +lat.toFixed(5), lon: +lon.toFixed(5), p: prices })
}
const snapshot = { generatedAt: feed.metadata?.generated_at ?? new Date().toISOString(), stations }
writeFileSync(out, JSON.stringify(snapshot))
console.log(`${stations.length} stations → ${out}`)
