// The stations as list rows: ranked by real savings, or in an overview of a place simply by price.
// Shared by the phone's list sheet and the wide side panel.
import { motion, useReducedMotion } from 'motion/react'
import { clamp, fmtKm, fmtPrice, signedMoney, stationName, stationWhere } from '../domain/format'
import type { Fuel, Ranked, Station } from '../domain/ranking'
import { SPRING, STILL } from './motion'
import { BrandBadge, Odometer } from './pieces'

const LIVE_ROWS = 12 // rows that get rolling digits and sliding; the rest update instantly

interface Props {
  fuel: Fuel
  /** nothing is ranked yet (no position, no place): no rows */
  nowhere: boolean
  /** a place picked by hand, before a starting point: plain price rows from `areaList` */
  overview: boolean
  list: Ranked[]
  areaList: Station[]
  activeId: string | null
  ownRef: boolean
  onPick: (id: string) => void
  onUnfold: (id: string) => void
}

export function StationList({ fuel, nowhere, overview, list, areaList, activeId, ownRef, onPick, onUnfold }: Props) {
  const spring = useReducedMotion() ? STILL : SPRING
  const maxReal = Math.max(0.01, list[0]?.real ?? 0)

  const row = (r: Ranked, i: number) => {
    const liveRow = i < LIVE_ROWS
    const neg = r.real < -0.004
    const amount = `${r.isBaseline ? '0,00' : signedMoney(r.real)} $`
    const where = stationWhere(r.s)
    const city = where.includes(',') ? where.slice(where.lastIndexOf(',') + 1).trim() : where
    return (
      <motion.li key={r.s.id} layout={liveRow ? 'position' : false} transition={spring}>
        <button className="list-row" data-on={r.s.id === activeId || undefined} data-best={i === 0 || undefined} data-ref={r.isBaseline || undefined} onClick={() => { if (r.s.id === activeId) onUnfold(r.s.id); else onPick(r.s.id) }}
          aria-label={`${i + 1}. ${stationName(r.s)}, ${fmtPrice(r.price)} cents le litre, économie réelle ${amount}. Voir sur la carte`}>
          <span className="list-row-rank">{i + 1}</span>
          <BrandBadge brand={r.s.b} size={46} />
          <span className="list-row-main">
            <b>{stationName(r.s)}</b>
            <small>{r.km >= 0.05 && <><span>≈ {fmtKm(r.km)} km</span><i /></>}{r.isBaseline && !ownRef ? 'la plus proche' : city}</small>
          </span>
          <span className="price-pill list-row-price">{fmtPrice(r.price)}<small>¢/L</small></span>
          <span className="list-row-bar"><i style={{ transform: `scaleX(${clamp(r.real / maxReal, 0, 1)})` }} /></span>
          {r.isBaseline ? <span className="list-row-ref">Référence</span> : <span className="list-row-savings" data-neg={neg || undefined}>{liveRow ? <Odometer value={amount} /> : amount}</span>}
        </button>
      </motion.li>
    )
  }

  const areaRow = (s: Station, i: number) => (
    <li key={s.id}>
      <button className="list-row plain" data-best={i === 0 || undefined} onClick={() => onPick(s.id)}
        aria-label={`${stationName(s)}, ${stationWhere(s)}, ${fmtPrice(s.p[fuel]!)} cents le litre. Partir de cette station`}>
        <span className="list-row-rank">{i + 1}</span>
        <BrandBadge brand={s.b} size={46} />
        <span className="list-row-main"><b>{stationName(s)}</b><small>{stationWhere(s)}</small></span>
        <span className="price-pill list-row-price">{fmtPrice(s.p[fuel]!)}<small>¢/L</small></span>
      </button>
    </li>
  )

  return <ol className="station-list">{nowhere ? [] : overview ? areaList.map(areaRow) : list.map(row)}</ol>
}
