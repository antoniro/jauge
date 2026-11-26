// "Chercher ici": offered once the map has been dragged well away from where the person is.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Origin } from '../domain/ranking'
import { IconSearch } from './icons'
import { SPRING, STILL } from './motion'

export function SearchHere({ away, show, onSearch }: { away: Origin | null; show: boolean; onSearch: () => void }) {
  const spring = useReducedMotion() ? STILL : SPRING
  return (
    <AnimatePresence>
      {away && show && (
        <motion.button key="here" className="search-here" initial={{ opacity: 0, y: -10, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -10, x: '-50%' }} transition={spring}
          onClick={onSearch} aria-label={`Chercher les stations autour de ${away.label}`}>
          <IconSearch />Chercher ici
        </motion.button>
      )}
    </AnimatePresence>
  )
}
