// PROTOTYPE — throwaway.
import type { Fuel, Origin, RankInput, Ranking, Snapshot } from './data'
export interface VariantProps {
  snap: Snapshot; ranking: Ranking; inp: RankInput
  fuel: Fuel; setFuel: (f: Fuel) => void
  fillL: number; setFillL: (n: number) => void
  origin: Origin; locate: () => void; locating: boolean
  dark: boolean
}
