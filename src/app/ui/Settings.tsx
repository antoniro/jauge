// The settings sheet: the car (its size and consumption), the search radius, the route app, language and theme.
import { useState } from 'react'
import { clamp } from '../domain/format'
import type { Jauge } from '../state'
import { IconMinus, IconPlus } from './icons'
import { Segmented } from './Segmented'

const car = { width: 46, height: 26, viewBox: '0 0 46 26', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
const CarSmall = () => (<svg {...car}><path d="M11 19H8.500v-5l3.500-1 3.500-5H26l4.500 5 5 1.200V19H34M17 19h11" /><circle cx="14" cy="19" r="3" /><circle cx="31" cy="19" r="3" /></svg>)
const CarMid = () => (<svg {...car}><path d="M8 19H4.500v-4.500l5-1.500 4-5.500h14l5.500 5.500 8 1.500V19h-3M14.500 19h17" /><circle cx="11.200" cy="19" r="3.200" /><circle cx="34.800" cy="19" r="3.200" /></svg>)
const CarBig = () => (<svg {...car}><path d="M7.500 20H3.500V9c0-1.700 1.300-3 3-3h20.500l6 6 9 1.800V20h-3M15 20h16.500M23 6v6.500h10" /><circle cx="11.200" cy="20" r="3.700" /><circle cx="35.200" cy="20" r="3.700" /></svg>)

/** Each drawing stands for a range of consumption; tapping it sets a typical value inside that range. */
const CARS = [{ v: 6.5, max: 7, t: <CarSmall />, name: 'Petite voiture' }, { v: 8, max: 9.5, t: <CarMid />, name: 'Voiture moyenne' }, { v: 11, max: Infinity, t: <CarBig />, name: 'VUS ou camion' }]

export function Settings({ j }: { j: Jauge }) {
  const [nav, setNav] = useState('google'), [lang, setLang] = useState('fr'), [theme, setTheme] = useState('auto')
  const cons = j.consL100
  const step = (d: number) => j.setConsL100(clamp(Math.round((cons + d) * 2) / 2, 3, 20))
  return (
    <div className="settings">
      <h2>Réglages</h2>

      <section>
        <h3>Ta voiture</h3>
        <div className="car-sizes" role="radiogroup" aria-label="Taille de ta voiture">
          {CARS.map((c) => (
            <button key={c.v} role="radio" aria-checked={c === CARS.find((k) => cons <= k.max)} aria-label={c.name} onClick={() => j.setConsL100(c.v)}>{c.t}</button>
          ))}
        </div>
        <div className="consumption-stepper">
          <button onClick={() => step(-0.5)} disabled={cons <= 3} aria-label="Consomme moins"><IconMinus /></button>
          <span aria-live="polite"><b>{new Intl.NumberFormat('fr-CA', { minimumFractionDigits: 1 }).format(cons)}</b> L / 100 km</span>
          <button onClick={() => step(0.5)} disabled={cons >= 20} aria-label="Consomme plus"><IconPlus /></button>
        </div>
      </section>

      <section>
        <h3>Rayon de recherche</h3>
        <Segmented label="Rayon de recherche" value={j.radiusKm ?? 0} onChange={(v) => j.setRadiusKm(v || null)}
          options={[{ v: 0, t: 'Auto' }, { v: 5, t: '5 km' }, { v: 10, t: '10 km' }, { v: 25, t: '25 km' }, { v: 50, t: '50 km' }]} />
      </section>

      <section>
        <h3>Itinéraire</h3>
        <Segmented label="Application pour l’itinéraire" value={nav} onChange={setNav} options={[{ v: 'google', t: 'Google Maps' }, { v: 'waze', t: 'Waze' }, { v: 'apple', t: 'Plans' }]} />
      </section>

      <section className="settings-pair">
        <div><h3>Langue</h3><Segmented label="Langue" value={lang} onChange={setLang} options={[{ v: 'fr', t: 'Français' }, { v: 'en', t: 'English' }]} /></div>
        <div><h3>Thème</h3><Segmented label="Thème" value={theme} onChange={setTheme} options={[{ v: 'auto', t: 'Auto' }, { v: 'light', t: 'Clair' }, { v: 'dark', t: 'Sombre' }]} /></div>
      </section>

    </div>
  )
}
