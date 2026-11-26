// PROTOTYPE — throwaway. Fable round of main-screen mockups: variants behind ?variant=A|B|B2|B3|C (B3 is the default).
import '@fontsource-variable/big-shoulders'
import '@fontsource-variable/instrument-sans'
import { MotionConfig } from 'motion/react'
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import './base.css'
import { IconChevron, useJauge } from './shared'
import VariantA from './VariantA'
import VariantC from './VariantC'

const VariantB = lazy(() => import('./VariantB')) // the map library only loads for the map variants
const VariantB2 = lazy(() => import('./VariantB2'))
const VariantB3 = lazy(() => import('./VariantB3'))

const VARIANTS = [
  { key: 'A', name: 'Le cadran' },
  { key: 'B', name: 'La carte' },
  { key: 'B2', name: 'La carte, v2' },
  { key: 'B3', name: 'La carte, v3' },
  { key: 'C', name: 'Le reçu' },
] as const
type VKey = (typeof VARIANTS)[number]['key']
const ACCENTS = [
  { key: 'cone', name: 'Cône', hex: '#FF5B1F' },
  { key: 'lime', name: 'Lime', hex: '#D2F03C' },
  { key: 'fleur', name: 'Fleurdelisé', hex: '#2F5BFF' },
  { key: 'menthe', name: 'Menthe', hex: '#19C37D' },
] as const

const SHOW_SWITCHER = import.meta.env.DEV || import.meta.env.VITE_PROTO === '1'

function readParams() {
  const q = new URLSearchParams(location.search)
  const v = (q.get('variant') ?? 'B3').toUpperCase()
  const t = q.get('theme')
  return {
    variant: (VARIANTS.some((x) => x.key === v) ? v : 'B3') as VKey,
    dark: t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches,
    accent: ACCENTS.find((a) => a.key === q.get('accent'))?.key ?? 'cone',
    wide: q.get('large') === '1',
  }
}

export default function FableMockups() {
  const init = useRef(readParams()).current
  const [variant, setVariant] = useState<VKey>(init.variant)
  const [dark, setDark] = useState(init.dark)
  const [accent, setAccent] = useState<string>(init.accent)
  const [large, setLarge] = useState(init.wide) // B3 only: the laptop layout instead of the phone frame
  const wide = large && variant === 'B3'
  const j = useJauge()
  const phone = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(796)

  useEffect(() => {
    const el = phone.current; if (!el) return
    const ro = new ResizeObserver(() => setH(el.clientHeight)); ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = dark ? 'dark' : 'light'
    root.dataset.accent = accent
    const q = new URLSearchParams(location.search)
    q.set('variant', variant); q.set('theme', dark ? 'dark' : 'light'); q.set('accent', accent)
    if (large) q.set('large', '1'); else q.delete('large')
    history.replaceState(null, '', `${location.pathname}?${q}`)
  }, [variant, dark, accent, large])

  const step = useCallback((d: number) => setVariant((v) => {
    const i = VARIANTS.findIndex((x) => x.key === v)
    return VARIANTS[(i + d + VARIANTS.length) % VARIANTS.length].key
  }), [])

  useEffect(() => {
    if (!SHOW_SWITCHER) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      if (t && (t.closest('input, textarea, select, [contenteditable], [data-own-keys]'))) return
      if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [step])

  const props = { j, dark, accent, h }
  const current = VARIANTS.find((x) => x.key === variant)!

  return (
    <MotionConfig reducedMotion="user">
      <div className="fb-shell" data-wide={wide || undefined}>
        <div className="fb-stage">
          <div className="fb-phone" ref={phone} data-variant={variant}>
            {variant === 'A' && <VariantA key="A" {...props} />}
            {variant === 'B' && <Suspense fallback={null}><VariantB key="B" {...props} /></Suspense>}
            {variant === 'B2' && <Suspense fallback={null}><VariantB2 key="B2" {...props} /></Suspense>}
            {variant === 'B3' && <Suspense fallback={null}><VariantB3 key={wide ? 'B3w' : 'B3'} {...props} wide={wide} /></Suspense>}
            {variant === 'C' && <VariantC key="C" {...props} />}
          </div>
        </div>
        {SHOW_SWITCHER && (
          <nav className="fb-switcher" aria-label="Maquettes (hors design)">
            <button onClick={() => step(-1)} aria-label="Variante précédente"><IconChevron dir="left" /></button>
            <span className="fb-switcher-name"><b>{current.key}</b> {current.name}</span>
            <button onClick={() => step(1)} aria-label="Variante suivante"><IconChevron /></button>
            <i />
            <button onClick={() => setDark((d) => !d)} aria-label={dark ? 'Passer en clair' : 'Passer en sombre'} className="fb-switcher-theme">
              {dark ? '☾' : '☀'}
            </button>
            {variant === 'B3' && (
              <button onClick={() => setLarge((l) => !l)} aria-label={large ? 'Voir sur téléphone' : 'Voir sur grand écran'} aria-pressed={large} className="fb-switcher-theme" title={large ? 'Téléphone' : 'Grand écran'}>
                {large ? '▯' : '▭'}
              </button>
            )}
            <i />
            {ACCENTS.map((a) => (
              <button key={a.key} className="fb-switcher-dot" aria-label={`Accent ${a.name}`} aria-pressed={accent === a.key}
                title={a.name} style={{ background: a.hex }} onClick={() => setAccent(a.key)} />
            ))}
          </nav>
        )}
      </div>
    </MotionConfig>
  )
}
