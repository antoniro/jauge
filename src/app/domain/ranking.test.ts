import { describe, expect, it } from 'vitest'
import type { Station } from './ranking'
import { around, betterOption, rank, roadKm } from './ranking'

// about 0.0127° of latitude is 1.41 km in a straight line, 1.84 km "by road"
const here = { lat: 45.5, lon: -73.5, label: 'Ma position' }
const station = (id: string, north: number, R?: number, extra: Partial<Station['p']> = {}): Station =>
  ({ id, n: id, b: null, a: '', r: '', lat: 45.5 + north, lon: -73.5, p: { ...(R == null ? {} : { R }), ...extra } })
const base = { origin: here, fuel: 'R' as const, fillL: 50, consL100: 8 }

describe('distance', () => {
  it('is the straight line times 1.3', () => {
    expect(roadKm(here, { lat: 45.5 + 0.01, lon: -73.5 })).toBeCloseTo(1.112 * 1.3, 2)
  })
})

describe('ranking by real savings', () => {
  const near = station('near', 0.001, 150), cheapFar = station('cheapFar', 0.01, 147), dear = station('dear', 0.002, 155)

  it('takes the closest station selling the fuel as the reference', () => {
    const r = rank({ ...base, stations: [cheapFar, near, dear, station('noRegular', 0.0001, undefined, { D: 190 })] })
    expect(r.baseline?.s.id).toBe('near')
    expect(r.baseline?.real).toBe(0)
  })

  it('counts the price saving on the fill minus the detour there and back', () => {
    const r = rank({ ...base, stations: [near, cheapFar] })
    const far = r.list.find((x) => x.s.id === 'cheapFar')!
    expect(far.priceSaving).toBeCloseTo(1.5, 5) // 3 cents on 50 L
    const extra = (roadKm(here, cheapFar) - roadKm(here, near)) * 2
    expect(far.extraKm).toBeCloseTo(extra, 5)
    expect(far.detourCost).toBeCloseTo(((extra * 8) / 100) * 1.5, 5) // litres burned, at the reference's price
    expect(far.real).toBeCloseTo(1.5 - far.detourCost, 5)
  })

  it('puts the highest real savings first and lets them go negative', () => {
    const r = rank({ ...base, stations: [near, cheapFar, dear] })
    expect(r.list.map((x) => x.s.id)).toEqual(['cheapFar', 'near', 'dear'])
    expect(r.list[2].real).toBeLessThan(0)
  })

  it('a far cheap station can lose to the detour', () => {
    const tooFar = station('tooFar', 0.08, 149) // 1 cent cheaper, about 11.5 km away
    const r = rank({ ...base, stations: [near, tooFar], radiusKm: 25 })
    expect(r.list.find((x) => x.s.id === 'tooFar')!.real).toBeLessThan(0)
  })

  it('compares with the reference the person picked', () => {
    const r = rank({ ...base, stations: [near, cheapFar, dear], refId: 'dear' })
    expect(r.baseline?.s.id).toBe('dear')
    expect(r.list.find((x) => x.s.id === 'near')!.priceSaving).toBeCloseTo(2.5, 5)
    expect(r.list.find((x) => x.s.id === 'near')!.detourCost).toBe(0) // it is closer than the reference
  })

  it('keeps a picked reference in the list even outside the radius', () => {
    const away = station('away', 0.3, 140)
    const r = rank({ ...base, stations: [near, dear, away], refId: 'away', radiusKm: 5 })
    expect(r.list.some((x) => x.s.id === 'away')).toBe(true)
  })

  it('looks within 10 km, and 25 km when fewer than five stations are found', () => {
    const many = [0.001, 0.002, 0.003, 0.004, 0.005].map((n, i) => station(`s${i}`, n, 150))
    const far = station('far', 0.12, 150) // about 17 km
    expect(rank({ ...base, stations: [...many, far] }).radiusKm).toBe(10)
    expect(rank({ ...base, stations: [...many, far] }).list).toHaveLength(5)
    const wide = rank({ ...base, stations: [near, far] })
    expect(wide.radiusKm).toBe(25)
    expect(wide.list).toHaveLength(2)
  })

  it('has nothing to rank when nobody sells the fuel', () => {
    expect(rank({ ...base, fuel: 'D', stations: [near] })).toEqual({ list: [], baseline: null, radiusKm: 10 })
  })
})

describe('better option', () => {
  it('is the best fill-up when it beats the reference by 50 cents or more', () => {
    const r = rank({ ...base, stations: [station('ref', 0.001, 150), station('good', 0.002, 147)] })
    expect(betterOption(r)?.s.id).toBe('good')
  })
  it('is nothing when the gain is small or the reference is already the best', () => {
    expect(betterOption(rank({ ...base, stations: [station('ref', 0.001, 150), station('meh', 0.002, 149.5)] }))).toBeNull()
    expect(betterOption(rank({ ...base, stations: [station('ref', 0.001, 150), station('dear', 0.002, 155)] }))).toBeNull()
  })
})

describe('overview of a place', () => {
  it('lists the stations around it that sell the fuel, cheapest first', () => {
    const list = around([station('b', 0.002, 152), station('a', 0.01, 149), station('x', 0.4, 120), station('d', 0.001, undefined, { D: 190 })], here, 'R')
    expect(list.map((s) => s.id)).toEqual(['a', 'b'])
  })
})
