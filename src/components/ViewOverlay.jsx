import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from '../app/reveal.js'
import { useShell } from '../app/ShellContext.js'
import { towers } from '../scenes/building/floors.js'
import { ChevronIcon, SpinIcon } from './Brand.jsx'
import PanoramaViewer from './PanoramaViewer.jsx'
import { nearestFloor, topView, wingPanoramas } from '../content/panoramas.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

// The drone panoramas filling the presentation: the view from a wing at the
// height of a floor, or from directly above the site. Opened from the
// building model, the floor plans and the unit finder. Portalled into the
// page frame so the full-screen gate still covers it, and closed with Escape.
// Radians; positive pitch looks down.
const WING_START = { yaw: 0, pitch: 0.05, fov: 1.47 }
const TOP_START = { yaw: 0, pitch: 1.45, fov: 1.25 }

export default function ViewOverlay({ wing = towers[0].id, floor = null, onClose }) {
  const { menuOpen } = useShell()
  const root = useRef(null)
  const pano = useRef(null)
  const [tower, setTower] = useState(wing)
  const [viewFloor, setViewFloor] = useState(() => nearestFloor(wing, floor))
  const [top, setTop] = useState(false)
  const [time, setTime] = useState('evening')
  const [spinning, setSpinning] = useState(() => !prefersReducedMotion())
  const flights = wingPanoramas[tower]
  const flight = flights.find(item => item.floor === viewFloor) ?? flights[0]
  const step = direction => {
    const next = flights[flights.indexOf(flight) + direction]
    if (next) setViewFloor(next.floor)
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
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key === 'ArrowLeft') { event.preventDefault(); pano.current?.look(-1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); pano.current?.look(1) }
      if (!top && event.key === 'ArrowUp') { event.preventDefault(); step(1) }
      if (!top && event.key === 'ArrowDown') { event.preventDefault(); step(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, top, viewFloor, tower])

  const title = top ? 'Top view' : `Wing ${tower} · Floor ${flight.floor}`
  return createPortal(<div ref={root} role="dialog" aria-modal="true" aria-label={`${title}, aerial view`} data-tone="dark" data-own-gesture data-own-keys
    className="absolute inset-0 z-70 overflow-hidden bg-plum-950 text-fg">
    {top
      ? <PanoramaViewer key="top" ref={pano} className="absolute inset-0" scenes={topView.times} active={time} start={TOP_START} spinning={spinning} paused={menuOpen}
        label={`360-degree view from directly above the site, ${time}. Drag to look around.`} />
      : <PanoramaViewer key={`wing-${tower}`} ref={pano} className="absolute inset-0" scenes={flights} active={String(viewFloor)} start={WING_START} spinning={spinning} paused={menuOpen}
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
              : <>Aerial photograph of the site, <span className="num">{flight.height}</span> m up, the height of floor <span className="num">{flight.floor}</span> · views from each residence vary</>}
          </p>
        </div>
        <button type="button" data-close className="btn-icon pointer-events-auto shrink-0" onClick={onClose} aria-label="Close view">
          <svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19" /></svg>
        </button>
      </div>

      <div className="glass-panel pointer-events-auto mx-auto mt-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-x-5 gap-y-3 rounded-sm px-5 py-4 short:max-w-none short:py-2.5">
        <div role="group" aria-label="View" className="flex gap-1.5">
          <button type="button" className="chip" aria-pressed={!top} onClick={() => setTop(false)}>Wing view</button>
          <button type="button" className="chip" aria-pressed={top} onClick={() => setTop(true)}>Top view</button>
        </div>
        {top
          ? <div role="group" aria-label="Time of day" className="flex gap-1.5">
            {topView.times.map(item => <button key={item.id} type="button" className="chip" aria-pressed={time === item.id} onClick={() => setTime(item.id)}>{item.label}</button>)}
          </div>
          : <>
            <div role="group" aria-label="Wing" className="flex items-center gap-1.5">
              <span className="eyebrow mr-1 short:hidden" aria-hidden="true">Wing</span>
              {towers.map(item => <button key={item.id} type="button" className="chip min-w-11" aria-pressed={tower === item.id} aria-label={`Wing ${item.id}`} onClick={() => setTower(item.id)}>{item.id}</button>)}
            </div>
            <div role="group" aria-label="Floor of the view" data-own-gesture className="-my-1 flex max-w-full gap-1.5 overflow-x-auto py-1">
              {flights.map(item => <button key={item.id} type="button" className="chip num min-w-11 shrink-0" aria-pressed={item.floor === flight.floor} aria-label={`Floor ${item.floor}`} onClick={() => setViewFloor(item.floor)}>{item.floor}</button>)}
            </div>
          </>}
        <div className="flex gap-2">
          <button type="button" className="btn-icon" onClick={() => setSpinning(on => !on)} aria-label={spinning ? 'Stop rotation' : 'Start rotation'}><SpinIcon paused={!spinning} /></button>
          {/* On phones the panorama is dragged; the arrows join from sm up. */}
          <button type="button" className="btn-icon max-sm:hidden" aria-label="Look left" onClick={() => pano.current?.look(-1)}><ChevronIcon direction="left" /></button>
          <button type="button" className="btn-icon max-sm:hidden" aria-label="Look right" onClick={() => pano.current?.look(1)}><ChevronIcon /></button>
        </div>
      </div>
    </div>
  </div>, document.querySelector('.page-frame') || document.body)
}
