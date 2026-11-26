// PROTOTYPE — throwaway. Small shared pieces used by every variant.
import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { contours } from 'd3-contour'
import { geoPath } from 'd3-geo'
import type { Fuel } from './data'
import { FUEL_LABEL, minutesAgo } from './data'

/* ---------- Rolling digits (the signature animation) ---------- */
const STEP = 1.05
function Digit({ d, delay }: { d: number; delay: number }) {
  const reduce = useReducedMotion()
  return (
    <span className="roll-digit" aria-hidden>
      <motion.span
        className="roll-col"
        initial={{ y: '0em' }}
        animate={{ y: `${-d * STEP}em` }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 18, mass: 1, delay }}
      >
        {Array.from({ length: 10 }, (_, i) => <span key={i}>{i}</span>)}
      </motion.span>
    </span>
  )
}
export function Rolling({ value, delay = 0, className }: { value: string; delay?: number; className?: string }) {
  const chars = value.split('')
  return (
    <span className={`roll ${className ?? ''}`} role="text" aria-label={value}>
      {chars.map((c, i) => {
        const key = chars.length - i // keyed from the right so units stay put
        return /\d/.test(c)
          ? <Digit key={key} d={+c} delay={delay + i * 0.045} />
          : <span key={`s${key}`} className="roll-sep" aria-hidden>{c}</span>
      })}
    </span>
  )
}

/* ---------- Brand badge (stand-in: real logos come later) ---------- */
const BRAND: Record<string, { c: string; t: string }> = {
  'Esso': { c: '#D8202A', t: 'Esso' }, 'Petro-Canada': { c: '#D71F2B', t: 'Petro' }, 'Shell': { c: '#E3A300', t: 'Shell' },
  'Ultramar': { c: '#0A4FA0', t: 'Ultra' }, 'Harnois': { c: '#0F7A3E', t: 'Harnois' }, 'Irving': { c: '#1D3F8F', t: 'Irving' },
  'Sonic': { c: '#E05A12', t: 'Sonic' }, 'Couche-Tard': { c: '#D2232A', t: 'C-Tard' }, 'Crevier': { c: '#1B5DAA', t: 'Crevier' },
  'Canadian Tire': { c: '#C8102E', t: 'CTire' }, 'Costco': { c: '#005DAA', t: 'Costco' },
}
export function BrandBadge({ brand, size = 44 }: { brand: string | null; size?: number }) {
  const b = brand ? BRAND[brand] : undefined
  return (
    <span className="badge" style={{ width: size, height: size, ['--brand' as string]: b?.c ?? 'var(--ink-3)' }} title={brand ?? 'Indépendant'}>
      {b ? <span className="badge-word" style={{ fontSize: size * 0.24 }}>{b.t}</span> : <PumpIcon size={size * 0.46} />}
    </span>
  )
}
export function PumpIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" /><path d="M3 21h12" /><path d="M6.5 8h5" />
      <path d="M14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3" />
    </svg>
  )
}

/* ---------- Fuel toggle with a sliding highlight ---------- */
export function FuelToggle({ fuel, onChange, id }: { fuel: Fuel; onChange: (f: Fuel) => void; id: string }) {
  return (
    <div className="fuel-toggle glass" role="radiogroup" aria-label="Carburant">
      {(['R', 'S', 'D'] as Fuel[]).map((f) => (
        <button key={f} role="radio" aria-checked={fuel === f} className={fuel === f ? 'on' : ''} onClick={() => onChange(f)}>
          {fuel === f && <motion.span layoutId={`fuel-hl-${id}`} className="fuel-hl" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span className="fuel-label">{FUEL_LABEL[f]}</span>
        </button>
      ))}
    </div>
  )
}

/* ---------- Source line (always visible) ---------- */
export function SourceLine({ generatedAt }: { generatedAt: string }) {
  const m = minutesAgo(generatedAt)
  const age = m < 60 ? `il y a ${m} min` : `il y a ${Math.round(m / 60)} h`
  return (
    <p className="source-line">
      Source : Régie de l'énergie · mis à jour {age}. Chaque station déclare ses propres prix.
    </p>
  )
}

/* ---------- Gazou, the clay fuel drop ---------- */
export function Gazou({ size = 84 }: { size?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.svg width={size} height={size * 1.2} viewBox="0 0 100 120" aria-hidden
      animate={reduce ? {} : { y: [0, -10, 0], scaleY: [1, 1.04, 0.96, 1], rotate: [0, -3, 3, 0] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
      <defs>
        <radialGradient id="gz-body" cx="35%" cy="35%" r="75%">
          <stop offset="0%" stopColor="color-mix(in oklab, var(--accent) 40%, white)" />
          <stop offset="55%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="color-mix(in oklab, var(--accent) 70%, black)" />
        </radialGradient>
        <radialGradient id="gz-shine" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity=".9" /><stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="114" rx="26" ry="4" fill="var(--ink)" opacity=".12" />
      <path d="M50 6 C62 30 84 50 84 74 A34 34 0 0 1 16 74 C16 50 38 30 50 6Z" fill="url(#gz-body)" />
      <ellipse cx="36" cy="58" rx="9" ry="14" fill="url(#gz-shine)" transform="rotate(-20 36 58)" />
      <circle cx="40" cy="78" r="4.2" fill="var(--ink)" /><circle cx="60" cy="78" r="4.2" fill="var(--ink)" />
      <circle cx="41.4" cy="76.6" r="1.3" fill="white" /><circle cx="61.4" cy="76.6" r="1.3" fill="white" />
      <path d="M44 88 Q50 93 56 88" stroke="var(--ink)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </motion.svg>
  )
}

/* ---------- Embossed relief (procedural stand-in for a Quebec relief) ---------- */
function noiseField(w: number, h: number, seed = 7) {
  const rand = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s) }
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const value = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
    const a = rand(xi, yi), b = rand(xi + 1, yi), c = rand(xi, yi + 1), d = rand(xi + 1, yi + 1)
    const u = smooth(xf), v = smooth(yf)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
  const out = new Array(w * h)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let f = 0, amp = 1, freq = 1 / 30
    for (let o = 0; o < 3; o++) { f += value(i * freq, j * freq) * amp; amp *= 0.5; freq *= 2 }
    out[j * w + i] = f
  }
  return out
}
export function Relief({ height = 320, draw = true }: { height?: number; draw?: boolean }) {
  const reduce = useReducedMotion()
  const { paths, w, h } = useMemo(() => {
    const w = 96, h = 80
    const values = noiseField(w, h)
    const gen = contours().size([w, h]).thresholds(13)
    const path = geoPath()
    return { paths: gen(values).map((c) => path(c) ?? ''), w, h }
  }, [])
  return (
    <svg className="relief" viewBox={`1 1 ${w - 2} ${h - 2}`} preserveAspectRatio="xMidYMid slice" style={{ height }} aria-hidden>
      {paths.map((d, i) => (
        <g key={i}>
          <motion.path d={d} className="relief-shadow" initial={draw && !reduce ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay: 0.04 * i, ease: [0.3, 0.7, 0.2, 1] }} />
          <motion.path d={d} className="relief-line" initial={draw && !reduce ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay: 0.04 * i, ease: [0.3, 0.7, 0.2, 1] }} />
        </g>
      ))}
    </svg>
  )
}

export function GoButton({ children = 'Y aller' }: { children?: string }) {
  return <motion.button className="go" whileTap={{ scale: 0.95 }} transition={{ type: 'spring', stiffness: 600, damping: 30 }}>{children}</motion.button>
}

export function PinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" />
    </svg>
  )
}
