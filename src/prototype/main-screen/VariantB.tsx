// PROTOTYPE — throwaway. Variant B "Réponse": one huge answer, a swipeable deck of alternatives, a map that grows out of a card.
import { AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react'
import { useState } from 'react'
import StationMap from './StationMap'
import type { VariantProps } from './types'
import { fmtKm, fmtMoney, fmtPrice, shortAddress } from './data'
import type { Ranked } from './data'
import { BrandBadge, FuelToggle, GoButton, PinIcon, Rolling, SourceLine } from './ui'

function DeckCard({ r, depth, onSwipe }: { r: Ranked; depth: number; onSwipe: () => void }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-12, 12])
  const { city } = shortAddress(r.s.a)
  return (
    <motion.article className="b-card glass-strong" style={{ x: depth === 0 ? x : 0, rotate: depth === 0 ? rotate : 0, zIndex: 10 - depth }}
      initial={{ scale: 0.9, y: 30, opacity: 0 }} animate={{ scale: 1 - depth * 0.05, y: depth * 14, opacity: depth > 2 ? 0 : 1 }}
      exit={{ x: x.get() < 0 ? -420 : 420, opacity: 0, rotate: x.get() < 0 ? -18 : 18, transition: { duration: 0.32 } }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      drag={depth === 0 ? 'x' : false} dragSnapToOrigin dragElastic={0.6}
      onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 600) onSwipe() }}>
      <BrandBadge brand={r.s.b} size={40} />
      <div className="b-card-name"><b>{r.s.b ?? r.s.n}</b><small>≈ {fmtKm(r.km)} km · {city}</small></div>
      <span className="pill">{fmtPrice(r.price)}</span>
      <span className={`b-card-save ${r.real > 0 ? '' : 'muted'}`}>{r.isBaseline ? 'la plus proche' : r.real > 0 ? `tu sauves ${fmtMoney(r.real)} $` : 'pas rentable'}</span>
    </motion.article>
  )
}

export default function VariantB(p: VariantProps) {
  const [deckStart, setDeckStart] = useState(1)
  const [mapOpen, setMapOpen] = useState(false)
  const best = p.ranking.list[0]
  const rest = p.ranking.list.slice(1)
  const deck = rest.slice(deckStart - 1, deckStart + 2)
  const { street, city } = best ? shortAddress(best.s.a) : { street: '', city: '' }
  const already = best && p.ranking.baseline?.s.id === best.s.id

  return (
    <div className="vB">
      <div className="b-blob" aria-hidden />
      <header className="b-head">
        <button className="b-where" onClick={p.locate}><PinIcon /> {p.locating ? 'Localisation…' : p.origin.label}</button>
        <div className="b-fill" aria-label="Volume du plein">
          <button onClick={() => p.setFillL(Math.max(10, p.fillL - 5))} aria-label="Moins">−</button>
          <span><Rolling value={String(p.fillL)} /> L</span>
          <button onClick={() => p.setFillL(Math.min(120, p.fillL + 5))} aria-label="Plus">+</button>
        </div>
      </header>
      <FuelToggle fuel={p.fuel} onChange={(f) => { p.setFuel(f); setDeckStart(1) }} id="B" />

      {best && (
        <section className="b-hero">
          <p className="b-kicker">{already ? 'Tu es déjà au meilleur prix' : 'Va chez'}</p>
          <h1 className="b-station"><BrandBadge brand={best.s.b} size={38} /> {best.s.b ?? best.s.n}</h1>
          <p className="b-addr">{street}, {city}</p>
          <div className="b-price"><Rolling value={fmtPrice(best.price)} delay={0.1} /></div>
          <p className="b-save">
            ≈ {fmtKm(best.km)} km{best.real > 0 && <> · tu sauves <b><Rolling value={fmtMoney(best.real)} delay={0.45} /> $</b></>}
          </p>
          <GoButton />
        </section>
      )}

      <section className="b-deck-wrap">
        <div className="b-deck-head"><span>Autres options</span><small>Glisse pour voir la suivante</small></div>
        <div className="b-deck">
          <AnimatePresence initial={false}>
            {deck.map((r, i) => <DeckCard key={r.s.id} r={r} depth={i} onSwipe={() => setDeckStart((n) => (n >= rest.length ? 1 : n + 1))} />)}
          </AnimatePresence>
        </div>
      </section>

      <motion.button layoutId="b-map" className="b-map-thumb glass-strong" onClick={() => setMapOpen(true)} transition={{ type: 'spring', stiffness: 300, damping: 32 }}>
        {!mapOpen && <StationMap stations={p.snap.stations} ranked={p.ranking.list.slice(0, 6)} fuel={p.fuel} origin={p.origin} dark={p.dark} bestId={best?.s.id} interactive={false} />}
        <motion.span layout="position" className="b-map-label glass-strong">Voir les {p.ranking.list.length} stations sur la carte</motion.span>
      </motion.button>

      <SourceLine generatedAt={p.snap.generatedAt} />

      <AnimatePresence>
        {mapOpen && (
          <motion.div layoutId="b-map" className="b-map-full" transition={{ type: 'spring', stiffness: 300, damping: 32 }}>
            <StationMap stations={p.snap.stations} ranked={p.ranking.list} fuel={p.fuel} origin={p.origin} dark={p.dark} bestId={best?.s.id} />
            <motion.button className="b-close glass-strong" onClick={() => setMapOpen(false)} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>Fermer</motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
