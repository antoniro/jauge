// Small pieces used all over: rolling numbers, brand badges, the fuel switch, the name with its gauge.
import { motion } from 'motion/react'
import { useId } from 'react'
import { FUEL_LABEL } from '../domain/format'
import { FUELS } from '../domain/ranking'
import type { Jauge } from '../state'

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
