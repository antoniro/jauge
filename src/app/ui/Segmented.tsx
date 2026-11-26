// A segmented control: a few options side by side, the chosen one on a dark pill (settings, the chart's period).
import type { ReactNode } from 'react'

export function Segmented<T extends string | number>({ label, options, value, onChange }: { label: string; options: { v: T; t: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.v)} role="radio" aria-checked={o.v === value} onClick={() => onChange(o.v)}>{o.t}</button>
      ))}
    </div>
  )
}
