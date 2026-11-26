// PROTOTYPE — throwaway. Pieces shared by the three Fable variants.
import { motion } from 'motion/react'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { Fuel, Origin, Ranked, Ranking, Snapshot, Station } from '../main-screen/data'
import { FUEL_LABEL, LONGUEUIL, fmtKm, fmtMoney, fmtPrice, loadSnapshot, rank, shortAddress } from '../main-screen/data'

export const FUELS: Fuel[] = ['R', 'S', 'D']
export const CONS_L100 = 8
const FILLS = [30, 50, 70]

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
  fillL: number; cycleFill: () => void; setFillL: (n: number) => void
  ranking: Ranking
  best: Ranked | null
  /** Best Posted price within the Search radius, per Fuel type */
  bestPrice: Record<Fuel, number | null>
}

export interface VariantProps { j: Jauge; dark: boolean; accent: string; h: number; wide?: boolean }

export function useJauge(): Jauge {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [fuel, setFuel] = useState<Fuel>('R')
  const [origin, setOrigin] = useState<Origin>(LONGUEUIL)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [fillL, setFillL] = useState(50)
  const [consL100, setConsL100] = useState(CONS_L100)
  const [radiusKm, setRadiusKm] = useState<number | null>(null)

  useEffect(() => { loadSnapshot().then(setSnap).catch(() => setSnap({ generatedAt: '', stations: [] })) }, [])

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
    ready: snap != null, stations, fuel, setFuel, origin, located: origin !== LONGUEUIL, locating, locate, geoError, setOrigin,
    consL100, setConsL100, radiusKm, setRadiusKm,
    fillL, setFillL, cycleFill: () => setFillL((v) => FILLS[(FILLS.indexOf(v) + 1) % FILLS.length]),
    ranking, best: ranking.list[0] ?? null, bestPrice,
  }
}

// ---------- formatting ----------
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
export { FUEL_LABEL, fmtKm, fmtMoney, fmtPrice }

// ---------- odometer ----------
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const ODO_SPRING = { type: 'spring', stiffness: 170, damping: 24, mass: 0.9 } as const

/** Digits roll into place like a pump display. Only transforms are animated. */
export function Odometer({ value, className = '' }: { value: string; className?: string }) {
  const chars = [...value]
  return (
    <span className={`fb-odo ${className}`} role="text" aria-label={value}>
      {chars.map((ch, i) => {
        const key = chars.length - i // keyed from the right so units stay put when a digit is added
        const d = DIGITS.indexOf(ch)
        if (d < 0) return <span key={`s${key}`} className="fb-odo-s" aria-hidden>{ch === ' ' ? ' ' : ch}</span>
        return (
          <span key={`d${key}`} className="fb-odo-d" aria-hidden>
            <motion.span className="fb-odo-strip" initial={{ y: '0em' }} animate={{ y: `${-d}em` }}
              transition={{ ...ODO_SPRING, delay: Math.min(0.18, (chars.length - 1 - i) * 0.03) }}>
              {DIGITS.map((n) => <span key={n}>{n}</span>)}
            </motion.span>
          </span>
        )
      })}
    </span>
  )
}

// ---------- brand badge placeholder ----------
const BRAND_TONES: Record<string, [string, string]> = {
  'Esso': ['#E4002B', '#1C3FA8'], 'Petro-Canada': ['#E31837', '#F5F5F5'], 'Shell': ['#F7C600', '#DD1D21'],
  'Ultramar': ['#0B56A4', '#FFD100'], 'Harnois': ['#E30613', '#2B2B2B'], 'Irving': ['#0E57A7', '#E31837'],
  'Sonic': ['#E2001A', '#FFD500'], 'Couche-Tard': ['#E31B23', '#F58220'], 'Crevier': ['#0A539B', '#E31837'],
  'Canadian Tire': ['#D8262E', '#1A7F3C'], 'Costco': ['#0B5DAA', '#E31837'], 'Mobil': ['#1C3FA8', '#E4002B'],
}
function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }

/** Placeholder until the real logos arrive: an enamel-pin drop in the brand's usual colours. Never initials. */
export function BrandBadge({ brand, size = 40 }: { brand: string | null; size?: number }) {
  const id = useId()
  const h = hash(brand ?? '')
  const [a, b] = brand ? BRAND_TONES[brand] ?? [`hsl(${h % 360} 62% 46%)`, `hsl(${(h * 7) % 360} 70% 62%)`] : ['#8A909A', '#C9CDD3']
  const mark = brand ? h % 3 : 3
  return (
    <svg className="fb-badge" width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={brand ?? 'Station indépendante'}>
      <defs><clipPath id={id}><path d="M20 8.5c4.6 5.2 7.4 9.2 7.4 13.2a7.4 7.4 0 0 1-14.8 0c0-4 2.8-8 7.4-13.2Z" /></clipPath></defs>
      <circle cx="20" cy="20" r="19" className="fb-badge-disc" />
      <circle cx="20" cy="20" r="19" className="fb-badge-ring" />
      <g clipPath={`url(#${id})`}>
        <rect x="8" y="6" width="24" height="26" fill={a} />
        {mark === 0 && <rect x="8" y="21" width="24" height="12" fill={b} />}
        {mark === 1 && <path d="M8 26l12-7 12 7v8H8z" fill={b} />}
        {mark === 2 && <circle cx="20" cy="23" r="3.6" fill={b} />}
        {mark === 3 && <rect x="8" y="24" width="24" height="3" fill={b} />}
        <path d="M15.6 20.5c0-1.9 1-3.9 2.6-6" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  )
}

// ---------- icons ----------
export const IconLocate = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
    <circle cx="8" cy="8" r="4.2" /><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" /><path d="M8 1v2.2M8 12.8V15M1 8h2.2M12.8 8H15" />
  </svg>
)
export const IconGo = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M14.3 1.7 1.9 6.6c-.5.2-.5.9 0 1.1l4.7 1.7 1.7 4.7c.2.5.9.5 1.1 0l4.9-12.4Z" /></svg>
)
export const IconChevron = ({ dir = 'right' }: { dir?: 'left' | 'right' | 'up' }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden
    style={{ transform: dir === 'left' ? 'rotate(180deg)' : dir === 'up' ? 'rotate(-90deg)' : undefined }}><path d="m5 2.5 4.5 4.5L5 11.5" /></svg>
)

// ---------- small shared UI ----------
export function FuelSwitch({ j, id, className = '' }: { j: Jauge; id: string; className?: string }) {
  return (
    <div className={`fb-fuel ${className}`} role="radiogroup" aria-label="Type de carburant">
      {FUELS.map((f) => (
        <button key={f} role="radio" aria-checked={j.fuel === f} className="fb-fuel-opt" onClick={() => j.setFuel(f)}>
          {j.fuel === f && <motion.span layoutId={`fuel-${id}`} className="fb-fuel-thumb" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span>{FUEL_LABEL[f]}</span>
        </button>
      ))}
    </div>
  )
}

export function LocateButton({ j, className = '' }: { j: Jauge; className?: string }) {
  return (
    <button className={`fb-locate ${className}`} onClick={j.locate} aria-busy={j.locating}>
      <span className={j.locating ? 'fb-spin' : ''}><IconLocate /></span>
      <span>Ma position</span>
    </button>
  )
}

export function SourceLine({ className = '' }: { className?: string }) {
  return <p className={`fb-source ${className}`}>Prix publiés par la Régie de l’énergie. Chaque station déclare les siens.</p>
}

export function Wordmark() {
  return (
    <span className="fb-wordmark" aria-label="Jauge">
      {/* a car's fuel gauge, upright (F on top, E at the bottom), pared down for small sizes; the full icon is public/icon.svg */}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round" aria-hidden>
        <path d="M11.41 20.29A10 10 0 0 1 11.41 3.71" stroke="currentColor" strokeWidth="2.400" />
        <path d="M17 12L11.94 7.76" stroke="var(--accent)" strokeWidth="2.400" />
        <circle cx="17" cy="12" r="1.800" fill="currentColor" />
      </svg>
      Jauge
    </span>
  )
}

export function GeoToast({ j }: { j: Jauge }) {
  if (!j.geoError) return null
  return <motion.p className="fb-toast" role="status" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>{j.geoError}</motion.p>
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
