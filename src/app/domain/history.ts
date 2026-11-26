// A station's price history: one change per line, as saved by the collector (formats: docs/data.md).
import type { Fuel } from './ranking'

/** A price change: from `t` (milliseconds) on, the price is `p`. `null` means the station stopped selling the fuel. */
export interface Change { t: number; p: number | null }

/** Reads one monthly history file and keeps the lines of one fuel, oldest first. Lines that make no sense are dropped. */
export function parseHistory(csv: string, fuel: Fuel): Change[] {
  const out: Change[] = []
  for (const line of csv.split('\n')) {
    const [when, f, price] = line.trim().split(',')
    if (f !== fuel) continue
    const t = Date.parse(when)
    if (Number.isNaN(t)) continue
    const p = price === '' || price == null ? null : Number(price)
    if (p != null && !(p > 0)) continue
    out.push({ t, p })
  }
  return out.sort((a, b) => a.t - b.t)
}

/** The monthly files that cover a period, oldest first: ["2026-10", "2026-11"]. */
export function monthsBetween(from: number, to: number): string[] {
  const out: string[] = []
  const d = new Date(from)
  d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0)
  while (d.getTime() <= to) { out.push(d.toISOString().slice(0, 7)); d.setUTCMonth(d.getUTCMonth() + 1) }
  return out
}

/** The price in force at a moment, or null if we know nothing that early (or the fuel was not sold). */
export function priceAt(changes: Change[], t: number): number | null {
  let p: number | null = null
  for (const c of changes) { if (c.t <= t) p = c.p; else break }
  return p
}

/**
 * What a chart needs for the period [from, to]: where the line starts, and the changes inside the period.
 * `known` is the first moment we know a price in that period: later than `from` when the history is younger than the period.
 */
export function period(changes: Change[], from: number, to: number) {
  const start = priceAt(changes, from)
  const inside = changes.filter((c) => c.t > from && c.t <= to)
  const known = start != null ? from : inside.find((c) => c.p != null)?.t ?? null
  return { start, inside, known }
}
