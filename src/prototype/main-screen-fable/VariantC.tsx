// PROTOTYPE — throwaway. Variant C, "Le reçu": each station is a price sign on top of a pump receipt; flick to see the next.
import { AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect, useState } from 'react'
import type { Ranked } from '../main-screen/data'
import './c.css'
import type { Jauge, VariantProps } from './shared'
import { BrandBadge, FUELS, FUEL_LABEL, GeoToast, IconGo, LocateButton, Odometer, SourceLine, Wordmark, clamp, fmtKm, fmtMoney, fmtPrice, goUrl, signedMoney, stationName, stationWhere } from './shared'

interface Pose { dir: number; depth: number }
const REST = [
  { rotate: -2, scale: 1, y: 0 },
  { rotate: 3.5, scale: 0.955, y: 16 },
  { rotate: -5, scale: 0.91, y: 30 },
]
const SPRING = { type: 'spring', stiffness: 300, damping: 28 } as const
const variants = {
  enter: ({ dir, depth }: Pose) =>
    dir < 0 ? { x: -460, rotate: -22, opacity: 1, scale: 1, y: 0 } // coming back from the left
      : dir > 0 ? { x: 0, opacity: 0, scale: 0.86, y: 44, rotate: REST[depth].rotate } // new card appears at the bottom of the deck
        : { x: 0, y: 420, opacity: 0, rotate: 14, scale: 1 }, // first deal
  rest: ({ dir, depth }: Pose) => ({ x: 0, opacity: 1, ...REST[depth], transition: dir === 0 ? { ...SPRING, damping: 20, delay: 0.25 + (2 - depth) * 0.11 } : SPRING }),
  exit: ({ dir }: Pose) =>
    dir > 0 ? { x: -480, rotate: -24, opacity: 0, transition: { duration: 0.32, ease: [0.3, 0, 0.8, 0.4] as const } }
      : { opacity: 0, scale: 0.86, y: 44, transition: { duration: 0.2 } },
}

function Card({ r, rank, j, top, isBest, onFlick }: { r: Ranked; rank: number; j: Jauge; top: boolean; isBest: boolean; onFlick: (d: number) => void }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-13, 13])
  const p = fmtPrice(r.price)
  const [whole, tenth] = p.split(',')
  return (
    <motion.div className="c-card-drag" style={{ x, rotate }} drag={top ? 'x' : false} dragSnapToOrigin dragElastic={0.9} dragConstraints={{ left: 0, right: 0 }}
      dragTransition={{ bounceStiffness: 380, bounceDamping: 26 }}
      onDragEnd={(_, info) => {
        if (info.offset.x < -80 || info.velocity.x < -500) onFlick(1)
        else if (info.offset.x > 80 || info.velocity.x > 500) onFlick(-1)
      }}>
      <article className="c-card" data-best={isBest || undefined}>
        <div className="c-sign">
          <div className="c-sign-top"><span>{FUEL_LABEL[j.fuel]}</span><span className="c-rank">{isBest ? 'Le meilleur plein' : `Choix nº ${rank}`}</span></div>
          <div className="c-price" aria-label={`${p} cents le litre`}>
            <Odometer value={whole} className="c-price-whole" />
            <span className="c-price-side"><Odometer value={tenth ?? '0'} className="c-price-tenth" /><small>¢/L</small></span>
          </div>
        </div>
        <div className="c-receipt">
          <div className="c-station">
            <BrandBadge brand={r.s.b} size={40} />
            <div><h2>{stationName(r.s)}</h2><p>{stationWhere(r.s)}</p></div>
            <span className="c-km">≈ {fmtKm(r.km)} km</span>
          </div>
          {r.isBaseline ? (
            <p className="c-note">C’est la station la plus proche. Les autres sont comparées à elle.</p>
          ) : (
            <dl className="c-sum">
              <div><dt>{r.priceSaving >= 0 ? 'Rabais' : 'Surcoût'} sur <button className="c-fill" onClick={j.cycleFill} disabled={!top}>{j.fillL} L</button></dt><dd>{signedMoney(r.priceSaving).replace('+', '')} $</dd></div>
              <div><dt>Détour de ≈ {fmtKm(r.extraKm)} km</dt><dd>{r.detourCost > 0.004 ? '−' : ''}{fmtMoney(r.detourCost)} $</dd></div>
            </dl>
          )}
          <div className="c-total" data-neg={r.real < -0.004 || undefined}>
            <span>Économie réelle</span>
            <b><i>{r.real > 0.004 ? '+' : r.real < -0.004 ? '−' : ''}</i><Odometer value={fmtMoney(Math.abs(r.real))} /> $</b>
          </div>
          <a className={`fb-go c-go${isBest ? '' : ' quiet'}`} href={goUrl(r.s)} target="_blank" rel="noreferrer" tabIndex={top ? 0 : -1} draggable={false}><IconGo />Y aller</a>
        </div>
      </article>
    </motion.div>
  )
}

export default function VariantC({ j, h }: VariantProps) {
  const list = j.ranking.list
  const [idx, setIdx] = useState(0)
  const [dir, setDir] = useState(0)
  const resetKey = `${j.fuel}-${j.origin.lat}-${j.origin.lon}`
  useEffect(() => { setIdx(0); setDir(0) }, [resetKey])

  const flick = (d: number) => {
    const next = clamp(idx + d, 0, list.length - 1)
    if (next === idx) return
    setDir(d); setIdx(next)
  }
  const deck = list.slice(idx, idx + 3)
  const scale = clamp((h - 292) / 500, 0.5, 1)

  return (
    <div className="c-root">
      <div className="c-sky" aria-hidden />
      <GeoToast j={j} />
      <header className="c-top"><Wordmark /><LocateButton j={j} /></header>
      <div className="c-head">
        <p>Autour de {j.origin.label}</p>
        <h1>{idx === 0 ? 'Le meilleur plein' : `Choix nº ${idx + 1} sur ${list.length}`}</h1>
      </div>

      <div className="c-deck-wrap" data-own-keys tabIndex={0} role="group" aria-label="Stations, de la meilleure économie réelle à la moins bonne. Flèches pour changer."
        onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); flick(1) } else if (e.key === 'ArrowLeft') { e.preventDefault(); flick(-1) } }}>
        <div className="c-deck" style={{ transform: `scale(${scale})` }} key={resetKey}>
          <AnimatePresence custom={{ dir, depth: 0 }} initial>
            {deck.map((r, depth) => (
              <motion.div key={r.s.id} className="c-slot" style={{ zIndex: 3 - depth }} custom={{ dir, depth }} variants={variants} initial="enter" animate="rest" exit="exit">
                <Card r={r} rank={idx + depth + 1} j={j} top={depth === 0} isBest={idx + depth === 0} onFlick={flick} />
              </motion.div>
            )).reverse()}
          </AnimatePresence>
          {j.ready && !list.length && <p className="c-empty">Aucune station ne vend ce carburant à moins de {j.ranking.radiusKm} km.</p>}
        </div>
      </div>

      <div className="c-nav">
        <button onClick={() => flick(-1)} disabled={idx === 0}>Précédente</button>
        <span className="c-track" aria-hidden><i style={{ transform: `scaleX(${list.length ? (idx + 1) / list.length : 0})` }} /></span>
        <button onClick={() => flick(1)} disabled={idx >= list.length - 1}>Suivante</button>
      </div>

      <div className="c-grades" role="radiogroup" aria-label="Type de carburant">
        {FUELS.map((f) => (
          <button key={f} role="radio" aria-checked={j.fuel === f} className="c-grade" onClick={() => j.setFuel(f)}>
            <span>{FUEL_LABEL[f]}</span>
            <b>{j.bestPrice[f] != null ? <Odometer value={fmtPrice(j.bestPrice[f]!)} /> : '—'}</b>
          </button>
        ))}
      </div>
      <SourceLine className="c-source" />
    </div>
  )
}
