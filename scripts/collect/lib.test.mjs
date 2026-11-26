import assert from 'node:assert/strict'
import { test } from 'node:test'
import { diff, historyFile, historyLine, looksBroken, parsePrice, stamp, stationId, toStations } from './lib.mjs'

const feature = (over = {}) => ({
  geometry: { coordinates: [-73.49946, 45.53646] },
  properties: {
    Name: 'Super gaz ltée #808', brand: 'Super Gaz', Address: '700 ch. de Chambly, Longueuil', Region: 'Montérégie',
    Prices: [
      { GasType: 'Régulier', Price: '139.9¢', IsAvailable: true },
      { GasType: 'Super', Price: '164.9¢', IsAvailable: true },
      { GasType: 'Diesel', Price: null, IsAvailable: false },
    ],
    ...over,
  },
})

test('a price is read the way the feed writes it', () => {
  assert.equal(parsePrice('166.4¢'), 166.4)
  assert.equal(parsePrice('166,4¢'), 166.4)
  assert.equal(parsePrice(null), null)
  assert.equal(parsePrice('0¢'), null)
})

test('the feed becomes a compact station list', () => {
  const { stations, skipped, generatedAt } = toStations({ metadata: { generated_at: '2026-11-26T20:20:00.41Z' }, features: [feature()] })
  assert.equal(generatedAt, '2026-11-26T20:20:00.41Z')
  assert.equal(skipped.length, 0)
  assert.deepEqual(stations[0], {
    id: stationId('700 ch. de Chambly, Longueuil', 45.53646, -73.49946), n: 'Super gaz ltée #808', b: 'Super Gaz',
    a: '700 ch. de Chambly, Longueuil', r: 'Montérégie', lat: 45.53646, lon: -73.49946, p: { R: 139.9, S: 164.9 },
  })
})

test('a station with no banner has no brand', () => {
  assert.equal(toStations({ features: [feature({ brand: 'Aucun' })] }).stations[0].b, null)
})

test('a station that cannot be placed is set aside, not kept at 0, 0', () => {
  const { stations, skipped } = toStations({ features: [{ ...feature(), geometry: { coordinates: [0, 0] } }] })
  assert.equal(stations.length, 0)
  assert.equal(skipped[0].reason, 'no usable position')
})

const at = '2026-11-26T20:20:00.41Z', later = '2026-11-26T21:05:00Z'
const seconds = (iso) => Math.floor(new Date(iso).getTime() / 1000)
const station = (p, t) => ({ id: 'abc', p, ...(t ? { t } : {}) })

test('a station seen for the first time gets a starting line per fuel', () => {
  const { changes, stations } = diff([], [station({ R: 139.9, S: 164.9 })], at)
  assert.deepEqual(changes, [{ id: 'abc', fuel: 'R', price: 139.9 }, { id: 'abc', fuel: 'S', price: 164.9 }])
  assert.deepEqual(stations[0].t, { R: seconds(at), S: seconds(at) })
})

test('an unchanged price writes nothing and keeps the time of its last change', () => {
  const first = diff([], [station({ R: 139.9 })], at).stations
  const { changes, stations } = diff(first, [station({ R: 139.9 })], later)
  assert.deepEqual(changes, [])
  assert.deepEqual(stations[0].t, { R: seconds(at) })
})

test('a changed price writes one line and restarts its clock', () => {
  const first = diff([], [station({ R: 139.9, S: 164.9 })], at).stations
  const { changes, stations } = diff(first, [station({ R: 141.9, S: 164.9 })], later)
  assert.deepEqual(changes, [{ id: 'abc', fuel: 'R', price: 141.9 }])
  assert.deepEqual(stations[0].t, { R: seconds(later), S: seconds(at) })
})

test('a fuel that is no longer sold writes a line with no price', () => {
  const first = diff([], [station({ R: 139.9, D: 189.9 })], at).stations
  const { changes, stations } = diff(first, [station({ R: 139.9 })], later)
  assert.deepEqual(changes, [{ id: 'abc', fuel: 'D', price: null }])
  assert.deepEqual(stations[0].t, { R: seconds(at) })
})

test('a station that left the feed writes nothing', () => {
  const first = diff([], [station({ R: 139.9 })], at).stations
  assert.deepEqual(diff(first, [], later).changes, [])
})

test('history is one file per station per month, one line per change', () => {
  assert.equal(stamp(at), '2026-11-26T20:20:00Z')
  assert.equal(historyFile('abc', at), 'h/2026-11/abc.csv')
  assert.equal(historyLine(at, 'R', 139.9), '2026-11-26T20:20:00Z,R,139.9\n')
  assert.equal(historyLine(at, 'D', null), '2026-11-26T20:20:00Z,D,\n')
})

test('a feed that lost most of its stations is treated as broken', () => {
  assert.equal(looksBroken(2476, 0), true)
  assert.equal(looksBroken(2476, 900), true)
  assert.equal(looksBroken(2476, 2470), false)
  assert.equal(looksBroken(0, 2476), false)
})
