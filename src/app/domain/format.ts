// How things are written on screen: prices like station signs, money, distances, station names.
import type { Fuel, Station } from './ranking'

const fr = (d: number) => new Intl.NumberFormat('fr-CA', { minimumFractionDigits: d, maximumFractionDigits: d })
/** A posted price the way the sign shows it: 171,9 */
export const fmtPrice = (c: number) => fr(1).format(c)
export const fmtMoney = (d: number) => fr(2).format(d)
export const fmtKm = (k: number) => (k < 10 ? fr(1).format(k) : fr(0).format(k))
export const FUEL_LABEL: Record<Fuel, string> = { R: 'Régulier', S: 'Super', D: 'Diesel' }

/** Street and town from "230 av. Murdoch, Rouyn-Noranda" */
export function shortAddress(a: string) { const [street, city] = a.split(','); return { street: street?.trim() ?? a, city: city?.trim() ?? '' } }

export const signedMoney = (d: number) => {
  const r = Math.round(d * 100) / 100
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${fmtMoney(Math.abs(r))}`
}
export const stationName = (s: Station) => s.b ?? s.n
export const stationWhere = (s: Station) => {
  const { street, city } = shortAddress(s.a)
  const c = city && city === city.toUpperCase() ? city.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase()) : city
  return c ? `${street}, ${c}` : street
}
export const cityName = (s: Station) => {
  const { city } = shortAddress(s.a)
  return city && city === city.toUpperCase() ? city.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase()) : city
}
export interface Place { name: string; lat: number; lon: number; n: number }
/** Every town that has a station, biggest first, placed on its middle station. Stands in for a real place search. */
export function placeIndex(stations: Station[]): Place[] {
  const by = new Map<string, Station[]>()
  for (const s of stations) { if (s.lat < 40) continue; const c = cityName(s); if (!c) continue; const g = by.get(c); if (g) g.push(s); else by.set(c, [s]) }
  const mid = (v: number[]) => v.sort((a, b) => a - b)[v.length >> 1]
  return [...by].map(([name, g]) => ({ name, n: g.length, lat: mid(g.map((s) => s.lat)), lon: mid(g.map((s) => s.lon)) })).sort((a, b) => b.n - a.n)
}
export const goUrl = (s: Station) => `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
