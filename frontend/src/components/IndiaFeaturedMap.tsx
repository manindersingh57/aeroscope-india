import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import type { HotspotFeature, ModelLegend } from '../lib/mapTypes'

const INDIA_BOUNDS: L.LatLngBoundsExpression = [[6.1, 68.0], [37.8, 97.8]]
type BoundaryFeature = FeatureCollection<Polygon | MultiPolygon, { shapeName?: string; name?: string }>
type Props = {
  features: HotspotFeature[]
  legend: ModelLegend | null
  onSelectState: (name: string) => void
  selectedState: string | null
}

export default function IndiaFeaturedMap({ features, legend, onSelectState, selectedState }: Props) {
  const elementRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const polygonsRef = useRef<Map<string, L.Path>>(new Map())
  const hotspotsRef = useRef<L.LayerGroup | null>(null)
  const callbackRef = useRef(onSelectState)
  const selectedRef = useRef(selectedState)
  const [boundaryError, setBoundaryError] = useState('')
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => { callbackRef.current = onSelectState }, [onSelectState])
  useEffect(() => { selectedRef.current = selectedState }, [selectedState])

  useEffect(() => {
    if (!elementRef.current) return
    const map = L.map(elementRef.current, {
      zoomControl: false, attributionControl: false, scrollWheelZoom: false,
      minZoom: 3, maxZoom: 9, zoomSnap: 0.25,
      maxBounds: [[5.5, 67], [38.5, 99]], maxBoundsViscosity: 1,
    })
    mapRef.current = map
    map.fitBounds(INDIA_BOUNDS, { padding: [8, 8], animate: false })
    hotspotsRef.current = L.layerGroup().addTo(map)
    const controller = new AbortController()
    let dead = false
    let resize: ResizeObserver | undefined
    let frame = 0

    const focusIndia = () => {
      if (dead) return
      map.invalidateSize({ pan: false })
      map.fitBounds(INDIA_BOUNDS, { padding: [16, 16], animate: false })
    }
    if (typeof ResizeObserver !== 'undefined' && elementRef.current) {
      resize = new ResizeObserver(() => {
        if (!dead) { map.invalidateSize({ pan: false }) }
      })
      resize.observe(elementRef.current)
    }
    frame = requestAnimationFrame(focusIndia)

    async function load() {
      try {
        const response = await fetch('/data/india-states.geojson', { signal: controller.signal })
        if (!response.ok) throw new Error(`Boundary file unavailable (HTTP ${response.status})`)
        const geojson: BoundaryFeature = await response.json()
        if (dead || !geojson.features?.length) return
        const layer = L.geoJSON(geojson, {
          style: () => ({ color: '#ffffff', weight: 1.1, fillColor: '#b8c8c4', fillOpacity: 0.96 }),
          onEachFeature: (feature, stateLayer) => {
            if (!(stateLayer instanceof L.Polygon)) return
            const name = String(feature.properties?.shapeName || feature.properties?.name || '')
            if (!name) return
            polygonsRef.current.set(name.toLowerCase(), stateLayer)
            stateLayer.bindTooltip(name, { direction: 'top', sticky: true, className: 'al-map-tooltip' })
            stateLayer.on('mouseover', () => {
              stateLayer.setStyle({ fillColor: '#77d9b8', fillOpacity: 0.92, color: '#ffffff', weight: 2 })
            })
            stateLayer.on('mouseout', () => {
              stateLayer.setStyle(name.toLowerCase() === selectedRef.current?.toLowerCase()
                ? { fillColor: '#71d1b0', fillOpacity: 1, color: '#0c8c80', weight: 2.5 }
                : { fillColor: '#b8c8c4', fillOpacity: 0.96, color: '#ffffff', weight: 1.1 })
            })
            stateLayer.on('click', (e: L.LeafletMouseEvent) => {
              L.DomEvent.stopPropagation(e.originalEvent)
              callbackRef.current(name)
              map.flyToBounds(stateLayer.getBounds(), { padding: [30, 30], maxZoom: 6, duration: 0.75 })
            })
          },
        }).addTo(map)
        const bounds = layer.getBounds()
        if (bounds.isValid()) {
          map.invalidateSize({ pan: false })
          map.fitBounds(bounds, { padding: [18, 18], animate: false })
        } else focusIndia()
        setMapReady(true)
      } catch (error) {
        if (!dead && !controller.signal.aborted) setBoundaryError(error instanceof Error ? error.message : 'Map boundaries not available')
      }
    }
    void load()
    return () => {
      dead = true
      controller.abort()
      cancelAnimationFrame(frame)
      resize?.disconnect()
      polygonsRef.current.clear()
      hotspotsRef.current = null
      mapRef.current = null
      map.remove()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const group = hotspotsRef.current
    if (!map || !group || !mapReady) return
    group.clearLayers()
    for (const feature of features) {
      const [lon, lat] = feature.geometry.coordinates
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
      const cluster = legend?.clusters.find(x => x.name === feature.properties.cluster_name)
      const color = cluster?.color && /^#[a-fA-F0-9]{6}$/.test(cluster.color) ? cluster.color : '#ed8b49'
      L.circleMarker([lat, lon], {
        radius: 13, stroke: false, fillColor: color, fillOpacity: 0.19,
        interactive: false, className: 'al-hotspot-halo',
      }).addTo(group)
      L.circleMarker([lat, lon], {
        radius: 5, color: '#ffffff', weight: 1.8, fillColor: color, fillOpacity: 0.98,
        className: 'al-hotspot-core',
      }).bindTooltip(`${feature.properties.cluster_name} · mean AOD ${
        typeof feature.properties.mean_aod === 'number' ? feature.properties.mean_aod.toFixed(3) : 'unavailable'}`)
        .addTo(group)
    }
  }, [features, legend, mapReady])

  useEffect(() => {
    for (const [name, polygon] of polygonsRef.current) {
      const active = selectedState?.toLowerCase() === name
      polygon.setStyle(active
        ? { fillColor: '#71d1b0', fillOpacity: 1, color: '#0c8c80', weight: 2.5 }
        : { fillColor: '#b8c8c4', fillOpacity: 0.96, color: '#ffffff', weight: 1.1 })
    }
  }, [selectedState])

  const zoom = (delta: number) => mapRef.current?.zoomIn(delta)
  const reset = () => mapRef.current?.fitBounds(INDIA_BOUNDS, { padding: [18, 18], duration: 0.5 })

  return (
    <div className="al-map-root">
      <div ref={elementRef} className="al-map-leaflet" aria-label="Interactive India map showing state boundaries and, when permitted, historical hotspot centres" />
      <div className="al-map-controls" aria-label="Map controls">
        <button type="button" onClick={() => zoom(1)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoom(-1)} aria-label="Zoom out">−</button>
        <button type="button" onClick={reset} aria-label="Reset view to India" title="Reset to India">⌖</button>
      </div>
      {boundaryError && <div role="alert" className="al-map-error">{boundaryError}. Run <code>python tools/fetch_india_states.py</code> at the project root.</div>}
    </div>
  )
}
