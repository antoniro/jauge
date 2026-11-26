// The main screen of the app: the map, the best stations as cards, the full list, and the sheets around them.
// Rules: docs/design/behaviour.md. Look: DESIGN.md.
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Origin, Ranked, Station } from './domain/ranking'
import { around, betterOption, rank } from './domain/ranking'
import { loadHistory } from './data/source'
import './styles/main.css'
import StationMap from './ui/StationMap'
import type { Place } from './domain/format'
import type { Jauge } from './state'
import { cityName, clamp, fmtKm, fmtMoney, fmtPrice, goUrl, placeIndex, signedMoney, stationName, stationWhere } from './domain/format'
import { BrandBadge, FuelSwitch, GeoToast, IconGo, IconLocate, Odometer, Wordmark } from './ui/pieces'
import { IconBack, IconDown, IconGear, IconPinMark, IconSearch, PlacePicker, ReportPrice, Settings, Sheet, StationMore, Welcome } from './ui/sheets'
import { paintRelief } from './ui/relief'

const CARD_W = 326, GAP = 10, PITCH = CARD_W + GAP
const PEEK = 80 // closed handle strip
// The source of the prices, always in view: one short line beside the count (phone) or pinned under the list (wide).
const SRC = 'Prix déclarés par les stations à la Régie'
const SRC_FULL = 'Prix déclarés par les stations à la Régie de l’énergie'
const TOP_H = 108 // the global controls stay visible above the open list
const TOP_N = 12
const LIVE_ROWS = 12 // rows that get rolling digits and sliding; the rest update instantly
const SPRING = { type: 'spring', stiffness: 330, damping: 34 } as const
const STILL = { duration: 0 } as const

const MIN_L = 10, MAX_L = 120, STEP_L = 5

interface CardData { r: Ranked; tag: string | null }

const ic = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
const IconPump = () => (<svg {...ic}><path d="M2.5 14V3.2c0-.7.5-1.2 1.2-1.2h4.1c.7 0 1.2.5 1.2 1.2V14M1.5 14h8.5M4.5 4.5h2.5v2.3H4.5zM9 8h1.4c.6 0 1 .4 1 1v2.2a1.1 1.1 0 0 0 2.2 0V5.6L11.4 3.4" /></svg>)
const IconPin = () => (<svg {...ic}><path d="M8 14.2s4.4-3.9 4.4-7.5a4.4 4.4 0 1 0-8.8 0c0 3.6 4.4 7.5 4.4 7.5Z" /><circle cx="8" cy="6.7" r="1.5" /></svg>)
const IconMinus = () => (<svg {...ic}><path d="M3.5 8h9" /></svg>)
const IconPlus = () => (<svg {...ic}><path d="M3.5 8h9M8 3.5v9" /></svg>)
const IconList = () => (<svg {...ic}><path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" /></svg>)
const IconCheck = () => (<svg {...ic}><path d="m3.2 8.4 3.1 3.1 6.500-7" /></svg>)
const IconClose = () => (<svg {...ic} width={12} height={12}><path d="m4 4 8 8M12 4l-8 8" /></svg>)
const IconMap = () => (<svg {...ic}><path d="M1.8 4.2 6 2.5l4 1.7 4.2-1.7v9.300L10 13.500l-4-1.7-4.2 1.700ZM6 2.5v9.300M10 4.200v9.3" /></svg>)

/** Fill volume as the stepper everybody knows from shopping carts: − 50 L +. */
function LitreStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const set = (_e: React.MouseEvent, d: number) => { onChange(clamp(value + d, MIN_L, MAX_L)) }
  return (
    <span className="b3-step" role="group" aria-label="Litres de ton plein">
      <button onClick={(e) => set(e, -STEP_L)} disabled={value <= MIN_L} aria-label={`${STEP_L} litres de moins`}><IconMinus /></button>
      <span className="b3-step-val" aria-live="polite" aria-label={`${value} litres`}><IconPump /><Odometer value={String(value)} />L</span>
      <button onClick={(e) => set(e, STEP_L)} disabled={value >= MAX_L} aria-label={`${STEP_L} litres de plus`}><IconPlus /></button>
    </span>
  )
}

/** Where the person chose to look, remembered for the next visit. A position is asked again from the device each time. */
type Start = { kind: 'position' } | { kind: 'place'; name: string; lat: number; lon: number }
const START_KEY = 'jauge.start'
const readStart = (): Start | null => { try { return JSON.parse(localStorage.getItem(START_KEY) ?? 'null') } catch { return null } }
const keepStart = (s: Start) => { try { localStorage.setItem(START_KEY, JSON.stringify(s)) } catch { /* private mode */ } }
/** What the map shows before anything is chosen: the St. Lawrence valley, where most stations are. */
const QUEBEC: [number, number, number, number] = [-74.9, 45, -70.8, 47.2]

export default function MainScreen({ j, dark, accent, h, wide }: { j: Jauge; dark: boolean; accent: string; h: number; wide: boolean }) {
  const still = useReducedMotion()
  const spring = still ? STILL : SPRING
  // The reference is the closest station until the person picks one of their own on the map or in the list.
  const [refPick, setRefPick] = useState<string | null>(null)
  const [selId, setSelId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  // the screens around the main one
  const [sheet, setSheet] = useState<'place' | 'settings' | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [away, setAway] = useState<Origin | null>(null)
  const [start] = useState(readStart)
  // first visit: say what Jauge does and ask where to look
  const [welcome, setWelcome] = useState(start == null)
  const endWelcome = () => setWelcome(false)
  const places = useMemo(() => placeIndex(j.stations), [j.stations])
  // A place chosen by hand (no GPS) never pretends to be a position: first an overview of the area,
  // then the station the person taps there becomes the starting point for distances and savings.
  const [area, setArea] = useState<{ name: string; lat: number; lon: number; fit: boolean } | null>(null)
  const [anchored, setAnchored] = useState(false)
  const pending = useRef<string | null>(null)
  const overview = area != null && !anchored
  // Without a position from the device and without a place, nothing is ranked: the app does not guess where the person is.
  const positioned = j.origin.label === 'Ma position'
  const nowhere = !area && !positioned
  const blank = overview || nowhere
  const areaList = useMemo<Station[]>(() => (overview && area ? around(j.stations, area, j.fuel, j.radiusKm ?? 10) : []), [overview, area, j.stations, j.fuel, j.radiusKm])
  const frame = useMemo<[number, number, number, number] | 'keep' | null>(() => {
    if (nowhere) return QUEBEC
    if (!overview || !area) return null
    if (!area.fit) return 'keep'
    const town = j.stations.filter((s) => s.lat > 40 && cityName(s) === area.name)
    const g = town.length ? town : areaList
    if (!g.length) return null
    return [Math.min(...g.map((s) => s.lon)), Math.min(...g.map((s) => s.lat)), Math.max(...g.map((s) => s.lon)), Math.max(...g.map((s) => s.lat))]
  }, [nowhere, overview, area, j.stations, areaList])
  const enterArea = (p: { name: string; lat: number; lon: number }, fit: boolean) => {
    setArea({ name: p.name, lat: p.lat, lon: p.lon, fit }); setAnchored(false)
    keepStart({ kind: 'place', name: p.name, lat: p.lat, lon: p.lon })
    setRefPick(null); setSelId(null); setDetailId(null); setOpen(false); setAway(null)
  }
  const anchorAt = (s: Station) => {
    if (!area) return
    pending.current = s.id; setAnchored(true); setRefPick(s.id); setSelId(s.id)
    j.setOrigin({ lat: s.lat, lon: s.lon, label: area.name })
  }
  const ranking = useMemo(
    () => (refPick ? rank({ stations: j.stations, origin: j.origin, fuel: j.fuel, fillL: j.fillL, consL100: j.consL100, radiusKm: j.radiusKm ?? undefined, refId: refPick }) : j.ranking),
    [refPick, j.stations, j.origin, j.fuel, j.fillL, j.consL100, j.radiusKm, j.ranking])
  const list = ranking.list
  const base = ranking.baseline
  const refId = base?.s.id
  const ownRef = refPick != null && refId === refPick
  const bestId = list[0]?.s.id
  const relief = useMemo(() => paintRelief(390, 340, dark), [dark])

  useEffect(() => { const p = pending.current; pending.current = null; setSelId(p); setRefPick(p); setAway(null) }, [j.origin])
  useEffect(() => { setSelId(null) }, [j.fuel])
  // on arrival, go back to where the person was looking last
  const arrived = useRef(false)
  useEffect(() => {
    if (arrived.current || !j.ready) return
    arrived.current = true
    if (start?.kind === 'place') enterArea(start, true)
    else if (start?.kind === 'position') j.locate().then((ok) => { if (!ok) setSheet('place') })
  }, [j.ready]) // eslint-disable-line react-hooks/exhaustive-deps
  const activeId = selId ?? (ownRef ? refId : bestId) ?? null
  // What the reference card points to: the best fill-up, when it beats the reference by 50 cents or more.
  const better = betterOption(ranking)

  // Cards: the best ranked stations. A reference the person picked goes in front; the default one stays where it ranks.
  const cards = useMemo<CardData[]>(() => {
    const top: CardData[] = list.slice(0, TOP_N).map((r, i) => ({ r, tag: r.isBaseline ? 'Ta référence' : i === 0 ? 'Le meilleur plein' : null }))
    if (!base) return top
    const at = top.findIndex((c) => c.r.isBaseline)
    if (ownRef) { if (at >= 0) top.splice(at, 1); top.unshift({ r: base, tag: 'Ta référence' }) }
    else if (at < 0) top.push({ r: base, tag: 'Ta référence' })
    return top
  }, [list, base, ownRef])
  const activeIdx = Math.max(0, cards.findIndex((c) => c.r.s.id === activeId))
  const selected = blank ? null : cards[activeIdx]?.r.s ?? null

  // Map pills only change when the stations or prices behind them do, so moving the litre ruler does not redraw the map.
  const pillSig = list.slice(0, TOP_N).map((r) => `${r.s.id}:${r.price}`).join('|')
  const rankedPills = useMemo(() => { const p = list.slice(0, TOP_N); const b = list.find((r) => r.isBaseline); return b && !p.includes(b) ? [...p, b] : p }, [pillSig, refId]) // eslint-disable-line react-hooks/exhaustive-deps
  // In the overview nothing is ranked yet: the cheapest few simply get the solid tags.
  const areaPills = useMemo<Ranked[]>(() => areaList.slice(0, 8).map((s) => ({ s, price: s.p[j.fuel]!, km: 0, extraKm: 0, detourCost: 0, priceSaving: 0, real: 0, isBaseline: false })), [areaList, j.fuel])
  const pills = useMemo(() => (nowhere ? [] : overview ? areaPills : rankedPills), [nowhere, overview, areaPills, rankedPills])

  // card rail
  const x = useMotionValue(0)
  const railDraggedAt = useRef(0)
  useEffect(() => { const a = animate(x, -activeIdx * PITCH, spring); return () => a.stop() }, [activeIdx, cards.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // sheet
  const sheetH = h - TOP_H
  const closedY = sheetH - PEEK
  const y = useMotionValue(closedY)
  const controls = useDragControls()
  const first = useRef(true)
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (first.current) { first.current = false; y.set(closedY); return }
    const a = animate(y, open ? 0 : closedY, spring); return () => a.stop()
  }, [open, closedY]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!open) scroller.current?.scrollTo({ top: 0 }) }, [open])
  const railY = useTransform(y, (v) => v - closedY)
  const railOpacity = useTransform(y, [closedY, closedY - 140], [1, 0])
  const scrim = useTransform(y, [closedY, 0], [0, 0.4])

  // A station that already has a card just comes forward. Any other one becomes the reference
  // (and, when the place was picked by hand, the new starting point too).
  const pick = (id: string) => {
    const s = j.stations.find((x) => x.id === id)
    if (!s || s.p[j.fuel] == null || nowhere) return
    setOpen(false)
    if (detailId) setDetailId(id)
    if (area && (overview || !cards.some((c) => c.r.s.id === id))) { anchorAt(s); return }
    if (!cards.some((c) => c.r.s.id === id)) setRefPick(id)
    setSelId(id)
  }
  const dropRef = () => { setRefPick(null); setSelId(null); if (area) { setAnchored(false); setDetailId(null) } }
  const onAway = (p: Origin | null) => setAway((cur) => (p && cur && cur.label === p.label && Math.abs(cur.lat - p.lat) < 1e-4 && Math.abs(cur.lon - p.lon) < 1e-4 ? cur : p))
  // A card unfolds into its station page; it is the selected card that is open, or none.
  const unfolded = !blank && detailId != null && detailId === activeId
  useEffect(() => {
    if (!unfolded) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDetailId(null) }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [unfolded])
  const count = overview
    ? <><b>{areaList.length} stations</b>{' '}<span>autour de {area!.name}</span></>
    : <><b>{list.length} stations</b>{' '}<span>à moins de {ranking.radiusKm} km</span></>
  const [reportId, setReportId] = useState<string | null>(null)
  const reported = reportId ? list.find((r) => r.s.id === reportId) ?? null : null
  const maxReal = Math.max(0.01, list[0]?.real ?? 0)

  const card = (c: CardData, on: boolean) => {
    const isBest = c.r.s.id === bestId
    const lose = !c.r.isBaseline && c.r.real < -0.004
    const amount = c.r.isBaseline ? '0,00' : lose ? fmtMoney(-c.r.real) : signedMoney(c.r.real)
    return (
      <motion.article key={c.r.s.id} className="b-card b3-card" data-on={on || undefined} data-open={(on && unfolded) || undefined} data-best={isBest || undefined} data-ref={c.r.isBaseline || undefined}
        animate={{ scale: on ? 1 : 0.94 }} transition={spring}
        onClick={() => { if (!on && performance.now() - railDraggedAt.current > 250) setSelId(c.r.s.id) }}>
        {c.tag && (
          <p className="b3-ribbon">{c.tag}
            {c.r.isBaseline && ownRef && (
              <button tabIndex={on ? 0 : -1} aria-label="Revenir à la station la plus proche comme référence" onClick={(e) => { if (!on) return; e.stopPropagation(); dropRef() }}><IconClose /></button>
            )}
          </p>
        )}
        {on && bestId && !isBest && !(c.r.isBaseline && ownRef && better) && (
          <button className="b3-back" aria-label="Revenir au meilleur plein"
            onClick={(e) => { e.stopPropagation(); setSelId(bestId); if (detailId) setDetailId(bestId) }}><IconBack />Meilleur plein</button>
        )}
        <div className="b3-head" role="button" tabIndex={on ? 0 : -1} aria-expanded={on && unfolded} aria-label={`${stationName(c.r.s)}, ${stationWhere(c.r.s)}. ${on && unfolded ? 'Replier' : 'Voir les détails'}`}
          onClick={(e) => { if (!on || performance.now() - railDraggedAt.current < 250) return; e.stopPropagation(); setDetailId(unfolded ? null : c.r.s.id) }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailId(unfolded ? null : c.r.s.id) } }}>
          <BrandBadge brand={c.r.s.b} size={38} />
          <div>
            <h2>{stationName(c.r.s)}</h2>
            <p className="b-where">{stationWhere(c.r.s)}</p>
          </div>
          <span className="x-chev" aria-hidden><IconDown /></span>
        </div>
        <div className="b3-nums">
          <div className="b2-real" data-neg={lose || c.r.isBaseline || undefined} data-long={amount.length > 5 || undefined}>
            <b><Odometer value={`${amount} $`} /></b>
            <p>{lose ? 'plus cher' : 'd’économie'}</p>
          </div>
          <span className="fb-pill b3-price"><Odometer value={fmtPrice(c.r.price)} /><small>¢/L</small></span>
        </div>
        {!base ? null : !c.r.isBaseline ? (
          <button className="b3-strip" tabIndex={on ? 0 : -1} aria-label={`Comparée à ta référence : ${stationName(base.s)}, ${fmtPrice(base.price)} cents le litre. La voir`}
            onClick={(e) => { if (!on) return; e.stopPropagation(); setSelId(base.s.id) }}>
            <i>vs</i>
            <BrandBadge brand={base.s.b} size={22} />
            <span><b>{stationName(base.s)}</b></span>
            <em>{fmtPrice(base.price)}</em>
          </button>
        ) : !ownRef ? (
          <p className="b3-strip"><IconPin /><span><b>La plus proche de toi</b></span></p>
        ) : better ? (
          <button className="b3-strip b3-better" tabIndex={on ? 0 : -1} aria-label={`Meilleure option : ${stationName(better.s)}, ${signedMoney(better.real)} dollars. La voir`}
            onClick={(e) => { if (!on) return; e.stopPropagation(); setSelId(better.s.id) }}>
            <BrandBadge brand={better.s.b} size={22} />
            <span><b>{stationName(better.s)}</b><small>meilleure option</small></span>
            <em>{signedMoney(better.real)} $</em>
          </button>
        ) : (
          <p className="b3-strip"><IconCheck /><span><b>Rien de mieux autour</b></span></p>
        )}
        <div className="x-more" inert={!(on && unfolded)}>
          <div className="x-more-clip">
            {on && (
              <div className="x-more-in" data-own-keys>
                <StationMore j={j} r={c.r} base={base} ownRef={ownRef} onMakeRef={() => { setRefPick(c.r.s.id); setSelId(c.r.s.id) }} onDropRef={dropRef} onReport={() => setReportId(c.r.s.id)} history={loadHistory} />
              </div>
            )}
          </div>
        </div>
        <a className={`fb-go b3-go${isBest ? '' : ' quiet'}`} href={goUrl(c.r.s)} target="_blank" rel="noreferrer" tabIndex={on ? 0 : -1} draggable={false}
          onClick={(e) => { if (!on) e.preventDefault(); e.stopPropagation() }}><span><IconGo />Y aller</span>{c.r.km >= 0.05 && <small>≈ {fmtKm(c.r.km)} km</small>}</a>
      </motion.article>
    )
  }

  const row = (r: Ranked, i: number) => {
    const liveRow = i < LIVE_ROWS
    const neg = r.real < -0.004
    const amount = `${r.isBaseline ? '0,00' : signedMoney(r.real)} $`
    const where = stationWhere(r.s)
    const city = where.includes(',') ? where.slice(where.lastIndexOf(',') + 1).trim() : where
    return (
      <motion.li key={r.s.id} layout={liveRow ? 'position' : false} transition={spring}>
        <button className="b2-row" data-on={r.s.id === activeId || undefined} data-best={i === 0 || undefined} data-ref={r.isBaseline || undefined} onClick={() => { if (r.s.id === activeId) setDetailId(r.s.id); else pick(r.s.id) }}
          aria-label={`${i + 1}. ${stationName(r.s)}, ${fmtPrice(r.price)} cents le litre, économie réelle ${amount}. Voir sur la carte`}>
          <span className="b2-row-n">{i + 1}</span>
          <BrandBadge brand={r.s.b} size={46} />
          <span className="b2-row-main">
            <b>{stationName(r.s)}</b>
            <small>{r.km >= 0.05 && <><span>≈ {fmtKm(r.km)} km</span><i /></>}{r.isBaseline && !ownRef ? 'la plus proche' : city}</small>
          </span>
          <span className="fb-pill b2-row-pill">{fmtPrice(r.price)}<small>¢/L</small></span>
          <span className="b2-bar"><i style={{ transform: `scaleX(${clamp(r.real / maxReal, 0, 1)})` }} /></span>
          {r.isBaseline ? <span className="b3-ref-tag">Référence</span> : <span className="b2-row-real" data-neg={neg || undefined}>{liveRow ? <Odometer value={amount} /> : amount}</span>}
        </button>
      </motion.li>
    )
  }

  const areaRow = (s: Station, i: number) => (
    <li key={s.id}>
      <button className="b2-row x-plain" data-best={i === 0 || undefined} onClick={() => pick(s.id)}
        aria-label={`${stationName(s)}, ${stationWhere(s)}, ${fmtPrice(s.p[j.fuel]!)} cents le litre. Partir de cette station`}>
        <span className="b2-row-n">{i + 1}</span>
        <BrandBadge brand={s.b} size={46} />
        <span className="b2-row-main"><b>{stationName(s)}</b><small>{stationWhere(s)}</small></span>
        <span className="fb-pill b2-row-pill">{fmtPrice(s.p[j.fuel]!)}<small>¢/L</small></span>
      </button>
    </li>
  )
  const rows = nowhere ? [] : overview ? areaList.map(areaRow) : list.map(row)
  const label = area ? area.name : positioned ? j.origin.label : 'Où ?'

  const goToMyPosition = async () => {
    if (await j.locate()) { keepStart({ kind: 'position' }); setArea(null); setAnchored(false); setSheet(null); endWelcome() }
    else setSheet('place')
  }

  const whereChip = (
    <button className="fb-locate x-where" onClick={() => setSheet('place')} aria-label={`Tu regardes autour de : ${label}. Changer d’endroit`}>
      <span className={j.locating ? 'fb-spin' : ''}>{label === 'Ma position' ? <IconLocate /> : <IconPinMark />}</span>
      <span>{label}</span>
      <IconDown />
    </button>
  )
  const gear = <button className="x-gear" onClick={() => setSheet('settings')} aria-label="Réglages"><IconGear /></button>
  const hereButton = (
    <AnimatePresence>
      {away && !blank && !open && !welcome && (
        <motion.button key="here" className="x-here" initial={{ opacity: 0, y: -10, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -10, x: '-50%' }} transition={spring}
          onClick={() => enterArea({ name: away.label, lat: away.lat, lon: away.lon }, false)} aria-label={`Chercher les stations autour de ${away.label}`}>
          <IconSearch />Chercher ici
        </motion.button>
      )}
    </AnimatePresence>
  )
  // sheets and the first-open screen, shared by the phone and the wide layout
  const overlays = (
    <>
      <AnimatePresence>
        {welcome && (
          <Welcome key="welcome" j={j} dark={dark} wide={wide} onChoose={() => setSheet('place')}
            onNear={goToMyPosition} />
        )}
      </AnimatePresence>
      <Sheet open={sheet === 'place'} onClose={() => setSheet(null)} wide={wide} label="Choisir un endroit">
        <PlacePicker j={j} places={places}
          onPlace={(p: Place) => { enterArea(p, true); setSheet(null); if (welcome) endWelcome() }}
          onMine={goToMyPosition} />
      </Sheet>
      <Sheet open={sheet === 'settings'} onClose={() => setSheet(null)} wide={wide} label="Réglages">
        <Settings j={j} />
      </Sheet>
      <Sheet open={reported != null} onClose={() => setReportId(null)} wide={wide} label="Signaler un prix inexact">
        {reported && <ReportPrice j={j} r={reported} />}
      </Sheet>
    </>
  )

  if (wide) {
    return (
      <div className="b-root b2-root b3-root x-wide">
        <StationMap stations={j.stations} pills={pills} fuel={j.fuel} origin={j.origin} dark={dark} accent={accent}
          bestId={nowhere ? undefined : overview ? areaPills[0]?.s.id : bestId} refId={blank ? undefined : refId} selected={selected} onSelect={pick} padBottom={blank || unfolded ? 40 : 250} padTop={90}
          padLeft={sheet || reported ? 900 : unfolded ? 444 + 360 + 48 : 484} allPrices onAway={blank ? undefined : onAway} showMe={positioned && !area} frame={frame} />
        <GeoToast j={j} />
        <aside className="x-side" aria-label="Stations">
          <div className="x-side-top">
            <div><Wordmark /><span style={{ flex: 1 }} />{whereChip}{gear}</div>
            <div><FuelSwitch j={j} id="b3w" /><LitreStepper value={j.fillL} onChange={j.setFillL} /></div>
            {!nowhere && <p className="x-side-count">{count}</p>}
          </div>
          <div className="x-side-list">
            <ol className="b2-list">{rows}</ol>
          </div>
          <p className="x-side-foot">{SRC_FULL}</p>
        </aside>
        {!blank && cards[activeIdx] && <div className="x-card-dock" style={{ ['--more-max' as string]: `${h - 28 - 232 - 36}px` }}>{card(cards[activeIdx], true)}</div>}
        {hereButton}
        {overlays}
      </div>
    )
  }

  return (
    <div className="b-root b2-root b3-root">
      <StationMap stations={j.stations} pills={pills} fuel={j.fuel} origin={j.origin} dark={dark} accent={accent}
        bestId={nowhere ? undefined : overview ? areaPills[0]?.s.id : bestId} refId={blank ? undefined : refId} selected={selected} onSelect={pick} padBottom={nowhere ? 0 : overview ? PEEK : PEEK + 238} padTop={128}
        allPrices onAway={blank ? undefined : onAway} showMe={positioned && !area} frame={frame} />
      <motion.div className="b-scrim" style={{ opacity: scrim }} aria-hidden />
      <GeoToast j={j} />
      <header className="b-top b3-top">
        <div className="x-left">{whereChip}{gear}</div>
        <div className="b3-pump">
          <FuelSwitch j={j} id="b3" />
          <LitreStepper value={j.fillL} onChange={j.setFillL} />
        </div>
      </header>
      {hereButton}

      <AnimatePresence>
        {unfolded && <motion.div key="dim" className="x-dim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: still ? 0 : 0.25 }} onClick={() => setDetailId(null)} aria-hidden />}
      </AnimatePresence>
      {!blank && <motion.div className="b-rail-wrap" data-unfolded={unfolded || undefined}
        style={{ y: railY, opacity: railOpacity, pointerEvents: open ? 'none' : 'auto', bottom: PEEK + 12, ['--more-max' as string]: `${h - PEEK - 12 - 232 - 30}px` }} inert={open}>
        <motion.div className="b-rail" style={{ x }} drag={unfolded ? false : 'x'} dragMomentum={false} dragElastic={0.12}
          dragConstraints={{ left: -(cards.length - 1) * PITCH, right: 0 }}
          onDragEnd={(_, info) => {
            railDraggedAt.current = performance.now()
            const i = clamp(Math.round((-x.get() - info.velocity.x * 0.18) / PITCH), 0, cards.length - 1)
            if (i === activeIdx) animate(x, -i * PITCH, spring)
            else setSelId(cards[i].r.s.id)
          }}>
          {cards.map((c, i) => card(c, i === activeIdx))}
        </motion.div>
        <div className="b3-dots" aria-hidden>{cards.map((c, i) => <i key={c.r.s.id} data-on={i === activeIdx || undefined} data-best={c.r.s.id === bestId || undefined} />)}</div>
      </motion.div>}

      {!nowhere && <motion.section className="b-sheet b2-sheet" data-open={open || undefined} aria-label="Liste des stations"
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
            <div className="x-count"><p>{count}</p><p className="x-src">{SRC}</p></div>
            <button className="b3-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? <><IconMap />Carte</> : <><IconList />Liste</>}
            </button>
          </div>
        </div>

        <motion.div className="b2-scroll" ref={scroller} layoutScroll style={{ overflowY: open ? 'auto' : 'hidden' }} inert={!open}
          onScroll={(e) => { const s = e.currentTarget.scrollTop > 8; if (s !== scrolled) setScrolled(s) }}>
          <ol className="b2-list">{rows}</ol>
        </motion.div>
      </motion.section>}
      {overlays}
    </div>
  )
}
