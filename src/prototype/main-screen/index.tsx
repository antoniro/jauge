// PROTOTYPE — throwaway.
// Question: what should Jauge's main screen look and feel like, and which accent colour?
// Three structurally different variants on one route, switched with ?variant=A|B|C, plus ?accent= and ?theme=.
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import './prototype.css'
import type { Fuel, Origin, Snapshot } from './data'
import { LONGUEUIL, loadSnapshot, rank } from './data'
import { Gazou } from './ui'
import VariantA from './VariantA'
import VariantB from './VariantB'
import VariantC from './VariantC'

const VARIANTS = { A: { name: 'Carte', C: VariantA }, B: { name: 'Réponse', C: VariantB }, C: { name: 'Relief', C: VariantC } } as const
type VKey = keyof typeof VARIANTS
const ACCENTS = {
  lime: { name: 'Lime', c: '#C8F051', on: '#101C2D' },
  glacier: { name: 'Glacier', c: '#3D7BFF', on: '#FFFFFF' },
  violet: { name: 'Violet', c: '#7B61FF', on: '#FFFFFF' },
  signal: { name: 'Signal', c: '#FF8A1F', on: '#101C2D' },
} as const
type AKey = keyof typeof ACCENTS

function useParam<T extends string>(key: string, fallback: T, allowed: readonly string[]) {
  const read = () => { const v = new URLSearchParams(location.search).get(key); return (v && allowed.includes(v) ? v : fallback) as T }
  const [val, setVal] = useState<T>(read)
  const set = useCallback((v: T) => {
    const u = new URL(location.href); u.searchParams.set(key, v); history.replaceState(null, '', u); setVal(v)
  }, [key])
  return [val, set] as const
}

function Switcher({ v, setV, a, setA, theme, setTheme }: { v: VKey; setV: (k: VKey) => void; a: AKey; setA: (k: AKey) => void; theme: string; setTheme: (t: 'light' | 'dark') => void }) {
  const keys = Object.keys(VARIANTS) as VKey[]
  const step = useCallback((d: number) => setV(keys[(keys.indexOf(v) + d + keys.length) % keys.length]), [v, setV]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [contenteditable]')) return
      if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1)
    }
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey)
  }, [step])
  return (
    <div className="proto-switcher" role="toolbar" aria-label="Prototype">
      <button onClick={() => step(-1)} aria-label="Variante précédente">‹</button>
      <span className="proto-label">{v} · {VARIANTS[v].name}</span>
      <button onClick={() => step(1)} aria-label="Variante suivante">›</button>
      <span className="proto-sep" />
      {(Object.keys(ACCENTS) as AKey[]).map((k) => (
        <button key={k} className={`proto-dot${a === k ? ' on' : ''}`} style={{ background: ACCENTS[k].c }} onClick={() => setA(k)} aria-label={`Accent ${ACCENTS[k].name}`} title={ACCENTS[k].name} />
      ))}
      <span className="proto-sep" />
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Changer le thème">{theme === 'dark' ? '☀' : '☾'}</button>
    </div>
  )
}

export default function MainScreenPrototype() {
  const [v, setV] = useParam<VKey>('variant', 'A', Object.keys(VARIANTS))
  const [a, setA] = useParam<AKey>('accent', 'lime', Object.keys(ACCENTS))
  const sysDark = matchMedia('(prefers-color-scheme: dark)').matches
  const [theme, setTheme] = useParam<'light' | 'dark'>('theme', sysDark ? 'dark' : 'light', ['light', 'dark'])
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [fuel, setFuel] = useState<Fuel>('R')
  const [fillL, setFillL] = useState(50)
  const [origin, setOrigin] = useState<Origin>(LONGUEUIL)
  const [locating, setLocating] = useState(false)

  useEffect(() => { const t = setTimeout(() => loadSnapshot().then(setSnap), 900); return () => clearTimeout(t) }, []) // short delay so Gazou is visible
  useEffect(() => {
    const r = document.documentElement
    r.dataset.theme = theme
    r.style.setProperty('--accent', ACCENTS[a].c); r.style.setProperty('--on-accent', ACCENTS[a].on)
  }, [a, theme])

  const locate = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: 'Ma position' }); setLocating(false) },
      () => setLocating(false), { enableHighAccuracy: false, timeout: 8000 })
  }
  const inp = useMemo(() => snap && { stations: snap.stations, origin, fuel, fillL, consL100: 8 }, [snap, origin, fuel, fillL])
  const ranking = useMemo(() => (inp ? rank(inp) : null), [inp])
  const V = VARIANTS[v].C

  return (
    <MotionConfig reducedMotion="user">
      <div className="proto-stage">
        <div className="phone">
          <AnimatePresence mode="wait">
            {!snap || !ranking || !inp ? (
              <motion.div key="load" className="loading" exit={{ opacity: 0, scale: 0.9 }}>
                <Gazou /><p>On fait le plein de prix…</p>
              </motion.div>
            ) : (
              <motion.div key={`${v}-${theme}`} className="screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <V snap={snap} ranking={ranking} inp={inp} fuel={fuel} setFuel={setFuel} fillL={fillL} setFillL={setFillL}
                  origin={origin} locate={locate} locating={locating} dark={theme === 'dark'} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {(import.meta.env.DEV || import.meta.env.VITE_PROTO === "1") && <Switcher v={v} setV={setV} a={a} setA={setA} theme={theme} setTheme={setTheme} />}
      </div>
    </MotionConfig>
  )
}
