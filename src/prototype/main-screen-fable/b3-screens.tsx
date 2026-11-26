// PROTOTYPE — throwaway. The screens around B3's main screen: first open, choosing a place, a station's page, settings.
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import { useEffect, useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Fuel, Ranked } from '../main-screen/data'
import './b3x.css'
import { paintRelief } from './topo'
import type { Jauge, Place } from './shared'
import { BrandBadge, FUELS, FUEL_LABEL, IconLocate, SourceLine, Wordmark, clamp, fmtKm, fmtMoney, fmtPrice, signedMoney, stationName, stationWhere } from './shared'

const SPRING = { type: 'spring', stiffness: 330, damping: 34 } as const
const STILL = { duration: 0 } as const

const ic = { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
export const IconClose = () => (<svg {...ic}><path d="m4.500 4.500 9 9M13.500 4.500l-9 9" /></svg>)
export const IconSearch = () => (<svg {...ic}><circle cx="8" cy="8" r="4.800" /><path d="m11.600 11.600 3.400 3.400" /></svg>)
export const IconGear = () => (<svg {...ic}><path d="M3 5.200h6.200M12.800 5.200H15M3 12.800h2.200M8.800 12.800H15" /><circle cx="11" cy="5.200" r="1.800" /><circle cx="7" cy="12.800" r="1.800" /></svg>)
export const IconPinMark = () => (<svg {...ic}><path d="M9 16s5-4.400 5-8.400a5 5 0 1 0-10 0C4 11.600 9 16 9 16Z" /><circle cx="9" cy="7.500" r="1.700" /></svg>)
export const IconDown = () => (<svg {...ic} width={12} height={12}><path d="m4.500 7 4.500 4.500L13.500 7" /></svg>)
export const IconBack = () => (<svg {...ic} width={14} height={14}><path d="M7 4.500 3.500 8 7 11.500M3.500 8h7a3.500 3.500 0 0 1 0 7H9" /></svg>)
const IconMinus = () => (<svg {...ic}><path d="M4 9h10" /></svg>)
const IconPlus = () => (<svg {...ic}><path d="M4 9h10M9 4v10" /></svg>)
const IconCheck = () => (<svg {...ic}><path d="m4 9.400 3.400 3.400L14 5.600" /></svg>)
const IconFlag = () => (<svg {...ic} width={16} height={16}><path d="M4.500 15.500V3M4.500 3.500h8l-1.800 3 1.800 3h-8" /></svg>)

const car = { width: 46, height: 26, viewBox: '0 0 46 26', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
const CarSmall = () => (<svg {...car}><path d="M11 19H8.500v-5l3.500-1 3.500-5H26l4.500 5 5 1.200V19H34M17 19h11" /><circle cx="14" cy="19" r="3" /><circle cx="31" cy="19" r="3" /></svg>)
const CarMid = () => (<svg {...car}><path d="M8 19H4.500v-4.500l5-1.500 4-5.500h14l5.500 5.500 8 1.500V19h-3M14.500 19h17" /><circle cx="11.200" cy="19" r="3.200" /><circle cx="34.800" cy="19" r="3.200" /></svg>)
const CarBig = () => (<svg {...car}><path d="M7.500 20H3.500V9c0-1.700 1.300-3 3-3h20.500l6 6 9 1.800V20h-3M15 20h16.500M23 6v6.500h10" /><circle cx="11.200" cy="20" r="3.700" /><circle cx="35.200" cy="20" r="3.700" /></svg>)

// ---------- a sheet: rises from the bottom on a phone, slides in from the left beside the list on a wide screen ----------
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
        <motion.div key="scrim" className="x-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden />
      )}
      {open && (
        <motion.section key="sheet" className="x-sheet" data-wide={wide || undefined} data-own-keys role="dialog" aria-modal aria-label={label}
          initial={hidden} animate={wide ? { x: 0, opacity: 1 } : { y: 0 }} exit={hidden} transition={still ? STILL : SPRING}
          drag={wide ? false : 'y'} dragControls={controls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 600) onClose() }}>
          <div className="x-grab" onPointerDown={(e) => controls.start(e)}><span className="b-handle" aria-hidden /></div>
          <button className="x-close" onClick={onClose} aria-label="Fermer"><IconClose /></button>
          <div className="x-body">{children}</div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}

function Seg<T extends string | number>({ label, options, value, onChange }: { label: string; options: { v: T; t: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="x-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.v)} role="radio" aria-checked={o.v === value} onClick={() => onChange(o.v)}>{o.t}</button>
      ))}
    </div>
  )
}

// ---------- first open ----------
export function Welcome({ j, dark, wide, onNear, onChoose }: { j: Jauge; dark: boolean; wide: boolean; onNear: () => void; onChoose: () => void }) {
  const still = useReducedMotion()
  const relief = useMemo(() => (wide ? paintRelief(720, 450, dark, 11) : paintRelief(390, 844, dark, 11)), [dark, wide])
  const rise = (i: number) => ({ initial: { opacity: 0, y: still ? 0 : 26 }, animate: { opacity: 1, y: 0 }, transition: still ? STILL : { ...SPRING, delay: 0.12 + i * 0.09 } })
  return (
    <motion.div className="x-welcome" data-wide={wide || undefined} style={{ ['--relief' as string]: `url(${relief})` }} exit={{ opacity: 0, y: still ? 0 : -40 }} transition={{ duration: still ? 0 : 0.32, ease: [0.4, 0, 1, 1] }}>
      <motion.div {...rise(0)}><Wordmark /></motion.div>
      <h1>
        <motion.span className="thin" {...rise(1)}>Le plein</motion.span>
        <motion.span className="bold" {...rise(2)}>moins cher,</motion.span>
        <motion.span className="thin" {...rise(3)}>détour compris.</motion.span>
      </h1>
      <motion.div className="x-welcome-go" {...rise(5)}>
        <button className="fb-go" onClick={onNear} aria-busy={j.locating}><span className={j.locating ? 'fb-spin' : ''}><IconLocate /></span>Autour de moi</button>
        <button className="x-ghost" onClick={onChoose}><IconSearch />Choisir un endroit</button>
      </motion.div>
      <motion.div {...rise(6)}><SourceLine /></motion.div>
    </motion.div>
  )
}

// ---------- where to look ----------
const plain = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
export function PlacePicker({ j, places, onPlace, onMine }: { j: Jauge; places: Place[]; onPlace: (p: Place) => void; onMine: () => void }) {
  const [q, setQ] = useState('')
  const shown = useMemo(() => { const n = plain(q.trim()); return (n ? places.filter((p) => plain(p.name).includes(n)) : places).slice(0, 40) }, [q, places])
  return (
    <div className="x-place">
      <label className="x-search"><IconSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ville ou village" aria-label="Chercher une ville ou un village" autoComplete="off" spellCheck={false} enterKeyHint="search" /></label>
      <ul>
        <li>
          <button className="x-row me" aria-busy={j.locating} onClick={onMine}>
            <span className={`x-ico${j.locating ? ' fb-spin' : ''}`}><IconLocate /></span><b>Ma position</b>
          </button>
        </li>
        {shown.map((p) => (
          <li key={p.name}>
            <button className="x-row" onClick={() => onPlace(p)}>
              <span className="x-ico"><IconPinMark /></span><b>{p.name}</b><small>{p.n} {p.n > 1 ? 'stations' : 'station'}</small>
            </button>
          </li>
        ))}
        {!shown.length && <li className="x-none">Aucune station à cet endroit</li>}
      </ul>
    </div>
  )
}

// ---------- a station's page ----------
/** Stand-in for the history the real app collects itself: every price change of the last 30 days, ending on today's price. */
interface Change { t: number; p: number }
const DAY = 864e5
const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }
function fakeChanges(id: string, price: number, now: number): { first: number; list: Change[] } {
  let h = 0; for (const c of id) h = (h * 33 + c.charCodeAt(0)) >>> 0
  const rnd = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 4294967296)
  const times: number[] = []
  const today = startOfDay(now)
  for (let back = 0; back < 30; back++) {
    const r = rnd(), n = r < 0.45 ? 0 : r < 0.85 ? 1 : 2
    for (let k = 0; k < n; k++) { const t = today - back * DAY + (6 + rnd() * 15) * 36e5; if (t < now - 36e5) times.push(t) }
  }
  times.sort((a, b) => b - a)
  let cur = price
  const list: Change[] = []
  for (const t of times) { list.unshift({ t, p: cur }); const r = rnd(); cur = Math.round((cur - (r < 0.3 ? 2 : r < 0.55 ? -3 : r < 0.8 ? 4 : -1.5)) * 10) / 10 }
  return { first: cur, list }
}

/** A smooth line, after the owner's Loupe references (Performance card 4b89, Alina Barni b295, DevDock 27ec):
 *  flat while the price holds, a soft ramp at each change, the area fading out underneath, a bold dot for "now".
 *  Every change shows, several in one day included, and the curve never rises above or dips below a real price.
 *  Slide a finger (or the mouse) along it to read the exact price at any moment. */
function PriceHistory({ id, price }: { id: string; price: number }) {
  const [days, setDays] = useState(7)
  const [at, setAt] = useState<number | null>(null)
  const now = useMemo(() => Date.now(), [])
  const all = useMemo(() => fakeChanges(id, price, now), [id, price, now])
  const t0 = startOfDay(now) - (days - 1) * DAY, t1 = startOfDay(now) + DAY
  const priceAt = (t: number) => { let p = all.first; for (const c of all.list) { if (c.t <= t) p = c.p; else break } return p }
  const inside = all.list.filter((c) => c.t > t0)
  const startP = priceAt(t0)
  const values = [startP, ...inside.map((c) => c.p)]
  const lo = Math.min(...values), hi = Math.max(...values), pad = Math.max((hi - lo) * 0.18, 0.6)
  const X0 = 3, PW = 258, Y0 = 10, PH = 80, YB = Y0 + PH
  const x = (t: number) => X0 + ((t - t0) / (t1 - t0)) * PW
  const y = (p: number) => Y0 + (1 - (p - (lo - pad)) / (hi - lo + 2 * pad)) * PH
  const ramp = days > 7 ? 3.2 : 7 // half the width of a change's ramp, in chart units
  let d = `M${x(t0).toFixed(1)} ${y(startP).toFixed(1)}`
  let px = x(t0), py = y(startP)
  inside.forEach((c, i) => {
    const cx = x(c.t), nx = i + 1 < inside.length ? x(inside[i + 1].t) : x(now), cy = y(c.p)
    const w = Math.max(0.5, Math.min(ramp, (cx - px) / 2, (nx - cx) / 2)) // ramps never run into each other
    d += `H${(cx - w).toFixed(1)}C${cx.toFixed(1)} ${py.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)} ${(cx + w).toFixed(1)} ${cy.toFixed(1)}`
    px = cx; py = cy
  })
  d += `H${x(now).toFixed(1)}`
  const gid = useId()
  const cols = Array.from({ length: days }, (_, i) => t0 + i * DAY)
  const wd = new Intl.DateTimeFormat('fr-CA', { weekday: 'short' }), dm = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'short' })
  const last = all.list[all.list.length - 1]
  const since = last ? now - last.t : 30 * DAY
  const quiet = since < 36e5 ? `changé il y a ${Math.max(1, Math.round(since / 6e4))} min` : since < DAY ? `changé il y a ${Math.round(since / 36e5)} h` : `inchangé depuis ${Math.floor(since / DAY)} ${Math.floor(since / DAY) > 1 ? 'jours' : 'jour'}`
  const when = at == null ? '' : new Intl.DateTimeFormat('fr-CA', days > 7 ? { day: 'numeric', month: 'short', hour: 'numeric' } : { weekday: 'short', hour: 'numeric' }).format(at)
  const scrub = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const t = t0 + (((e.clientX - box.left) / box.width) * 300 - X0) / PW * (t1 - t0)
    setAt(clamp(t, t0, now))
  }
  return (
    <section className="x-hist" aria-label="Historique du prix">
      <div className="x-hist-head">
        <Seg label="Période" value={days} onChange={setDays} options={[{ v: 7, t: '7 jours' }, { v: 30, t: '30 jours' }]} />
        <p aria-live="off">{at == null ? quiet : <><b>{fmtPrice(priceAt(at))}</b>{' '}{when}</>}</p>
      </div>
      <svg className="x-line" viewBox="0 0 300 118" role="img" onPointerDown={scrub} onPointerMove={scrub} onPointerLeave={() => setAt(null)} onPointerUp={(e) => { if (e.pointerType !== 'mouse') setAt(null) }}
        aria-label={`Prix des ${days} derniers jours : de ${fmtPrice(lo)} à ${fmtPrice(hi)} cents le litre, ${inside.length} ${inside.length > 1 ? 'changements' : 'changement'}`}>
        {cols.map((t, i) => (days === 7 || i % 7 === 0) && i > 0 && <path key={t} className="day" d={`M${x(t).toFixed(1)} ${Y0 - 4}V${YB}`} />)}
        <path className="level" d={`M${X0} ${y(hi).toFixed(1)}H${X0 + PW}`} />
        {hi !== lo && <path className="level" d={`M${X0} ${y(lo).toFixed(1)}H${X0 + PW}`} />}
        <text className="val" x="298" y={y(hi) + 4.500} textAnchor="end">{fmtPrice(hi)}</text>
        {hi !== lo && <text className="val" x="298" y={y(lo) + 4.500} textAnchor="end">{fmtPrice(lo)}</text>}
        <defs>
          <linearGradient id={`${gid}a`} x1="0" y1={Y0} x2="0" y2={YB} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--ink)" stopOpacity=".2" /><stop offset="1" stopColor="var(--ink)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${gid}l`} x1={X0} y1="0" x2={x(now)} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--ink)" stopOpacity=".3" /><stop offset=".7" stopColor="var(--ink)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path className="area" d={`${d}V${YB}H${x(t0).toFixed(1)}Z`} fill={`url(#${gid}a)`} />
        <path key={days} className="step" d={d} pathLength={1} stroke={`url(#${gid}l)`} />
        {at != null && <path className="cursor" d={`M${x(at).toFixed(1)} ${Y0 - 4}V${YB}`} />}
        <circle className="now" cx={x(at ?? now)} cy={y(priceAt(at ?? now))} r="5.500" />
        {days === 7
          ? cols.map((t, i) => <text key={t} x={x(t + DAY / 2)} y="112" textAnchor="middle" className={i === 6 ? 'today' : undefined}>{i === 6 ? 'auj.' : wd.format(t).replace('.', '')}</text>)
          : cols.map((t, i) => i % 7 === 0 && i < 28 ? <text key={t} x={x(t) + 2} y="112">{dm.format(t)}</text> : i === 29 ? <text key={t} x={X0 + PW} y="112" textAnchor="end" className="today">auj.</text> : null)}
      </svg>
    </section>
  )
}

/** What a station's card unfolds to show: why the savings are what they are, its other fuels, the last week, and the reference switch. */
export function StationMore({ j, r, base, ownRef, onMakeRef, onDropRef, onReport }: { j: Jauge; r: Ranked; base: Ranked | null; ownRef: boolean; onMakeRef: () => void; onDropRef: () => void; onReport: () => void }) {
  const others = FUELS.filter((f: Fuel) => f !== j.fuel)
  return (
    <>
      {!r.isBaseline && base && (
        <div className="x-why" aria-label="D’où vient ce montant">
          <p><span>Prix<small>{fmtPrice(r.price)} contre {fmtPrice(base.price)}</small></span><em>{signedMoney(r.priceSaving)} $</em></p>
          <p><span>Détour<small>≈ {fmtKm(r.extraKm)} km de plus, aller-retour</small></span><em>{r.detourCost > 0.004 ? `−${fmtMoney(r.detourCost)}` : fmtMoney(0)} $</em></p>
        </div>
      )}
      <div className="x-others">
        {others.map((f) => (
          <p key={f}><span>{FUEL_LABEL[f]}</span><b>{r.s.p[f] == null ? '—' : fmtPrice(r.s.p[f]!)}</b></p>
        ))}
      </div>
      <PriceHistory id={r.s.id + j.fuel} price={r.price} />
      <div className="x-foot">
        <button className="x-ref" aria-pressed={r.isBaseline} disabled={r.isBaseline && !ownRef} onClick={(e) => { e.stopPropagation(); if (r.isBaseline) onDropRef(); else onMakeRef() }}>
          {r.isBaseline ? <IconCheck /> : <IconPinMark />}Ma référence
        </button>
        <button className="x-ref" onClick={(e) => { e.stopPropagation(); onReport() }}><IconFlag />Prix inexact ?</button>
      </div>
    </>
  )
}

/** Opens from "Prix inexact ?" on a station: says whose price it is, then links to the Régie's own site.
 *  (Its site has no page per station and no report form; its own button only writes an e-mail to
 *  req_enquete@regie-energie.qc.ca. A pre-written e-mail from Jauge was tried on 2026-11-26 and set aside for now.) */
export function ReportPrice({ j, r }: { j: Jauge; r: Ranked }) {
  return (
    <div className="x-report">
      <h2>Ce prix est inexact ?</h2>
      <div className="x-report-what">
        <BrandBadge brand={r.s.b} size={46} />
        <div><b>{stationName(r.s)}</b><small>{stationWhere(r.s)}</small></div>
        <p><small>{FUEL_LABEL[j.fuel]}</small><span className="fb-pill">{fmtPrice(r.price)}<small>¢/L</small></span></p>
      </div>
      <p>Chaque station déclare elle-même ses prix à la Régie de l’énergie. Jauge les affiche tels quels.</p>
      <a className="fb-go" href="https://regieessencequebec.ca" target="_blank" rel="noreferrer"><IconFlag />Signaler à la Régie</a>
    </div>
  )
}

// ---------- settings ----------
/** Each drawing stands for a range of consumption; tapping it sets a typical value inside that range. */
const CARS = [{ v: 6.5, max: 7, t: <CarSmall />, name: 'Petite voiture' }, { v: 8, max: 9.5, t: <CarMid />, name: 'Voiture moyenne' }, { v: 11, max: Infinity, t: <CarBig />, name: 'VUS ou camion' }]
export function Settings({ j, onReplay }: { j: Jauge; onReplay: () => void }) {
  const [nav, setNav] = useState('google'), [lang, setLang] = useState('fr'), [theme, setTheme] = useState('auto')
  const cons = j.consL100
  const step = (d: number) => j.setConsL100(clamp(Math.round((cons + d) * 2) / 2, 3, 20))
  return (
    <div className="x-settings">
      <h2>Réglages</h2>

      <section>
        <h3>Ta voiture</h3>
        <div className="x-cars" role="radiogroup" aria-label="Taille de ta voiture">
          {CARS.map((c) => (
            <button key={c.v} role="radio" aria-checked={c === CARS.find((k) => cons <= k.max)} aria-label={c.name} onClick={() => j.setConsL100(c.v)}>{c.t}</button>
          ))}
        </div>
        <div className="x-cons">
          <button onClick={() => step(-0.5)} disabled={cons <= 3} aria-label="Consomme moins"><IconMinus /></button>
          <span aria-live="polite"><b>{new Intl.NumberFormat('fr-CA', { minimumFractionDigits: 1 }).format(cons)}</b> L / 100 km</span>
          <button onClick={() => step(0.5)} disabled={cons >= 20} aria-label="Consomme plus"><IconPlus /></button>
        </div>
      </section>

      <section>
        <h3>Rayon de recherche</h3>
        <Seg label="Rayon de recherche" value={j.radiusKm ?? 0} onChange={(v) => j.setRadiusKm(v || null)}
          options={[{ v: 0, t: 'Auto' }, { v: 5, t: '5 km' }, { v: 10, t: '10 km' }, { v: 25, t: '25 km' }, { v: 50, t: '50 km' }]} />
      </section>

      <section>
        <h3>Itinéraire</h3>
        <Seg label="Application pour l’itinéraire" value={nav} onChange={setNav} options={[{ v: 'google', t: 'Google Maps' }, { v: 'waze', t: 'Waze' }, { v: 'apple', t: 'Plans' }]} />
      </section>

      <section className="x-two">
        <div><h3>Langue</h3><Seg label="Langue" value={lang} onChange={setLang} options={[{ v: 'fr', t: 'Français' }, { v: 'en', t: 'English' }]} /></div>
        <div><h3>Thème</h3><Seg label="Thème" value={theme} onChange={setTheme} options={[{ v: 'auto', t: 'Auto' }, { v: 'light', t: 'Clair' }, { v: 'dark', t: 'Sombre' }]} /></div>
      </section>

      <button className="x-replay" onClick={onReplay}>Revoir l’écran d’accueil</button>
    </div>
  )
}
