// A sheet: rises from the bottom over a scrim on a phone (drag it down to close), slides in from the left beside the list on a wide screen.
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { IconClose } from './icons'
import { SPRING, STILL } from './motion'

export function Sheet({ open, onClose, wide, label, children }: { open: boolean; onClose: () => void; wide: boolean; label: string; children: ReactNode }) {
  const controls = useDragControls()
  const still = useReducedMotion()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, onClose])
  const hidden = wide ? { x: '-100%', opacity: 0 } : { y: '100%' }
  return (
    <AnimatePresence>
      {open && !wide && (
        <motion.div key="scrim" className="sheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden />
      )}
      {open && (
        <motion.section key="sheet" className="sheet" data-wide={wide || undefined} data-own-keys role="dialog" aria-modal aria-label={label}
          initial={hidden} animate={wide ? { x: 0, opacity: 1 } : { y: 0 }} exit={hidden} transition={still ? STILL : SPRING}
          drag={wide ? false : 'y'} dragControls={controls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 600) onClose() }}>
          <div className="sheet-grab" onPointerDown={(e) => controls.start(e)}><span className="grab-handle" aria-hidden /></div>
          <button className="sheet-close" onClick={onClose} aria-label="Fermer"><IconClose /></button>
          <div className="sheet-body">{children}</div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
