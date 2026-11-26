// The main screen's state: where the person is looking, which station is selected and which one is the reference,
// what is unfolded or open, and everything that follows from it. Rules: docs/design/behaviour.md.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Place } from './domain/format'
import { cityName, placeIndex } from './domain/format'
import type { Origin, Ranked, Station } from './domain/ranking'
import { around, betterOption, rank } from './domain/ranking'
import type { Jauge } from './state'
import type { CardData } from './ui/StationCard'

/** How many of the best stations get a card, and a solid sign on the map. */
const TOP_N = 12

/** Where the person chose to look, remembered for the next visit. A position is asked again from the device each time. */
type Start = { kind: 'position' } | { kind: 'place'; name: string; lat: number; lon: number }
const START_KEY = 'jauge.start'
const readStart = (): Start | null => { try { return JSON.parse(localStorage.getItem(START_KEY) ?? 'null') } catch { return null } }
const keepStart = (s: Start) => { try { localStorage.setItem(START_KEY, JSON.stringify(s)) } catch { /* private mode */ } }
/** What the map shows before anything is chosen: the St. Lawrence valley, where most stations are. */
const QUEBEC: [number, number, number, number] = [-74.9, 45, -70.8, 47.2]

export function useMainScreen(j: Jauge) {
  // The reference is the closest station until the person picks one of their own on the map or in the list.
  const [refPick, setRefPick] = useState<string | null>(null)
  const [selId, setSelId] = useState<string | null>(null)
  // the list (phone) is open over the map
  const [open, setOpen] = useState(false)
  // the screens around the main one
  const [sheet, setSheet] = useState<'place' | 'settings' | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
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

  // Map pills only change when the stations or prices behind them do, so changing the litres does not redraw the map.
  const pillSig = list.slice(0, TOP_N).map((r) => `${r.s.id}:${r.price}`).join('|')
  const rankedPills = useMemo(() => { const p = list.slice(0, TOP_N); const b = list.find((r) => r.isBaseline); return b && !p.includes(b) ? [...p, b] : p }, [pillSig, refId]) // eslint-disable-line react-hooks/exhaustive-deps
  // In the overview nothing is ranked yet: the cheapest few simply get the solid tags.
  const areaPills = useMemo<Ranked[]>(() => areaList.slice(0, 8).map((s) => ({ s, price: s.p[j.fuel]!, km: 0, extraKm: 0, detourCost: 0, priceSaving: 0, real: 0, isBaseline: false })), [areaList, j.fuel])
  const pills = useMemo(() => (nowhere ? [] : overview ? areaPills : rankedPills), [nowhere, overview, areaPills, rankedPills])
  /** The station drawn as the best on the map: the best fill-up, or in an overview the cheapest. */
  const mapBestId = nowhere ? undefined : overview ? areaPills[0]?.s.id : bestId

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
  const makeRef = (id: string) => { setRefPick(id); setSelId(id) }
  const backToBest = () => { if (!bestId) return; setSelId(bestId); if (detailId) setDetailId(bestId) }
  const onAway = (p: Origin | null) => setAway((cur) => (p && cur && cur.label === p.label && Math.abs(cur.lat - p.lat) < 1e-4 && Math.abs(cur.lon - p.lon) < 1e-4 ? cur : p))
  const searchHere = () => { if (away) enterArea({ name: away.label, lat: away.lat, lon: away.lon }, false) }
  // A card unfolds into its station page; it is the selected card that is open, or none.
  const unfolded = !blank && detailId != null && detailId === activeId
  useEffect(() => {
    if (!unfolded) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDetailId(null) }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [unfolded])
  const reported = reportId ? list.find((r) => r.s.id === reportId) ?? null : null
  const label = area ? area.name : positioned ? j.origin.label : 'Où ?'

  const goToMyPosition = async () => {
    if (await j.locate()) { keepStart({ kind: 'position' }); setArea(null); setAnchored(false); setSheet(null); endWelcome() }
    else setSheet('place')
  }
  const choosePlace = (p: Place) => { enterArea(p, true); setSheet(null); if (welcome) endWelcome() }

  return {
    // where the person is looking
    area, overview, positioned, nowhere, blank, frame, label, places, away, welcome,
    // what is ranked, and what is shown of it
    ranking, list, areaList, base, refId, ownRef, bestId, better, cards, activeId, activeIdx, selected, pills, mapBestId,
    // what is open
    open, sheet, unfolded, reported,
    // what the person can do
    setOpen, setSheet, select: setSelId, unfold: setDetailId, report: setReportId,
    pick, makeRef, dropRef, backToBest, onAway, searchHere, choosePlace, goToMyPosition,
  }
}
