// What the person chose (fuel, litres, car, radius), where they are, and the ranking that follows from it.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadStations } from './data/source'
import type { Fuel, Origin, Ranked, Ranking, Snapshot, Station } from './domain/ranking'
import { FUELS, rank } from './domain/ranking'

/** Stands in for "no starting point yet". Nothing is shown from it: the screen ranks only once a position or a place is chosen. */
const UNSET: Origin = { lat: 46.1, lon: -72.85, label: '' }
export const CONS_L100 = 8

export interface Jauge {
  ready: boolean
  stations: Station[]
  fuel: Fuel; setFuel: (f: Fuel) => void
  origin: Origin; located: boolean; locating: boolean; locate: () => Promise<boolean>; geoError: string | null
  /** Look around another place (picked in the place list, or "search here" on the map). */
  setOrigin: (o: Origin) => void
  consL100: number; setConsL100: (n: number) => void
  /** null = automatic: 10 km, widened to 25 km when fewer than 5 stations */
  radiusKm: number | null; setRadiusKm: (n: number | null) => void
  fillL: number; setFillL: (n: number) => void
  ranking: Ranking
  best: Ranked | null
  /** Best Posted price within the Search radius, per Fuel type */
  bestPrice: Record<Fuel, number | null>
}

/** A setting that survives a reload when `key` is given. */
function useKept<T>(key: string | undefined, initial: T): [T, (v: T) => void] {
  const [value, set] = useState<T>(() => {
    if (!key) return initial
    try { const raw = localStorage.getItem(key); return raw == null ? initial : (JSON.parse(raw) as T) } catch { return initial }
  })
  const keep = useCallback((v: T) => { set(v); if (key) { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* private mode */ } } }, [key])
  return [value, keep]
}

export interface JaugeOptions {
  /** where the stations come from */
  load?: () => Promise<Snapshot>
  /** prefix under which fuel, litres, consumption and radius are remembered; none = not remembered */
  keep?: string
}

export function useJauge({ load = loadStations, keep }: JaugeOptions = {}): Jauge {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [fuel, setFuel] = useKept<Fuel>(keep && `${keep}.fuel`, 'R')
  const [origin, setOrigin] = useState<Origin>(UNSET)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [fillL, setFillL] = useKept(keep && `${keep}.litres`, 50)
  const [consL100, setConsL100] = useKept(keep && `${keep}.consumption`, CONS_L100)
  const [radiusKm, setRadiusKm] = useKept<number | null>(keep && `${keep}.radius`, null)

  useEffect(() => { load().then(setSnap).catch(() => setSnap({ generatedAt: '', stations: [] })) }, [load])

  const stations = useMemo(() => snap?.stations ?? [], [snap])
  const rankings = useMemo(() => {
    const out = {} as Record<Fuel, Ranking>
    for (const f of FUELS) out[f] = rank({ stations, origin, fuel: f, fillL, consL100, radiusKm: radiusKm ?? undefined })
    return out
  }, [stations, origin, fillL, consL100, radiusKm])
  const ranking = rankings[fuel]
  const bestPrice = useMemo(() => {
    const out = {} as Record<Fuel, number | null>
    for (const f of FUELS) out[f] = rankings[f].list[0]?.price ?? null
    return out
  }, [rankings])

  const locate = useCallback(() => new Promise<boolean>((resolve) => {
    if (!navigator.geolocation) { setGeoError('La localisation n’est pas offerte par ce navigateur.'); resolve(false); return }
    setLocating(true); setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (p) => { setOrigin({ lat: p.coords.latitude, lon: p.coords.longitude, label: 'Ma position' }); setLocating(false); resolve(true) },
      () => { setGeoError('Position introuvable.'); setLocating(false); resolve(false) },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    )
  }), [])
  useEffect(() => { if (!geoError) return; const t = setTimeout(() => setGeoError(null), 4000); return () => clearTimeout(t) }, [geoError])

  return {
    ready: snap != null, stations, fuel, setFuel, origin, located: origin !== UNSET, locating, locate, geoError, setOrigin,
    consL100, setConsL100, radiusKm, setRadiusKm,
    fillL, setFillL,
    ranking, best: ranking.list[0] ?? null, bestPrice,
  }
}
