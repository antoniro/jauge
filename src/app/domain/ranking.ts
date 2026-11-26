// Ranking stations by real savings. Terms are defined in GLOSSARY.md, the rules in docs/design/behaviour.md.
export type Fuel = 'R' | 'S' | 'D'
export const FUELS: Fuel[] = ['R', 'S', 'D']

export interface Station {
  id: string
  /** name, banner (null when the station has none), address, administrative region */
  n: string; b: string | null; a: string; r: string
  lat: number; lon: number
  /** posted price per fuel, in cents per litre */
  p: Partial<Record<Fuel, number>>
  /** per fuel, when its price last changed (unix seconds) */
  t?: Partial<Record<Fuel, number>>
}
export interface Snapshot { generatedAt: string; stations: Station[] }
/** Where distances are measured from: the person's position, or a station they picked as starting point. */
export interface Origin { lat: number; lon: number; label: string }

export interface Ranked {
  s: Station; price: number
  /** distance from the starting point, and how much farther than the reference, there and back */
  km: number; extraKm: number
  detourCost: number; priceSaving: number
  /** real savings: the price saving minus the detour cost. Can be zero or negative. */
  real: number
  /** true for the reference station */
  isBaseline: boolean
}
export interface Ranking { list: Ranked[]; baseline: Ranked | null; radiusKm: number }

export interface RankInput {
  stations: Station[]; origin: Origin; fuel: Fuel
  /** litres the person plans to buy, and what their vehicle uses per 100 km */
  fillL: number; consL100: number
  /** undefined = automatic: 10 km, widened to 25 km when fewer than 5 stations are found */
  radiusKm?: number
  /** the reference the person picked; without it, the closest station selling the fuel */
  refId?: string | null
}

/** No routing service: the straight line times 1.3, always shown with "≈". */
const ROAD_FACTOR = 1.3
export function roadKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h)) * ROAD_FACTOR
}

function evaluate(s: Station, km: number, ref: { price: number; km: number }, inp: RankInput): Ranked {
  const price = s.p[inp.fuel]!
  const extraKm = Math.max(0, km - ref.km) * 2
  const detourCost = ((extraKm * inp.consL100) / 100) * (ref.price / 100)
  const priceSaving = ((ref.price - price) / 100) * inp.fillL
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
  if (!inside.includes(ref)) inside = [...inside, ref] // a picked reference stays in the list even outside the radius
  const list = inside.map((x) => evaluate(x.s, x.km, base, inp))
  const baseline = list.find((r) => r.s.id === ref.s.id)!
  baseline.isBaseline = true
  list.sort((x, y) => y.real - x.real || x.km - y.km)
  return { list, baseline, radiusKm }
}

/** On a reference the person picked: the best fill-up, when it saves at least 50 cents more. */
export function betterOption(ranking: Ranking): Ranked | null {
  const best = ranking.list[0]
  return best && !best.isBaseline && best.real >= 0.5 ? best : null
}

/** The stations around a place chosen by hand, cheapest first: the list of an overview. */
export function around(stations: Station[], place: { lat: number; lon: number }, fuel: Fuel, reachKm = 10): Station[] {
  return stations
    .filter((s) => s.p[fuel] != null && roadKm(place, s) <= reachKm)
    .sort((a, b) => a.p[fuel]! - b.p[fuel]! || roadKm(place, a) - roadKm(place, b))
}
