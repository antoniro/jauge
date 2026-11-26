// The price chart of an unfolded card: what a station charged for one fuel over the last 7 or 30 days.
import { useEffect, useId, useMemo, useState } from 'react'
import { clamp, fmtPrice } from '../domain/format'
import { Segmented } from './Segmented'

/** A recorded price change: from `t` on, the price is `p`. */
interface Change { t: number; p: number }
const DAY = 864e5
const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }

/** A smooth line, after the owner's Loupe references (Performance card 4b89, Alina Barni b295, DevDock 27ec):
 *  flat while the price holds, a soft ramp at each change, the area fading out underneath, a bold dot for "now".
 *  Every change shows, several in one day included, and the curve never rises above or dips below a real price.
 *  Slide a finger (or the mouse) along it to read the exact price at any moment. */
export function PriceChart({ price, load }: { price: number; load: (from: number, to: number) => Promise<{ t: number; p: number | null }[]> }) {
  const [days, setDays] = useState(7)
  const [at, setAt] = useState<number | null>(null)
  const now = useMemo(() => Date.now(), [])
  // what the collector recorded for this station and fuel over the last month
  const [list, setList] = useState<Change[]>([])
  useEffect(() => {
    let alive = true
    setList([])
    load(startOfDay(now) - 31 * DAY, now).then((c) => { if (alive) setList(c.filter((x): x is Change => x.p != null)) })
    return () => { alive = false }
  }, [load, now])
  const t0 = startOfDay(now) - (days - 1) * DAY, t1 = startOfDay(now) + DAY
  const priceAt = (t: number) => { let p: number | null = null; for (const c of list) { if (c.t <= t) p = c.p; else break } return p }
  const within = list.filter((c) => c.t > t0 && c.t <= now)
  // a history younger than the period starts where we first know a price, not at the left edge
  const known = priceAt(t0) != null ? t0 : within[0]?.t ?? null
  const firstP = priceAt(t0) ?? within[0]?.p ?? price
  const inside = priceAt(t0) != null ? within : within.slice(1)
  const from = known ?? now
  const values = [firstP, ...inside.map((c) => c.p)]
  const lo = Math.min(...values), hi = Math.max(...values), pad = Math.max((hi - lo) * 0.18, 0.6)
  const X0 = 3, PW = 258, Y0 = 10, PH = 80, YB = Y0 + PH
  const x = (t: number) => X0 + ((t - t0) / (t1 - t0)) * PW
  const y = (p: number) => Y0 + (1 - (p - (lo - pad)) / (hi - lo + 2 * pad)) * PH
  const ramp = days > 7 ? 3.2 : 7 // half the width of a change's ramp, in chart units
  let d = `M${x(from).toFixed(1)} ${y(firstP).toFixed(1)}`
  let px = x(from), py = y(firstP)
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
  const last = list[list.length - 1]
  const since = last ? now - last.t : 30 * DAY
  const quiet = known == null ? '' : known > t0 ? `depuis le ${dm.format(known)}` : since < 36e5 ? `changé il y a ${Math.max(1, Math.round(since / 6e4))} min` : since < DAY ? `changé il y a ${Math.round(since / 36e5)} h` : `inchangé depuis ${Math.floor(since / DAY)} ${Math.floor(since / DAY) > 1 ? 'jours' : 'jour'}`
  const when = at == null ? '' : new Intl.DateTimeFormat('fr-CA', days > 7 ? { day: 'numeric', month: 'short', hour: 'numeric' } : { weekday: 'short', hour: 'numeric' }).format(at)
  const scrub = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const t = t0 + (((e.clientX - box.left) / box.width) * 300 - X0) / PW * (t1 - t0)
    if (known != null) setAt(clamp(t, known, now))
  }
  return (
    <section className="price-chart" aria-label="Historique du prix">
      <div className="price-chart-head">
        <Segmented label="Période" value={days} onChange={setDays} options={[{ v: 7, t: '7 jours' }, { v: 30, t: '30 jours' }]} />
        <p aria-live="off">{at == null ? quiet : <><b>{fmtPrice(priceAt(at) ?? price)}</b>{' '}{when}</>}</p>
      </div>
      <svg className="price-chart-line" viewBox="0 0 300 118" role="img" onPointerDown={scrub} onPointerMove={scrub} onPointerLeave={() => setAt(null)} onPointerUp={(e) => { if (e.pointerType !== 'mouse') setAt(null) }}
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
          <linearGradient id={`${gid}l`} x1={x(from)} y1="0" x2={Math.max(x(now), x(from) + 1)} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--ink)" stopOpacity=".3" /><stop offset=".7" stopColor="var(--ink)" stopOpacity="1" />
          </linearGradient>
        </defs>
        {known != null && <path className="area" d={`${d}V${YB}H${x(from).toFixed(1)}Z`} fill={`url(#${gid}a)`} />}
        {known != null && <path key={`${days}${from}`} className="step" d={d} pathLength={1} stroke={`url(#${gid}l)`} />}
        {at != null && <path className="cursor" d={`M${x(at).toFixed(1)} ${Y0 - 4}V${YB}`} />}
        <circle className="now" cx={x(at ?? now)} cy={y(priceAt(at ?? now) ?? price)} r="5.500" />
        {days === 7
          ? cols.map((t, i) => <text key={t} x={x(t + DAY / 2)} y="112" textAnchor="middle" className={i === 6 ? 'today' : undefined}>{i === 6 ? 'auj.' : wd.format(t).replace('.', '')}</text>)
          : cols.map((t, i) => i % 7 === 0 && i < 28 ? <text key={t} x={x(t) + 2} y="112">{dm.format(t)}</text> : i === 29 ? <text key={t} x={X0 + PW} y="112" textAnchor="end" className="today">auj.</text> : null)}
      </svg>
    </section>
  )
}
