// PROTOTYPE — throwaway. Variant B, "La carte": the map is the screen; a card row drives it; pull the sheet for the list.
import { animate, motion, useDragControls, useMotionValue, useTransform } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Ranked } from '../main-screen/data'
import { betterOption } from '../main-screen/data'
import './b.css'
import FableMap from './FableMap'
import type { VariantProps } from './shared'
import { BrandBadge, CONS_L100, FuelSwitch, GeoToast, IconChevron, IconGo, LocateButton, Odometer, SourceLine, clamp, fmtKm, fmtPrice, goUrl, signedMoney, stationName, stationWhere } from './shared'

const CARD_W = 304, GAP = 10, PITCH = CARD_W + GAP
const PEEK = 92
const TOP_N = 12
const SPRING = { type: 'spring', stiffness: 330, damping: 34 } as const

interface CardData { r: Ranked; tag: string | null; better: Ranked | null; rank: number | null }

export default function VariantB({ j, dark, accent, h }: VariantProps) {
  const list = j.ranking.list
  const bestId = j.best?.s.id
  const [selId, setSelId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const inp = useMemo(() => ({ stations: j.stations, origin: j.origin, fuel: j.fuel, fillL: j.fillL, consL100: CONS_L100 }), [j.stations, j.origin, j.fuel, j.fillL])

  useEffect(() => { setSelId(null) }, [j.fuel, j.origin])
  const activeId = selId ?? bestId ?? null

  // Cards: the best ranked stations, plus the Selected station in front when the person picked one outside that set.
  const cards = useMemo<CardData[]>(() => {
    const top: CardData[] = list.slice(0, TOP_N).map((r, i) => ({ r, rank: i + 1, better: null, tag: i === 0 ? 'Le meilleur plein' : r.isBaseline ? 'La plus proche' : null }))
    if (selId && !top.some((c) => c.r.s.id === selId)) {
      const s = j.stations.find((x) => x.id === selId)
      const res = s && betterOption(s, inp)
      if (res) {
        const i = list.findIndex((x) => x.s.id === selId)
        top.unshift({ r: res.sel, rank: i >= 0 ? i + 1 : null, better: res.better, tag: 'Ta sélection' })
      }
    }
    return top
  }, [list, selId, j.stations, inp])
  const activeIdx = Math.max(0, cards.findIndex((c) => c.r.s.id === activeId))
  const selected = cards[activeIdx]?.r.s ?? null

  // card rail
  const x = useMotionValue(0)
  useEffect(() => { const a = animate(x, -activeIdx * PITCH, SPRING); return () => a.stop() }, [activeIdx, cards.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // sheet
  const sheetH = Math.round(h * 0.82)
  const closedY = sheetH - PEEK
  const y = useMotionValue(closedY)
  const controls = useDragControls()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; y.set(closedY); return }
    const a = animate(y, open ? 0 : closedY, SPRING); return () => a.stop()
  }, [open, closedY]) // eslint-disable-line react-hooks/exhaustive-deps
  const railY = useTransform(y, (v) => v - closedY)
  const railOpacity = useTransform(y, [closedY, closedY - 140], [1, 0])
  const scrim = useTransform(y, [closedY, 0], [0, 0.35])

  const pick = (id: string) => { setSelId(id); setOpen(false) }

  return (
    <div className="b-root">
      <FableMap stations={j.stations} pills={list.slice(0, 16)} fuel={j.fuel} origin={j.origin} dark={dark} accent={accent}
        bestId={bestId} selected={selected} onSelect={pick} padBottom={PEEK + 210} />
      <motion.div className="b-scrim" style={{ opacity: scrim }} aria-hidden />
      <GeoToast j={j} />
      <header className="b-top">
        <LocateButton j={j} />
        <FuelSwitch j={j} id="b" />
      </header>

      <motion.div className="b-rail-wrap" style={{ y: railY, opacity: railOpacity, pointerEvents: open ? 'none' : 'auto', bottom: PEEK + 12 }}>
        <motion.div className="b-rail" style={{ x }} drag="x" dragMomentum={false} dragElastic={0.12}
          dragConstraints={{ left: -(cards.length - 1) * PITCH, right: 0 }}
          onDragEnd={(_, info) => {
            const i = clamp(Math.round((-x.get() - info.velocity.x * 0.18) / PITCH), 0, cards.length - 1)
            if (i === activeIdx) animate(x, -i * PITCH, SPRING)
            else setSelId(cards[i].r.s.id)
          }}>
          {cards.map((c, i) => {
            const on = i === activeIdx
            return (
              <motion.article key={c.r.s.id} className="b-card" data-on={on || undefined} data-best={c.r.s.id === bestId || undefined}
                animate={{ scale: on ? 1 : 0.94, opacity: on ? 1 : 0.72 }} transition={SPRING}
                onClick={() => { if (!on) setSelId(c.r.s.id) }}>
                <div className="b-card-sign"><Odometer value={fmtPrice(c.r.price)} /><small>¢/L</small></div>
                <div className="b-card-head">
                  <BrandBadge brand={c.r.s.b} size={40} />
                  <div>
                    {c.tag && <p className="b-tag">{c.tag}</p>}
                    <h2>{stationName(c.r.s)}</h2>
                    <p className="b-where">{stationWhere(c.r.s).split(',')[0]}</p>
                  </div>
                </div>
                <div className="b-card-body">
                  <div className="b-real" data-neg={c.r.real < -0.004 || undefined}>
                    <b>{signedMoney(c.r.real)} $</b>
                    <span>{c.r.isBaseline ? 'c’est la référence' : `d’économie réelle sur ${j.fillL} L`}</span>
                  </div>
                  <a className={`fb-go b-go${c.r.s.id === bestId ? '' : ' quiet'}`} href={goUrl(c.r.s)} target="_blank" rel="noreferrer" tabIndex={on ? 0 : -1} draggable={false}
                    onClick={(e) => { if (!on) e.preventDefault() }}><IconGo />Y aller</a>
                </div>
                <p className="b-foot">
                  {c.better
                    ? <button className="b-better" onClick={(e) => { e.stopPropagation(); setSelId(c.better!.s.id) }}>Meilleure option : {stationName(c.better.s)}, {signedMoney(c.better.real - c.r.real).replace('+', '')} $ de plus <IconChevron /></button>
                    : <>≈ {fmtKm(c.r.km)} km d’ici{c.r.isBaseline ? '' : `, détour de ≈ ${fmtKm(c.r.extraKm)} km compris`}</>}
                </p>
              </motion.article>
            )
          })}
        </motion.div>
      </motion.div>

      <motion.section className="b-sheet" style={{ y, height: sheetH }} drag="y" dragControls={controls} dragListener={false}
        dragConstraints={{ top: 0, bottom: closedY }} dragElastic={0.06} dragMomentum={false}
        onDragEnd={(_, info) => {
          const goOpen = info.velocity.y < -300 ? true : info.velocity.y > 300 ? false : y.get() < closedY / 2
          if (goOpen === open) animate(y, goOpen ? 0 : closedY, SPRING); else setOpen(goOpen)
        }}>
        <div className="b-sheet-head" onPointerDown={(e) => controls.start(e)}>
          <span className="b-handle" aria-hidden />
          <button className="b-sheet-title" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <span><b>{list.length} stations</b> à moins de {j.ranking.radiusKm} km de {j.origin.label}</span>
            <span className="b-sheet-chev" data-open={open || undefined}><IconChevron dir="up" /></span>
          </button>
          <SourceLine className="b-source" />
        </div>
        <ol className="b-list" style={{ overflowY: open ? 'auto' : 'hidden' }} inert={!open}>
          {list.map((r, i) => (
            <li key={r.s.id}>
              <button className="b-row" data-on={r.s.id === activeId || undefined} onClick={() => pick(r.s.id)}>
                <span className="b-row-n">{i + 1}</span>
                <BrandBadge brand={r.s.b} size={34} />
                <span className="b-row-main"><b>{stationName(r.s)}</b><small>{stationWhere(r.s)}, ≈ {fmtKm(r.km)} km</small></span>
                <span className="b-row-real" data-neg={r.real < -0.004 || undefined}>{r.isBaseline ? 'référence' : `${signedMoney(r.real)} $`}</span>
                <span className="fb-pill b-row-pill">{fmtPrice(r.price)}</span>
              </button>
            </li>
          ))}
        </ol>
      </motion.section>
    </div>
  )
}
