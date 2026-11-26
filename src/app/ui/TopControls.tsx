// The global controls: the place chip and the settings button; on a phone they sit over the map with the fuel switch and the litres.
import type { Jauge } from '../state'
import { IconDown, IconGear, IconLocate, IconPinMark } from './icons'
import { LitresStepper } from './LitresStepper'
import { FuelSwitch } from './pieces'

/** Where the person is looking; opens the place search. */
export function PlaceChip({ label, locating, onClick }: { label: string; locating: boolean; onClick: () => void }) {
  return (
    <button className="place-chip" onClick={onClick} aria-label={`Tu regardes autour de : ${label}. Changer d’endroit`}>
      <span className={locating ? 'spinning' : ''}>{label === 'Ma position' ? <IconLocate /> : <IconPinMark />}</span>
      <span>{label}</span>
      <IconDown />
    </button>
  )
}

export function SettingsButton({ onClick }: { onClick: () => void }) {
  return <button className="settings-button" onClick={onClick} aria-label="Réglages"><IconGear /></button>
}

/** Phone: where and settings on the left, fuel and litres on the right. */
export function TopControls({ j, label, onPlace, onSettings }: { j: Jauge; label: string; onPlace: () => void; onSettings: () => void }) {
  return (
    <header className="top-controls">
      <div className="place-controls"><PlaceChip label={label} locating={j.locating} onClick={onPlace} /><SettingsButton onClick={onSettings} /></div>
      <div className="fill-controls">
        <FuelSwitch j={j} id="top" />
        <LitresStepper value={j.fillL} onChange={j.setFillL} />
      </div>
    </header>
  )
}
