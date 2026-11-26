// PROTOTYPE — throwaway. MapLibre map with free OpenFreeMap tiles, recoloured to the app's palette.
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef } from 'react'
import type { Fuel, Origin, Ranked, Station } from './data'
import { fmtPrice } from './data'

maplibregl.setWorkerUrl(workerUrl)

interface Props {
  stations: Station[]; ranked: Ranked[]; fuel: Fuel; origin: Origin; dark: boolean
  bestId?: string; selectedId?: string | null; onSelect?: (id: string) => void
  interactive?: boolean; bottomPadding?: number
}

function recolour(map: maplibregl.Map, dark: boolean) {
  const css = getComputedStyle(document.documentElement)
  const v = (n: string) => css.getPropertyValue(n).trim()
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id
    try {
      if (layer.type === 'background') map.setPaintProperty(id, 'background-color', v('--map-land'))
      else if (layer.type === 'fill' && /water/.test(id)) map.setPaintProperty(id, 'fill-color', v('--map-water'))
      else if (layer.type === 'fill' && /park|wood|grass|landcover|landuse/.test(id)) map.setPaintProperty(id, 'fill-opacity', dark ? 0.25 : 0.35)
      else if (layer.type === 'line' && /road|highway|street|bridge|tunnel/.test(id)) map.setPaintProperty(id, 'line-color', v('--map-road'))
      else if (layer.type === 'symbol' && /label|name|place|poi/.test(id)) {
        map.setPaintProperty(id, 'text-color', v('--ink-3'))
        map.setPaintProperty(id, 'text-halo-color', v('--map-land'))
      }
      else if (layer.type === 'raster') map.setLayoutProperty(id, 'visibility', 'none')
      if (/shield|poi|housenum/.test(id)) map.setLayoutProperty(id, 'visibility', 'none')
    } catch { /* layer without that property */ }
  }
}

export default function StationMap({ stations, ranked, fuel, origin, dark, bestId, selectedId, onSelect, interactive = true, bottomPadding = 0 }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const ready = useRef(false)
  const pending = useRef<(() => void) | null>(null)
  const onSelectRef = useRef(onSelect); onSelectRef.current = onSelect

  useEffect(() => {
    const map = new maplibregl.Map({
      container: el.current!,
      style: `https://tiles.openfreemap.org/styles/${dark ? 'dark' : 'positron'}`,
      center: [origin.lon, origin.lat], zoom: 12, attributionControl: { compact: true },
      interactive, pitchWithRotate: false, dragRotate: false,
    })
    mapRef.current = map
    map.on('load', () => {
      recolour(map, dark)
      map.addSource('all', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'all-dots', type: 'circle', source: 'all', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 1.6, 12, 4.5],
        'circle-color': getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(),
        'circle-opacity': 0.35, 'circle-stroke-width': 1, 'circle-stroke-color': 'rgba(255,255,255,.6)',
      } })
      map.on('click', 'all-dots', (e: maplibregl.MapLayerMouseEvent) => { const id = e.features?.[0]?.properties?.id; if (id) onSelectRef.current?.(id) })
      map.on('mouseenter', 'all-dots', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'all-dots', () => { map.getCanvas().style.cursor = '' })
      ready.current = true
      pending.current?.(); pending.current = null
    })
    return () => { ready.current = false; map.remove(); mapRef.current = null }
  }, [dark, interactive]) // eslint-disable-line react-hooks/exhaustive-deps

  // data + markers
  useEffect(() => {
    const map = mapRef.current; if (!map) return
    const apply = () => {
      const src = map.getSource('all') as maplibregl.GeoJSONSource | undefined
      src?.setData({ type: 'FeatureCollection', features: stations.filter((s) => s.p[fuel] != null && !ranked.some((r) => r.s.id === s.id)).map((s) => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { id: s.id },
      })) })
      markers.current.forEach((m) => m.remove()); markers.current = []
      const me = document.createElement('div'); me.className = 'me-dot'
      markers.current.push(new maplibregl.Marker({ element: me }).setLngLat([origin.lon, origin.lat]).addTo(map))
      ranked.slice(0, 18).forEach((r, i) => {
        const pill = document.createElement('button')
        pill.className = `map-pill${r.s.id === bestId ? ' best' : ''}${r.s.id === selectedId ? ' selected' : ''}`
        pill.style.setProperty('--i', String(i))
        pill.textContent = fmtPrice(r.price)
        pill.setAttribute('aria-label', `${r.s.b ?? 'Station'} ${fmtPrice(r.price)} cents le litre`)
        pill.onclick = (e) => { e.stopPropagation(); onSelectRef.current?.(r.s.id) }
        const m = new maplibregl.Marker({ element: pill, anchor: 'bottom' }).setLngLat([r.s.lon, r.s.lat]).addTo(map)
        if (r.s.id === bestId || r.s.id === selectedId) m.getElement().style.zIndex = '5'
        markers.current.push(m)
      })
    }
    if (ready.current) apply(); else pending.current = apply
  }, [stations, ranked, fuel, origin, bestId, selectedId, dark])

  useEffect(() => {
    mapRef.current?.easeTo({ center: [origin.lon, origin.lat], padding: { top: 0, bottom: bottomPadding, left: 0, right: 0 }, duration: 900 })
  }, [origin, bottomPadding])

  return <div ref={el} className="station-map" />
}
