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
import { nearestFloor, outlooks, planHeading, topView, wingPanoramas } from '../content/panoramas.js'
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
// Each home has two outlooks, front and back (client, 16 Oct 2026). One
// calibrated in the setup panel (`outlooks`, in degrees) is kept within its
// own left, right, up and down edges and opens centred between them, showing
// all it can; otherwise the front faces away from the core and the back the
// other way, 110° wide.
const SIDES = ['front', 'back']
const outlookOf = (wingId, position, side, saved) => {
  const set = saved[wingId]?.[position]?.[side] ?? {}
  const facing = (bearingOf(position) - planHeading[wingId] + (side === 'back' ? 180 : 0)) * rad
  const lock = { yaw: facing, span: OUTLOOK_SPAN, pitch: OUTLOOK_TILT }
  const view = { yaw: facing, pitch: 0.09 }
  const span = edgeSpan(set.yaw)
  if (span) {
    Object.assign(lock, { yaw: (set.yaw[0] + span / 2) * rad, span: span * rad })
    view.yaw = lock.yaw
  }
  if (set.pitch?.[0] != null && set.pitch?.[1] != null) {
    const [up, down] = [...set.pitch].sort((a, b) => a - b)
    lock.pitch = [up * rad, down * rad]
    Object.assign(view, { pitch: (up + down) / 2 * rad, fov: (down - up) * rad })
  } else if (span) view.fov = OUTLOOK_TILT[1] - OUTLOOK_TILT[0]
  // A start view, where set, is where the outlook opens (kept within its edges).
  if (set.start) Object.assign(view, { yaw: set.start[0] * rad, pitch: set.start[1] * rad, fov: set.start[2] * rad })
  if (set.start && !span) lock.yaw = view.yaw
  return { view, lock }
}
// Degrees clockwise from the left edge to the right, or null until both are set.
const edgeSpan = edges => edges?.[0] != null && edges?.[1] != null ? (((edges[1] - edges[0]) % 360) + 360) % 360 || 360 : null

// The setup panel, for calibrating each home's outlook by eye: on with ?setup
// in the address (kept for the session), off with ?setup=off. Its settings
// are kept as drafts in this browser and apply only while setup is on, until
// copied into `outlooks` in panoramas.js.
const SETUP_KEY = 'ascend-view-setup'
const DRAFTS_KEY = 'ascend-outlook-drafts'
const setupMode = () => {
  try {
    const flag = new URLSearchParams(location.search).get('setup')
    if (flag === 'off') sessionStorage.removeItem(SETUP_KEY)
    else if (flag !== null) sessionStorage.setItem(SETUP_KEY, '1')
    return sessionStorage.getItem(SETUP_KEY) === '1'
  } catch { return false }
}
const readDrafts = () => { try { return JSON.parse(localStorage.getItem(DRAFTS_KEY)) || {} } catch { return {} } }
const writeDrafts = drafts => { try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)) } catch {} }
// The code's outlooks with this browser's drafts over them, side by side
// (a null draft clears a setting).
const complete = pair => pair?.[0] != null && pair?.[1] != null
const mergeOutlooks = drafts => {
  const merged = {}
  for (const wingId of new Set([...Object.keys(outlooks), ...Object.keys(drafts)])) {
    merged[wingId] = {}
    for (const position of new Set([...Object.keys(outlooks[wingId] ?? {}), ...Object.keys(drafts[wingId] ?? {})])) {
      const entry = {}
      for (const side of SIDES) {
        const set = { ...outlooks[wingId]?.[position]?.[side], ...drafts[wingId]?.[position]?.[side] }
        if (set.start || set.yaw || set.pitch) entry[side] = set
      }
      if (Object.keys(entry).length) merged[wingId][position] = entry
    }
  }
  return merged
}
const degrees = angle => ((angle / rad) % 360 + 360) % 360
const round = value => Math.round(value * 10) / 10
const shown = value => value == null ? '—' : `${round(value).toFixed(1)}°`
const sideLine = set => [set?.start && `start: [${set.start.join(', ')}]`, complete(set?.yaw) && `yaw: [${set.yaw.join(', ')}]`, complete(set?.pitch) && `pitch: [${set.pitch.join(', ')}]`].filter(Boolean).join(', ')
const roomLine = (position, entry) => `'${position}': { ${SIDES.filter(side => sideLine(entry[side])).map(side => `${side}: { ${sideLine(entry[side])} }`).join(', ')} },`
const allRooms = merged => `export const outlooks = {\n${Object.entries(merged).map(([wingId, rooms]) =>
  `  ${wingId}: {\n${Object.entries(rooms).sort(([a], [b]) => a.localeCompare(b)).map(([position, entry]) => `    ${roomLine(position, entry)}`).join('\n')}\n  },`).join('\n')}\n}\n`
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true } catch {}
  const area = Object.assign(document.createElement('textarea'), { value: text })
  document.body.append(area)
  area.select()
  const done = document.execCommand('copy')
  area.remove()
  return done
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
  const [setup] = useState(setupMode)
  const [drafts, setDrafts] = useState(() => setup ? readDrafts() : {})
  const [live, setLive] = useState(null)      // the view as it moves, for the setup panel's readout
  const saved = setup ? mergeOutlooks(drafts) : outlooks
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
  const [side, setSide] = useState('front')          // which of the home's two outlooks
  const outlook = tower === planWing && !top ? outlookOf(tower, home, side, saved) : null
  const lock = locked && outlook ? outlook.lock : null
  const start = lock ? { ...WING_START, ...outlook.view } : WING_START
  // A home is entered from the front.
  const pickHome = position => { setRadarUnit(position); setSide('front'); setLocked(true); setAimed(count => count + 1) }
  const turnAround = () => { setSide(value => value === 'front' ? 'back' : 'front'); setLocked(true); setAimed(count => count + 1) }
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
  // Setup: change this home's draft, and while the view is locked, apply the new outlook at once.
  const setDraft = change => {
    setDrafts(value => {
      const room = value[tower]?.[home] ?? {}
      const next = { ...value, [tower]: { ...value[tower], [home]: { ...room, [side]: { ...room[side], ...change } } } }
      writeDrafts(next)
      return next
    })
    if (locked) setAimed(count => count + 1)
  }
  const title = top ? 'Top view' : `Wing ${tower} · Floor ${flight.floor}`
  return createPortal(<div ref={root} role="dialog" aria-modal="true" aria-label={`${title}, aerial view`} data-tone="dark" data-own-gesture data-own-keys
    className="absolute inset-0 z-70 overflow-hidden bg-plum-950 text-fg">
    {top
      ? <PanoramaViewer key="top" ref={pano} className="absolute inset-0" scenes={topView.times} active={time} start={TOP_START} spinning={spinning} paused={menuOpen}
        label={`360-degree view from directly above the site, ${time}. Drag to look around.`} />
      : <PanoramaViewer key={`wing-${tower}`} ref={pano} className="absolute inset-0" scenes={flights} active={String(viewFloor)} start={start} lock={lock} onView={view => { map.current?.update(view); if (setup) setLive(view) }} spinning={spinning} paused={menuOpen}
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
              : <>Aerial photograph of the site, <span className="num">{flight.height}</span> m up, the height of floor <span className="num">{flight.floor}</span> · {lock ? <>{side} outlook of Unit <span className="num">{home}</span>, angle indicative</> : 'views from each residence vary'}</>}
          </p>
        </div>
        <button type="button" data-close className="btn-icon pointer-events-auto shrink-0" onClick={onClose} aria-label="Close view">
          <svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19" /></svg>
        </button>
      </div>

      {/* The view's options drop down from the top left, over the picture. */}
      <div className="mt-2 flex flex-wrap items-start gap-2 self-start">
      <div ref={picker} className="pointer-events-auto relative">
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
      {/* Looking out from a home: one button turns to its other side. */}
      {lock && <button type="button" className="btn-lux pointer-events-auto whitespace-nowrap" onClick={turnAround}
        aria-label={`Turn to the ${side === 'front' ? 'back' : 'front'} view of Unit ${home}`}>{side === 'front' ? 'Back view' : 'Front view'}</button>}
      </div>

      {setup && !top && <SetupPanel wing={tower} unit={home} side={side} live={live} set={saved[tower]?.[home]?.[side] ?? {}} entry={saved[tower]?.[home] ?? {}} all={saved}
        calibrating={tower === planWing} locked={locked} onLock={() => { if (locked) setLocked(false); else { setLocked(true); setAimed(count => count + 1) } }} onChange={setDraft} />}

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

// The setup panel (?setup): a live readout of the view, and the edges of the
// home's front or back outlook (the button beside the view's options turns
// between them). Each edge is taken from the screen's own edge: turn until
// the outlook's left limit sits at the left of the screen and press Left, and
// so on. Unlock frees the view to look past the edges; Lock shows the outlook
// as visitors see it, centred between them.
function SetupPanel({ wing, unit, side, live, set, entry, all, calibrating, locked, onLock, onChange }) {
  const [copied, setCopied] = useState(null)
  const now = live && {
    yaw: round(degrees(live.yaw)), pitch: round(live.pitch / rad), zoom: round(live.fov / rad),
    left: round(degrees(live.yaw - live.hfov / 2)), right: round(degrees(live.yaw + live.hfov / 2)),
    up: round((live.pitch - live.fov / 2) / rad), down: round((live.pitch + live.fov / 2) / rad),
  }
  const yaw = set.yaw ?? [null, null]
  const pitch = set.pitch ?? [null, null]
  const copy = async (what, text) => { setCopied(await copyText(text) ? what : 'failed'); setTimeout(() => setCopied(null), 1600) }
  const label = 'text-[0.55rem] uppercase tracking-[0.24em] text-muted'
  const pair = (title, values, arrow, buttons, clear) => <div className="mt-4 border-t border-line pt-3">
    <div className="flex items-baseline justify-between gap-3">
      <span className={label}>{title}</span>
      <span className="num text-[0.66rem] text-muted">{shown(values[0])} {arrow} {shown(values[1])}</span>
    </div>
    <div className="mt-2 flex flex-wrap gap-2">
      {buttons.map(([text, change]) => <button key={text} type="button" className="chip" disabled={!now} onClick={() => onChange(change())}>{text}</button>)}
      {(values[0] != null || values[1] != null) && <button type="button" className="chip border-transparent!" onClick={() => onChange(clear)}>Clear</button>}
    </div>
  </div>
  return <div role="region" aria-label="View setup" className="glass-panel pointer-events-auto absolute right-(--gutter) top-[calc(var(--header-h)+0.5rem)] max-h-[calc(100dvh-var(--header-h)-1.5rem)] w-[min(19rem,calc(100vw-2*var(--gutter)))] overflow-y-auto rounded-sm bg-plum-950/90! p-4 text-fg">
    <p className="eyebrow">Setup · Wing {wing} · Unit <span className="num">{unit}</span> · {side}</p>
    <p className="num mt-2 text-[0.8rem]">{now ? <>yaw {now.yaw.toFixed(1)}° · pitch {now.pitch.toFixed(1)}° · zoom {now.zoom.toFixed(1)}°</> : '—'}</p>
    {!calibrating
      ? <p className={`${label} mt-4 leading-relaxed`}>Wing {wing} has no plans yet: choose Wing A to set its homes' views.</p>
      : <>
        <div className="mt-4 border-t border-line pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className={label}>Start view</span>
            <span className="num text-[0.66rem] text-muted">{set.start ? `${set.start[0]}° · ${set.start[1]}° · ${set.start[2]}°` : 'centred'}</span>
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" className="chip" disabled={!now} onClick={() => onChange({ start: [now.yaw, now.pitch, now.zoom] })}>Set start view</button>
            {set.start && <button type="button" className="chip border-transparent!" onClick={() => onChange({ start: null })}>Clear</button>}
          </div>
        </div>
        {pair('Left → right', yaw, '→', [['Left edge', () => ({ yaw: [now.left, yaw[1]] })], ['Right edge', () => ({ yaw: [yaw[0], now.right] })]], { yaw: null })}
        {pair('Up ↕ down', pitch, '↕', [['Up edge', () => ({ pitch: [now.up, pitch[1]] })], ['Down edge', () => ({ pitch: [pitch[0], now.down] })]], { pitch: null })}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
          <button type="button" className="chip" aria-pressed={locked} onClick={onLock}>{locked ? 'Unlock' : 'Lock'}</button>
          <button type="button" className="chip" onClick={() => copy('room', roomLine(unit, entry))}>{copied === 'room' ? 'Copied' : 'Copy this room'}</button>
          <button type="button" className="chip" onClick={() => copy('all', allRooms(all))}>{copied === 'all' ? 'Copied' : 'Copy all rooms'}</button>
        </div>
        {copied === 'failed' && <p className={`${label} mt-2`}>Copy blocked by the browser</p>}
        <p className={`${label} mt-3 leading-relaxed normal-case tracking-[0.06em]`}>Choose a home on the mini plan, Unlock, and turn until each limit sits at that edge of the screen. Back view / Front view switches side. Saved in this browser while setup is on; paste "Copy all rooms" into src/content/panoramas.js to keep it for everyone.</p>
      </>}
  </div>
}
