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
import { nearestFloor, planHeading, topView, wingPanoramas } from '../content/panoramas.js'
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
const OUTLOOK_TILT = [-20 * rad, 40 * rad]
const [planWidth, planHeight] = typicalPlan.viewBox
const bearingOf = position => {
  const [x, y] = zoneCentre(typicalPlan.zones[position])
  return (Math.atan2(x - planWidth / 2, -(y - planHeight / 2)) / rad + 360) % 360
}
const outlookOf = (wingId, position) => {
  const yaw = (bearingOf(position) - planHeading[wingId]) * rad
  return { view: { yaw, pitch: 0.09 }, lock: { yaw, span: OUTLOOK_SPAN, pitch: OUTLOOK_TILT } }
}

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
  const [locked, setLocked] = useState(unit != null)                // the view kept to that home's outlook
  const [aimed, setAimed] = useState(0)                             // counts presses, so a home pressed again turns back to it
  const [top, setTop] = useState(false)
  const [time, setTime] = useState('evening')
  const [spinning, setSpinning] = useState(() => !prefersReducedMotion())
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
  const outlook = tower === planWing && !top ? outlookOf(tower, home) : null
  const lock = locked && outlook ? outlook.lock : null
  const start = lock ? { ...WING_START, ...outlook.view } : WING_START
  const pickHome = position => { setRadarUnit(position); setLocked(true); setAimed(count => count + 1) }
  // A home pressed, or the lock switched: fly to that home's outlook and lock, or free the view where it is.
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    const handle = pano.current
    const current = !top && handle?.getView()
    if (!current) return
    if (lock) handle.focus(outlook.view, lock)
    else handle.focus(current, null)
  }, [radarUnit, locked, aimed])
  const title = top ? 'Top view' : `Wing ${tower} · Floor ${flight.floor}`
  return createPortal(<div ref={root} role="dialog" aria-modal="true" aria-label={`${title}, aerial view`} data-tone="dark" data-own-gesture data-own-keys
    className="absolute inset-0 z-70 overflow-hidden bg-plum-950 text-fg">
    {top
      ? <PanoramaViewer key="top" ref={pano} className="absolute inset-0" scenes={topView.times} active={time} start={TOP_START} spinning={spinning} paused={menuOpen}
        label={`360-degree view from directly above the site, ${time}. Drag to look around.`} />
      : <PanoramaViewer key={`wing-${tower}`} ref={pano} className="absolute inset-0" scenes={flights} active={String(viewFloor)} start={start} lock={lock} onView={view => map.current?.update(view)} spinning={spinning} paused={menuOpen}
        label={`360-degree aerial view from Wing ${tower}, at the height of floor ${flight.floor}. Drag to look around; use the up and down arrow keys to change floor.`} />}
    {/* Shade the edges that carry text, so it reads over bright sky. */}
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,11,13,.7),transparent_26%,transparent_58%,rgba(18,11,13,.88))]" />

    <div className="pointer-events-none absolute inset-0 flex flex-col px-(--gutter) pb-[clamp(0.75rem,3vh,2rem)]">
      <div className="flex h-(--header-h) shrink-0 items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{title}</p>
          <p className="mt-1.5 max-w-xl text-[0.58rem] uppercase leading-relaxed tracking-[0.22em] text-ivory/80">
            {top
              ? <>Aerial photograph of the site, taken <span className="num">{topView.height}</span> m above it</>
              : <>Aerial photograph of the site, <span className="num">{flight.height}</span> m up, the height of floor <span className="num">{flight.floor}</span> · {lock ? <>outlook of Unit <span className="num">{home}</span>, angle indicative</> : 'views from each residence vary'}</>}
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
          {tower === planWing && <button type="button" className="chip mt-3 w-full justify-center" aria-pressed={locked} onClick={() => locked ? setLocked(false) : pickHome(home)}>
            {locked ? <>Outlook of Unit <span className="num ml-1">{home}</span> · tap for all round</> : 'Look from this home'}
          </button>}
          <p className="mt-2 text-[0.52rem] uppercase leading-relaxed tracking-[0.2em] text-muted">The radar shows where the view looks · press a home to look out from it · direction indicative</p>
        </div>
      </div>}
    </div>
  </div>, document.querySelector('.page-frame') || document.body)
}
