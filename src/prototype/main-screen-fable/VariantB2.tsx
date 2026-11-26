// PROTOTYPE — throwaway. Variant B2, "La carte, v2": B plus a roomy list with a relief cover and a labelled litre ruler.
import { animate, motion, useDragControls, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Ranked } from '../main-screen/data'
import { betterOption } from '../main-screen/data'
import './b.css'
import './b2.css'
import FableMap from './FableMap'
import type { VariantProps } from './shared'
import { BrandBadge, CONS_L100, FuelSwitch, GeoToast, IconChevron, IconGo, LocateButton, Odometer, SourceLine, clamp, fmtKm, fmtPrice, goUrl, signedMoney, stationName, stationWhere } from './shared'
import { paintRelief } from './topo'

const CARD_W = 304, GAP = 10, PITCH = CARD_W + GAP
const PEEK = 104 // closed handle strip
const HEAD_OPEN = 68
const TOP_N = 12
const LIVE_ROWS = 12 // rows that get rolling digits and sliding; the rest update instantly
const SPRING = { type: 'spring', stiffness: 330, damping: 34 } as const
const STILL = { duration: 0 } as const

const LITRES = Array.from({ length: 23 }, (_, i) => 10 + i * 5) // 10 … 120 L
const CELL = 58

interface CardData { r: Ranked; tag: string | null; better: Ranked | null; rank: number | null }

const IconSlide = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M1.5 6h15M5 2.5 1.5 6 5 9.5M13 2.5 16.5 6 13 9.5" />
  </svg>
)
const IconPencil = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8.2 1.8 10.2 3.8 4 10l-2.5.5L2 8l6.2-6.2Z" />
  </svg>
)

/** Fill volume as a ruler: drag it, tap a number, or use −5 / +5. Snaps every 5 L. */
function LitreRuler({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const still = useReducedMotion()
  const win = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(250)
  const idx = Math.max(0, LITRES.indexOf(value))
  const xFor = (i: number) => w / 2 - CELL / 2 - i * CELL
  const x = useMotionValue(xFor(idx))
  const [live, setLive] = useState(idx)
  const liveRef = useRef(idx)
  const dragging = useRef(false)
  const draggedAt = useRef(0)
  const last = LITRES.length - 1

  useEffect(() => {
    const el = win.current; if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    if (dragging.current) return
    const a = animate(x, xFor(idx), still ? STILL : { type: 'spring', stiffness: 420, damping: 38 }); return () => a.stop()
  }, [idx, w]) // eslint-disable-line react-hooks/exhaustive-deps

  useMotionValueEvent(x, 'change', (v) => {
    const i = clamp(Math.round((w / 2 - CELL / 2 - v) / CELL), 0, last)
    if (i === liveRef.current) return
    liveRef.current = i; setLive(i)
    if (dragging.current) onChange(LITRES[i]) // the amounts follow the finger
  })
  const go = (i: number) => onChange(LITRES[clamp(i, 0, last)])

  return (
    <div className="b2-ruler" role="slider" tabIndex={0} data-own-keys aria-label="Litres que tu comptes mettre" aria-orientation="horizontal"
      aria-valuemin={LITRES[0]} aria-valuemax={LITRES[last]} aria-valuenow={value} aria-valuetext={`${value} litres`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); go(idx - 1) }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); go(idx + 1) }
      }}>
      <button className="b2-step" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="5 litres de moins" tabIndex={-1}>−5</button>
      <div className="b2-ruler-win" ref={win}>
        <span className="b2-lens" aria-hidden><small>litres</small></span>
        <motion.div className="b2-ruler-row" style={{ x }} drag="x" dragMomentum={false} dragElastic={0.12}
          dragConstraints={{ left: xFor(last), right: xFor(0) }}
          onDragStart={() => { dragging.current = true }}
          onDragEnd={(_, info) => {
            dragging.current = false; draggedAt.current = performance.now()
            const i = clamp(Math.round((w / 2 - CELL / 2 - x.get() - info.velocity.x * 0.12) / CELL), 0, last)
            animate(x, xFor(i), still ? STILL : { type: 'spring', stiffness: 420, damping: 38 })
            onChange(LITRES[i])
          }}>
          {LITRES.map((n, i) => (
            <button key={n} className="b2-lit" data-on={i === live || undefined} data-near={Math.abs(i - live) === 1 || undefined} tabIndex={-1} aria-hidden
              onClick={() => { if (performance.now() - draggedAt.current > 250) go(i) }}>{n}</button>
          ))}
        </motion.div>
      </div>
      <button className="b2-step" onClick={() => go(idx + 1)} disabled={idx === last} aria-label="5 litres de plus" tabIndex={-1}>+5</button>
    </div>
  )
}

const TITLE: ['thin' | 'bold', string][] = [['thin', 'Le plein'], ['bold', 'le moins cher'], ['thin', 'autour de']]

export default function VariantB2({ j, dark, accent, h }: VariantProps) {
  const still = useReducedMotion()
  const spring = still ? STILL : SPRING
  const list = j.ranking.list
  const bestId = j.best?.s.id
  const [selId, setSelId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [hint, setHint] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [flash, setFlash] = useState(0)
  const inp = useMemo(() => ({ stations: j.stations, origin: j.origin, fuel: j.fuel, fillL: j.fillL, consL100: CONS_L100 }), [j.stations, j.origin, j.fuel, j.fillL])
  const relief = useMemo(() => paintRelief(390, 340, dark), [dark])

  useEffect(() => { setSelId(null) }, [j.fuel, j.origin])
  const activeId = selId ?? bestId ?? null

  // Cards: the best ranked stations, plus the Selected station in front when the person picked one outside that set.
  const cards = useMemo<CardData[]>(() => {
    const top: CardData[] = list.slice(0, TOP_N).map((r, i) => ({ r, rank: i + 1, better: null, tag: i === 0 ? 'Le meilleur plein' : r.isBaseline ? 'La plus proche de toi' : null }))
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

  // Map pills only change when the stations or prices behind them do, so moving the litre ruler does not redraw the map.
  const pillSig = list.slice(0, 16).map((r) => `${r.s.id}:${r.price}`).join('|')
  const pills = useMemo(() => list.slice(0, 16), [pillSig]) // eslint-disable-line react-hooks/exhaustive-deps

  // card rail
  const x = useMotionValue(0)
  const railDraggedAt = useRef(0)
  useEffect(() => { const a = animate(x, -activeIdx * PITCH, spring); return () => a.stop() }, [activeIdx, cards.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // sheet
  const sheetH = h - 62
  const closedY = sheetH - PEEK
  const y = useMotionValue(closedY)
  const controls = useDragControls()
  const first = useRef(true)
  const scroller = useRef<HTMLDivElement>(null)
  const litres = useRef<HTMLElement>(null)
  useEffect(() => {
    if (first.current) { first.current = false; y.set(closedY); return }
    const a = animate(y, open ? 0 : closedY, spring); return () => a.stop()
  }, [open, closedY]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!open) scroller.current?.scrollTo({ top: 0 }) }, [open])
  const railY = useTransform(y, (v) => v - closedY)
  const railOpacity = useTransform(y, [closedY, closedY - 140], [1, 0])
  const scrim = useTransform(y, [closedY, 0], [0, 0.4])

  const pick = (id: string) => { setSelId(id); setOpen(false); setHint(false) }
  const openLitres = () => {
    setOpen(true); setFlash((n) => n + 1)
    setTimeout(() => {
      const sc = scroller.current, el = litres.current
      if (sc && el) sc.scrollTo({ top: el.offsetTop - HEAD_OPEN - 6, behavior: still ? 'auto' : 'smooth' })
    }, still ? 0 : 320)
  }

  const maxReal = Math.max(0.01, list[0]?.real ?? 0)
  const place = j.origin.label.replace(/^./, (c) => c.toUpperCase())

  return (
    <div className="b-root b2-root">
      <FableMap stations={j.stations} pills={pills} fuel={j.fuel} origin={j.origin} dark={dark} accent={accent}
        bestId={bestId} selected={selected} onSelect={pick} padBottom={PEEK + 270} />
      <motion.div className="b-scrim" style={{ opacity: scrim }} aria-hidden />
      <GeoToast j={j} />
      <header className="b-top">
        <LocateButton j={j} />
        <FuelSwitch j={j} id="b2" />
      </header>

      <motion.div className="b-rail-wrap" style={{ y: railY, opacity: railOpacity, pointerEvents: open ? 'none' : 'auto', bottom: PEEK + 12 }} inert={open}>
        {hint && <p className="b2-hint"><IconSlide />Glisse les cartes ou touche un prix sur la carte</p>}
        <motion.div className="b-rail" style={{ x }} drag="x" dragMomentum={false} dragElastic={0.12}
          dragConstraints={{ left: -(cards.length - 1) * PITCH, right: 0 }}
          onDragEnd={(_, info) => {
            railDraggedAt.current = performance.now(); setHint(false)
            const i = clamp(Math.round((-x.get() - info.velocity.x * 0.18) / PITCH), 0, cards.length - 1)
            if (i === activeIdx) animate(x, -i * PITCH, spring)
            else setSelId(cards[i].r.s.id)
          }}>
          {cards.map((c, i) => {
            const on = i === activeIdx
            const isBest = c.r.s.id === bestId
            return (
              <motion.article key={c.r.s.id} className="b-card b2-card" data-on={on || undefined} data-best={isBest || undefined}
                animate={{ scale: on ? 1 : 0.94, opacity: on ? 1 : 0.72 }} transition={spring}
                onClick={() => { if (!on && performance.now() - railDraggedAt.current > 250) { setSelId(c.r.s.id); setHint(false) } }}>
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
                  <div className="b2-real" data-neg={c.r.real < -0.004 || undefined}>
                    <b><Odometer value={`${signedMoney(c.r.real)} $`} /></b>
                    <p>{c.r.isBaseline ? 'c’est la plus proche : on compare' : 'd’économie réelle'}</p>
                    <p>
                      {c.r.isBaseline ? 'les autres à elle, pour ' : 'sur ton plein de '}
                      <button className="b2-fill" tabIndex={on ? 0 : -1} aria-label={`${j.fillL} litres. Changer le nombre de litres`}
                        onClick={(e) => { e.stopPropagation(); if (on) openLitres() }}>{j.fillL} L<IconPencil /></button>
                    </p>
                  </div>
                  <a className={`fb-go b-go${isBest ? '' : ' quiet'}`} href={goUrl(c.r.s)} target="_blank" rel="noreferrer" tabIndex={on ? 0 : -1} draggable={false}
                    onClick={(e) => { if (!on) e.preventDefault() }}><IconGo />Y aller</a>
                </div>
                <p className="b-foot">
                  {c.better
                    ? <button className="b-better" tabIndex={on ? 0 : -1} onClick={(e) => { e.stopPropagation(); setSelId(c.better!.s.id) }}>Meilleure option : {stationName(c.better.s)}, {signedMoney(c.better.real - c.r.real).replace('+', '')} $ de plus <IconChevron /></button>
                    : <>≈ {fmtKm(c.r.km)} km d’ici{c.r.isBaseline ? '' : `, détour de ≈ ${fmtKm(c.r.extraKm)} km compris`}</>}
                </p>
              </motion.article>
            )
          })}
        </motion.div>
      </motion.div>

      <motion.section className="b-sheet b2-sheet" data-open={open || undefined} aria-label="Liste des stations"
        style={{ y, height: sheetH, ['--relief' as string]: `url(${relief})` }}
        drag="y" dragControls={controls} dragListener={false}
        dragConstraints={{ top: 0, bottom: closedY }} dragElastic={0.06} dragMomentum={false}
        onDragEnd={(_, info) => {
          const goOpen = info.velocity.y < -300 ? true : info.velocity.y > 300 ? false : y.get() < closedY / 2
          if (goOpen === open) animate(y, goOpen ? 0 : closedY, spring); else setOpen(goOpen)
        }}>
        <div className="b2-head" data-scrolled={(open && scrolled) || undefined} onPointerDown={(e) => controls.start(e)}>
          <span className="b-handle" aria-hidden />
          <div className="b2-head-row">
            <p><b>{list.length} stations</b><span>à moins de {j.ranking.radiusKm} km de {j.origin.label}</span></p>
            <button className="b2-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? 'Retour à la carte' : 'Voir la liste'}
              <span className="b2-toggle-chev"><IconChevron dir="up" /></span>
            </button>
          </div>
          <SourceLine className="b2-source" />
        </div>

        <motion.div className="b2-scroll" ref={scroller} layoutScroll style={{ overflowY: open ? 'auto' : 'hidden' }} inert={!open}
          onScroll={(e) => { const s = e.currentTarget.scrollTop > 8; if (s !== scrolled) setScrolled(s) }}>
          <div className="b2-cover">
            <motion.h1 className="b2-title" initial={false} animate={open ? 'show' : 'hide'}
              variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } }, hide: {} }}>
              {[...TITLE, ['bold', place] as const].map(([wgt, t]) => (
                <span key={t} className="b2-title-clip">
                  <motion.span className={wgt} variants={{ hide: { y: '105%' }, show: { y: '0%', transition: spring } }}>{t}</motion.span>
                </span>
              ))}
            </motion.h1>
          </div>

          <section className="b2-litres" ref={litres} key={flash} data-flash={flash > 0 || undefined}>
            <h2>Combien de litres comptes-tu mettre ?</h2>
            <p>On s’en sert pour calculer ton économie.</p>
            <LitreRuler value={j.fillL} onChange={j.setFillL} />
            <p className="b2-litres-how"><IconSlide />Glisse la règle ou touche un nombre</p>
          </section>

          <section className="b2-legend">
            <h2>Classées par économie réelle</h2>
            <p>
              Le rabais sur ton plein de <b>{j.fillL} L</b>, moins le coût du détour, par rapport à la station la plus proche de toi.
              Touche une station pour la voir sur la carte.
            </p>
          </section>

          <ol className="b2-list">
            {list.map((r, i) => {
              const liveRow = i < LIVE_ROWS
              const neg = r.real < -0.004
              const amount = `${r.isBaseline ? '0,00' : signedMoney(r.real)} $`
              const where = stationWhere(r.s)
              const city = where.includes(',') ? where.slice(where.lastIndexOf(',') + 1).trim() : where
              return (
                <motion.li key={r.s.id} layout={liveRow ? 'position' : false} transition={spring}>
                  <button className="b2-row" data-on={r.s.id === activeId || undefined} data-best={i === 0 || undefined} onClick={() => pick(r.s.id)}
                    aria-label={`${i + 1}. ${stationName(r.s)}, ${fmtPrice(r.price)} cents le litre, économie réelle ${amount}. Voir sur la carte`}>
                    <span className="b2-row-n">{i + 1}</span>
                    <BrandBadge brand={r.s.b} size={46} />
                    <span className="b2-row-main">
                      <b>{stationName(r.s)}</b>
                      <small><span>≈ {fmtKm(r.km)} km</span><i />{r.isBaseline ? 'la plus proche de toi' : city}</small>
                    </span>
                    <span className="fb-pill b2-row-pill">{fmtPrice(r.price)}<small>¢/L</small></span>
                    <span className="b2-bar"><i style={{ transform: `scaleX(${clamp(r.real / maxReal, 0, 1)})` }} /></span>
                    <span className="b2-row-real" data-neg={neg || r.isBaseline || undefined}>{liveRow ? <Odometer value={amount} /> : amount}</span>
                  </button>
                </motion.li>
              )
            })}
          </ol>
          <SourceLine className="b2-list-source" />
        </motion.div>
      </motion.section>
    </div>
  )
}
