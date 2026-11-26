// What a station's card unfolds to show: why the savings are what they are, its other fuels, the price chart, and the reference switch.
import { useMemo } from 'react'
import { FUEL_LABEL, fmtKm, fmtMoney, fmtPrice, signedMoney } from '../domain/format'
import type { Fuel, Ranked } from '../domain/ranking'
import { FUELS } from '../domain/ranking'
import type { Jauge } from '../state'
import { IconCheck, IconFlag, IconPinMark } from './icons'
import { PriceChart } from './PriceChart'

/** Loads a station's recorded price changes for one fuel over a period. */
export type HistoryLoader = (id: string, fuel: Fuel, from: number, to: number) => Promise<{ t: number; p: number | null }[]>

export function StationDetails({ j, r, base, ownRef, onMakeRef, onDropRef, onReport, history }: { j: Jauge; r: Ranked; base: Ranked | null; ownRef: boolean; onMakeRef: () => void; onDropRef: () => void; onReport: () => void; history: HistoryLoader }) {
  const id = r.s.id, fuel = j.fuel
  const load = useMemo(() => (from: number, to: number) => history(id, fuel, from, to), [history, id, fuel])
  const others = FUELS.filter((f: Fuel) => f !== j.fuel)
  return (
    <>
      {!r.isBaseline && base && (
        <div className="savings-why" aria-label="D’où vient ce montant">
          <p><span>Prix<small>{fmtPrice(r.price)} contre {fmtPrice(base.price)}</small></span><em>{signedMoney(r.priceSaving)} $</em></p>
          <p><span>Détour<small>≈ {fmtKm(r.extraKm)} km de plus, aller-retour</small></span><em>{r.detourCost > 0.004 ? `−${fmtMoney(r.detourCost)}` : fmtMoney(0)} $</em></p>
        </div>
      )}
      <div className="other-fuels">
        {others.map((f) => (
          <p key={f}><span>{FUEL_LABEL[f]}</span><b>{r.s.p[f] == null ? '—' : fmtPrice(r.s.p[f]!)}</b></p>
        ))}
      </div>
      <PriceChart price={r.price} load={load} />
      <div className="card-actions">
        <button className="outline-button" aria-pressed={r.isBaseline} disabled={r.isBaseline && !ownRef} onClick={(e) => { e.stopPropagation(); if (r.isBaseline) onDropRef(); else onMakeRef() }}>
          {r.isBaseline ? <IconCheck /> : <IconPinMark />}Ma référence
        </button>
        <button className="outline-button" onClick={(e) => { e.stopPropagation(); onReport() }}><IconFlag />Prix inexact ?</button>
      </div>
    </>
  )
}
