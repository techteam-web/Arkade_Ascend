import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from '../app/reveal.js'
import { useShell } from '../app/ShellContext.js'
import { towers } from '../scenes/building/floors.js'
import { ChevronIcon, SpinIcon } from './Brand.jsx'
import PanoramaViewer from './PanoramaViewer.jsx'
import ViewMap, { zoneCentre } from './ViewMap.jsx'
import { floorExceptions, positions, typicalPlan, wing as planWing } from '../content/floorPlans.js'
import { ordinal, typeAt } from '../content/inventory.js'
import { nearestFloor, planHeading, roomViews, topView, wingPanoramas } from '../content/panoramas.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

// The drone panoramas filling the presentation: the view from a wing at the
// height of a floor, or from directly above the site. Opened from the
// building model, the floor plans and the unit finder. Portalled into the
// page frame so the full-screen gate still covers it, and closed with Escape.
// Radians; positive pitch looks down.
const WING_START = { yaw: 0, pitch: 0.05, fov: 1.47 }
const TOP_START = { yaw: 0, pitch: 1.45, fov: 1.25 }

// Room by room: a home looks out away from the building's core, along the line
// from the plan's centre through the home. The view turns to that direction
// (on the plan, clockwise from the top of the drawing; planHeading says how the
// panorama's front sits on the plan) and can be locked to a sector around it.
const rad = Math.PI / 180
const OUTLOOK_SPAN = 110 * rad
const OUTLOOK_TILT = [-30 * rad, 60 * rad]   // 90 degrees, so a locked view keeps a wide zoom
const [planWidth, planHeight] = typicalPlan.viewBox
const bearingOf = position => {
  const [x, y] = zoneCentre(typicalPlan.zones[position])
  return (Math.atan2(x - planWidth / 2, -(y - planHeight / 2)) / rad + 360) % 360
}
// A home's view: what is set by hand in roomViews (degrees), else the estimate.
// `sector` says the outlook's edges are set (so it locks even while calibrating).
const toRadians = view => ({ yaw: view.yaw * rad, pitch: view.pitch * rad, fov: view.fov * rad })
const edgesOf = room => Array.isArray(room?.outlook) && room.outlook.every(edge => typeof edge === 'number') ? room.outlook : null
const spanOf = ([left, right]) => ((right - left) % 360 + 360) % 360
// The up / down limits set by hand ([top, bottom] pitch, degrees), lowest first, else the default.
const tiltOf = room => Array.isArray(room?.tilt) && room.tilt.every(edge => typeof edge === 'number')
  ? [Math.min(...room.tilt) * rad, Math.max(...room.tilt) * rad] : OUTLOOK_TILT
// Every home looks out at the back as well as the front (client, 16 Oct 2026):
// each side has its own view (`back` in roomViews), chosen with Front view /
// Back view; a back not yet set faces the other way from the front's estimate.
const BACK_HOMES = positions
const outlookOf = (wingId, position, rooms, side = 'front') => {
  const home = rooms[wingId]?.[position]
  const room = side === 'back' ? home?.back : home
  const edges = edgesOf(room)
  const estimate = bearingOf(position) + (side === 'back' ? 180 : 0) - planHeading[wingId]
  const yaw = edges ? (edges[0] + spanOf(edges) / 2) * rad : estimate * rad
  const view = room?.start ? toRadians(room.start) : { yaw, pitch: 0.09 }
  const lock = room?.outlook === false ? null : { yaw, span: edges ? spanOf(edges) * rad : OUTLOOK_SPAN, pitch: tiltOf(room) }
  return { manual: !!(room?.start || room?.outlook !== undefined || room?.tilt), sector: !!edges, view, lock }
}

// `?calibrate` in the address shows a Setup panel for each home's view: its
// numbers live, buttons to set its start view and its outlook's edges, and the
// result as code to paste into roomViews. What is set there is used at once and
// kept in this browser only.
const ROOMS_KEY = 'ascend.roomViews'
const savedRooms = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(ROOMS_KEY)) ?? {}
    return { A: { ...roomViews.A, ...saved.A }, B: { ...roomViews.B, ...saved.B } }
  } catch { return roomViews }
}
const round = value => Math.round(value * 10) / 10
const wrap180 = angle => angle - 360 * Math.round(angle / 360)
const inDegrees = view => ({ yaw: round(wrap180(view.yaw / rad)), pitch: round(view.pitch / rad), fov: round(view.fov / rad) })
const viewText = view => `{ yaw: ${view.yaw}, pitch: ${view.pitch}, fov: ${view.fov} }`
const roomText = room => {
  const parts = []
  if (room?.start) parts.push(`start: ${viewText(room.start)}`)
  if (room?.outlook === false) parts.push('outlook: false')
  else if (Array.isArray(room?.outlook)) parts.push(`outlook: [${room.outlook.map(edge => edge ?? 'null').join(', ')}]`)
  if (Array.isArray(room?.tilt)) parts.push(`tilt: [${room.tilt.map(edge => edge ?? 'null').join(', ')}]`)
  if (room?.back) parts.push(`back: ${roomText(room.back)}`)
  return `{ ${parts.join(', ')} }`
}
// roomViews written out as it reads in panoramas.js, ready to paste over it.
const roomsText = rooms => {
  const wing = id => {
    const homes = Object.keys(rooms[id] ?? {}).sort()
    return homes.length ? `{\n${homes.map(home => `    '${home}': ${roomText(rooms[id][home])},`).join('\n')}\n  }` : '{}'
  }
  return `export const roomViews = {\n  A: ${wing('A')},\n  B: ${wing('B')},\n}`
}
const edgeText = edge => edge == null ? '—' : `${edge}°`

export default function ViewOverlay({ wing = towers[0].id, floor = null, unit = null, onClose }) {
  const { menuOpen } = useShell()
  const root = useRef(null)
  const pano = useRef(null)
  const [tower, setTower] = useState(wing)
  const [viewFloor, setViewFloor] = useState(() => nearestFloor(wing, floor))
  // The mini plan is the plan of the floor asked for, which the drone may not have flown (floor 7,
  // say): it starts on the floor the view was opened from and follows the floor chosen here.
  const [planFloor, setPlanFloor] = useState(floor)
  const pickFloor = n => { setViewFloor(n); setPlanFloor(n) }
  const [radarUnit, setRadarUnit] = useState(unit ?? positions[0])   // the home the radar stands on
  const [side, setSide] = useState('front')                          // a corner home's front or back view
  const [locked, setLocked] = useState(unit != null)                // the view kept to that home's outlook
  const [aimed, setAimed] = useState(0)                             // counts presses, so a home pressed again turns back to it
  const [top, setTop] = useState(false)
  const [time, setTime] = useState('evening')
  const setting = useRef(new URLSearchParams(window.location.search).has('calibrate')).current
  // Calibrating starts with the slow turn off, so the numbers hold still.
  const [spinning, setSpinning] = useState(() => !setting && !prefersReducedMotion())
  const [rooms, setRooms] = useState(() => setting ? savedRooms() : roomViews)
  const [readout, setReadout] = useState(null)
  const [copied, setCopied] = useState('')
  const latest = useRef(null)                                   // the panorama's last reported yaw and horizontal field
  const [options, setOptions] = useState(false)     // the dropdown of view options
  const picker = useRef(null)
  const map = useRef(null)
  // The mini floor plan opens with the view, except on small or short screens.
  const [mapOpen, setMapOpen] = useState(() => matchMedia('(min-width: 640px) and (min-height: 545px)').matches)
  const flights = wingPanoramas[tower]
  const flight = flights.find(item => item.floor === viewFloor) ?? flights[0]
  const step = direction => {
    const next = flights[flights.indexOf(flight) + direction]
    if (next) pickFloor(next.floor)
  }

  // Focus goes to Close, and back to whatever opened the view.
  useLayoutEffect(() => {
    const opener = document.activeElement
    root.current.querySelector('[data-close]')?.focus({ preventScroll: true })
    const context = gsap.context(() => {
      if (!prefersReducedMotion()) gsap.from(root.current, { opacity: 0, duration: 0.6, ease: 'silk' })
    })
    return () => { context.revert(); opener?.isConnected && opener.focus?.({ preventScroll: true }) }
  }, [])
  useEffect(() => {
    const onKey = event => {
      if (event.target.closest?.('input, select') || event.defaultPrevented) return
      // Escape closes the dropdown first, then the view.
      if (event.key === 'Escape') { event.preventDefault(); options ? setOptions(false) : onClose() }
      if (event.key === 'ArrowLeft') { event.preventDefault(); pano.current?.look(-1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); pano.current?.look(1) }
      if (!top && event.key === 'ArrowUp') { event.preventDefault(); step(1) }
      if (!top && event.key === 'ArrowDown') { event.preventDefault(); step(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, top, viewFloor, tower, options])
  // A press anywhere outside the dropdown closes it.
  useEffect(() => {
    if (!options) return
    const away = event => { if (!picker.current?.contains(event.target)) setOptions(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [options])

  const shownFloor = planFloor ?? flight.floor
  const absent = positions.filter(position => !typeAt(shownFloor, position))
  const differs = positions.filter(position => floorExceptions[shownFloor]?.[position])
  const home = absent.includes(radarUnit) ? positions[0] : radarUnit
  const facing = BACK_HOMES.includes(home) ? side : 'front'
  const outlook = tower === planWing && !top ? outlookOf(tower, home, rooms, facing) : null
  // While calibrating, only a home whose edges are set is locked, so the edges can be found.
  const lock = locked && outlook?.lock && (!setting || outlook.sector) ? outlook.lock : null
  const start = locked && outlook ? { ...WING_START, ...outlook.view } : WING_START
  const pickHome = position => { setRadarUnit(position); setSide('front'); setLocked(true); setAimed(count => count + 1) }
  const pickSide = next => { setSide(next); setLocked(true); setAimed(count => count + 1) }
  // A home pressed, or the lock switched: fly to that home's outlook and lock, or free the view where it is.
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    const handle = pano.current
    const current = !top && handle?.getView()
    if (!current) return
    if (lock) handle.focus(outlook.view, lock)
    else if (locked && outlook) handle.focus(outlook.view, null)
    else handle.focus(current, null)
  }, [radarUnit, facing, locked, aimed, rooms])

  // The Setup panel (?calibrate): the view's numbers, live, and the home's settings.
  useEffect(() => {
    if (!setting) return
    const timer = setInterval(() => {
      const view = pano.current?.getView()
      if (view) setReadout(inDegrees(view))
    }, 200)
    return () => clearInterval(timer)
  }, [])
  const room = rooms[tower]?.[home] ?? {}
  const keepRooms = next => {
    setRooms(next)
    try { localStorage.setItem(ROOMS_KEY, JSON.stringify(next)) } catch { /* kept for this visit only */ }
  }
  const setRoom = change => {
    const next = { ...room, ...change }
    Object.keys(next).forEach(key => next[key] === undefined && delete next[key])
    const homes = { ...rooms[tower], [home]: next }
    if (!Object.keys(next).length) delete homes[home]
    keepRooms({ ...rooms, [tower]: homes })
  }
  // The side being set: the home itself (front), or its `back`.
  const part = facing === 'back' ? room.back ?? {} : room
  const setPart = change => {
    if (facing !== 'back') { setRoom(change); return }
    const next = { ...part, ...change }
    Object.keys(next).forEach(key => next[key] === undefined && delete next[key])
    setRoom({ back: Object.keys(next).length ? next : undefined })
  }
  const setRoomStart = () => {
    const view = pano.current?.getView()
    if (view) setPart({ start: inDegrees(view) })
  }
  // An edge is the yaw at that side of the screen, so the picture locks to what is on screen when it is marked.
  const markEdge = side => {
    const seen = latest.current
    if (!seen) return
    const edge = round(wrap180((seen.yaw + (side === 'left' ? -1 : 1) * seen.hfov / 2) / rad))
    const edges = Array.isArray(part.outlook) ? [...part.outlook] : [null, null]
    edges[side === 'left' ? 0 : 1] = edge
    setPart({ outlook: edges })
  }
  const copy = text => {
    setCopied(text)
    navigator.clipboard?.writeText(text).catch(() => {})
  }
  const roomSpan = edgesOf(part) ? spanOf(part.outlook) : 0
  // The top or bottom edge is the pitch at that side of the screen.
  const markTilt = edge => {
    const view = pano.current?.getView()
    if (!view) return
    const value = round((view.pitch + (edge === 'top' ? -1 : 1) * view.fov / 2) / rad)
    const tilt = Array.isArray(part.tilt) ? [...part.tilt] : [null, null]
    tilt[edge === 'top' ? 0 : 1] = value
    setPart({ tilt })
  }
  const title = top ? 'Top view' : `Wing ${tower} · Floor ${flight.floor}`
  return createPortal(<div ref={root} role="dialog" aria-modal="true" aria-label={`${title}, aerial view`} data-tone="dark" data-own-gesture data-own-keys
    className="absolute inset-0 z-70 overflow-hidden bg-plum-950 text-fg">
    {top
      ? <PanoramaViewer key="top" ref={pano} className="absolute inset-0" scenes={topView.times} active={time} start={TOP_START} spinning={spinning} paused={menuOpen}
        label={`360-degree view from directly above the site, ${time}. Drag to look around.`} />
      : <PanoramaViewer key={`wing-${tower}`} ref={pano} className="absolute inset-0" scenes={flights} active={String(viewFloor)} start={start} lock={lock} onView={view => { latest.current = view; map.current?.update(view) }} spinning={spinning} paused={menuOpen}
        label={`360-degree aerial view from Wing ${tower}, at the height of floor ${flight.floor}. Drag to look around; use the up and down arrow keys to change floor.`} />}
    {/* Shade the edges that carry text, so it reads over bright sky. */}
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,11,13,.7),transparent_26%,transparent_58%,rgba(18,11,13,.88))]" />

    <div className="pointer-events-none absolute inset-0 flex flex-col px-(--gutter) pb-[clamp(0.75rem,3vh,2rem)]">
      {setting && !top && tower === planWing && <div className="glass-panel pointer-events-auto absolute left-(--gutter) top-[calc(var(--header-h)+4.5rem)] z-0 flex max-h-[calc(100dvh-var(--header-h)-7rem)] w-80 max-w-[calc(100%-2*var(--gutter))] flex-col gap-2.5 overflow-y-auto rounded-sm bg-plum-950/90! p-3.5 text-ivory/90">
        <div>
          <p className="eyebrow">Setup · Apartment <span className="num">{home}</span>{facing === 'back' && ' · back'}</p>
          <p className="mt-1.5 text-[0.55rem] uppercase tracking-[0.22em] text-muted">Wing {tower} · floor <span className="num">{flight.floor}</span></p>
          <p className="num mt-1 text-[0.85rem] text-fg">{readout ? <>yaw {readout.yaw.toFixed(1)}° · pitch {readout.pitch.toFixed(1)}° · zoom {readout.fov.toFixed(1)}°</> : '—'}</p>
        </div>
        {BACK_HOMES.includes(home) && <div role="group" aria-label="Side to set" className="grid grid-cols-2 gap-1.5 border-t border-line pt-3">
          {[['front', 'Front view'], ['back', 'Back view']].map(([id, label]) => <button key={id} type="button" className="chip min-h-8! justify-center px-3! text-[0.55rem]!" aria-pressed={facing === id} onClick={() => pickSide(id)}>{label}</button>)}
        </div>}
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[0.55rem] uppercase tracking-[0.22em] text-muted">Start view</p>
            <p className="num text-[0.62rem] text-fg">{part.start ? `${part.start.yaw}° · ${part.start.pitch}° · zoom ${part.start.fov}°` : 'estimate'}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="chip min-h-8! px-3! text-[0.55rem]!" onClick={setRoomStart}>Set start view</button>
            <button type="button" className="chip min-h-8! px-3! text-[0.55rem]!" disabled={!part.start} onClick={() => setPart({ start: undefined })}>Clear</button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[0.55rem] uppercase tracking-[0.22em] text-muted">Outlook left → right</p>
            <p className="num text-[0.62rem] text-fg">{part.outlook === false ? 'not locked' : Array.isArray(part.outlook) ? `${edgeText(part.outlook[0])} → ${edgeText(part.outlook[1])}` : 'estimate'}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="chip min-h-8! px-3! text-[0.55rem]!" onClick={() => markEdge('left')}>Left edge</button>
            <button type="button" className="chip min-h-8! px-3! text-[0.55rem]!" onClick={() => markEdge('right')}>Right edge</button>
            <button type="button" className="chip min-h-8! px-3! text-[0.55rem]!" disabled={part.outlook === false} onClick={() => setPart({ outlook: false })}>Unlock</button>
          </div>
          <p className="text-[0.55rem] leading-relaxed tracking-[0.1em] text-muted">
            {roomSpan > 165 ? 'Wider than 165°: it cannot be locked, mark a narrower outlook. ' : ''}Press a home on the plan, then turn until that side of the screen is the outlook's edge and press its button. Unlock frees the view to mark again.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[0.55rem] uppercase tracking-[0.22em] text-muted">Up / down top → bottom</p>
            <p className="num text-[0.62rem] text-fg">{Array.isArray(part.tilt) ? `${edgeText(part.tilt[0])} → ${edgeText(part.tilt[1])}` : '-30° → 60°'}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="chip min-h-8! px-3! text-[0.55rem]!" onClick={() => markTilt('top')}>Top edge</button>
            <button type="button" className="chip min-h-8! px-3! text-[0.55rem]!" onClick={() => markTilt('bottom')}>Bottom edge</button>
            <button type="button" className="chip min-h-8! px-3! text-[0.55rem]!" disabled={!part.tilt} onClick={() => setPart({ tilt: undefined })}>Clear</button>
          </div>
          <p className="text-[0.55rem] leading-relaxed tracking-[0.1em] text-muted">
            Tilt until the top of the screen is as high as the view should go and press Top edge; then as low as it should go, Bottom edge. Clear frees it to mark again.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
          <button type="button" className="chip min-h-8! px-3! text-[0.55rem]!" disabled={!rooms[tower]?.[home]} onClick={() => copy(`'${home}': ${roomText(room)},`)}>Copy this room</button>
          <button type="button" className="chip min-h-8! px-3! text-[0.55rem]!" onClick={() => copy(roomsText(rooms))}>Copy all rooms</button>
        </div>
        <textarea readOnly rows={3} aria-label="Copied text, to paste into roomViews in src/content/panoramas.js" value={copied || roomsText(rooms)} onFocus={event => event.target.select()}
          className="w-full resize-none rounded-sm border border-line bg-transparent p-1.5 text-[0.58rem] tracking-normal text-ivory/90" />
        <p className="text-[0.52rem] uppercase leading-relaxed tracking-[0.18em] text-muted">Paste into roomViews in src/content/panoramas.js</p>
      </div>}
      <div className="flex h-(--header-h) shrink-0 items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{title}</p>
          <p className="mt-1.5 max-w-xl text-[0.58rem] uppercase leading-relaxed tracking-[0.22em] text-ivory/80">
            {top
              ? <>Aerial photograph of the site, taken <span className="num">{topView.height}</span> m above it</>
              : <>Aerial photograph of the site, <span className="num">{flight.height}</span> m up, the height of floor <span className="num">{flight.floor}</span> · {lock ? <>outlook of Unit <span className="num">{home}</span>{facing === 'back' && ' at the back'}{!outlook.manual && ', angle indicative'}</> : 'views from each residence vary'}</>}
          </p>
        </div>
        <button type="button" data-close className="btn-icon pointer-events-auto shrink-0" onClick={onClose} aria-label="Close view">
          <svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19" /></svg>
        </button>
      </div>

      {/* The view's options drop down from the top left, over the picture. */}
      <div ref={picker} className="pointer-events-auto relative mt-2 self-start">
        <button type="button" className="chip flex items-center gap-2.5" aria-expanded={options} aria-controls="view-options" onClick={() => setOptions(open => !open)}>
          <span>{top ? `Top view · ${topView.times.find(item => item.id === time).label}` : <>Wing {tower} · Floor <span className="num">{flight.floor}</span></>}</span>
          <svg viewBox="0 0 12 12" aria-hidden="true" className={`size-2.5 fill-none stroke-current stroke-[1.4] transition-transform duration-300 ${options ? 'rotate-180' : ''}`}><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
        </button>
        {options && <div id="view-options" className="glass-panel absolute left-0 top-full z-1 mt-2 flex max-h-[calc(100dvh-var(--header-h)-6.5rem)] w-[min(21rem,calc(100vw-2*var(--gutter)))] flex-col gap-5 overflow-y-auto rounded-sm bg-plum-950/90! p-4">
          {/* One row of segments for the kind of view, then what that view needs. */}
          <div role="group" aria-label="View" className="grid grid-cols-2 gap-1 rounded-full border border-line p-1">
            <button type="button" className="chip justify-center border-transparent!" aria-pressed={!top} onClick={() => setTop(false)}>Wing view</button>
            <button type="button" className="chip justify-center border-transparent!" aria-pressed={top} onClick={() => setTop(true)}>Top view</button>
          </div>
          {top
            ? <div role="group" aria-label="Time of day" className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="eyebrow">Time of day</span>
                <span className="text-[0.58rem] uppercase tracking-[0.2em] text-muted"><span className="num">{topView.height}</span> m up</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {topView.times.map(item => <button key={item.id} type="button" className="chip justify-center px-0!" aria-pressed={time === item.id} onClick={() => setTime(item.id)}>{item.label}</button>)}
              </div>
            </div>
            : <>
              <div role="group" aria-label="Wing" className="flex flex-col gap-2.5">
                <span className="eyebrow">Wing</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {towers.map(item => <button key={item.id} type="button" className="chip justify-center" aria-pressed={tower === item.id} aria-label={`Wing ${item.id}`} onClick={() => setTower(item.id)}>Wing {item.id}</button>)}
                </div>
              </div>
              <div role="group" aria-label="Floor of the view" className="flex flex-col gap-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="eyebrow">Floor</span>
                  <span className="text-[0.58rem] uppercase tracking-[0.2em] text-muted"><span className="num">{flight.height}</span> m up</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {flights.map(item => <button key={item.id} type="button" className="chip num justify-center px-0!" aria-pressed={item.floor === flight.floor} aria-label={`Floor ${item.floor}`} onClick={() => pickFloor(item.floor)}>{item.floor}</button>)}
                </div>
              </div>
            </>}
          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            {lock
              ? <button type="button" className="chip" onClick={() => setLocked(false)}>All round</button>
              : <button type="button" className="chip flex items-center gap-2" onClick={() => setSpinning(on => !on)}>
                <span className="size-4 [&_svg]:size-full [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.6]"><SpinIcon paused={!spinning} /></span>
                {spinning ? 'Pause turn' : 'Turn'}
              </button>}
            {/* On phones the panorama is dragged; the arrows join from sm up. */}
            <div className="flex gap-2 max-sm:hidden">
              <button type="button" className="btn-icon" aria-label="Look left" onClick={() => pano.current?.look(-1)}><ChevronIcon direction="left" /></button>
              <button type="button" className="btn-icon" aria-label="Look right" onClick={() => pano.current?.look(1)}><ChevronIcon /></button>
            </div>
          </div>
        </div>}
      </div>

      {/* A mini floor plan, bottom right, with a radar at its centre that
          turns with the picture. Wing B has no plans yet. */}
      {!top && <div className={`pointer-events-auto mt-auto self-end ${mapOpen ? 'glass-panel w-[min(22rem,100%)] rounded-sm bg-plum-950/90! p-3' : ''}`}>
        <div className="flex items-center justify-between gap-4">
          {mapOpen && <p className="flex items-center gap-2.5 text-[0.62rem] font-medium uppercase tracking-[0.22em] text-fg">
            <span className="size-1.5 rounded-full bg-gold-400" aria-hidden="true" />
            <span><span className="num">{ordinal(shownFloor)}</span> floor plan</span>
          </p>}
          <button type="button" className="chip" aria-expanded={mapOpen} onClick={() => setMapOpen(open => !open)}>{mapOpen ? 'Hide' : 'Show map'}</button>
        </div>
        <div hidden={!mapOpen} className="mt-3">
          {tower === planWing
            ? <ViewMap ref={map} plan={typicalPlan} zones={typicalPlan.zones} homes={positions.filter(position => !absent.includes(position))} absent={absent} differs={differs}
              unit={home} onUnit={pickHome} heading={planHeading[tower]}
              alt={`Floor ${shownFloor} plan of Wing ${tower}, with a radar showing where the view looks`} />
            : <p className="rounded-sm bg-cream-100 px-4 py-8 text-center text-[0.62rem] uppercase tracking-[0.22em] text-muted" data-tone="light">Wing {tower} plans to follow</p>}
          {(absent.length > 0 || differs.length > 0) && <p className="mt-2 text-[0.52rem] uppercase leading-relaxed tracking-[0.2em] text-fg/80">
            {[...differs.map(position => `Unit ${position} has its own plan on this floor`), ...absent.map(position => `Unit ${position} is not on this floor`)].join(' · ')}
          </p>}
          {tower === planWing && BACK_HOMES.includes(home) && <div role="group" aria-label={`Unit ${home}'s view`} className="mt-3 grid grid-cols-2 gap-1.5">
            {[['front', 'Front view'], ['back', 'Back view']].map(([id, label]) => <button key={id} type="button" className="chip justify-center px-0!" aria-pressed={locked && facing === id} onClick={() => pickSide(id)}>{label}</button>)}
          </div>}
          {tower === planWing && <button type="button" className="chip mt-3 w-full justify-center" aria-pressed={locked} onClick={() => locked ? setLocked(false) : pickHome(home)}>
            {locked ? <>Outlook of Unit <span className="num ml-1">{home}</span>{facing === 'back' && ' · back'} · tap for all round</> : 'Look from this home'}
          </button>}
          <p className="mt-2 text-[0.52rem] uppercase leading-relaxed tracking-[0.2em] text-muted">The radar shows where the view looks · press a home to look out from it · direction indicative</p>
        </div>
      </div>}
    </div>
  </div>, document.querySelector('.page-frame') || document.body)
}
