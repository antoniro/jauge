// PROTOTYPE — throwaway. Variant C "Relief": an embossed relief opening, then a ranked list that reorders as you tune the fill.
import { animate, motion, useMotionValue, useMotionValueEvent } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { VariantProps } from './types'
import { fmtKm, fmtMoney, fmtPrice, shortAddress } from './data'
import { BrandBadge, FuelToggle, PinIcon, Relief, SourceLine } from './ui'

const LITRES = Array.from({ length: 23 }, (_, i) => 10 + i * 5) // 10 … 120
const CELL = 64

function FillPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const track = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(360)
  useEffect(() => { const f = () => setW(track.current?.clientWidth ?? 360); f(); addEventListener('resize', f); return () => removeEventListener('resize', f) }, [])
  const xFor = (n: number) => w / 2 - CELL / 2 - LITRES.indexOf(n) * CELL
  const x = useMotionValue(xFor(value))
  const [live, setLive] = useState(value)
  useEffect(() => { x.set(xFor(value)) }, [w]) // eslint-disable-line react-hooks/exhaustive-deps
  useMotionValueEvent(x, 'change', (v) => {
    const i = Math.round((w / 2 - CELL / 2 - v) / CELL)
    const n = LITRES[Math.max(0, Math.min(LITRES.length - 1, i))]
    if (n !== live) setLive(n)
  })
  const settle = () => { const n = live; animate(x, xFor(n), { type: 'spring', stiffness: 420, damping: 40 }); onChange(n) }
  return (
    <div className="c-picker" ref={track} aria-label={`Volume du plein : ${value} litres`}>
      <motion.div className="c-picker-row" style={{ x }} drag="x" dragMomentum dragElastic={0.1}
        dragConstraints={{ left: xFor(LITRES[LITRES.length - 1]), right: xFor(LITRES[0]) }}
        onDragEnd={() => setTimeout(settle, 220)}>
        {LITRES.map((n) => {
          const d = Math.abs(LITRES.indexOf(n) - LITRES.indexOf(live))
          return (
            <motion.button key={n} className="c-pick" style={{ width: CELL }} animate={{ scale: d === 0 ? 1.6 : d === 1 ? 1 : 0.85, opacity: d === 0 ? 1 : d > 3 ? 0.15 : 0.45 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={() => { setLive(n); animate(x, xFor(n), { type: 'spring', stiffness: 420, damping: 40 }); onChange(n) }}>{n}</motion.button>
          )
        })}
      </motion.div>
      <span className="c-picker-unit">litres</span>
    </div>
  )
}

export default function VariantC(p: VariantProps) {
  const list = p.ranking.list.slice(0, 12)
  const max = Math.max(0.01, ...list.map((r) => r.real))
  return (
    <div className="vC">
      <section className="c-hero">
        <Relief height={300} />
        <motion.h1 className="c-title" initial="hide" animate="show" variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.5 } } }}>
          {[['thin', 'Le plein'], ['bold', 'le moins cher'], ['thin', 'autour de'], ['bold', p.origin.label]].map(([w, t]) => (
            <motion.span key={t} className={`c-line ${w}`} variants={{ hide: { y: '110%', opacity: 0 }, show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 200, damping: 24 } } }}>{t}</motion.span>
          ))}
        </motion.h1>
        <button className="chip glass c-locate" onClick={p.locate}><PinIcon /> {p.locating ? 'Localisation…' : 'Ma position'}</button>
      </section>

      <section className="c-controls">
        <FuelToggle fuel={p.fuel} onChange={p.setFuel} id="C" />
        <FillPicker value={p.fillL} onChange={p.setFillL} />
      </section>

      {list[0]?.isBaseline && <p className="c-already">Tu es déjà au meilleur prix : la station la plus proche est aussi la plus avantageuse.</p>}
      <ol className="c-list">
        {list.map((r, i) => {
          const { city } = shortAddress(r.s.a)
          return (
            <motion.li key={r.s.id} layout transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.9 + i * 0.05 } }}>
              <span className="c-rank">{i + 1}</span>
              <BrandBadge brand={r.s.b} size={42} />
              <div className="c-li-main">
                <div className="c-li-top"><b>{r.s.b ?? r.s.n}</b><span className="pill">{fmtPrice(r.price)}</span></div>
                <small>≈ {fmtKm(r.km)} km · {city}{r.isBaseline ? ' · la plus proche' : ''}</small>
                <div className="c-bar"><motion.span className={r.real > 0 ? '' : 'muted'} initial={{ width: 0 }} animate={{ width: `${Math.max(0, r.real) / max * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 1 + i * 0.05 }} /></div>
              </div>
              <span className={`c-save ${r.real > 0 ? '' : 'muted'}`}>{r.isBaseline ? '0,00 $' : `${fmtMoney(r.real)} $`}</span>
            </motion.li>
          )
        })}
      </ol>
      <SourceLine generatedAt={p.snap.generatedAt} />
    </div>
  )
}
