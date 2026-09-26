import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { gsap } from '../../app/reveal.js'
import { prefersReducedMotion } from '../../hooks/useMediaQuery.js'

// OpenFreeMap's Positron (free, no key, OpenStreetMap data), recoloured to the
// brochure's cream map page, with extruded 3D buildings and a tilted camera,
// as on our other location maps. Routes follow the roads (OSRM).
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
const PLUM = '#4e373c'
const HALO = '#fbf8ec'
const LOAD_TIMEOUT = 12000
const ROUTE_TIMEOUT = 6000
const TILT = { pitch: 55, bearing: -18 }
const TILT_COMPACT = { pitch: 45, bearing: -18 }
const FLAT = { pitch: 0, bearing: 0 }

function brochureStyle(style) {
  const paint = (layer, values) => { layer.paint = { ...layer.paint, ...values } }
  style.layers = style.layers.filter(layer => !/^boundary|shield|country|state/.test(layer.id))
  style.layers.forEach(layer => {
    const { id, type } = layer
    if (id === 'background') paint(layer, { 'background-color': '#f6efd6' })
    else if (id === 'water') paint(layer, { 'fill-color': '#d4dad3' })
    else if (id === 'waterway') paint(layer, { 'line-color': '#d4dad3' })
    else if (id === 'park' || id === 'landcover_wood') paint(layer, { 'fill-color': '#e3e1c0', 'fill-opacity': 0.9 })
    else if (id === 'landuse_residential') paint(layer, { 'fill-color': '#f1e8cb', 'fill-opacity': 0.6 })
    else if (id === 'building') paint(layer, { 'fill-color': '#e8dcbb', 'fill-outline-color': '#ddcfa9' })
    else if (id.startsWith('aeroway')) paint(layer, type === 'fill' ? { 'fill-color': '#ece3c7' } : { 'line-color': '#e2d6b6' })
    else if (type === 'line' && id.includes('casing')) paint(layer, { 'line-color': '#e0d1ab' })
    else if (type === 'line' && id.includes('motorway')) paint(layer, { 'line-color': '#f0dbb0' })
    else if (type === 'line' && /highway|road/.test(id)) paint(layer, { 'line-color': '#fdfaf0' })
    else if (type === 'line' && id.includes('railway')) paint(layer, { 'line-color': '#c9b79d' })
    else if (type === 'symbol') paint(layer, { 'text-color': '#6f5a5e', 'text-halo-color': '#f6efd6', 'text-halo-width': 1.2 })
  })
  return style
}

// OpenStreetMap carries some impossible heights (single buildings tagged at
// 900 m and 1,582 m around Kandivali). The tallest towers in these suburbs
// stand under 200 m, so anything above that is treated as a tagging error and
// drawn as an ordinary low-rise instead of a sky-high sliver.
const MAX_HEIGHT = 200
const FALLBACK_HEIGHT = 12
const heightOf = ['let', 'h', ['coalesce', ['get', 'render_height'], ['get', 'height'], 10],
  ['case', ['>', ['var', 'h'], MAX_HEIGHT], FALLBACK_HEIGHT, ['var', 'h']]]
const baseOf = ['let', 'b', ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
  ['case', ['>', ['var', 'b'], MAX_HEIGHT], 0, ['var', 'b']]]

// Sand-coloured buildings rise from zoom 14; the project's own plot is gold.
function addBuildings(map, origin) {
  const firstSymbol = map.getStyle().layers.find(layer => layer.type === 'symbol')?.id
  map.addLayer({
    id: 'buildings-3d', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building', minzoom: 13.5,
    filter: ['!=', ['get', 'hide_3d'], true],
    paint: {
      'fill-extrusion-color': ['case', ['<', ['distance', { type: 'Point', coordinates: origin }], 45], '#c49a6c', '#e4d6b2'],
      'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14.5, heightOf],
      'fill-extrusion-base': baseOf,
      'fill-extrusion-opacity': 0.88,
      'fill-extrusion-vertical-gradient': true,
    },
  }, firstSymbol)
  map.setLight({ anchor: 'viewport', color: '#fff4e0', intensity: 0.4, position: [1.4, 200, 35] })
}

// A gentle arc, used when no road route is available.
function arc([x1, y1], [x2, y2], steps = 72) {
  const cx = (x1 + x2) / 2 - (y2 - y1) * 0.2
  const cy = (y1 + y2) / 2 + (x2 - x1) * 0.2
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps, u = 1 - t
    return [u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * cy + t * t * y2]
  })
}

// A driving route from the public OSRM server, cached per place.
const routeCache = new Map()
async function routeTo(origin, place, signal) {
  if (routeCache.has(place.id)) return routeCache.get(place.id)
  const request = new AbortController()
  const stop = () => request.abort()
  signal.addEventListener('abort', stop)
  const timer = setTimeout(stop, ROUTE_TIMEOUT)
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.join(',')};${place.lngLat.join(',')}?overview=full&geometries=geojson`
    const json = await (await fetch(url, { signal: request.signal })).json()
    if (json.code !== 'Ok' || !json.routes?.length) throw new Error('no route')
    const coordinates = [origin, ...json.routes[0].geometry.coordinates, place.lngLat]
    routeCache.set(place.id, coordinates)
    return coordinates
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', stop)
  }
}

function boundsOf(points) {
  const bounds = new maplibregl.LngLatBounds(points[0], points[0])
  points.forEach(point => bounds.extend(point))
  return bounds
}

function pin(className, label, onClick) {
  const element = document.createElement('div')
  element.className = className
  element.setAttribute('aria-hidden', 'true')
  element.innerHTML = '<span class="map-pin-dot"></span><span class="map-pin-label"></span>'
  element.querySelector('.map-pin-label').textContent = label
  if (onClick) element.addEventListener('click', onClick)
  return element
}

export default function LiveMap({ origin, places, group, active, hovered, tilted, onSelect, onFail }) {
  const box = useRef(null)
  const map = useRef(null)
  const pins = useRef(new Map())
  const markers = useRef([])
  const draw = useRef(null)
  const camera = useRef(null)
  const [ready, setReady] = useState(false)
  const groupIds = useMemo(() => places.filter(place => place.group === group).map(place => place.id), [places, group])
  const handlers = useRef({ onSelect, onFail })
  handlers.current = { onSelect, onFail }
  const tiltRef = useRef(tilted)
  tiltRef.current = tilted

  const angle = () => tiltRef.current ? (box.current.clientWidth < 700 ? TILT_COMPACT : TILT) : FLAT

  // The camera moves through a proxy, so it carries the site's ease and a
  // gentle zoom-out through the middle: a cinematic pull, not a flat pan.
  const fly = target => {
    const instance = map.current
    camera.current?.kill()
    if (prefersReducedMotion()) { instance.jumpTo(target); return }
    const from = { lng: instance.getCenter().lng, lat: instance.getCenter().lat, zoom: instance.getZoom(), pitch: instance.getPitch(), bearing: instance.getBearing() }
    const dip = Math.min(1.2, 0.3 + Math.abs(target.zoom - from.zoom) * 0.45)
    let turn = target.bearing - from.bearing
    if (turn > 180) turn -= 360
    if (turn < -180) turn += 360
    const proxy = { t: 0 }
    camera.current = gsap.to(proxy, {
      t: 1, duration: 1.8, ease: 'silk',
      onUpdate: () => {
        const t = proxy.t
        instance.jumpTo({
          center: [from.lng + (target.center[0] - from.lng) * t, from.lat + (target.center[1] - from.lat) * t],
          zoom: from.zoom + (target.zoom - from.zoom) * t - dip * Math.sin(Math.PI * t),
          pitch: from.pitch + (target.pitch - from.pitch) * t,
          bearing: from.bearing + turn * t,
        })
      },
    })
  }

  // Frame the project and a journey (or a group of places).
  const frame = points => {
    const view = angle()
    const width = box.current.clientWidth, height = box.current.clientHeight
    const side = Math.round(Math.min(150, Math.max(48, width * 0.16)))
    const top = Math.round(Math.min(120, Math.max(70, height * 0.16)))
    const fit = map.current.cameraForBounds(boundsOf(points), { padding: { top, bottom: Math.round(top * 0.7), left: side, right: side }, bearing: view.bearing, maxZoom: 16 })
    if (!fit) return
    // A tilted view shows more ground towards the top, so step back a little.
    fly({ center: [fit.center.lng, fit.center.lat], zoom: fit.zoom - (view.pitch ? 0.35 : 0), ...view })
  }

  useEffect(() => {
    let cancelled = false
    let instance
    const fail = () => { if (!cancelled) handlers.current.onFail() }
    const timer = setTimeout(fail, LOAD_TIMEOUT)
    const stacked = matchMedia('(max-width: 63.999rem) and (min-height: 34.001rem)').matches
    fetch(STYLE_URL)
      .then(response => { if (!response.ok) throw new Error(response.statusText); return response.json() })
      .then(style => {
        if (cancelled) return
        instance = new maplibregl.Map({
          container: box.current, style: brochureStyle(style), center: origin, zoom: 14.2, pitch: 0, bearing: 0,
          minZoom: 10, maxZoom: 18, maxPitch: 70, attributionControl: { compact: true },
          // On a stacked page the map sits in a scrolling column: two fingers pan it.
          cooperativeGestures: stacked && matchMedia('(pointer: coarse)').matches,
        })
        instance.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')
        // A visitor's own drag, wheel or pinch takes over from any camera flight.
        instance.on('movestart', event => { if (event.originalEvent) camera.current?.kill() })
        instance.on('load', () => {
          if (cancelled) return
          clearTimeout(timer)
          addBuildings(instance, origin)
          instance.addSource('route', { type: 'geojson', lineMetrics: true, data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [origin, origin] } } })
          const hidden = ['step', ['line-progress'], 'rgba(0,0,0,0)', 0, 'rgba(0,0,0,0)']
          instance.addLayer({ id: 'route-halo', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': 9, 'line-gradient': hidden } })
          instance.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': 4, 'line-gradient': hidden } })
          markers.current.push(new maplibregl.Marker({ element: pin('map-origin', 'Arkade Ascend') }).setLngLat(origin).addTo(instance))
          places.forEach(place => {
            const element = pin('map-pin', place.distance ? `${place.name} · ${place.distance}` : `${place.name} · upcoming`, () => handlers.current.onSelect(place.id))
            element.dataset.state = 'hidden'
            pins.current.set(place.id, element)
            markers.current.push(new maplibregl.Marker({ element, anchor: 'center' }).setLngLat(place.lngLat).addTo(instance))
          })
          map.current = instance
          if (import.meta.env.DEV) window.__map = instance   // for automated checks
          setReady(true)
        })
      })
      .catch(fail)
    const resize = new ResizeObserver(() => map.current?.resize())
    resize.observe(box.current)
    return () => {
      cancelled = true
      clearTimeout(timer)
      resize.disconnect()
      draw.current?.kill()
      camera.current?.kill()
      pins.current.clear()
      markers.current = []
      map.current = null
      instance?.remove()
    }
  }, [])

  // Pins: the chosen group shows, the active place carries its label.
  useEffect(() => {
    if (!ready) return
    pins.current.forEach((element, id) => {
      element.dataset.state = !groupIds.includes(id) ? 'hidden' : id === active ? 'active' : id === hovered ? 'hover' : 'idle'
    })
  }, [ready, groupIds, active, hovered])

  // A label centred on a pin near the map's edge would be cut off, so it
  // then opens toward the middle instead.
  useEffect(() => {
    if (!ready) return
    const instance = map.current
    const align = () => {
      const width = box.current.clientWidth
      markers.current.forEach(marker => {
        const element = marker.getElement()
        const half = element.querySelector('.map-pin-label').offsetWidth / 2 + 6
        const x = instance.project(marker.getLngLat()).x
        element.dataset.align = x < half ? 'start' : x > width - half ? 'end' : 'center'
      })
    }
    align()
    instance.on('move', align)
    instance.on('resize', align)
    return () => { instance.off('move', align); instance.off('resize', align) }
  }, [ready])

  // The chosen place: its road route draws out from the project while the
  // camera tilts in to frame the whole journey.
  useEffect(() => {
    if (!ready) return
    const place = places.find(item => item.id === active)
    if (!place) return
    const instance = map.current
    const controller = new AbortController()
    const show = coordinates => {
      if (controller.signal.aborted || !map.current) return
      instance.getSource('route').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates } })
      draw.current?.kill()
      const progress = { reach: 0 }
      const paint = () => {
        const reach = Math.max(0.0001, progress.reach)
        instance.setPaintProperty('route', 'line-gradient', ['step', ['line-progress'], PLUM, reach, 'rgba(78,55,60,0)'])
        instance.setPaintProperty('route-halo', 'line-gradient', ['step', ['line-progress'], HALO, reach, 'rgba(251,248,236,0)'])
      }
      const reduced = prefersReducedMotion()
      draw.current = gsap.to(progress, { reach: 1, duration: reduced ? 0 : 1.6, delay: reduced ? 0 : 0.5, ease: 'power2.inOut', onStart: paint, onUpdate: paint })
      frame(coordinates)
    }
    routeTo(origin, place, controller.signal)
      .then(show)
      .catch(() => show(arc(origin, place.lngLat)))
    return () => controller.abort()
  }, [ready, active])

  // 3D or plan view.
  const firstTilt = useRef(true)
  useEffect(() => {
    if (!ready) return
    if (firstTilt.current) { firstTilt.current = false; return }
    const instance = map.current
    fly({ center: [instance.getCenter().lng, instance.getCenter().lat], zoom: instance.getZoom(), ...angle() })
  }, [ready, tilted])

  return <div className="absolute inset-0">
    {/* Inline, because MapLibre's stylesheet makes its container relative. */}
    <div ref={box} style={{ position: 'absolute', inset: 0 }} />
    <div className={`pointer-events-none absolute inset-0 grid place-items-center bg-cream-100 transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`}>
      <span className="text-[0.6rem] uppercase tracking-[0.3em] text-plum-700/60">Loading map</span>
    </div>
  </div>
}
