// PROTOTYPE — throwaway. Variant A, "Le cadran": stations are ticks on a wheel you turn; the needle stays still.
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import './a.css'
import type { VariantProps } from './shared'
import { BrandBadge, FuelSwitch, GeoToast, IconGo, LocateButton, Odometer, SourceLine, Wordmark, clamp, fmtKm, fmtMoney, fmtPrice, goUrl, stationName, stationWhere } from './shared'
import { paintRelief } from './topo'

const STEP = 3.3 // degrees between two stations
const R = 560 // wheel radius, px
const DEG = 180 / Math.PI
const WINDOW = 12

export default function VariantA({ j, dark, h }: VariantProps) {
  const reduce = useReducedMotion()
  const byDist = useMemo(() => [...j.ranking.list].sort((a, b) => a.km - b.km), [j.ranking])
  const n = byDist.length
  const bestId = j.best?.s.id
  const bestIdx = Math.max(0, byDist.findIndex((r) => r.s.id === bestId))
  const maxReal = Math.max(0.01, j.best?.real ?? 0)

  const angle = useMotionValue(0)
  const [idx, setIdx] = useState(0)
  const idxRef = useRef(0)
  const anim = useRef<ReturnType<typeof animate> | null>(null)
  const start = useRef(0)
  const [touched, setTouched] = useState(false)

  useMotionValueEvent(angle, 'change', (v) => {
    const i = clamp(Math.round(-v / STEP), 0, Math.max(0, n - 1))
    if (i !== idxRef.current) { idxRef.current = i; setIdx(i) }
  })

  const goTo = (i: number, soft = false) => {
    anim.current?.stop()
    anim.current = animate(angle, -i * STEP, soft ? { type: 'spring', stiffness: 38, damping: 13, restDelta: 0.01 } : { type: 'spring', stiffness: 260, damping: 30 })
  }

  // Opening moment: start on the Baseline station (the closest), sweep to the best one.
  const sweepKey = `${j.ready}-${j.fuel}-${j.origin.lat}-${j.origin.lon}`
  useEffect(() => {
    if (!n) return
    anim.current?.stop()
    if (reduce) { angle.set(-bestIdx * STEP); return }
    angle.set(0)
    const t = setTimeout(() => goTo(bestIdx, true), 350)
    return () => clearTimeout(t)
  }, [sweepKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const relief = useMemo(() => paintRelief(390, 520, dark), [dark])

  const cur = byDist[Math.min(idx, n - 1)]
  const base = j.ranking.baseline
  const isBest = !!cur && cur.s.id === bestId
  const status = !cur ? '' : isBest && cur.isBaseline ? 'Le meilleur, et le plus proche' : isBest ? 'Le meilleur plein' : cur.isBaseline ? 'La station la plus proche' : cur.real > 0.005 ? 'Rentable aussi' : 'Pas rentable d’ici'
  const real = cur ? Math.round(cur.real * 100) / 100 : 0
  const sign = real > 0 ? '+' : real < 0 ? '−' : ''
  const compact = h < 720
  const numSize = compact ? clamp(Math.round((h - 400) * 0.5), 72, 110) : clamp(Math.round(h * 0.168), 92, 136)

  const lo = Math.max(0, idx - WINDOW), hi = Math.min(n - 1, idx + WINDOW)
  const ticks = []
  for (let i = lo; i <= hi; i++) {
    const r = byDist[i]
    const len = r.real > 0.005 ? 24 + 30 * Math.min(1, r.real / maxReal) : 22 - 13 * Math.min(1, -r.real / 4)
    ticks.push(
      <div key={r.s.id} className="a-tick" data-best={r.s.id === bestId || undefined} data-neg={r.real < -0.005 || undefined} data-on={i === idx || undefined}
        style={{ transform: `rotate(${i * STEP}deg) translateY(${-R}px)` }} onClick={() => { setTouched(true); goTo(i) }}>
        <i style={{ height: len }} />
        {r.isBaseline && <b className="a-tick-base" />}
        <span>{fmtPrice(r.price)}</span>
      </div>,
    )
  }

  return (
    <div className="a-root" data-compact={compact || undefined}>
      <div className="a-relief" style={{ backgroundImage: `url(${relief})` }} aria-hidden />
      <GeoToast j={j} />
      <header className="a-top">
        <Wordmark />
        <LocateButton j={j} />
      </header>
      <FuelSwitch j={j} id="a" className="a-fuel" />

      {cur && (
        <section className="a-hero" aria-live="polite">
          <p className="a-status">{status}</p>
          <div className="a-station">
            <BrandBadge brand={cur.s.b} size={44} />
            <div>
              <h1>{stationName(cur.s)}</h1>
              <p>{stationWhere(cur.s)}</p>
            </div>
          </div>

          <div className="a-num" data-neg={real < 0 || undefined} style={{ fontSize: numSize }}>
            <span className="a-num-sign">{sign}</span>
            <Odometer value={fmtMoney(Math.abs(real))} />
            <span className="a-num-unit">$</span>
          </div>
          <p className="a-caption">
            {cur.isBaseline
              ? <>C’est la station la plus proche, à ≈ {fmtKm(cur.km)} km d’ici. Les autres sont comparées à elle.</>
              : real > 0
                ? <>d’économie réelle sur <button className="a-fill" onClick={j.cycleFill}>{j.fillL} L</button>, détour de ≈ {fmtKm(cur.extraKm)} km compris</>
                : <>d’économie réelle sur <button className="a-fill" onClick={j.cycleFill}>{j.fillL} L</button> : le détour de ≈ {fmtKm(cur.extraKm)} km coûte plus que le rabais</>}
          </p>

          <div className="a-actions">
            <a className={`fb-go${isBest ? '' : ' quiet'}`} href={goUrl(cur.s)} target="_blank" rel="noreferrer"><IconGo />Y aller</a>
            <div className="a-facts">
              <span className="fb-pill"><Odometer value={fmtPrice(cur.price)} /><small>¢/L</small></span>
              <span className="a-km">≈ {fmtKm(cur.km)} km</span>
            </div>
          </div>
          {base && !cur.isBaseline && (
            <p className="a-base">La plus proche : {stationName(base.s)} à ≈ {fmtKm(base.km)} km, {fmtPrice(base.price)} ¢/L</p>
          )}
        </section>
      )}
      {j.ready && !cur && <p className="a-empty">Aucune station ne vend ce carburant à moins de {j.ranking.radiusKm} km.</p>}

      <motion.div className="a-dial" data-own-keys tabIndex={0} role="slider" aria-label="Tourner pour voir les autres stations, de la plus proche à la plus loin"
        aria-valuemin={1} aria-valuemax={Math.max(1, n)} aria-valuenow={idx + 1} aria-valuetext={cur ? `${stationName(cur.s)}, ${fmtPrice(cur.price)} cents le litre` : undefined}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); goTo(clamp(idxRef.current + 1, 0, n - 1)) }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); goTo(clamp(idxRef.current - 1, 0, n - 1)) }
        }}
        onPanStart={() => { anim.current?.stop(); start.current = angle.get(); setTouched(true) }}
        onPan={(_, info) => {
          const min = -(n - 1) * STEP
          let v = start.current + (info.offset.x / R) * DEG
          if (v > 0) v = v * 0.3; else if (v < min) v = min + (v - min) * 0.3 // rubber band at both ends
          angle.set(v)
        }}
        onPanEnd={(_, info) => {
          const min = -(n - 1) * STEP
          const cur = angle.get()
          if (cur > 0 || cur < min) { anim.current = animate(angle, cur > 0 ? 0 : min, { type: 'spring', stiffness: 320, damping: 30 }); return }
          // glide on with the release speed, then settle on the nearest station
          const v = (info.velocity.x / R) * DEG
          const target = clamp(Math.round((cur + v * 0.35) / STEP) * STEP, min, 0)
          anim.current = animate(angle, target, { type: 'spring', stiffness: 85, damping: 19, velocity: v, restDelta: 0.01 })
        }}>
        <div className="a-disc" />
        <motion.div className="a-wheel" style={{ rotate: angle }}>{ticks}</motion.div>
        <div className="a-needle" aria-hidden />
        <div className="a-ends" aria-hidden><span>plus près</span><span>plus loin</span></div>
        {!touched && n > 1 && <p className="a-hint">Tourne le cadran : {n} stations à moins de {j.ranking.radiusKm} km</p>}
        <SourceLine className="a-source" />
      </motion.div>
    </div>
  )
}
