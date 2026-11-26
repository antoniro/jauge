// The fill volume, as the stepper everybody knows from shopping carts: − 50 L +. The number rolls.
import { clamp } from '../domain/format'
import { IconMinusSmall, IconPlusSmall, IconPump } from './icons'
import { Odometer } from './pieces'

const MIN_L = 10, MAX_L = 120, STEP_L = 5

export function LitresStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const set = (d: number) => { onChange(clamp(value + d, MIN_L, MAX_L)) }
  return (
    <span className="litres-stepper" role="group" aria-label="Litres de ton plein">
      <button onClick={() => set(-STEP_L)} disabled={value <= MIN_L} aria-label={`${STEP_L} litres de moins`}><IconMinusSmall /></button>
      <span className="litres-value" aria-live="polite" aria-label={`${value} litres`}><IconPump /><Odometer value={String(value)} />L</span>
      <button onClick={() => set(STEP_L)} disabled={value >= MAX_L} aria-label={`${STEP_L} litres de plus`}><IconPlusSmall /></button>
    </span>
  )
}
