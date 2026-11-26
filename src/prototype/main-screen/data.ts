// PROTOTYPE — throwaway. Real-savings ranking as defined in GLOSSARY.md.
export type Fuel = 'R' | 'S' | 'D'
export interface Station {
  id: string; n: string; b: string | null; a: string; r: string
  lat: number; lon: number; p: Partial<Record<Fuel, number>>
}
export interface Snapshot { generatedAt: string; stations: Station[] }
export interface Origin { lat: number; lon: number; label: string }
export interface Ranked {
  s: Station; price: number; km: number; extraKm: number
  detourCost: number; priceSaving: number; real: number; isBaseline: boolean
}
export interface Ranking { list: Ranked[]; baseline: Ranked | null; radiusKm: number }

export const LONGUEUIL: Origin = { lat: 45.5312, lon: -73.5181, label: 'Longueuil' }
const ROAD_FACTOR = 1.3

export async function loadSnapshot(): Promise<Snapshot> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/stations.json`)
  return res.json()
}

export function roadKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371, toRad = Math.PI / 180
  const dLat = (b.lat - a.lat) * toRad, dLon = (b.lon - a.lon) * toRad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h)) * ROAD_FACTOR
}

/** refId: the station the person chose to compare against. Without it (or if it lacks the fuel), the closest station is the reference. */
export interface RankInput { stations: Station[]; origin: Origin; fuel: Fuel; fillL: number; consL100: number; radiusKm?: number; refId?: string | null }

function evaluate(s: Station, km: number, base: { price: number; km: number }, inp: RankInput): Ranked {
  const price = s.p[inp.fuel]!
  const extraKm = Math.max(0, km - base.km) * 2
  const detourCost = (extraKm * inp.consL100 / 100) * base.price / 100
  const priceSaving = (base.price - price) / 100 * inp.fillL
  return { s, price, km, extraKm, detourCost, priceSaving, real: priceSaving - detourCost, isBaseline: false }
}

export function rank(inp: RankInput): Ranking {
  const withFuel = inp.stations
    .filter((s) => s.p[inp.fuel] != null)
    .map((s) => ({ s, km: roadKm(inp.origin, s) }))
    .sort((x, y) => x.km - y.km)
  if (!withFuel.length) return { list: [], baseline: null, radiusKm: inp.radiusKm ?? 10 }
  const ref = (inp.refId && withFuel.find((x) => x.s.id === inp.refId)) || withFuel[0]
  const base = { price: ref.s.p[inp.fuel]!, km: ref.km }
  let radiusKm = inp.radiusKm ?? 10
  let inside = withFuel.filter((x) => x.km <= radiusKm)
  if (inside.length < 5 && inp.radiusKm == null) { radiusKm = 25; inside = withFuel.filter((x) => x.km <= radiusKm) }
  if (!inside.includes(ref)) inside = [...inside, ref] // a chosen reference stays in the list even outside the radius
  const list = inside.map((x) => evaluate(x.s, x.km, base, inp))
  const baseline = list.find((r) => r.s.id === ref.s.id)!
  baseline.isBaseline = true
  list.sort((x, y) => y.real - x.real || x.km - y.km)
  return { list, baseline, radiusKm }
}

/** Better option for a Selected station: closer to the person, or within 3 km of the pick, saving ≥ $0.50 more. */
export function betterOption(selected: Station, inp: RankInput): { sel: Ranked; better: Ranked | null } | null {
  const withFuel = inp.stations.filter((s) => s.p[inp.fuel] != null).map((s) => ({ s, km: roadKm(inp.origin, s) })).sort((a, b) => a.km - b.km)
  if (!withFuel.length || selected.p[inp.fuel] == null) return null
  const base = { price: withFuel[0].s.p[inp.fuel]!, km: withFuel[0].km }
  const sel = evaluate(selected, roadKm(inp.origin, selected), base, inp)
  let better: Ranked | null = null
  for (const x of withFuel) {
    if (x.s.id === selected.id) continue
    if (!(x.km < sel.km || roadKm(selected, x.s) / 1.3 <= 3)) continue
    const r = evaluate(x.s, x.km, base, inp)
    if (r.real - sel.real >= 0.5 && (!better || r.real > better.real)) better = r
  }
  return { sel, better }
}

const fr = (d: number) => new Intl.NumberFormat('fr-CA', { minimumFractionDigits: d, maximumFractionDigits: d })
export const fmtPrice = (c: number) => fr(1).format(c)
export const fmtMoney = (d: number) => fr(2).format(d)
export const fmtKm = (k: number) => (k < 10 ? fr(1).format(k) : fr(0).format(k))
export const FUEL_LABEL: Record<Fuel, string> = { R: 'Régulier', S: 'Super', D: 'Diesel' }

export function minutesAgo(iso: string) { return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)) }

/** Short street + city from "230 av. Murdoch, Rouyn-Noranda" */
export function shortAddress(a: string) { const [street, city] = a.split(','); return { street: street?.trim() ?? a, city: city?.trim() ?? '' } }
