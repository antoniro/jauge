import { describe, expect, it } from 'vitest'
import { monthsBetween, parseHistory, period, priceAt } from './history'

const at = (iso: string) => Date.parse(iso)
const csv = `2026-11-26T20:25:00Z,R,149.9
2026-11-26T20:25:00Z,S,176.9
2026-11-27T11:05:00Z,R,152.9
2026-11-27T21:40:00Z,D,
not a line
2026-11-27T16:00:00Z,R,151.4
`

describe('reading a history file', () => {
  it('keeps the lines of one fuel, oldest first', () => {
    expect(parseHistory(csv, 'R')).toEqual([
      { t: at('2026-11-26T20:25:00Z'), p: 149.9 }, { t: at('2026-11-27T11:05:00Z'), p: 152.9 }, { t: at('2026-11-27T16:00:00Z'), p: 151.4 },
    ])
  })
  it('reads an empty price as "no longer sold"', () => {
    expect(parseHistory(csv, 'D')).toEqual([{ t: at('2026-11-27T21:40:00Z'), p: null }])
  })
  it('gives nothing for an empty file', () => {
    expect(parseHistory('', 'R')).toEqual([])
  })
})

describe('which monthly files cover a period', () => {
  it('is one month inside a month', () => {
    expect(monthsBetween(at('2026-11-05T00:00:00Z'), at('2026-11-26T00:00:00Z'))).toEqual(['2026-11'])
  })
  it('spans months and years', () => {
    expect(monthsBetween(at('2026-12-20T00:00:00Z'), at('2027-01-19T00:00:00Z'))).toEqual(['2026-12', '2027-01'])
    expect(monthsBetween(at('2027-01-30T12:00:00Z'), at('2027-03-01T12:00:00Z'))).toEqual(['2027-01', '2027-02', '2027-03'])
  })
})

describe('the price at a moment', () => {
  const r = parseHistory(csv, 'R')
  it('is the last change before it', () => {
    expect(priceAt(r, at('2026-11-27T12:00:00Z'))).toBe(152.9)
    expect(priceAt(r, at('2026-11-28T00:00:00Z'))).toBe(151.4)
  })
  it('is unknown before the first line', () => {
    expect(priceAt(r, at('2026-11-20T00:00:00Z'))).toBeNull()
  })
})

describe('a period for the chart', () => {
  const r = parseHistory(csv, 'R')
  it('starts from the price in force and lists the changes inside', () => {
    const p = period(r, at('2026-11-27T00:00:00Z'), at('2026-11-28T00:00:00Z'))
    expect(p.start).toBe(149.9)
    expect(p.inside.map((c) => c.p)).toEqual([152.9, 151.4])
    expect(p.known).toBe(at('2026-11-27T00:00:00Z'))
  })
  it('says from when a price is known if the history is younger than the period', () => {
    const p = period(r, at('2026-11-20T00:00:00Z'), at('2026-11-28T00:00:00Z'))
    expect(p.start).toBeNull()
    expect(p.known).toBe(at('2026-11-26T20:25:00Z'))
    expect(p.inside).toHaveLength(3)
  })
  it('knows nothing when there is no history', () => {
    expect(period([], 0, 1).known).toBeNull()
  })
})
