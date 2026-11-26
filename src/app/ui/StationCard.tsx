// A station's card: who, how much you save and its price, what it is compared to, "Y aller"; it unfolds in place to show the details.
import { motion, useReducedMotion } from 'motion/react'
import type { RefObject } from 'react'
import { loadHistory } from '../data/source'
import { fmtKm, fmtMoney, fmtPrice, goUrl, signedMoney, stationName, stationWhere } from '../domain/format'
import type { Ranked } from '../domain/ranking'
import type { Jauge } from '../state'
import { IconBack, IconCheckSmall, IconCloseSmall, IconDown, IconGo, IconPin } from './icons'
import { SPRING, STILL } from './motion'
import { BrandBadge, Odometer } from './pieces'
import { StationDetails } from './StationDetails'

/** A card: the station, ranked, and its label ("Le meilleur plein", "Ta référence") if it has one. */
export interface CardData { r: Ranked; tag: string | null }

/** A card that is never in a rail that can be dragged (the wide layout's docked card). */
const NEVER_DRAGGED = { current: 0 }

interface Props {
  j: Jauge
  card: CardData
  /** in front: the selected card. The others are smaller and only come forward when tapped. */
  on: boolean
  /** the card in front is unfolded */
  unfolded: boolean
  bestId: string | undefined
  base: Ranked | null
  ownRef: boolean
  better: Ranked | null
  /** when the rail was last dragged: a tap that ends a drag does not count as a tap */
  draggedAt?: RefObject<number>
  onSelect: (id: string) => void
  onUnfold: (id: string | null) => void
  onBackToBest: () => void
  onMakeRef: (id: string) => void
  onDropRef: () => void
  onReport: (id: string) => void
}

/** Everything a card needs that is the same for every card on the screen. */
export type CardProps = Omit<Props, 'card' | 'on' | 'draggedAt'>

export function StationCard({ j, card: c, on, unfolded, bestId, base, ownRef, better, draggedAt = NEVER_DRAGGED, onSelect, onUnfold, onBackToBest, onMakeRef, onDropRef, onReport }: Props) {
  const spring = useReducedMotion() ? STILL : SPRING
  const isBest = c.r.s.id === bestId
  const lose = !c.r.isBaseline && c.r.real < -0.004
  const amount = c.r.isBaseline ? '0,00' : lose ? fmtMoney(-c.r.real) : signedMoney(c.r.real)
  return (
    <motion.article className="station-card" data-on={on || undefined} data-open={(on && unfolded) || undefined} data-best={isBest || undefined} data-ref={c.r.isBaseline || undefined}
      animate={{ scale: on ? 1 : 0.94 }} transition={spring}
      onClick={() => { if (!on && performance.now() - draggedAt.current > 250) onSelect(c.r.s.id) }}>
      {c.tag && (
        <p className="card-label">{c.tag}
          {c.r.isBaseline && ownRef && (
            <button tabIndex={on ? 0 : -1} aria-label="Revenir à la station la plus proche comme référence" onClick={(e) => { if (!on) return; e.stopPropagation(); onDropRef() }}><IconCloseSmall /></button>
          )}
        </p>
      )}
      {on && bestId && !isBest && !(c.r.isBaseline && ownRef && better) && (
        <button className="back-to-best" aria-label="Revenir au meilleur plein"
          onClick={(e) => { e.stopPropagation(); onBackToBest() }}><IconBack />Meilleur plein</button>
      )}
      <div className="card-head" role="button" tabIndex={on ? 0 : -1} aria-expanded={on && unfolded} aria-label={`${stationName(c.r.s)}, ${stationWhere(c.r.s)}. ${on && unfolded ? 'Replier' : 'Voir les détails'}`}
        onClick={(e) => { if (!on || performance.now() - draggedAt.current < 250) return; e.stopPropagation(); onUnfold(unfolded ? null : c.r.s.id) }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onUnfold(unfolded ? null : c.r.s.id) } }}>
        <BrandBadge brand={c.r.s.b} size={38} />
        <div>
          <h2>{stationName(c.r.s)}</h2>
          <p className="card-where">{stationWhere(c.r.s)}</p>
        </div>
        <span className="card-chevron" aria-hidden><IconDown /></span>
      </div>
      <div className="card-figures">
        <div className="card-savings" data-neg={lose || c.r.isBaseline || undefined} data-long={amount.length > 5 || undefined}>
          <b><Odometer value={`${amount} $`} /></b>
          <p>{lose ? 'plus cher' : 'd’économie'}</p>
        </div>
        <span className="price-pill card-price"><Odometer value={fmtPrice(c.r.price)} /><small>¢/L</small></span>
      </div>
      {!base ? null : !c.r.isBaseline ? (
        <button className="compare-row" tabIndex={on ? 0 : -1} aria-label={`Comparée à ta référence : ${stationName(base.s)}, ${fmtPrice(base.price)} cents le litre. La voir`}
          onClick={(e) => { if (!on) return; e.stopPropagation(); onSelect(base.s.id) }}>
          <i>vs</i>
          <BrandBadge brand={base.s.b} size={22} />
          <span><b>{stationName(base.s)}</b></span>
          <em>{fmtPrice(base.price)}</em>
        </button>
      ) : !ownRef ? (
        <p className="compare-row"><IconPin /><span><b>La plus proche de toi</b></span></p>
      ) : better ? (
        <button className="compare-row better" tabIndex={on ? 0 : -1} aria-label={`Meilleure option : ${stationName(better.s)}, ${signedMoney(better.real)} dollars. La voir`}
          onClick={(e) => { if (!on) return; e.stopPropagation(); onSelect(better.s.id) }}>
          <BrandBadge brand={better.s.b} size={22} />
          <span><b>{stationName(better.s)}</b><small>meilleure option</small></span>
          <em>{signedMoney(better.real)} $</em>
        </button>
      ) : (
        <p className="compare-row"><IconCheckSmall /><span><b>Rien de mieux autour</b></span></p>
      )}
      <div className="card-more" inert={!(on && unfolded)}>
        <div className="card-more-clip">
          {on && (
            <div className="card-more-inner" data-own-keys>
              <StationDetails j={j} r={c.r} base={base} ownRef={ownRef} onMakeRef={() => onMakeRef(c.r.s.id)} onDropRef={onDropRef} onReport={() => onReport(c.r.s.id)} history={loadHistory} />
            </div>
          )}
        </div>
      </div>
      <a className={`go-button${isBest ? '' : ' quiet'}`} href={goUrl(c.r.s)} target="_blank" rel="noreferrer" tabIndex={on ? 0 : -1} draggable={false}
        onClick={(e) => { if (!on) e.preventDefault(); e.stopPropagation() }}><span><IconGo />Y aller</span>{c.r.km >= 0.05 && <small>≈ {fmtKm(c.r.km)} km</small>}</a>
    </motion.article>
  )
}
