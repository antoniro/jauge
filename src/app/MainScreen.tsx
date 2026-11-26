// The main screen of the app: the map, the best stations as cards, the full list, and the sheets around them.
// Its state lives in useMainScreen; this file lays it out, on a phone or on a wide screen.
// Rules: docs/design/behaviour.md. Look: DESIGN.md.
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useMemo } from 'react'
import type { Jauge } from './state'
import './styles/controls.css'
import './styles/map.css'
import './styles/card.css'
import './styles/chart.css'
import './styles/list.css'
import './styles/sheets.css'
import './styles/welcome.css'
import './styles/settings.css'
import './styles/wide.css'
import { useMainScreen } from './useMainScreen'
import { CardRail } from './ui/CardRail'
import { ListSheet } from './ui/ListSheet'
import { GeoToast } from './ui/pieces'
import { PlaceSearch } from './ui/PlaceSearch'
import { paintRelief } from './ui/relief'
import { ReportPrice } from './ui/ReportPrice'
import { SearchHere } from './ui/SearchHere'
import { Settings } from './ui/Settings'
import { Sheet } from './ui/Sheet'
import { SidePanel } from './ui/SidePanel'
import type { CardProps } from './ui/StationCard'
import { StationCard } from './ui/StationCard'
import { StationList } from './ui/StationList'
import StationMap from './ui/StationMap'
import { TopControls } from './ui/TopControls'
import { Welcome } from './ui/Welcome'

const PEEK = 80 // the list's head: all that shows of it when closed
const TOP_H = 108 // the global controls stay visible above the open list

export default function MainScreen({ j, dark, accent, h, wide }: { j: Jauge; dark: boolean; accent: string; h: number; wide: boolean }) {
  const s = useMainScreen(j)
  const still = useReducedMotion()
  const relief = useMemo(() => paintRelief(390, 340, dark), [dark])

  // phone: where the list sheet sits; the cards and the darkening of the map follow it
  const sheetH = h - TOP_H
  const closedY = sheetH - PEEK
  const listY = useMotionValue(closedY)
  const scrim = useTransform(listY, [closedY, 0], [0, 0.4])

  const count = s.overview
    ? <><b>{s.areaList.length} stations</b>{' '}<span>autour de {s.area!.name}</span></>
    : <><b>{s.list.length} stations</b>{' '}<span>à moins de {s.ranking.radiusKm} km</span></>
  const stationList = (
    <StationList fuel={j.fuel} nowhere={s.nowhere} overview={s.overview} list={s.list} areaList={s.areaList} activeId={s.activeId} ownRef={s.ownRef}
      onPick={s.pick} onUnfold={s.unfold} />
  )
  const card: CardProps = {
    j, unfolded: s.unfolded, bestId: s.bestId, base: s.base, ownRef: s.ownRef, better: s.better,
    onSelect: s.select, onUnfold: s.unfold, onBackToBest: s.backToBest, onMakeRef: s.makeRef, onDropRef: s.dropRef, onReport: s.report,
  }
  const mapProps = {
    stations: j.stations, pills: s.pills, fuel: j.fuel, origin: j.origin, dark, accent, bestId: s.mapBestId, refId: s.blank ? undefined : s.refId,
    selected: s.selected, onSelect: s.pick, allPrices: true, onAway: s.blank ? undefined : s.onAway, showMe: s.positioned && !s.area, frame: s.frame,
  }
  const openPlace = () => s.setSheet('place')
  const openSettings = () => s.setSheet('settings')
  const searchHere = <SearchHere away={s.away} show={!s.blank && !s.open && !s.welcome} onSearch={s.searchHere} />
  // the first-open screen and the sheets, the same on a phone and on a wide screen
  const overlays = (
    <>
      <AnimatePresence>
        {s.welcome && <Welcome key="welcome" j={j} dark={dark} wide={wide} onChoose={openPlace} onNear={s.goToMyPosition} />}
      </AnimatePresence>
      <Sheet open={s.sheet === 'place'} onClose={() => s.setSheet(null)} wide={wide} label="Choisir un endroit">
        <PlaceSearch j={j} places={s.places} onPlace={s.choosePlace} onMine={s.goToMyPosition} />
      </Sheet>
      <Sheet open={s.sheet === 'settings'} onClose={() => s.setSheet(null)} wide={wide} label="Réglages">
        <Settings j={j} />
      </Sheet>
      <Sheet open={s.reported != null} onClose={() => s.report(null)} wide={wide} label="Signaler un prix inexact">
        {s.reported && <ReportPrice j={j} r={s.reported} />}
      </Sheet>
    </>
  )

  if (wide) {
    const front = s.blank ? undefined : s.cards[s.activeIdx]
    return (
      <div className="main-screen wide">
        <StationMap {...mapProps} padBottom={s.blank || s.unfolded ? 40 : 250} padTop={90}
          padLeft={s.sheet || s.reported ? 900 : s.unfolded ? 444 + 360 + 48 : 484} />
        <GeoToast j={j} />
        <SidePanel j={j} label={s.label} count={s.nowhere ? null : count} onPlace={openPlace} onSettings={openSettings}>{stationList}</SidePanel>
        {front && (
          <div className="card-dock" style={{ ['--more-max' as string]: `${h - 28 - 232 - 36}px` }}>
            <StationCard key={front.r.s.id} {...card} card={front} on />
          </div>
        )}
        {searchHere}
        {overlays}
      </div>
    )
  }

  return (
    <div className="main-screen">
      <StationMap {...mapProps} padBottom={s.nowhere ? 0 : s.overview ? PEEK : PEEK + 238} padTop={128} />
      <motion.div className="list-scrim" style={{ opacity: scrim }} aria-hidden />
      <GeoToast j={j} />
      <TopControls j={j} label={s.label} onPlace={openPlace} onSettings={openSettings} />
      {searchHere}

      <AnimatePresence>
        {s.unfolded && <motion.div key="dim" className="card-dim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: still ? 0 : 0.25 }} onClick={() => s.unfold(null)} aria-hidden />}
      </AnimatePresence>
      <CardRail show={!s.blank} cards={s.cards} activeIdx={s.activeIdx} open={s.open} listY={listY} closedY={closedY}
        bottom={PEEK + 12} moreMax={h - PEEK - 12 - 232 - 30} card={card} />

      <ListSheet show={!s.nowhere} y={listY} height={sheetH} closedY={closedY} open={s.open} setOpen={s.setOpen} relief={relief} count={count}>
        {stationList}
      </ListSheet>
      {overlays}
    </div>
  )
}
