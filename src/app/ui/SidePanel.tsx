// Wide screens: the panel on the left with the name, the global controls, the count, the list, and the source pinned at its bottom.
import type { ReactNode } from 'react'
import type { Jauge } from '../state'
import { LitresStepper } from './LitresStepper'
import { FuelSwitch, Wordmark } from './pieces'
import { PlaceChip, SettingsButton } from './TopControls'

// The source of the prices, always in view: one short line beside the count (phone) or pinned under the list (wide).
const SRC_FULL = 'Prix déclarés par les stations à la Régie de l’énergie'

export function SidePanel({ j, label, count, onPlace, onSettings, children }: { j: Jauge; label: string; count: ReactNode; onPlace: () => void; onSettings: () => void; children: ReactNode }) {
  return (
    <aside className="side-panel" aria-label="Stations">
      <div className="side-panel-top">
        <div><Wordmark /><span style={{ flex: 1 }} /><PlaceChip label={label} locating={j.locating} onClick={onPlace} /><SettingsButton onClick={onSettings} /></div>
        <div><FuelSwitch j={j} id="side" /><LitresStepper value={j.fillL} onChange={j.setFillL} /></div>
        {count != null && <p className="side-panel-count">{count}</p>}
      </div>
      <div className="side-panel-list">{children}</div>
      <p className="side-panel-source">{SRC_FULL}</p>
    </aside>
  )
}
