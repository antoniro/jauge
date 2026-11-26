// Phone: the row of station cards above the list, one in front and the next one peeking in. Drag it sideways to change station.
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { useEffect, useRef } from 'react'
import { clamp } from '../domain/format'
import { SPRING, STILL } from './motion'
import type { CardData, CardProps } from './StationCard'
import { StationCard } from './StationCard'

const CARD_W = 326, GAP = 10, PITCH = CARD_W + GAP

interface Props {
  /** false while nothing is ranked: the rail stays mounted so it keeps its place, but shows nothing */
  show: boolean
  cards: CardData[]
  activeIdx: number
  /** the list is open over the map */
  open: boolean
  /** the list sheet's position: the rail rises with it and fades out */
  listY: MotionValue<number>
  closedY: number
  bottom: number
  /** how tall an unfolded card's details may grow, in px */
  moreMax: number
  card: CardProps
}

export function CardRail({ show, cards, activeIdx, open, listY, closedY, bottom, moreMax, card }: Props) {
  const spring = useReducedMotion() ? STILL : SPRING
  const x = useMotionValue(0)
  const draggedAt = useRef(0)
  useEffect(() => { const a = animate(x, -activeIdx * PITCH, spring); return () => a.stop() }, [activeIdx, cards.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const y = useTransform(listY, (v) => v - closedY)
  const opacity = useTransform(listY, [closedY, closedY - 140], [1, 0])
  if (!show) return null
  return (
    <motion.div className="card-rail" data-unfolded={card.unfolded || undefined}
      style={{ y, opacity, pointerEvents: open ? 'none' : 'auto', bottom, ['--more-max' as string]: `${moreMax}px` }} inert={open}>
      <motion.div className="card-rail-track" style={{ x }} drag={card.unfolded ? false : 'x'} dragMomentum={false} dragElastic={0.12}
        dragConstraints={{ left: -(cards.length - 1) * PITCH, right: 0 }}
        onDragEnd={(_, info) => {
          draggedAt.current = performance.now()
          const i = clamp(Math.round((-x.get() - info.velocity.x * 0.18) / PITCH), 0, cards.length - 1)
          if (i === activeIdx) animate(x, -i * PITCH, spring)
          else card.onSelect(cards[i].r.s.id)
        }}>
        {cards.map((c, i) => <StationCard key={c.r.s.id} {...card} card={c} on={i === activeIdx} draggedAt={draggedAt} />)}
      </motion.div>
      <div className="page-dots" aria-hidden>{cards.map((c, i) => <i key={c.r.s.id} data-on={i === activeIdx || undefined} data-best={c.r.s.id === card.bestId || undefined} />)}</div>
    </motion.div>
  )
}
