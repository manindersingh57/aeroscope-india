import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MapLibreMap, ExpressionSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { HotspotFeature, ModelLegend } from '../lib/mapTypes'

const EMPTY_GEOJSON = { type: 'FeatureCollection' as const, features: [] }
const STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL || 'https://demotiles.maplibre.org/style.json'

type Props = {
  features: HotspotFeature[]
  legend: ModelLegend | null
  selectedCoordinates: { lat: number; lon: number } | null
  onCoordinateClick: (lat: number, lon: number) => void
  onHotspotClick: (hotspot: HotspotFeature) => void
}

export default function AeroMap({ features, legend, selectedCoordinates, onCoordinateClick, onHotspotClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null)
  const featuresRef = useRef<HotspotFeature[]>(features)
  const onCoordinateRef = useRef(onCoordinateClick)
  const onHotspotRef = useRef(onHotspotClick)
  const [ready, setReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => { featuresRef.current = features }, [features])
  useEffect(() => { onCoordinateRef.current = onCoordinateClick }, [onCoordinateClick])
  useEffect(() => { onHotspotRef.current = onHotspotClick }, [onHotspotClick])

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [79.5, 22.5],
      zoom: 3.6,
      minZoom: 3,
      maxZoom: 12,
      attributionControl: false,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    function onLoad() {
      map.addSource('aeroscope-hotspots', { type: 'geojson', data: EMPTY_GEOJSON })
      map.addLayer({
        id: 'aeroscope-hotspots-circles',
        type: 'circle',
        source: 'aeroscope-hotspots',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 5.5, 7, 10, 12, 15],
          'circle-color': '#E76F51',
          'circle-opacity': 0.83,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.4,
        },
      })
      setReady(true)
    }
    function onMapClick(event: maplibregl.MapMouseEvent) {
      const matches = map.getLayer('aeroscope-hotspots-circles')
        ? map.queryRenderedFeatures(event.point, { layers: ['aeroscope-hotspots-circles'] })
        : []
      const id = matches[0]?.id
      if (id !== undefined && id !== null) {
        const feature = featuresRef.current.find((f) => String(f.id) === String(id))
        if (feature) {
          onHotspotRef.current(feature)
          return
        }
      }
      onCoordinateRef.current(event.lngLat.lat, event.lngLat.lng)
    }
    function onPointerMove(event: maplibregl.MapMouseEvent) {
      const matches = map.getLayer('aeroscope-hotspots-circles')
        ? map.queryRenderedFeatures(event.point, { layers: ['aeroscope-hotspots-circles'] })
        : []
      map.getCanvas().style.cursor = matches.length ? 'pointer' : 'crosshair'
    }
    function onMapError() {
      setMapError('The basemap could not load. Check your internet connection or configure VITE_MAP_STYLE_URL.')
    }

    map.on('load', onLoad)
    map.on('click', onMapClick)
    map.on('mousemove', onPointerMove)
    map.on('error', onMapError)

    return () => {
      map.off('load', onLoad)
      map.off('click', onMapClick)
      map.off('mousemove', onPointerMove)
      map.off('error', onMapError)
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const source = map.getSource('aeroscope-hotspots') as GeoJSONSource | undefined
    if (!source) return
    source.setData({ type: 'FeatureCollection', features } as Parameters<GeoJSONSource['setData']>[0])
    const colorStops: string[] = []
    for (const cluster of legend?.clusters ?? []) {
      colorStops.push(cluster.name, cluster.color)
    }
    const expression: string | ExpressionSpecification = colorStops.length > 0
      ? (['match', ['get', 'cluster_name'], ...colorStops, '#D97706'] as unknown as ExpressionSpecification)
      : '#D97706'
    map.setPaintProperty('aeroscope-hotspots-circles', 'circle-color', expression)
  }, [features, legend, ready])

  useEffect(() => {
    selectedMarkerRef.current?.remove()
    selectedMarkerRef.current = null
    if (!selectedCoordinates || !mapRef.current) return
    const marker = new maplibregl.Marker({ color: '#0d766d' })
      .setLngLat([selectedCoordinates.lon, selectedCoordinates.lat])
      .addTo(mapRef.current)
    selectedMarkerRef.current = marker
    return () => {
      marker.remove()
      if (selectedMarkerRef.current === marker) selectedMarkerRef.current = null
    }
  }, [selectedCoordinates])

  return (
    <div className="relative h-[62vh] min-h-[450px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 lg:h-[680px]">
      <div ref={containerRef} aria-label="Interactive map of India with historical aerosol hotspot centres" className="absolute inset-0" />
      {mapError && <div role="alert" className="absolute bottom-10 left-3 right-3 z-10 rounded-xl bg-white/95 p-3 text-sm text-rose-700 shadow">{mapError}</div>}
      <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-56 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs leading-5 text-slate-600 shadow-sm backdrop-blur">
        <strong className="block text-slate-800">Historical research map</strong>
        Click an empty location to inspect its nearest study grid cell. Circles mark hotspot centres, not hotspot boundaries.
      </div>
    </div>
  )
}
