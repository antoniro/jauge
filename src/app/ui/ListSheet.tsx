// Phone: the list of stations in a sheet under the cards. Closed, only its head shows (the count, the source, "Liste");
// dragged up or opened with the button, it covers the map up to the top controls.
import { animate, motion, useDragControls, useReducedMotion } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { IconList, IconMap } from './icons'
import { SPRING, STILL } from './motion'

// The source of the prices, always in view: one short line beside the count (phone) or pinned under the list (wide).
const SRC = 'Prix déclarés par les stations à la Régie'

interface Props {
  /** false while there is nothing to list: the sheet stays mounted so it keeps its place, but shows nothing */
  show: boolean
  /** how far down the sheet sits: 0 is open, closedY is closed (only the head shows) */
  y: MotionValue<number>
  height: number
  closedY: number
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  /** the embossed relief behind the head, as an image URL */
  relief: string
  count: ReactNode
  children: ReactNode
}

export function ListSheet({ show, y, height, closedY, open, setOpen, relief, count, children }: Props) {
  const spring = useReducedMotion() ? STILL : SPRING
  const controls = useDragControls()
  const first = useRef(true)
  const scroller = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    if (first.current) { first.current = false; y.set(closedY); return }
    const a = animate(y, open ? 0 : closedY, spring); return () => a.stop()
  }, [open, closedY]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!open) scroller.current?.scrollTo({ top: 0 }) }, [open])
  if (!show) return null
  return (
    <motion.section className="list-sheet" data-open={open || undefined} aria-label="Liste des stations"
      style={{ y, height, ['--relief' as string]: `url(${relief})` }}
      drag="y" dragControls={controls} dragListener={false}
      dragConstraints={{ top: 0, bottom: closedY }} dragElastic={0.06} dragMomentum={false}
      onDragEnd={(_, info) => {
        const goOpen = info.velocity.y < -300 ? true : info.velocity.y > 300 ? false : y.get() < closedY / 2
        if (goOpen === open) animate(y, goOpen ? 0 : closedY, spring); else setOpen(goOpen)
      }}>
      <div className="list-head" data-scrolled={(open && scrolled) || undefined} onPointerDown={(e) => controls.start(e)}>
        <span className="grab-handle" aria-hidden />
        <div className="list-head-row">
          <div className="list-count"><p>{count}</p><p className="list-source">{SRC}</p></div>
          <button className="list-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? <><IconMap />Carte</> : <><IconList />Liste</>}
          </button>
        </div>
      </div>

      <motion.div className="list-scroll" ref={scroller} layoutScroll style={{ overflowY: open ? 'auto' : 'hidden' }} inert={!open}
        onScroll={(e) => { const s = e.currentTarget.scrollTop > 8; if (s !== scrolled) setScrolled(s) }}>
        {children}
      </motion.div>
    </motion.section>
  )
}
