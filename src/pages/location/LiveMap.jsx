import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { gsap } from '../../app/reveal.js'
import { prefersReducedMotion } from '../../hooks/useMediaQuery.js'
import { buildingModel } from '../../content/template.js'
import { ModelNote } from '../../components/PageKit.jsx'
import { colourLockupMarkup } from '../../components/AscendLockup.jsx'
import { clearSite } from './siteTiles.js'
import { HERO, aerial, lens, lookOut, towerShot } from './shots.js'

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
const FLAT = { pitch: 0, bearing: 0 }
// The first view, high over the project; the map settles from it. The
// visit's first arrival comes down through the clouds, more slowly.
const ARRIVAL = { zoom: 12.6, pitch: 0, bearing: 12 }
let throughClouds = true
// A journey in 3D: the view from the tower out to the place, held for a
// beat once the place is in view, then the camera rises above the whole
// route (seconds). Kept short: visitors move quickly between places.
const OUT = 1.6
const HOLD = 0.35
const RISE = 1.6

// The tower (src/pages/location/towerLayer.js): its middle on the ground,
// between the wings, and its height. The camera's shots of it (its front,
// and from it out towards each place) are in shots.js.
const TOWER = buildingModel.map
const TOWER_CENTRE = (() => {
  const points = TOWER.footprints.flat()
  return [0, 1].map(axis => points.reduce((sum, point) => sum + point[axis], 0) / points.length)
})()
const TOWER_HEIGHT = buildingModel.top
const TOWER_RAMP = 13.5           // it stands from here, with the city's buildings
const EARTH = 40075016.686
const metresPerPixel = zoom => EARTH * Math.cos(TOWER_CENTRE[1] * Math.PI / 180) / (512 * 2 ** zoom)
// Places as metres east and north of the tower's foot, and back.
const KX = 111320 * Math.cos(TOWER_CENTRE[1] * Math.PI / 180), KY = 110540
const local = ([lng, lat]) => [(lng - TOWER_CENTRE[0]) * KX, (lat - TOWER_CENTRE[1]) * KY]
const lngLatOf = ([east, north]) => [TOWER_CENTRE[0] + east / KX, TOWER_CENTRE[1] + north / KY]
// The tower's site and wings, drawn flat for the 2D view.
const TOWER_PLAN = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { part: 'ground' }, geometry: { type: 'Polygon', coordinates: [[...TOWER.ground, TOWER.ground[0]]] } },
    ...TOWER.footprints.map(ring => ({ type: 'Feature', properties: { part: 'wing' }, geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] } })),
  ],
}

// The ground, as the brochure's map page: cream land, sage parks, water a
// cool grey-green that gives the creeks some depth, white streets, the
// expressways in pale gold, and plum labels (water's in its own tone). Each
// colour has a dusk twin, warmer and softer, blended in by the Dusk switch:
// peach land, lilac water, rose-brown buildings.
const PALETTE = {
  ground: ['#f6efd6', '#efd8c4'],
  water: ['#c3d1cc', '#b5b3c2'],
  shore: ['#b3c4bf', '#a6a3b5'],
  park: ['#dcdcb4', '#d5c8a9'],
  homes: ['#f1e7c8', '#ead1bd'],
  building: [BUILDING, '#ab8b84'],
  airfield: ['#ece3c7', '#e6cdb9'],
  runway: ['#e2d6b6', '#dcc2ae'],
  expressEdge: ['#dcc08e', '#d3aa86'],
  edge: ['#e2d3ae', '#dbbfa6'],
  express: ['#efd6a6', '#f0c69e'],
  street: ['#fdfaf0', '#f9e9da'],
  rail: ['#c9b79d', '#b99d8e'],
  place: ['#5a4448', '#4f3742'],
  waterName: ['#5d7470', '#5f5a72'],
  name: ['#76626a', '#6d5562'],
}
const tinted = []   // [layer, paint property, palette entry], for the dusk blend
function brochureStyle(style) {
  tinted.length = 0
  const paint = (layer, values) => Object.entries(values).forEach(([property, value]) => {
    layer.paint = { ...layer.paint, [property]: PALETTE[value]?.[0] ?? value }
    if (PALETTE[value]) tinted.push([layer.id, property, value])
  })
  style.layers = style.layers.filter(layer => !/^boundary|shield|country|state/.test(layer.id))
  // Paint changes take effect at once: the dusk blend sets them frame by frame.
  style.transition = { duration: 0, delay: 0 }
  style.layers.forEach(layer => {
    const { id, type } = layer
    if (id === 'background' || id === 'road_area_pier') paint(layer, type === 'fill' ? { 'fill-color': 'ground' } : { 'background-color': 'ground' })
    else if (id === 'water') paint(layer, { 'fill-color': 'water', 'fill-outline-color': 'shore' })
    else if (id === 'waterway') paint(layer, { 'line-color': 'water' })
    else if (id === 'park' || id === 'landcover_wood') paint(layer, { 'fill-color': 'park', 'fill-opacity': 0.9 })
    else if (id === 'landuse_residential') paint(layer, { 'fill-color': 'homes', 'fill-opacity': 0.6 })
    // Flat footprints only until the 3D buildings take over, so the two
    // never share a surface (which flickers), and in the same brown.
    else if (id === 'building') {
      layer.maxzoom = 13.5
      paint(layer, { 'fill-color': 'building', 'fill-outline-color': 'building', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.4, 13.5, 0.85] })
    }
    else if (id.startsWith('aeroway')) paint(layer, type === 'fill' ? { 'fill-color': 'airfield' } : { 'line-color': 'runway' })
    else if (type === 'line' && id.includes('motorway') && id.includes('casing')) paint(layer, { 'line-color': 'expressEdge' })
    else if (type === 'line' && id.includes('casing')) paint(layer, { 'line-color': 'edge' })
    else if (type === 'line' && id.includes('motorway')) paint(layer, { 'line-color': 'express' })
    else if (type === 'line' && /highway|road/.test(id)) paint(layer, { 'line-color': 'street' })
    else if (type === 'line' && id.includes('railway')) paint(layer, { 'line-color': 'rail' })
    else if (type === 'symbol') paint(layer, { 'text-color': id.startsWith('water') ? 'waterName' : id.startsWith('label') ? 'place' : 'name', 'text-halo-color': 'ground', 'text-halo-width': 1.2 })
  })
  return style
}

// '#rrggbb' colours mixed, a share t of the way from one to the other.
const mixHex = (from, to, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(from.slice(i, i + 2), 16) * (1 - t) + parseInt(to.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('')
const mixed = (pair, t) => mixHex(pair[0], pair[1], t)

// How much weather the device draws (QUALITY in towerLayer.js): none where
// it asks to save data or has little memory or few cores, a lighter deck on
// touch screens and small ones; a slow first flight lowers it further.
function weatherQuality() {
  const device = navigator
  if (device.connection?.saveData || device.deviceMemory <= 2 || device.hardwareConcurrency <= 2) return 'none'
  if (matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600) return 'low'
  return 'high'
}
const LOWER = { high: 'low', low: 'none', none: 'none' }

// OpenStreetMap carries some impossible heights (single buildings tagged at
// 900 m and 1,582 m around Kandivali). The tallest towers in these suburbs
// stand under 200 m, so anything above that is treated as a tagging error and
// drawn as an ordinary low-rise instead of a sky-high sliver.
const MAX_HEIGHT = 200
const FALLBACK_HEIGHT = 12
// One warm sun for the city and the tower, fixed to the compass (so faces
// and the tower's shadow hold as the map turns): by day in the east-south-
// east, where the tower's named face looks, 35 degrees up; at dusk low in
// the west-south-west, 18 degrees up and amber. It swings across the south.
const SUN = { anchor: 'map', color: '#ffefd6', intensity: 0.42, position: [1.4, 110, 55] }
const DUSK_SUN = { color: '#ffd6b8', intensity: 0.46, position: [1.4, 252, 72] }
const sunAt = t => ({
  ...SUN, color: mixHex(SUN.color, DUSK_SUN.color, t), intensity: SUN.intensity + (DUSK_SUN.intensity - SUN.intensity) * t,
  position: SUN.position.map((value, i) => value + (DUSK_SUN.position[i] - value) * t),
})

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
  if (!tinted.some(([id]) => id === 'buildings-3d')) tinted.push(['buildings-3d', 'fill-extrusion-color', 'building'])
  map.setLight(SUN)
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

export default function LiveMap({ origin, places, group, active, hovered, tilted, dusk = false, inset, onSelect, onFail }) {
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
  const quality = useRef(null)
  const daylight = useRef({ t: 0 })  // 0 day, 1 dusk

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
  // The camera as shots.js models it, and a shot as a camera to fly to (its
  // `foot`: where it stands the tower on screen).
  const lensSetup = () => ({ height: box.current.clientHeight, fov: map.current.getVerticalFieldOfView?.() ?? 36.87, metresPerPixel, towerHeight: TOWER_HEIGHT })
  const cameraOf = shot => ({ center: lngLatOf([-shot.offset[0], -shot.offset[1]]), zoom: shot.zoom, pitch: shot.pitch, bearing: shot.bearing, foot: shot.foot })
  // Where the tower's foot is on screen for a camera, if it is in or near view.
  const footOn = (camera, setup) => {
    const centre = local([camera.lng, camera.lat])
    const spot = lens(camera, setup).see([-centre[0], -centre[1], 0])
    const area = open()
    return spot && Math.abs(spot[0]) < area.width && Math.abs(spot[1]) < area.height ? spot : null
  }

  // The camera moves through a proxy, so it carries the site's ease and a
  // gentle zoom-out through the middle: a cinematic pull, not a flat pan.
  // The arrival is longer and only descends. Towards a shot of the tower,
  // the tower is held where it stands on screen while the camera turns,
  // tilts and closes in, so the camera circles the building instead of
  // sliding across the city (the arrival spirals down onto it).
  const fly = (target, { duration = 1.8, arrival = false, pull = true, then } = {}) => {
    const instance = map.current
    // A flight already under way is retargeted from where it is, without a
    // second pull-back, so quick choices read as one movement.
    const midFlight = camera.current?.isActive()
    camera.current?.kill()
    const { foot, ...view } = target
    if (prefersReducedMotion()) { instance.jumpTo(view); return }
    const from = { lng: instance.getCenter().lng, lat: instance.getCenter().lat, zoom: instance.getZoom(), pitch: instance.getPitch(), bearing: instance.getBearing() }
    const setup = lensSetup()
    const held = foot && footOn(from, setup)
    const dip = midFlight || arrival || !pull ? 0 : held ? 0.35 : Math.min(1.2, 0.3 + Math.abs(view.zoom - from.zoom) * 0.45)
    let turn = view.bearing - from.bearing
    if (turn > 180) turn -= 360
    if (turn < -180) turn += 360
    const proxy = { t: 0 }
    // A flight that draws under 22 frames a second asks for lighter weather.
    const frames = { count: 0, start: 0 }
    camera.current = gsap.to(proxy, {
      t: 1, duration, ease: arrival || held ? 'power2.inOut' : 'silk',
      onStart: () => { frames.start = performance.now() },
      onUpdate: () => {
        const t = proxy.t
        frames.count++
        const zoom = from.zoom + (view.zoom - from.zoom) * t - dip * Math.sin(Math.PI * t)
        const pitch = from.pitch + (view.pitch - from.pitch) * t
        const bearing = from.bearing + turn * t
        if (held) {
          const offset = lens({ zoom, pitch, bearing }, setup).ground([held[0] + (foot[0] - held[0]) * t, held[1] + (foot[1] - held[1]) * t])
          if (offset) instance.jumpTo({ center: lngLatOf([-offset[0], -offset[1]]), zoom, pitch, bearing })
          return
        }
        instance.jumpTo({ center: [from.lng + (view.center[0] - from.lng) * t, from.lat + (view.center[1] - from.lat) * t], zoom, pitch, bearing })
      },
      onComplete: () => {
        then?.()
        if (frames.count < 8 || (performance.now() - frames.start) / frames.count < 45 || quality.current === 'none' || document.hidden) return
        quality.current = LOWER[quality.current]
        tower.current?.setQuality(quality.current)
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

  // A journey. In 3D: first from the tower out towards the place, both in
  // view, then (after a moment) the camera rises above the whole route, so
  // the distance it covers shows (shots.js); `above` goes straight there
  // (a resize, or reduced motion). In 2D, the whole of it fitted into the
  // open part, straight down. The clouds part from what is framed (the
  // route and the tower).
  const frame = (points, above = false) => {
    lastView.current = { points, above }
    pad()
    const arrival = !arrived.current
    arrived.current = true
    const clouds = arrival && throughClouds
    throughClouds &&= !arrival
    const duration = clouds ? 3.6 : arrival ? 2.8 : tiltRef.current ? OUT : 1.8
    tower.current?.focus([...points, TOWER_CENTRE], { duration, arrival: clouds })
    if (tiltRef.current) {
      const area = open(), setup = lensSetup()
      const out = lookOut(local(points[points.length - 1]), area, setup)
      const high = out && aerial(points.map(local), out, area, setup)
      const rise = () => {
        lastView.current = { points, above: true }
        fly(cameraOf(high), { duration: RISE, pull: false })
      }
      if (high && (above || prefersReducedMotion())) { lastView.current = { points, above: true }; fly(cameraOf(high), { duration }); return }
      if (out) {
        // The hold is the camera's too: a new choice, or a drag, cancels it.
        fly(cameraOf(out), { duration, arrival, then: high && (() => { camera.current = gsap.delayedCall(HOLD, rise) }) })
        return
      }
    }
    const area = open()
    const side = Math.round(Math.min(150, Math.max(28, area.width * 0.12)))
    const top = Math.round(Math.min(110, Math.max(28, area.height * 0.16)))
    // Margins inside the open part; the project's own label hangs below its pin.
    const padding = { top, bottom: Math.round(top * 0.5) + 34, left: side, right: side }
    const fit = map.current.cameraForBounds(boundsOf(points), { padding, bearing: 0, maxZoom: 16 })
    if (fit) fly({ center: [fit.center.lng, fit.center.lat], zoom: fit.zoom, ...(tiltRef.current ? { pitch: 45, bearing: 0 } : FLAT) }, { duration, arrival })
  }

  // The tower, close, from its front (in 2D, straight down over its site).
  const frameTower = () => {
    lastView.current = { tower: true }
    pad()
    tower.current?.focus([TOWER_CENTRE])
    if (!tiltRef.current) { fly({ center: TOWER_CENTRE, zoom: 17.4, ...FLAT }); return }
    fly(cameraOf(towerShot(open(), lensSetup())), { duration: 2.2 })
  }
  const reframe = () => {
    if (lastView.current?.tower) frameTower()
    else if (lastView.current?.points) frame(lastView.current.points, lastView.current.above)
  }

  useEffect(() => {
    let cancelled = false
    let instance
    const fail = () => { if (!cancelled) handlers.current.onFail() }
    const timer = setTimeout(fail, LOAD_TIMEOUT)
    quality.current = weatherQuality()
    // The tower and the weather (three.js) load alongside the map.
    const towerCode = import('./towerLayer.js')
    fetch(STYLE_URL)
      .then(response => { if (!response.ok) throw new Error(response.statusText); return response.json() })
      .then(style => {
        if (cancelled) return
        instance = new maplibregl.Map({
          // The old buildings on the tower's site are taken out of the tiles.
          container: box.current, style: clearSite(maplibregl, brochureStyle(style), TOWER.site), center: origin, ...ARRIVAL,
          minZoom: 10, maxZoom: 18, maxPitch: 75, attributionControl: false, canvasContextAttributes: { antialias: true },
          // Phones draw at most two pixels per point: the weather is drawn per pixel.
          pixelRatio: Math.min(devicePixelRatio, quality.current === 'high' ? 3 : 2),
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
          // The route lies a little above the map: a soft shadow under it.
          instance.addLayer({ id: 'route-shadow', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-width': 10, 'line-blur': 7, 'line-translate': [0, 3], 'line-translate-anchor': 'viewport', 'line-gradient': hidden } })
          instance.addLayer({ id: 'route-halo', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': 9, 'line-gradient': hidden } })
          instance.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': 4, 'line-gradient': hidden } })
          // The tower's site and wings, flat, for the 2D view (shown there only).
          instance.addSource('tower-plan', { type: 'geojson', data: TOWER_PLAN })
          const fade = { duration: 900, delay: 0 }
          instance.addLayer({ id: 'tower-plan-ground', type: 'fill', source: 'tower-plan', minzoom: TOWER_RAMP, filter: ['==', ['get', 'part'], 'ground'],
            paint: { 'fill-color': '#ece0c4', 'fill-opacity': 0, 'fill-opacity-transition': fade } }, 'route-shadow')
          instance.addLayer({ id: 'tower-plan-wings', type: 'fill', source: 'tower-plan', minzoom: TOWER_RAMP, filter: ['==', ['get', 'part'], 'wing'],
            paint: { 'fill-color': '#e2cfb0', 'fill-opacity': 0, 'fill-opacity-transition': fade } }, 'route-shadow')
          instance.addLayer({ id: 'tower-plan-line', type: 'line', source: 'tower-plan', minzoom: TOWER_RAMP, layout: { 'line-join': 'round' },
            paint: { 'line-color': ['match', ['get', 'part'], 'wing', PLUM, '#b8894f'], 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.6, 17, 1.6],
              'line-opacity': 0, 'line-opacity-transition': fade } }, 'route-shadow')
          // The project is marked with its own logo, in full colour, on a cream card.
          const originPin = pin('map-origin', 'Arkade Ascend')
          const originLabel = originPin.querySelector('.map-pin-label')
          originLabel.classList.add('map-logo')
          originLabel.innerHTML = colourLockupMarkup()
          markers.current.push(new maplibregl.Marker({ element: originPin }).setLngLat(origin).addTo(instance))
          // The project's name rides on the tower's top while the tower
          // stands (the pin's own label otherwise); choosing it frames the tower.
          const towerLabel = document.createElement('button')
          towerLabel.type = 'button'
          towerLabel.className = 'map-tower-label'
          towerLabel.tabIndex = -1
          towerLabel.setAttribute('aria-label', 'Arkade Ascend, Malad West: view the tower')
          towerLabel.innerHTML = `<span class="map-logo">${colourLockupMarkup()}</span>`
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
          // The tower and the weather, drawn in the map's own WebGL context,
          // are in place before the first flight (which comes down through
          // the clouds); the map does not wait long for them, and works
          // without them. The layer is the top one: MapLibre draws flat layers
          // above its first 3D layer without a depth test, so the route,
          // drawn before the tower, is covered where it passes behind it (and
          // stays in view in front).
          const addTower = ({ createTowerLayer }) => {
            if (cancelled || map.current !== instance) return
            const layer = createTowerLayer({ ...TOWER, height: TOWER_HEIGHT, quality: quality.current, onFrame })
            instance.addLayer(layer)
            tower.current = layer
            if (!tiltRef.current) layer.setPlan(true)
            layer.setDusk(daylight.current.t)
          }
          Promise.race([towerCode, new Promise((resolve, reject) => setTimeout(reject, 2500))])
            .then(addTower)
            .catch(() => {})
            .finally(() => { if (!cancelled) setReady(true) })
          // If the browser drops the map's WebGL context, MapLibre rebuilds
          // its own layers once it is back (colours, light and route as they
          // were), but not the tower: it is let go at once (its wind would
          // keep asking a styleless map for frames) and added again, framed
          // as before.
          instance.on('webglcontextlost', () => { tower.current?.onRemove(); tower.current = null })
          instance.on('webglcontextrestored', () => {
            const restore = () => towerCode.then(module => {
              addTower(module)
              const view = lastView.current
              tower.current?.focus(view?.points ? [...view.points, TOWER_CENTRE] : [TOWER_CENTRE], { duration: 0 })
            }).catch(() => {})
            if (instance.isStyleLoaded()) restore()
            else instance.once('style.load', restore)
          })
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
      const layer = tower.current
      tower.current = null
      pins.current.clear()
      markers.current = []
      map.current = null
      // MapLibre's remove() skips custom layers' own clean-up, so the tower
      // is taken off first and frees what it holds.
      // (After a lost context the map may have no style at all.)
      if (instance?.style && instance.getLayer('tower')) instance.removeLayer('tower')
      else layer?.onRemove()
      instance?.remove()
    }
  }, [])

  // Pins: the chosen group shows, the active place carries its label. The
  // active place stays shown with its route even while another group is
  // looked at (Nearby's categories).
  useEffect(() => {
    if (!ready) return
    pins.current.forEach((element, id) => {
      element.dataset.state = id === active ? 'active' : !groupIds.includes(id) ? 'hidden' : id === hovered ? 'hover' : 'idle'
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
      instance.setPaintProperty('route-shadow', 'line-gradient', ['step', ['line-progress'], 'rgba(61,42,47,0.22)', shown, 'rgba(61,42,47,0)'])
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
        draw.current = gsap.to(progress, { reach: 1, duration: reduced ? 0 : 1.2, delay: reduced ? 0 : 0.1, ease: 'power2.inOut', onUpdate: paint, onComplete: paint })
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

  // Day or dusk: the ground's colours, the sun and the tower's weather blend
  // together, from wherever they are (reduced motion: at once).
  useEffect(() => {
    if (!ready) return
    const instance = map.current
    const light = () => {
      const t = daylight.current.t
      tinted.forEach(([id, property, name]) => { if (instance.getLayer(id)) instance.setPaintProperty(id, property, mixed(PALETTE[name], t)) })
      instance.setLight(sunAt(t))
      tower.current?.setDusk(t)
    }
    const target = dusk ? 1 : 0
    if (daylight.current.t === target) return
    if (prefersReducedMotion()) { daylight.current.t = target; light(); return }
    const tween = gsap.to(daylight.current, { t: target, duration: 1.4, ease: 'power1.inOut', overwrite: true, onUpdate: light })
    return () => tween.kill()
  }, [ready, dusk])

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
    if (lastView.current) reframe()
    else fly({ center: [instance.getCenter().lng, instance.getCenter().lat], zoom: instance.getZoom(), ...(tilted ? HERO : FLAT) })
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
