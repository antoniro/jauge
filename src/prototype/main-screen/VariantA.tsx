// PROTOTYPE — throwaway. Variant A "Carte": the map is the hero; a draggable sheet holds the answer.
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import StationMap from './StationMap'
import type { VariantProps } from './types'
import { betterOption, fmtKm, fmtMoney, fmtPrice, shortAddress } from './data'
import type { Ranked } from './data'
import { BrandBadge, FuelToggle, GoButton, PinIcon, Rolling, SourceLine } from './ui'

const PEEK = 318

function Answer({ r, label }: { r: Ranked; label?: string }) {
  const { street, city } = shortAddress(r.s.a)
  return (
    <div className="a-answer">
      <div className="a-head">
        <BrandBadge brand={r.s.b} size={46} />
        <div className="a-name"><strong>{r.s.b ?? r.s.n}</strong><span>{street}, {city}</span></div>
        {label && <span className="a-tag">{label}</span>}
      </div>
      <div className="a-price"><Rolling value={fmtPrice(r.price)} delay={0.15} /><span className="unit">¢/L</span></div>
      <p className="a-save">
        ≈ {fmtKm(r.km)} km ·{' '}
        {r.isBaseline ? <>la plus proche</> : r.real > 0
          ? <>tu sauves <b><Rolling value={fmtMoney(r.real)} delay={0.4} /> $</b></>
          : <>pas rentable d'y aller</>}
      </p>
    </div>
  )
}

export default function VariantA(p: VariantProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(600)
  useEffect(() => {
    const el = root.current!; const f = () => setH(Math.round(el.clientHeight * 0.82))
    f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect()
  }, [])
  const closed = h - PEEK
  const y = useMotionValue(closed)
  useEffect(() => { y.set(closed) }, [closed, y])
  const listOpacity = useTransform(y, [closed, closed - 120], [0, 1])
  const snapTo = (open: boolean) => animate(y, open ? 0 : closed, { type: 'spring', stiffness: 380, damping: 38 })

  const best = p.ranking.list[0]
  const sel = useMemo(() => {
    const s = selectedId ? p.snap.stations.find((x) => x.id === selectedId) : null
    return s ? betterOption(s, p.inp) : null
  }, [selectedId, p.snap, p.inp])
  const alreadyBest = best && p.ranking.baseline && best.s.id === p.ranking.baseline.s.id

  return (
    <div className="vA" ref={root}>
      <StationMap stations={p.snap.stations} ranked={p.ranking.list} fuel={p.fuel} origin={p.origin} dark={p.dark}
        bestId={best?.s.id} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); snapTo(false) }} bottomPadding={PEEK} />
      <div className="a-top">
        <button className="chip glass" onClick={p.locate}><PinIcon /> {p.locating ? "Localisation…" : p.origin.label}</button>
        <FuelToggle fuel={p.fuel} onChange={p.setFuel} id="A" />
      </div>
      <motion.section className="a-sheet glass-strong" style={{ y, height: h }} drag="y" dragConstraints={{ top: 0, bottom: closed }} dragElastic={0.08}
        onDragEnd={(_, info) => snapTo(info.velocity.y < -400 || (info.velocity.y < 400 && y.get() < closed / 2))}>
        <div className="grabber" />
        <AnimatePresence mode="popLayout" initial={false}>
          {sel ? (
            <motion.div key={`sel-${sel.sel.s.id}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }}>
              <Answer r={sel.sel} label="Ton choix" />
              {sel.better && (
                <motion.button className="better" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} onClick={() => setSelectedId(sel.better!.s.id)}>
                  <BrandBadge brand={sel.better.s.b} size={34} />
                  <span><b>{sel.better.s.b ?? sel.better.s.n}, {shortAddress(sel.better.s.a).city}</b> te fait sauver <b>{fmtMoney(sel.better.real - sel.sel.real)} $</b> de plus</span>
                </motion.button>
              )}
              <div className="a-actions"><GoButton /><button className="ghost" onClick={() => setSelectedId(null)}>Retour au meilleur choix</button></div>
            </motion.div>
          ) : best ? (
            <motion.div key="best" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }}>
              {alreadyBest && <p className="a-already">Tu es déjà au meilleur prix.</p>}
              <Answer r={best} />
              <div className="a-actions"><GoButton /><span className="a-fill">{p.fillL} L · 8 L/100 km</span></div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <motion.ol className="a-list" style={{ opacity: listOpacity }}>
          {p.ranking.list.slice(0, 25).map((r, i) => (
            <li key={r.s.id} onClick={() => { setSelectedId(r.s.id); snapTo(false) }}>
              <span className="a-rank">{i + 1}</span>
              <BrandBadge brand={r.s.b} size={34} />
              <span className="a-li-name"><b>{r.s.b ?? r.s.n}</b><small>≈ {fmtKm(r.km)} km · {shortAddress(r.s.a).city}</small></span>
              <span className="pill">{fmtPrice(r.price)}</span>
              <span className={`a-li-save ${r.real > 0 ? '' : 'muted'}`}>{r.isBaseline ? '—' : `${r.real > 0 ? '+' : ''}${fmtMoney(r.real)} $`}</span>
            </li>
          ))}
        </motion.ol>
        <SourceLine generatedAt={p.snap.generatedAt} />
      </motion.section>
    </div>
  )
}
