// PROTOTYPE — throwaway. MapLibre + free OpenFreeMap tiles, recoloured; price pills for ranked stations, dots for the rest.
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef } from 'react'
import type { Fuel, Origin, Ranked, Station } from '../main-screen/data'
import { roadKm } from '../main-screen/data'
import { fmtPrice } from './shared'

maplibregl.setWorkerUrl(workerUrl)

interface Props {
  stations: Station[]; pills: Ranked[]; fuel: Fuel; origin: Origin; dark: boolean; accent: string
  bestId?: string; refId?: string; selected: Station | null; onSelect: (id: string) => void; padBottom: number; padTop?: number
  /** Every station in view gets a quiet price tag up close, and each region shows its lowest price from far away. */
  allPrices?: boolean
  padLeft?: number
  /** false when nobody's position is known (a place picked by hand): no "you are here" dot */
  showMe?: boolean
  /** With nothing selected: fit these bounds ([west, south, east, north]), or 'keep' the view as it is. Default: centre on the person. */
  frame?: [number, number, number, number] | 'keep' | null
  /** The person dragged the map well away from where they are: offer to search there (null when back). */
  onAway?: (p: Origin | null) => void
}

const Z_REGION = 9.3 // below: one bubble per region
const AREA_MAX = 60
const AREA_REACH = 170 // px: a station further than this from every place name on screen stays a plain dot
const PLACE_KINDS = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'quarter', 'neighbourhood']) // not islands, provinces or countries
interface Area { key: string; name: string; low: Station; price: number; lon: number; lat: number }
interface Place { key: string; name: string; lon: number; lat: number; x: number; y: number }
const Z_PRICES = 12.2 // at or above: quiet price tags on the stations that have no card
const QUIET_MAX = 80
const SHORT_REGION: Record<string, string> = { 'Gaspésie-Îles-de-la-Madeleine': 'Gaspésie', 'Saguenay-Lac-Saint-Jean': 'Saguenay', 'Abitibi-Témiscamingue': 'Abitibi' }
type Box = { x: number; y: number; w: number; h: number }
const overlaps = (a: Box, k: Box) => a.x < k.x + k.w && a.x + a.w > k.x && a.y < k.y + k.h && a.y + a.h > k.y

const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()

function recolour(map: maplibregl.Map, dark: boolean) {
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id
    try {
      if (layer.type === 'background') map.setPaintProperty(id, 'background-color', cssVar('--map-land'))
      else if (layer.type === 'fill' && /water/.test(id)) map.setPaintProperty(id, 'fill-color', cssVar('--map-water'))
      else if (layer.type === 'fill' && /park|wood|grass|landcover|landuse/.test(id)) map.setPaintProperty(id, 'fill-opacity', dark ? 0.2 : 0.3)
      else if (layer.type === 'line' && /road|highway|street|bridge|tunnel/.test(id)) map.setPaintProperty(id, 'line-color', cssVar('--map-road'))
      else if (layer.type === 'symbol' && /label|name|place/.test(id)) {
        map.setPaintProperty(id, 'text-color', cssVar('--ink-3'))
        map.setPaintProperty(id, 'text-halo-color', cssVar('--map-land'))
      } else if (layer.type === 'raster') map.setLayoutProperty(id, 'visibility', 'none')
      if (/shield|poi|housenum/.test(id)) map.setLayoutProperty(id, 'visibility', 'none')
    } catch { /* layer without that property */ }
  }
}

/** A gentle arc from the person to the station (no routing service in the mockup). */
function arc(a: Origin, b: Station): [number, number][] {
  const mx = (a.lon + b.lon) / 2, my = (a.lat + b.lat) / 2
  const dx = b.lon - a.lon, dy = b.lat - a.lat
  const cx = mx - dy * 0.22, cy = my + dx * 0.22 * 0.5
  const out: [number, number][] = []
  for (let i = 0; i <= 32; i++) {
    const t = i / 32, u = 1 - t
    out.push([u * u * a.lon + 2 * u * t * cx + t * t * b.lon, u * u * a.lat + 2 * u * t * cy + t * t * b.lat])
  }
  return out
}

export default function FableMap({ stations, pills, fuel, origin, dark, accent, bestId, refId, selected, onSelect, padBottom, padTop = 96, allPrices = false, padLeft = 64, onAway, showMe = true, frame = null }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markers = useRef(new Map<string, { m: maplibregl.Marker; el: HTMLButtonElement }>())
  const meMarker = useRef<maplibregl.Marker | null>(null)
  const selMarker = useRef<maplibregl.Marker | null>(null)
  const quiet = useRef(new Map<string, { m: maplibregl.Marker; el: HTMLButtonElement; price: number }>())
  const regions = useRef<{ m: maplibregl.Marker; el: HTMLButtonElement; w: number }[]>([])
  const areas = useRef(new Map<string, { m: maplibregl.Marker; el: HTMLButtonElement; w: number; price: number }>())
  const placeLayers = useRef<{ id: string; opacity: unknown }[]>([])
  const data = useRef({ stations, fuel, pillIds: new Set<string>() })
  const ready = useRef(false)
  const queue = useRef<(() => void)[]>([])
  const onSelectRef = useRef(onSelect); onSelectRef.current = onSelect
  const onAwayRef = useRef(onAway); onAwayRef.current = onAway
  const originRef = useRef(origin); originRef.current = origin
  const byHand = useRef(false)
  const autoAt = useRef(0)
  /** After a drag or pinch: is the middle of the map far from the person? Name it after the nearest place label. */
  const checkAway = () => {
    const map = mapRef.current; if (!map || !onAwayRef.current) return
    if (!byHand.current) { onAwayRef.current(null); return }
    const c = map.getCenter(), o = originRef.current
    // "away" = the person's own spot has left the screen (and is at least 1.5 km from the middle)
    const at = map.project(c), me = map.project([o.lon, o.lat]), box = map.getContainer()
    const onScreen = me.x > 0 && me.x < box.clientWidth && me.y > 0 && me.y < box.clientHeight
    if (map.getZoom() < Z_REGION || onScreen || roadKm(o, { lat: c.lat, lon: c.lng }) / 1.3 < 1.5) { onAwayRef.current(null); return }
    let label = '', best = Infinity
    const ids = placeLayers.current.map((l) => l.id)
    for (const ft of ids.length ? map.queryRenderedFeatures({ layers: ids }) : []) {
      const name = ft.properties?.name as string | undefined
      if (!name || !PLACE_KINDS.has(ft.properties?.class) || ft.geometry.type !== 'Point') continue
      const p = map.project(ft.geometry.coordinates as [number, number]), d = (p.x - at.x) ** 2 + (p.y - at.y) ** 2
      if (d < best) { best = d; label = name }
    }
    onAwayRef.current({ lat: c.lat, lon: c.lng, label: label || 'Cet endroit' })
  }
  // Price tags that would sit on top of a more important one shrink to a dot.
  const declutter = () => {
    const map = mapRef.current; if (!map) return
    if (allPrices && map.getZoom() < Z_REGION) {
      // far away: region bubbles only, the closest regions win the space
      const keptR: Box[] = []
      for (const r of regions.current) {
        if (!r.w) r.w = r.el.offsetWidth
        const p = map.project(r.m.getLngLat())
        const box = { x: p.x - r.w / 2 - 3, y: p.y - 24, w: r.w + 6, h: 48 }
        const hit = keptR.some((k) => overlaps(box, k))
        r.el.classList.toggle('mini', hit)
        if (!hit) keptR.push(box)
      }
      return
    }
    const rank = (el: HTMLElement) => (el.classList.contains('on') ? 0 : el.classList.contains('best') ? 1 : el.classList.contains('ref') ? 2 : 3)
    const kept: Box[] = []
    ;[...markers.current.values()].map((v, i) => ({ v, i })).sort((a, b) => rank(a.v.el) - rank(b.v.el) || a.i - b.i).forEach(({ v }) => {
      const p = map.project(v.m.getLngLat())
      const big = v.el.classList.contains('on'), w = big ? 96 : v.el.classList.contains('ref') ? 74 : 62, h = v.el.classList.contains('ref') ? 52 : big ? 46 : 34
      const box = { x: p.x - w / 2, y: p.y - h, w, h }
      const hit = kept.some((k) => overlaps(box, k))
      v.el.classList.toggle('mini', hit)
      if (!hit) kept.push(box)
    })
    // quiet tags come last, cheapest first; one that would overlap leaves only its dot
    ;[...quiet.current.values()].sort((a, b) => a.price - b.price).forEach((v) => {
      const p = map.project(v.m.getLngLat())
      const box = { x: p.x - 25, y: p.y - 32, w: 50, h: 28 }
      const hit = kept.some((k) => overlaps(box, k))
      v.el.classList.toggle('mini', hit)
      if (!hit) kept.push(box)
    })
    // area bubbles give way to the tags of your own picks, then the cheapest area wins
    ;[...areas.current.values()].sort((a, b) => a.price - b.price).forEach((v) => {
      if (!v.w) v.w = v.el.offsetWidth
      const p = map.project(v.m.getLngLat())
      const box = { x: p.x - v.w / 2 - 3, y: p.y - 24, w: v.w + 6, h: 48 }
      const hit = kept.some((k) => overlaps(box, k))
      v.el.classList.toggle('mini', hit)
      if (!hit) kept.push(box)
    })
  }
  /** Which of the zoom bands we are in: regions, dots, or every price. */
  const syncBand = () => {
    const map = mapRef.current; if (!map || !el.current) return
    const z = map.getZoom()
    const band = !allPrices ? 'mid' : z < Z_REGION ? 'region' : z >= Z_PRICES ? 'near' : 'area'
    if (el.current.dataset.band !== band) {
      el.current.dataset.band = band
      // in the area band the bubbles carry the place names, so the map's own copies step back (they stay placed, only see-through)
      for (const l of placeLayers.current) { try { map.setPaintProperty(l.id, 'text-opacity', band === 'area' ? 0 : ((l.opacity ?? 1) as number)) } catch { /* layer gone */ } }
      declutter()
    }
  }
  /** Quiet price tags for the stations in view that have no card. */
  const syncQuiet = () => {
    const map = mapRef.current; if (!map) return
    const pool = quiet.current
    const want = new Map<string, Station>()
    if (allPrices && map.getZoom() >= Z_PRICES) {
      const b = map.getBounds(), { stations: all, fuel: f, pillIds } = data.current
      all.filter((s) => s.p[f] != null && !pillIds.has(s.id) && b.contains([s.lon, s.lat]))
        .sort((x, y) => x.p[f]! - y.p[f]!).slice(0, QUIET_MAX).forEach((s) => want.set(s.id, s))
    }
    pool.forEach((v, id) => { if (!want.has(id)) { v.m.remove(); pool.delete(id) } })
    want.forEach((s, id) => {
      if (pool.has(id)) return
      const price = s.p[data.current.fuel]!
      const wrap = document.createElement('button')
      wrap.className = 'b-pin quiet'
      wrap.setAttribute('aria-label', `${s.b ?? 'Station'}, ${fmtPrice(price)} cents le litre`)
      const inner = document.createElement('span'); inner.textContent = fmtPrice(price)
      wrap.appendChild(inner)
      wrap.onclick = (e) => { e.stopPropagation(); onSelectRef.current(id) }
      const m = new maplibregl.Marker({ element: wrap, anchor: 'bottom', offset: [0, -8] }).setLngLat([s.lon, s.lat]).addTo(map)
      pool.set(id, { m, el: wrap, price })
    })
    declutter()
  }
  /** Between "every price" and "regions": the lowest price around each place name the map is showing (neighbourhoods and towns up close, cities further out). */
  const syncAreas = () => {
    const map = mapRef.current; if (!map) return
    const pool = areas.current, z = map.getZoom()
    const want = new Map<string, Area>()
    if (allPrices && z >= Z_REGION && z < Z_PRICES) {
      const places = new Map<string, Place>()
      const ids = placeLayers.current.map((l) => l.id)
      for (const ft of ids.length ? map.queryRenderedFeatures({ layers: ids }) : []) {
        const name = ft.properties?.name as string | undefined
        if (!name || !PLACE_KINDS.has(ft.properties?.class) || ft.geometry.type !== 'Point') continue
        const [lon, lat] = ft.geometry.coordinates as [number, number]
        const key = `${name}:${lon.toFixed(2)}:${lat.toFixed(2)}`
        if (!places.has(key)) { const p = map.project([lon, lat]); places.set(key, { key, name, lon, lat, x: p.x, y: p.y }) }
      }
      const list = [...places.values()], { stations: all, fuel: f } = data.current
      const c = map.getContainer(), nw = map.unproject([-AREA_REACH, -AREA_REACH]), se = map.unproject([c.clientWidth + AREA_REACH, c.clientHeight + AREA_REACH])
      for (const s of all) {
        const price = s.p[f]
        if (price == null || s.lon < nw.lng || s.lon > se.lng || s.lat > nw.lat || s.lat < se.lat) continue
        const p = map.project([s.lon, s.lat])
        let near: Place | null = null, best = AREA_REACH ** 2
        for (const pl of list) { const d = (pl.x - p.x) ** 2 + (pl.y - p.y) ** 2; if (d < best) { best = d; near = pl } }
        if (!near) continue
        const a = want.get(near.key)
        if (!a) want.set(near.key, { key: near.key, name: near.name, low: s, price, lon: near.lon, lat: near.lat })
        else if (price < a.price) { a.low = s; a.price = price }
      }
      if (want.size > AREA_MAX) [...want.values()].sort((a, b) => a.price - b.price).slice(AREA_MAX).forEach((a) => want.delete(a.key))
    }
    let changed = false
    pool.forEach((v, k) => { const a = want.get(k); if (!a || a.price !== v.price) { v.m.remove(); pool.delete(k); changed = true } })
    want.forEach((a, k) => {
      if (pool.has(k)) return
      changed = true
      const wrap = document.createElement('button')
      wrap.className = 'b-region b-area'
      wrap.setAttribute('aria-label', `${a.name}, à partir de ${fmtPrice(a.price)} cents le litre. Zoomer`)
      const name = document.createElement('small'); name.textContent = a.name
      const price = document.createElement('b'); price.textContent = fmtPrice(a.price)
      const inner = document.createElement('span'); inner.append(name, price)
      wrap.appendChild(inner)
      wrap.onclick = (e) => { e.stopPropagation(); map.flyTo({ center: [a.low.lon, a.low.lat], zoom: Math.max(13, map.getZoom() + 1.5), duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1100, essential: true }) }
      const m = new maplibregl.Marker({ element: wrap, anchor: 'center' }).setLngLat([a.lon, a.lat]).addTo(map)
      pool.set(k, { m, el: wrap, w: 0, price: a.price })
    })
    if (changed) declutter()
  }
  const whenReady = (fn: () => void) => { if (ready.current) fn(); else queue.current.push(fn) }

  useEffect(() => {
    const map = new maplibregl.Map({
      container: el.current!,
      center: [origin.lon, origin.lat], zoom: 12.2, attributionControl: { compact: true }, pitchWithRotate: false, dragRotate: false,
    })
    mapRef.current = map
    map.touchZoomRotate.disableRotation()
    // the free dark style references a pattern image it does not ship: drop those layers
    map.setStyle(`https://tiles.openfreemap.org/styles/${dark ? 'dark' : 'positron'}`, {
      transformStyle: (_prev, next) => ({ ...next, layers: next.layers.filter((l) => !(l.type === 'fill' && l.paint && 'fill-pattern' in l.paint)) }),
    })
    map.on('load', () => {
      recolour(map, dark)
      placeLayers.current = (map.getStyle().layers ?? []).filter((l) => l.type === 'symbol' && (l as { 'source-layer'?: string })['source-layer'] === 'place').map((l) => ({ id: l.id, opacity: map.getPaintProperty(l.id, 'text-opacity') }))
      el.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
      const empty = { type: 'FeatureCollection' as const, features: [] }
      map.addSource('route', { type: 'geojson', data: empty })
      map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': cssVar('--accent'), 'line-width': 4, 'line-dasharray': [0.1, 1.9] } })
      map.addSource('all', { type: 'geojson', data: empty })
      map.addLayer({ id: 'all-dots', type: 'circle', source: 'all', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 12, 4.5, 15, 7],
        'circle-color': cssVar('--ink'), 'circle-opacity': dark ? 0.5 : 0.42, 'circle-stroke-width': 1.5, 'circle-stroke-color': cssVar('--map-land'),
      } })
      map.on('click', 'all-dots', (e: maplibregl.MapLayerMouseEvent) => { const id = e.features?.[0]?.properties?.id; if (id) onSelectRef.current(id) })
      map.on('move', declutter)
      map.on('zoom', syncBand)
      map.on('moveend', () => { syncBand(); syncQuiet() })
      map.on('idle', syncAreas)
      // every move counts as the person's own, except the camera moves we start ourselves when the selection changes
      map.on('movestart', () => { byHand.current = performance.now() - autoAt.current > 80 })
      map.on('idle', checkAway)
      ready.current = true
      queue.current.splice(0).forEach((fn) => fn())
    })
    const store = markers.current
    return () => { ready.current = false; queue.current = []; store.clear(); quiet.current.clear(); areas.current.clear(); regions.current = []; meMarker.current = null; selMarker.current = null; map.remove(); mapRef.current = null }
  }, [dark]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { whenReady(() => { try { mapRef.current?.setPaintProperty('route-line', 'line-color', cssVar('--accent')) } catch { /* not there yet */ } }) }, [accent])

  // dots for every station, price pills for the ranked ones
  useEffect(() => whenReady(() => {
    const map = mapRef.current; if (!map) return
    const pillIds = new Set(pills.map((r) => r.s.id))
    ;(map.getSource('all') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: stations
      .filter((s) => s.p[fuel] != null && !pillIds.has(s.id))
      .map((s) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { id: s.id } })) })
    markers.current.forEach((v) => v.m.remove()); markers.current.clear()
    meMarker.current?.remove()
    meMarker.current = null
    if (showMe) {
      const me = document.createElement('div'); me.className = 'b-me'
      meMarker.current = new maplibregl.Marker({ element: me }).setLngLat([origin.lon, origin.lat]).addTo(map)
    }
    pills.forEach((r, i) => {
      const wrap = document.createElement('button')
      wrap.className = 'b-pin'
      wrap.setAttribute('aria-label', `${r.s.b ?? 'Station'}, ${fmtPrice(r.price)} cents le litre`)
      const inner = document.createElement('span'); inner.textContent = fmtPrice(r.price); inner.style.setProperty('--i', String(i))
      wrap.appendChild(inner)
      wrap.onclick = (e) => { e.stopPropagation(); onSelectRef.current(r.s.id) }
      const m = new maplibregl.Marker({ element: wrap, anchor: 'bottom' }).setLngLat([r.s.lon, r.s.lat]).addTo(map)
      markers.current.set(r.s.id, { m, el: wrap })
    })
    data.current = { stations, fuel, pillIds }
    areas.current.forEach((v) => v.m.remove()); areas.current.clear()
    quiet.current.forEach((v) => v.m.remove()); quiet.current.clear()
    syncBand(); syncQuiet(); syncAreas()
  }), [stations, pills, fuel, origin, dark, showMe]) // eslint-disable-line react-hooks/exhaustive-deps

  // far away: one bubble per region with its lowest price; tapping it flies to that station
  useEffect(() => whenReady(() => {
    const map = mapRef.current; if (!map) return
    regions.current.forEach((r) => r.m.remove()); regions.current = []
    if (!allPrices) return
    const by = new Map<string, Station[]>()
    // a few stations in the feed have no usable position (0, 0): leave them out, and use the middle station so one stray point cannot drag the bubble away
    for (const s of stations) if (s.p[fuel] != null && s.lat > 40 && s.lon < -50) { const g = by.get(s.r); if (g) g.push(s); else by.set(s.r, [s]) }
    const mid = (v: number[]) => v.sort((x, y) => x - y)[v.length >> 1]
    const made = [...by].filter(([, g]) => g.length >= 5).map(([name, g]) => {
      const low = g.reduce((a, b) => (b.p[fuel]! < a.p[fuel]! ? b : a))
      const lon = mid(g.map((s) => s.lon)), lat = mid(g.map((s) => s.lat))
      return { name, low, lon, lat, d: (lon - origin.lon) ** 2 + ((lat - origin.lat) * 1.4) ** 2 }
    }).sort((a, b) => a.d - b.d)
    for (const r of made) {
      const wrap = document.createElement('button')
      wrap.className = 'b-region'
      wrap.setAttribute('aria-label', `${r.name}, à partir de ${fmtPrice(r.low.p[fuel]!)} cents le litre. Zoomer`)
      const name = document.createElement('small'); name.textContent = SHORT_REGION[r.name] ?? r.name
      const price = document.createElement('b'); price.textContent = fmtPrice(r.low.p[fuel]!)
      const inner = document.createElement('span'); inner.append(name, price)
      wrap.appendChild(inner)
      wrap.onclick = (e) => { e.stopPropagation(); map.flyTo({ center: [r.low.lon, r.low.lat], zoom: 13, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1400, essential: true }) }
      const m = new maplibregl.Marker({ element: wrap, anchor: 'center' }).setLngLat([r.lon, r.lat]).addTo(map)
      regions.current.push({ m, el: wrap, w: 0 })
    }
    declutter()
  }), [stations, fuel, origin, dark, allPrices]) // eslint-disable-line react-hooks/exhaustive-deps

  // selection: highlight, route, camera
  useEffect(() => whenReady(() => {
    const map = mapRef.current; if (!map) return
    markers.current.forEach((v, id) => {
      v.el.classList.toggle('best', id === bestId)
      v.el.classList.toggle('on', id === selected?.id)
      v.el.classList.toggle('ref', id === refId)
      v.el.style.zIndex = id === selected?.id ? '6' : id === bestId ? '5' : ''
    })
    // a picked station outside the ranked ones still gets its price tag
    selMarker.current?.remove(); selMarker.current = null
    const selPrice = selected?.p[fuel]
    if (selected && selPrice != null && !markers.current.has(selected.id)) {
      const wrap = document.createElement('div'); wrap.className = 'b-pin on'; wrap.style.zIndex = '6'
      const inner = document.createElement('span'); inner.textContent = fmtPrice(selPrice); inner.style.setProperty('--i', '0')
      wrap.appendChild(inner)
      selMarker.current = new maplibregl.Marker({ element: wrap, anchor: 'bottom' }).setLngLat([selected.lon, selected.lat]).addTo(map)
    }
    declutter()
    const src = map.getSource('route') as maplibregl.GeoJSONSource | undefined
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    const padding = { top: padTop, bottom: padBottom + 24, left: padLeft, right: 64 }
    autoAt.current = performance.now()
    const duration = (ms: number) => (still ? 0 : ms)
    // The map remembers its margins and fitBounds adds its own on top of them, which made it give up
    // ("cannot fit") once the margins had been set by an earlier move. So: work out the camera with the
    // target margins in place, put the old ones back in the same frame, then ease camera and margins together.
    const fit = (b: maplibregl.LngLatBoundsLike, maxZoom: number, ms: number) => {
      const before = map.getPadding()
      map.setPadding(padding)
      const cam = map.cameraForBounds(b, { maxZoom })
      map.setPadding(before)
      autoAt.current = performance.now()
      if (cam) map.easeTo({ ...cam, padding, duration: duration(ms), essential: true })
    }
    if (!selected) {
      src?.setData({ type: 'FeatureCollection', features: [] })
      if (frame === 'keep') return
      if (frame) fit([[frame[0], frame[1]], [frame[2], frame[3]]], 13.2, 900)
      else map.easeTo({ center: [origin.lon, origin.lat], padding, duration: duration(700) })
      return
    }
    src?.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: arc(origin, selected) }, properties: {} })
    // the starting point itself is selected (a station picked as the place to start from): stay around it, close enough to read every price
    if (roadKm(origin, selected) < 0.08) { map.easeTo({ center: [selected.lon, selected.lat], zoom: Math.max(map.getZoom(), 12.6), padding, duration: duration(800), essential: true }); return }
    fit(new maplibregl.LngLatBounds([origin.lon, origin.lat], [origin.lon, origin.lat]).extend([selected.lon, selected.lat]), 14.2, 850)
  }), [selected, bestId, refId, origin, padBottom, padTop, padLeft, pills, fuel, dark, frame]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className="b-map" />
}
