// PROTOTYPE — throwaway helpers for the mockups.
// The ranking itself now lives with the app (src/app/domain/ranking.ts); the mockups use the same code.
import type { Fuel, Origin, RankInput, Ranked, Snapshot, Station } from '../../app/domain/ranking'
import { roadKm } from '../../app/domain/ranking'
export type { Fuel, Origin, RankInput, Ranked, Ranking, Snapshot, Station } from '../../app/domain/ranking'
export { rank, roadKm } from '../../app/domain/ranking'

export const LONGUEUIL: Origin = { lat: 45.5312, lon: -73.5181, label: 'Longueuil' }

export async function loadSnapshot(): Promise<Snapshot> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/stations.json`)
  return res.json()
}

function evaluate(s: Station, km: number, base: { price: number; km: number }, inp: RankInput): Ranked {
  const price = s.p[inp.fuel]!
  const extraKm = Math.max(0, km - base.km) * 2
  const detourCost = (extraKm * inp.consL100 / 100) * base.price / 100
  const priceSaving = (base.price - price) / 100 * inp.fillL
  return { s, price, km, extraKm, detourCost, priceSaving, real: priceSaving - detourCost, isBaseline: false }
}

/** Only the two earliest map mockups (B and B2) still use this first version of the rule. */
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
