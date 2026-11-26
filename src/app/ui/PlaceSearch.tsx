// Where to look: the person's own position, or a town or village found by name (accents and case do not matter).
import { useMemo, useState } from 'react'
import type { Place } from '../domain/format'
import type { Jauge } from '../state'
import { IconLocate, IconPinMark, IconSearch } from './icons'

const plain = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function PlaceSearch({ j, places, onPlace, onMine }: { j: Jauge; places: Place[]; onPlace: (p: Place) => void; onMine: () => void }) {
  const [q, setQ] = useState('')
  const shown = useMemo(() => { const n = plain(q.trim()); return (n ? places.filter((p) => plain(p.name).includes(n)) : places).slice(0, 40) }, [q, places])
  return (
    <div className="place-search">
      <label className="search-field"><IconSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ville ou village" aria-label="Chercher une ville ou un village" autoComplete="off" spellCheck={false} enterKeyHint="search" /></label>
      <ul>
        <li>
          <button className="place-row me" aria-busy={j.locating} onClick={onMine}>
            <span className={`place-row-icon${j.locating ? ' spinning' : ''}`}><IconLocate /></span><b>Ma position</b>
          </button>
        </li>
        {shown.map((p) => (
          <li key={p.name}>
            <button className="place-row" onClick={() => onPlace(p)}>
              <span className="place-row-icon"><IconPinMark /></span><b>{p.name}</b><small>{p.n} {p.n > 1 ? 'stations' : 'station'}</small>
            </button>
          </li>
        ))}
        {!shown.length && <li className="place-none">Aucune station à cet endroit</li>}
      </ul>
    </div>
  )
}
