import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from '../app/reveal.js'
import { Figure, PageHeading, TemplateNote } from '../components/PageKit.jsx'
import { planRect, units } from '../content/project.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

const PLAN_RATIO = 2680 / 1660
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const Icon = ({ d }) => <svg viewBox="0 0 24 24"><path d={d} /></svg>

export default function FloorPlansPage() {
  const unit = units[0]
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)
  const [focus, setFocus] = useState(null)       // { id, n }: a zoom request
  const [fullscreen, setFullscreen] = useState(false)
  const active = hovered || selected
  const tilt = useRef(null)
  const opener = useRef(null)

  const chooseRoom = room => {
    const next = selected === room.id ? null : room.id
    setSelected(next)
    setFocus({ id: next, n: Date.now() })
  }

  // The plan rises from a tilted sheet to lie flat on arrival.
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      gsap.from(tilt.current, { rotateX: 58, rotateZ: -16, scale: 0.8, autoAlpha: 0, duration: 2.2, delay: 0.35, ease: 'expo.out' })
    })
    return () => context.revert()
  }, [])

  const closeFullscreen = () => { setFullscreen(false); requestAnimationFrame(() => opener.current?.focus({ preventScroll: true })) }

  return <section data-tone="light" className="page page-scroll flex flex-col gap-6 split:grid split:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] split:gap-x-[4vw] 3xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
    <div className="flex min-h-0 shrink-0 flex-col gap-[clamp(1rem,3vh,1.75rem)] split:shrink">
      <PageHeading id="floor-plans" title="Floor Plan" subtitle={`Unit ${unit.unit} · ${unit.configuration}`} />
      <div className="grid grid-cols-3 gap-3 border-y border-line py-4">
        <Figure value={unit.reraArea} suffix="sq.ft" label="RERA area" />
        <Figure value={unit.balcony} suffix="sq.ft" label="Balcony" />
        <Figure value={unit.totalArea} suffix="sq.ft" label="Total area" />
      </div>
      <div data-reveal className="flex min-h-0 flex-1 flex-col">
        <p className="eyebrow mb-2">Room schedule</p>
        <ul className="page-scroll -mx-2 min-h-0 flex-1 px-2 py-1 [mask-image:linear-gradient(transparent,#000_0.9rem,#000_calc(100%-0.9rem),transparent)] stack:max-h-[32vh] stack:flex-none" onPointerLeave={() => setHovered(null)}>
          {unit.rooms.map(room => <li key={room.id}>
            <button type="button" aria-pressed={selected === room.id}
              onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(room.id) }}
              onFocus={() => setHovered(room.id)} onBlur={() => setHovered(null)} onClick={() => chooseRoom(room)}
              className={`group flex min-h-11 w-full items-center justify-between gap-4 rounded-sm border-b border-line pl-1 text-left outline-offset-[-2px] transition-colors duration-500 ${active === room.id ? 'text-gold-700' : 'text-fg'}`}>
              <span className="flex items-center gap-3">
                <span className={`size-1.5 rounded-full transition-all duration-500 ${active === room.id ? 'scale-150 bg-gold-600' : 'bg-plum-700/25'}`} />
                <span className="text-[0.74rem] font-medium uppercase tracking-[0.14em]">{room.name}</span>
              </span>
              <span className="num text-[0.8rem] text-muted">{room.size}</span>
            </button>
          </li>)}
        </ul>
      </div>
    </div>

    <div className="relative flex min-h-[52vh] flex-col split:min-h-0">
      <div className="relative min-h-0 flex-1 perspective-[1800px]">
        <div ref={tilt} className="absolute inset-0 grid place-items-center @container-size">
          <PlanStage unit={unit} active={active} focus={focus} onHover={setHovered} onPick={chooseRoom}
            actions={<button ref={opener} type="button" className="btn-icon bg-cream-50/80!" onClick={() => setFullscreen(true)} aria-label="View plan full screen">
              <Icon d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
            </button>} />
        </div>
      </div>
      <div data-reveal className="mt-4 flex flex-wrap items-center justify-end gap-4">
        <TemplateNote className="max-sm:hidden">Indicative plan · not to scale</TemplateNote>
        <KeyPlan unit={unit} />
      </div>
    </div>

    {fullscreen && <PlanFullscreen unit={unit} active={active} selected={selected} onHover={setHovered} onPick={chooseRoom} onClose={closeFullscreen} />}
  </section>
}

function KeyPlan({ unit }) {
  return <figure className="relative flex items-center gap-3 border border-line bg-cream-50/70 p-1.5 pr-3" aria-label="Key plan with the unit highlighted">
    <img src={unit.keyPlan} alt="Key plan showing the unit's position on the floor" className="h-14 w-auto" />
    <span className="flex flex-col items-center text-[0.55rem] font-semibold tracking-[0.2em] text-fg" aria-hidden="true">
      N<svg viewBox="0 0 12 24" className="mt-1 h-6 w-3 fill-none stroke-current"><path d="M6 23V1M1 7l5-6 5 6" /></svg>
    </span>
  </figure>
}

// The plan with zoom (buttons, wheel), drag to pan when zoomed, and room
// hotspots. `focus` asks it to centre and zoom on a room, or to reset.
function PlanStage({ unit, active, focus, onHover, onPick, actions }) {
  const view = useRef({ scale: 1, x: 0, y: 0 })
  const viewport = useRef(null)
  const stage = useRef(null)
  const drag = useRef(null)
  const [zoomed, setZoomed] = useState(false)
  const activeRoom = unit.rooms.find(room => room.id === active)

  const apply = (next, duration = 0.9) => {
    const box = viewport.current.getBoundingClientRect()
    const scale = clamp(next.scale, 1, 3.4)
    // Keep the plan covering its frame at every zoom level.
    const limitX = (box.width * (scale - 1)) / 2
    const limitY = (box.height * (scale - 1)) / 2
    view.current = { scale, x: clamp(next.x, -limitX, limitX), y: clamp(next.y, -limitY, limitY) }
    setZoomed(scale > 1.01)
    gsap.to(stage.current, { ...view.current, duration: prefersReducedMotion() ? 0 : duration, ease: 'silk', overwrite: true })
  }
  const zoom = factor => apply({ scale: view.current.scale * factor, x: view.current.x * factor, y: view.current.y * factor })
  const reset = () => apply({ scale: 1, x: 0, y: 0 })

  useEffect(() => {
    if (!focus) return
    const room = unit.rooms.find(item => item.id === focus.id)
    if (!room) { reset(); return }
    const rect = planRect(room.box)
    const width = stage.current.offsetWidth, height = stage.current.offsetHeight
    const cx = (parseFloat(rect.left) + parseFloat(rect.width) / 2) / 100 - 0.5
    const cy = (parseFloat(rect.top) + parseFloat(rect.height) / 2) / 100 - 0.5
    const scale = clamp(0.5 / Math.max(parseFloat(rect.width) / 100, parseFloat(rect.height) / 100), 1.4, 2.6)
    apply({ scale, x: -cx * width * scale, y: -cy * height * scale })
  }, [focus])

  const onPointerDown = event => {
    if (view.current.scale <= 1.01 || event.target.closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, start: { ...view.current } }
  }
  const onPointerMove = event => {
    const d = drag.current
    if (d) apply({ ...d.start, x: d.start.x + event.clientX - d.x, y: d.start.y + event.clientY - d.y }, 0.25)
  }
  const endDrag = () => { drag.current = null }

  return <div className="relative" style={{ aspectRatio: PLAN_RATIO, width: `min(100cqw, calc(100cqh * ${PLAN_RATIO}))` }}>
    <div ref={viewport} data-own-gesture
      onWheel={event => zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15)}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
      className={`absolute inset-0 overflow-hidden rounded-sm border border-line bg-cream-50 shadow-[0_40px_80px_-30px_rgba(61,42,47,.45)] ${zoomed ? 'touch-none cursor-grab active:cursor-grabbing' : ''}`}>
      <div ref={stage} className="absolute inset-0 origin-center will-change-transform">
        <img src={unit.plan} alt={`Indicative floor plan of Unit ${unit.unit}, ${unit.configuration}`} draggable="false" className="size-full select-none object-contain" />
        {unit.rooms.map(room => <button key={room.id} type="button" tabIndex={-1} aria-hidden="true"
          onPointerEnter={event => { if (event.pointerType === 'mouse') onHover(room.id) }} onPointerLeave={() => onHover(null)}
          onClick={() => onPick(room)} className="absolute" style={planRect(room.box)}>
          <span className={`absolute inset-0 border transition-all duration-500 ${active === room.id ? 'border-gold-600 bg-gold-400/25 shadow-[0_0_0_1px_rgba(166,124,80,.4)]' : 'border-transparent'}`} />
        </button>)}
      </div>
    </div>
    {/* The chosen room's caption sits on the frame, not the zoomed plan, so
        it never scales up or runs outside the frame. */}
    {activeRoom && <p className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-plum-800/95 px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.14em] text-cream-50 shadow-lg">
      {activeRoom.name} · <span className="num">{activeRoom.size}</span>
    </p>}
    <div className="absolute bottom-3 left-3 flex gap-2">
      <button type="button" className="btn-icon bg-cream-50/80!" onClick={() => zoom(1.35)} aria-label="Zoom in"><Icon d="M12 5v14M5 12h14" /></button>
      <button type="button" className="btn-icon bg-cream-50/80!" onClick={() => zoom(1 / 1.35)} aria-label="Zoom out"><Icon d="M5 12h14" /></button>
      <button type="button" className="btn-icon bg-cream-50/80!" onClick={reset} aria-label="Reset zoom"><Icon d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" /></button>
      {actions}
    </div>
  </div>
}

// The plan filling the presentation. It is portalled into the page frame so
// the full-screen gate still covers it if the visitor leaves full screen.
function PlanFullscreen({ unit, active, selected, onHover, onPick, onClose }) {
  const root = useRef(null)
  const [focus, setFocus] = useState(selected ? { id: selected, n: 0 } : null)
  useLayoutEffect(() => {
    root.current.querySelector('[data-close]')?.focus({ preventScroll: true })
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'silk' } })
        .from(root.current, { autoAlpha: 0, duration: 0.6 })
        .from('[data-plan-sheet]', { scale: 0.92, y: 24, autoAlpha: 0, duration: 1.1 }, 0.1)
    }, root)
    return () => context.revert()
  }, [])
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') { event.preventDefault(); onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const pick = room => { onPick(room); setFocus({ id: selected === room.id ? null : room.id, n: Date.now() }) }

  return createPortal(<div ref={root} role="dialog" aria-modal="true" aria-label={`Unit ${unit.unit} floor plan, full screen`} data-tone="light"
    className="absolute inset-0 z-70 flex flex-col bg-cream-100 px-(--gutter) pb-[clamp(0.75rem,3vh,2rem)] text-fg">
    <div className="flex h-(--header-h) shrink-0 items-center justify-between gap-4">
      <p className="eyebrow">Unit {unit.unit} · {unit.configuration} · <span className="num">{unit.totalArea.toLocaleString('en-IN')}</span> sq.ft total</p>
      <button type="button" data-close className="btn-icon" onClick={onClose} aria-label="Close full-screen plan"><Icon d="m5 5 14 14M19 5 5 19" /></button>
    </div>
    <div data-plan-sheet className="relative grid min-h-0 flex-1 place-items-center @container-size">
      <PlanStage unit={unit} active={active} focus={focus} onHover={onHover} onPick={pick} />
    </div>
    <p className="mt-3 text-center text-[0.58rem] uppercase tracking-[0.26em] text-muted">Tap a room to focus it · drag to move when zoomed</p>
  </div>, document.querySelector('.page-frame') || document.body)
}
