import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { gsap } from '../../app/reveal.js'
import { prefersReducedMotion } from '../../hooks/useMediaQuery.js'
import { buildingModel } from '../../content/template.js'
import { ModelNote } from '../../components/PageKit.jsx'
import { clearSite } from './siteTiles.js'

// OpenFreeMap's Positron (free, no key, OpenStreetMap data), recoloured to the
// brochure's cream map page, with extruded 3D buildings and a tilted camera,
// as on our other location maps. Routes follow the roads (OSRM).
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
const PLUM = '#4e373c'
const HALO = '#fbf8ec'
// Every building in one warm brown. Per-building colours are impossible on
// this source: it merges a tile's buildings of one height into one feature,
// so a data-driven colour paints whole groups. The tower marks the project.
const BUILDING = '#c49a6c'
const LOAD_TIMEOUT = 12000
const ROUTE_TIMEOUT = 6000
const TILT = { pitch: 55, bearing: -18 }
const TILT_COMPACT = { pitch: 45, bearing: -18 }
const TILT_LOW = { pitch: 30, bearing: -18 }      // a small opening on a phone
const FLAT = { pitch: 0, bearing: 0 }
// The first view, high over the project; the map settles from it.
const ARRIVAL = { zoom: 12.6, pitch: 0, bearing: 12 }

// The tower (src/pages/location/towerLayer.js): its middle on the ground,
// between the wings, its height, and the side it is best seen from (from
// the east-north-east, facing the road, where its crowns carry the name).
const TOWER = buildingModel.map
const TOWER_CENTRE = (() => {
  const points = TOWER.footprints.flat()
  return [0, 1].map(axis => points.reduce((sum, point) => sum + point[axis], 0) / points.length)
})()
const TOWER_HEIGHT = buildingModel.top
const TOWER_BEARING = -126
const TOWER_RAMP = 13.5           // it stands from here, with the city's buildings
const EARTH = 40075016.686
const metresPerPixel = zoom => EARTH * Math.cos(TOWER_CENTRE[1] * Math.PI / 180) / (512 * 2 ** zoom)
// A point some metres along a compass bearing from a place.
function ahead([lng, lat], bearing, metres) {
  const b = bearing * Math.PI / 180
  return [lng + Math.sin(b) * metres / (111320 * Math.cos(lat * Math.PI / 180)), lat + Math.cos(b) * metres / 110540]
}
// The tower's site and wings, drawn flat for the 2D view.
const TOWER_PLAN = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { part: 'ground' }, geometry: { type: 'Polygon', coordinates: [[...TOWER.ground, TOWER.ground[0]]] } },
    ...TOWER.footprints.map(ring => ({ type: 'Feature', properties: { part: 'wing' }, geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] } })),
  ],
}

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
    // Flat footprints only until the 3D buildings take over, so the two
    // never share a surface (which flickers), and in the same brown.
    else if (id === 'building') {
      layer.maxzoom = 13.5
      paint(layer, { 'fill-color': BUILDING, 'fill-outline-color': BUILDING, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.4, 13.5, 0.85] })
    }
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

// Brown buildings rise from zoom 14, solid (see-through ones flicker where
// they overlap).
function addBuildings(map) {
  const firstSymbol = map.getStyle().layers.find(layer => layer.type === 'symbol')?.id
  map.addLayer({
    id: 'buildings-3d', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building', minzoom: 13.5,
    filter: ['!=', ['get', 'hide_3d'], true],
    paint: {
      'fill-extrusion-color': BUILDING,
      'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14.5, heightOf],
      'fill-extrusion-base': baseOf,
      'fill-extrusion-opacity': 1,
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

export default function LiveMap({ origin, places, group, active, hovered, tilted, inset, onSelect, onFail }) {
  const box = useRef(null)
  const map = useRef(null)
  const pins = useRef(new Map())
  const markers = useRef([])
  const draw = useRef(null)
  const reach = useRef({ reach: 0 })   // how much of the route line is drawn, 0 to 1
  const camera = useRef(null)
  const [ready, setReady] = useState(false)
  const groupIds = useMemo(() => places.filter(place => place.group === group).map(place => place.id), [places, group])
  const handlers = useRef({ onSelect, onFail })
  handlers.current = { onSelect, onFail }
  const tiltRef = useRef(tilted)
  tiltRef.current = tilted
  const insetRef = useRef(inset)
  insetRef.current = inset
  const lastView = useRef(null)      // what was last framed: a journey's points, or the tower
  const tower = useRef(null)         // the tower layer, once added
  const arrived = useRef(false)      // the first framing is the arrival
  const [towerOnScreen, setTowerOnScreen] = useState(false)
  const [noteBox, setNoteBox] = useState(null)

  // The part of the map left open by the page's header, view switch and
  // panel, which float over it, and by the map's own controls (the zoom
  // column at the left, the attribution line at the bottom). Too small an
  // opening ignores them.
  const open = () => {
    const width = box.current.clientWidth, height = box.current.clientHeight
    let { top, right, bottom, left } = insetRef.current
    const frameBox = box.current.getBoundingClientRect()
    const zoom = box.current.querySelector('.maplibregl-ctrl-bottom-left .maplibregl-ctrl-group')
    const credit = box.current.querySelector('.maplibregl-ctrl-bottom-left .maplibregl-ctrl-attrib')
    if (zoom?.offsetParent) left = Math.max(left, Math.round(zoom.getBoundingClientRect().right - frameBox.left + 8))
    if (credit?.offsetParent) bottom = Math.max(bottom, Math.round(frameBox.bottom - credit.getBoundingClientRect().top + 8))
    const fits = width - left - right >= 120 && height - top - bottom >= 80
    return fits ? { width: width - left - right, height: height - top - bottom, top, right, bottom, left } : { width, height, top: 0, right: 0, bottom: 0, left: 0 }
  }
  const angle = () => {
    if (!tiltRef.current) return FLAT
    const area = open()
    return area.height < 300 ? TILT_LOW : area.width < 700 ? TILT_COMPACT : TILT
  }

  // The camera moves through a proxy, so it carries the site's ease and a
  // gentle zoom-out through the middle: a cinematic pull, not a flat pan.
  // The arrival is longer and only descends.
  const fly = (target, { duration = 1.8, arrival = false } = {}) => {
    const instance = map.current
    // A flight already under way is retargeted from where it is, without a
    // second pull-back, so quick choices read as one movement.
    const midFlight = camera.current?.isActive()
    camera.current?.kill()
    if (prefersReducedMotion()) { instance.jumpTo(target); return }
    const from = { lng: instance.getCenter().lng, lat: instance.getCenter().lat, zoom: instance.getZoom(), pitch: instance.getPitch(), bearing: instance.getBearing() }
    const dip = midFlight || arrival ? 0 : Math.min(1.2, 0.3 + Math.abs(target.zoom - from.zoom) * 0.45)
    let turn = target.bearing - from.bearing
    if (turn > 180) turn -= 360
    if (turn < -180) turn += 360
    const proxy = { t: 0 }
    camera.current = gsap.to(proxy, {
      t: 1, duration, ease: arrival ? 'power2.inOut' : 'silk',
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
  // The camera's own padding is the covered margin, so the map's centre and
  // its 3D perspective sit in the open part. When it changes, the view is
  // re-centred on what was already there, so nothing jumps.
  const pad = () => {
    const instance = map.current
    const area = open()
    const next = { top: area.top, right: area.right, bottom: area.bottom, left: area.left }
    const now = instance.getPadding()
    if (Object.keys(next).every(key => Math.abs(now[key] - next[key]) < 1)) return
    const point = [next.left + area.width / 2, next.top + area.height / 2]
    instance.jumpTo({ padding: next, center: instance.unproject(point) })
  }

  const frame = points => {
    lastView.current = { points }
    pad()
    const view = angle()
    const area = open()
    const side = Math.round(Math.min(150, Math.max(28, area.width * 0.12)))
    const top = Math.round(Math.min(110, Math.max(28, area.height * 0.16)))
    // Margins inside the open part; the project's own label hangs below its pin.
    const padding = { top, bottom: Math.round(top * 0.5) + 34, left: side, right: side }
    const fitOf = list => map.current.cameraForBounds(boundsOf(list), { padding, bearing: view.bearing, maxZoom: 16 })
    let fit = fitOf(points)
    if (!fit) return
    // The tower stands up into the view, its label above it: the ray past
    // its top meets the ground further on, so that point is framed too.
    if (tower.current && view.pitch && fit.zoom - 0.35 > TOWER_RAMP) {
      const reach = (TOWER_HEIGHT + 60 * metresPerPixel(fit.zoom)) * Math.tan(view.pitch * Math.PI / 180)
      fit = fitOf([...points, ahead(TOWER_CENTRE, view.bearing, reach)]) ?? fit
    }
    // A tilted view shows more ground towards the top, so step back a little.
    const arrival = !arrived.current
    arrived.current = true
    fly({ center: [fit.center.lng, fit.center.lat], zoom: fit.zoom - (view.pitch ? 0.35 : 0), ...view }, arrival ? { duration: 2.8, arrival } : undefined)
  }

  // The tower, close, from its best side, filling about half the open part
  // of the map (in 2D, straight down over its site).
  const frameTower = () => {
    lastView.current = { tower: true }
    pad()
    const view = angle()
    if (!view.pitch) { fly({ center: TOWER_CENTRE, zoom: 17.4, ...view }); return }
    const p = view.pitch * Math.PI / 180
    const zoom = Math.log2(EARTH * Math.cos(TOWER_CENTRE[1] * Math.PI / 180) / (512 * TOWER_HEIGHT * Math.sin(p) / (open().height * 0.55)))
    fly({ center: ahead(TOWER_CENTRE, TOWER_BEARING, TOWER_HEIGHT / 2 * Math.tan(p)), zoom: Math.min(17.8, Math.max(15.5, zoom)), pitch: view.pitch, bearing: TOWER_BEARING })
  }
  const reframe = () => {
    if (lastView.current?.tower) frameTower()
    else if (lastView.current?.points) frame(lastView.current.points)
  }

  useEffect(() => {
    let cancelled = false
    let instance
    const fail = () => { if (!cancelled) handlers.current.onFail() }
    const timer = setTimeout(fail, LOAD_TIMEOUT)
    fetch(STYLE_URL)
      .then(response => { if (!response.ok) throw new Error(response.statusText); return response.json() })
      .then(style => {
        if (cancelled) return
        instance = new maplibregl.Map({
          // The old buildings on the tower's site are taken out of the tiles.
          container: box.current, style: clearSite(maplibregl, brochureStyle(style), TOWER.site), center: origin, ...ARRIVAL,
          minZoom: 10, maxZoom: 18, maxPitch: 75, attributionControl: false, canvasContextAttributes: { antialias: true },
        })
        // Bottom left, clear of the location panel (attribution lowest).
        instance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')
        instance.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-left')
        // A visitor's own drag, wheel or pinch takes over from any camera flight.
        instance.on('movestart', event => { if (event.originalEvent) camera.current?.kill() })
        instance.on('load', () => {
          if (cancelled) return
          clearTimeout(timer)
          addBuildings(instance)
          instance.addSource('route', { type: 'geojson', lineMetrics: true, data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [origin, origin] } } })
          const hidden = ['step', ['line-progress'], 'rgba(0,0,0,0)', 0, 'rgba(0,0,0,0)']
          instance.addLayer({ id: 'route-halo', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': 9, 'line-gradient': hidden } })
          instance.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': 4, 'line-gradient': hidden } })
          // The tower's site and wings, flat, for the 2D view (shown there only).
          instance.addSource('tower-plan', { type: 'geojson', data: TOWER_PLAN })
          const fade = { duration: 900, delay: 0 }
          instance.addLayer({ id: 'tower-plan-ground', type: 'fill', source: 'tower-plan', minzoom: TOWER_RAMP, filter: ['==', ['get', 'part'], 'ground'],
            paint: { 'fill-color': '#ece0c4', 'fill-opacity': 0, 'fill-opacity-transition': fade } }, 'route-halo')
          instance.addLayer({ id: 'tower-plan-wings', type: 'fill', source: 'tower-plan', minzoom: TOWER_RAMP, filter: ['==', ['get', 'part'], 'wing'],
            paint: { 'fill-color': '#e2cfb0', 'fill-opacity': 0, 'fill-opacity-transition': fade } }, 'route-halo')
          instance.addLayer({ id: 'tower-plan-line', type: 'line', source: 'tower-plan', minzoom: TOWER_RAMP, layout: { 'line-join': 'round' },
            paint: { 'line-color': ['match', ['get', 'part'], 'wing', PLUM, '#b8894f'], 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.6, 17, 1.6],
              'line-opacity': 0, 'line-opacity-transition': fade } }, 'route-halo')
          const originPin = pin('map-origin', 'Arkade Ascend')
          markers.current.push(new maplibregl.Marker({ element: originPin }).setLngLat(origin).addTo(instance))
          // The project's name rides on the tower's top while the tower
          // stands (the pin's own label otherwise); choosing it frames the tower.
          const towerLabel = document.createElement('button')
          towerLabel.type = 'button'
          towerLabel.className = 'map-tower-label'
          towerLabel.tabIndex = -1
          towerLabel.setAttribute('aria-label', 'Arkade Ascend: view the tower')
          towerLabel.innerHTML = '<span>Arkade Ascend</span>'
          towerLabel.addEventListener('click', event => { event.stopPropagation(); frameTower() })
          instance.getCanvasContainer().append(towerLabel)
          let onScreen = false
          const onFrame = ({ standing, label }) => {
            const canvas = instance.getCanvas(), width = canvas.clientWidth, height = canvas.clientHeight
            const raised = Boolean(label) && standing > 0.6 && label.x > 24 && label.x < width - 24 && label.y > 48 && label.y < height - 24
            if (label) towerLabel.style.transform = `translate(${label.x}px, ${label.y}px)`
            if (towerLabel.dataset.shown !== String(raised)) {
              towerLabel.dataset.shown = String(raised)
              towerLabel.tabIndex = raised ? 0 : -1
              originPin.dataset.raised = String(raised)
            }
            // The note stays with the plan too: it is drawn from the same model.
            const base = instance.project(TOWER_CENTRE)
            const planned = !tiltRef.current && instance.getZoom() >= TOWER_RAMP
            const seen = (standing > 0.05 || planned) && (raised || (base.x > 0 && base.x < width && base.y > 0 && base.y < height))
            if (seen !== onScreen) { onScreen = seen; setTowerOnScreen(seen) }
          }
          // Clicking or tapping the tower frames it; a pointer over it says so.
          instance.on('click', event => { if (tower.current?.hit(event.point)) frameTower() })
          if (matchMedia('(pointer: fine)').matches) {
            let pending = null
            instance.on('mousemove', event => {
              if (pending) return
              pending = requestAnimationFrame(() => {
                pending = null
                instance.getCanvas().style.cursor = tower.current?.hit(event.point) ? 'pointer' : ''
              })
            })
          }
          places.forEach(place => {
            const element = pin('map-pin', place.distance ? `${place.name} · ${place.distance}` : `${place.name} · upcoming`, () => handlers.current.onSelect(place.id))
            element.dataset.state = 'hidden'
            pins.current.set(place.id, element)
            markers.current.push(new maplibregl.Marker({ element, anchor: 'center' }).setLngLat(place.lngLat).addTo(instance))
          })
          map.current = instance
          if (import.meta.env.DEV) window.__map = instance   // for automated checks
          setReady(true)
          // The tower, drawn in the map's own WebGL context, once the map is
          // up (its code loads only then); the map works without it. It is
          // the top layer: MapLibre draws flat layers above its first 3D
          // layer without a depth test, so the route, drawn before the tower,
          // is covered where it passes behind it (and stays in view in front).
          import('./towerLayer.js').then(({ createTowerLayer }) => {
            if (cancelled || map.current !== instance) return
            const layer = createTowerLayer({ ...TOWER, height: TOWER_HEIGHT, onFrame })
            instance.addLayer(layer)
            tower.current = layer
            if (!tiltRef.current) layer.setPlan(true)
          }).catch(() => {})
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
      tower.current = null
      pins.current.clear()
      markers.current = []
      map.current = null
      // MapLibre's remove() skips custom layers' own clean-up, so the tower
      // is taken off first and frees what it holds.
      if (instance?.getLayer('tower')) instance.removeLayer('tower')
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
    // Edges are those of the open part of the map, so a label never runs
    // under the panel or the controls.
    const align = () => {
      const area = open()
      markers.current.forEach(marker => {
        const element = marker.getElement()
        const half = element.querySelector('.map-pin-label').offsetWidth / 2 + 6
        const x = instance.project(marker.getLngLat()).x
        element.dataset.align = x - area.left < half ? 'start' : area.left + area.width - x < half ? 'end' : 'center'
      })
    }
    align()
    instance.on('move', align)
    instance.on('resize', align)
    return () => { instance.off('move', align); instance.off('resize', align) }
  }, [ready])

  // The chosen place: the route on show draws back into the project, then
  // the new one draws out from it while the camera frames the journey. One
  // progress value drives the line throughout, so it never pops back in full
  // or jumps: a new choice mid-way simply carries on from where the line is.
  useEffect(() => {
    if (!ready) return
    const instance = map.current
    const place = places.find(item => item.id === active)
    const reduced = prefersReducedMotion()
    const progress = reach.current
    const paint = () => {
      const shown = Math.max(0.0001, progress.reach)
      instance.setPaintProperty('route', 'line-gradient', ['step', ['line-progress'], PLUM, shown, 'rgba(78,55,60,0)'])
      instance.setPaintProperty('route-halo', 'line-gradient', ['step', ['line-progress'], HALO, shown, 'rgba(251,248,236,0)'])
    }
    const setRoute = coordinates => instance.getSource('route').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates } })
    draw.current?.kill()
    const retract = progress.reach > 0.001 && !reduced
      ? gsap.to(progress, { reach: 0, duration: 0.35, ease: 'power2.in', onUpdate: paint })
      : null
    if (!retract) { progress.reach = 0; paint() }
    draw.current = retract
    // Runs once the old route has gone (at once if there was none). A tween
    // that has not yet ticked is not "active", so check its progress instead.
    const afterRetract = callback => retract && retract.progress() < 1 ? retract.eventCallback('onComplete', callback) : callback()

    // No place chosen (the Nearby list): the route goes, the tower is framed.
    if (!place) {
      afterRetract(() => setRoute([origin, origin]))
      arrived.current = true
      frameTower()
      return
    }
    const controller = new AbortController()
    const show = coordinates => {
      if (controller.signal.aborted || !map.current) return
      frame(coordinates)
      afterRetract(() => {
        if (controller.signal.aborted) return
        setRoute(coordinates)   // still at zero, so nothing shows until it draws
        draw.current = gsap.to(progress, { reach: 1, duration: reduced ? 0 : 1.5, delay: reduced ? 0 : 0.2, ease: 'power2.inOut', onUpdate: paint, onComplete: paint })
      })
    }
    routeTo(origin, place, controller.signal)
      .then(show)
      .catch(() => show(arc(origin, place.lngLat)))
    return () => controller.abort()
  }, [ready, active])

  // When what covers the map changes (a resize, the panel's height), frame
  // the current journey (or the tower) again in the space left open.
  useEffect(() => {
    if (!ready || !lastView.current) return
    const timer = setTimeout(reframe, 250)
    return () => clearTimeout(timer)
  }, [ready, inset.top, inset.right, inset.bottom, inset.left])

  // 3D or plan view. In 2D the tower folds away and its plan shows instead.
  const firstTilt = useRef(true)
  useEffect(() => {
    if (!ready) return
    const instance = map.current
    tower.current?.setPlan(!tilted)
    instance.setPaintProperty('tower-plan-ground', 'fill-opacity', tilted ? 0 : 0.9)
    instance.setPaintProperty('tower-plan-wings', 'fill-opacity', tilted ? 0 : 1)
    instance.setPaintProperty('tower-plan-line', 'line-opacity', tilted ? 0 : 0.9)
    if (firstTilt.current) { firstTilt.current = false; return }
    fly({ center: [instance.getCenter().lng, instance.getCenter().lat], zoom: instance.getZoom(), ...angle() })
  }, [ready, tilted])

  // The model note sits at the foot of the open part of the map.
  useEffect(() => {
    if (!ready) return
    const place = () => {
      const area = open(), width = box.current.clientWidth, height = box.current.clientHeight
      setNoteBox({ left: area.left, right: width - area.left - area.width, bottom: height - area.top - area.height + 10, compact: area.width < 620 || area.height < 420 })
    }
    place()
    map.current.on('resize', place)
    const instance = map.current
    return () => instance.off('resize', place)
  }, [ready, inset.top, inset.right, inset.bottom, inset.left])

  return <div className="absolute inset-0">
    {/* Inline, because MapLibre's stylesheet makes its container relative. */}
    <div ref={box} style={{ position: 'absolute', inset: 0 }} />
    {/* Wherever the tower model shows, so does the note on what it is. */}
    {noteBox && <div aria-hidden={!towerOnScreen} className={`pointer-events-none absolute flex justify-center px-3 transition-opacity duration-700 ${towerOnScreen ? 'opacity-100' : 'opacity-0'}`}
      style={{ left: noteBox.left, right: noteBox.right, bottom: noteBox.bottom }}>
      <ModelNote compact={noteBox.compact} className="max-w-[36rem] rounded-2xl bg-cream-50/85 px-3.5 py-1.5 text-center shadow-[0_6px_18px_-12px_rgba(61,42,47,.5)] backdrop-blur-sm" />
    </div>}
    <div className={`pointer-events-none absolute inset-0 grid place-items-center bg-cream-100 transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`}>
      <span className="text-[0.6rem] uppercase tracking-[0.3em] text-plum-700/60">Loading map</span>
    </div>
  </div>
}
