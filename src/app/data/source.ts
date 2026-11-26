// Where the app gets its data: the files our collector saves on the `data` branch (docs/data.md).
// The website is static and cannot be republished every few minutes, so these are read straight from GitHub,
// which serves them to any site and keeps them for five minutes.
import type { Change } from '../domain/history'
import { monthsBetween, parseHistory } from '../domain/history'
import type { Fuel, Snapshot } from '../domain/ranking'

const DATA = 'https://raw.githubusercontent.com/antoniro/jauge/data'

export interface Meta { generatedAt: string; since: string; stations: number }

async function get(path: string): Promise<Response | null> {
  try {
    const res = await fetch(`${DATA}/${path}`)
    return res.ok ? res : null
  } catch { return null }
}

/** Current prices. Falls back to the snapshot shipped with the site when GitHub cannot be reached, so the app still opens. */
export async function loadStations(): Promise<Snapshot & { live: boolean }> {
  const live = await get('stations.json')
  if (live) return { ...(await live.json()), live: true }
  const shipped = await fetch(`${import.meta.env.BASE_URL}data/stations.json`)
  return { ...(await shipped.json()), live: false }
}

let meta: Promise<Meta | null> | undefined
/** When the data was generated and since when prices have been collected. Asked once. */
export function loadMeta(): Promise<Meta | null> {
  meta ??= get('meta.json').then((res) => (res ? res.json() : null))
  return meta
}

/** One station's price changes for one fuel over a period, oldest first. A month with no file simply has no changes. */
export async function loadHistory(id: string, fuel: Fuel, from: number, to: number): Promise<Change[]> {
  // nothing was collected before `since`, so there is no point asking for older months
  const since = Date.parse((await loadMeta())?.since ?? '')
  const months = monthsBetween(Number.isNaN(since) ? from : Math.max(from, since), to)
  const files = await Promise.all(months.map((m) => get(`h/${m}/${id}.csv`)))
  const texts = await Promise.all(files.map((f) => (f ? f.text() : '')))
  return texts.flatMap((t) => parseHistory(t, fuel))
}
