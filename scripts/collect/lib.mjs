// Pure logic of the price collector: no network, no files. See docs/data.md for the file formats.
import { createHash } from 'node:crypto'

export const FUEL_KEY = { 'Régulier': 'R', 'Super': 'S', 'Diesel': 'D' }
export const FUELS = ['R', 'S', 'D']

/** Quebec, generously. A station outside this box has no usable position (the feed has at least one at 0, 0). */
const inQuebec = (lat, lon) => lat > 44 && lat < 63 && lon > -80 && lon < -56

/** The feed has no station identifier, so we make one from what identifies a station: its address and position. */
export const stationId = (address, lat, lon) =>
  createHash('sha1').update(`${address}|${lat.toFixed(5)}|${lon.toFixed(5)}`).digest('base64url').slice(0, 10)

/** "166.4¢" → 166.4 */
export const parsePrice = (text) => {
  const n = Number(String(text ?? '').replace('¢', '').replace(',', '.').trim())
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Turns the Régie's feed into our compact station list. Stations we cannot place are set aside, not guessed. */
export function toStations(feed) {
  const stations = [], skipped = []
  for (const f of feed.features ?? []) {
    const p = f.properties ?? {}
    const [lon, lat] = f.geometry?.coordinates ?? []
    if (typeof lat !== 'number' || typeof lon !== 'number' || !inQuebec(lat, lon)) {
      skipped.push({ name: p.Name ?? null, address: p.Address ?? null, reason: 'no usable position' })
      continue
    }
    const prices = {}
    for (const x of p.Prices ?? []) {
      const k = FUEL_KEY[x.GasType]
      const price = x.IsAvailable ? parsePrice(x.Price) : null
      if (k && price != null) prices[k] = price
    }
    stations.push({
      id: stationId(p.Address, lat, lon), n: p.Name, b: !p.brand || p.brand === 'Aucun' ? null : p.brand,
      a: p.Address, r: p.Region, lat: +lat.toFixed(5), lon: +lon.toFixed(5), p: prices,
    })
  }
  return { generatedAt: feed.metadata?.generated_at ?? null, stations, skipped }
}

/** "2026-11-26T20:20:00.4124592Z" → "2026-11-26T20:20:00Z" */
export const stamp = (iso) => new Date(iso).toISOString().replace(/\.\d+Z$/, 'Z')

/**
 * Compares the stations seen now with those of the previous run.
 * Returns the price changes to append to the history, and the stations carrying, per fuel, when its price last changed (`t`, unix seconds).
 * - a station or fuel seen for the first time gets a line too, so every history starts with a known price;
 * - a fuel that is no longer sold gets a line with an empty price;
 * - a station that left the feed gets nothing: we cannot know why.
 */
export function diff(previous, stations, at) {
  const before = new Map((previous ?? []).map((s) => [s.id, s]))
  const seconds = Math.floor(new Date(at).getTime() / 1000)
  const changes = []
  const next = stations.map((s) => {
    const old = before.get(s.id)
    const t = {}
    for (const fuel of FUELS) {
      const now = s.p[fuel] ?? null, was = old?.p?.[fuel] ?? null
      if (now === was) { if (now != null && old?.t?.[fuel] != null) t[fuel] = old.t[fuel]; continue }
      changes.push({ id: s.id, fuel, price: now })
      if (now != null) t[fuel] = seconds
    }
    return { ...s, t }
  })
  return { changes, stations: next }
}

/** One file per station per month, so the app only ever downloads a few small files for a chart. */
export const historyFile = (id, at) => `h/${stamp(at).slice(0, 7)}/${id}.csv`
export const historyLine = (at, fuel, price) => `${stamp(at)},${fuel},${price ?? ''}\n`

/** A feed that suddenly lost most of its stations is broken, not news. */
export const looksBroken = (previousCount, count) => count === 0 || (previousCount > 0 && count < previousCount * 0.5)
