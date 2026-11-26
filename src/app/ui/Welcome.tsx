// First open: what Jauge does, and where to look (around me, or a place chosen by hand).
import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import type { Jauge } from '../state'
import { IconLocate, IconSearch } from './icons'
import { SPRING, STILL } from './motion'
import { SourceLine, Wordmark } from './pieces'
import { paintRelief } from './relief'

export function Welcome({ j, dark, wide, onNear, onChoose }: { j: Jauge; dark: boolean; wide: boolean; onNear: () => void; onChoose: () => void }) {
  const still = useReducedMotion()
  const relief = useMemo(() => (wide ? paintRelief(720, 450, dark, 11) : paintRelief(390, 844, dark, 11)), [dark, wide])
  const rise = (i: number) => ({ initial: { opacity: 0, y: still ? 0 : 26 }, animate: { opacity: 1, y: 0 }, transition: still ? STILL : { ...SPRING, delay: 0.12 + i * 0.09 } })
  return (
    <motion.div className="welcome" data-wide={wide || undefined} style={{ ['--relief' as string]: `url(${relief})` }} exit={{ opacity: 0, y: still ? 0 : -40 }} transition={{ duration: still ? 0 : 0.32, ease: [0.4, 0, 1, 1] }}>
      <motion.div {...rise(0)}><Wordmark /></motion.div>
      <h1>
        <motion.span className="thin" {...rise(1)}>Le plein</motion.span>
        <motion.span className="bold" {...rise(2)}>moins cher,</motion.span>
        <motion.span className="thin" {...rise(3)}>détour compris.</motion.span>
      </h1>
      <motion.div className="welcome-actions" {...rise(5)}>
        <button className="go-button" onClick={onNear} aria-busy={j.locating}><span className={j.locating ? 'spinning' : ''}><IconLocate /></span>Autour de moi</button>
        <button className="ghost-button" onClick={onChoose}><IconSearch />Choisir un endroit</button>
      </motion.div>
      <motion.div {...rise(6)}><SourceLine /></motion.div>
    </motion.div>
  )
}
