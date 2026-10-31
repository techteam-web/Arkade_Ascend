import { useEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { PageHeading } from '../components/PageKit.jsx'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'
import { useShell } from '../app/ShellContext.js'
import { amenities, ecodeck } from '../content/ecodeck.js'

// The Ecodeck layout on the gold ground, its amenities on a plum card. Choosing
// an amenity glides the picture to its number and marks it there; tapping a
// number on the picture lights its name. The list is the keyboard way in, since
// the printed numbers stand too close for buttons on a phone: a tap on the
// picture takes the nearest number within reach instead.
const MAX_ZOOM = 5
const FOCUS_ZOOM = 2.4
const REACH = 28                    // CSS pixels from a printed number
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const Icon = ({ d }) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>

export default function EcodeckPage() {
  // x and y are fractions of the picture, so a resize keeps the framing.
  const view = useRef({ scale: 1, x: 0, y: 0 })
  const viewport = useRef(null)
  const stage = useRef(null)
  const list = useRef(null)
  const pointers = useRef(new Map())
  const gesture = useRef(null)
  const [zoomed, setZoomed] = useState(false)
  const [active, setActive] = useState(null)
  const [pointed, setPointed] = useState(null)
  const { menuOpen } = useShell()

  const apply = (next, duration = 0.7) => {
    const scale = clamp(next.scale, 1, MAX_ZOOM)
    // Keep the picture covering its frame at every zoom level.
    const limit = (scale - 1) / 2
    view.current = { scale, x: clamp(next.x, -limit, limit), y: clamp(next.y, -limit, limit) }
    setZoomed(scale > 1.01)
    gsap.to(stage.current, { scale, xPercent: view.current.x * 100, yPercent: view.current.y * 100, '--inverse': 1 / scale,
      duration: prefersReducedMotion() ? 0 : duration, ease: 'silk', overwrite: true })
  }
  // Zoom about a point given as a fraction of the frame from its centre.
  const zoomAt = (point, factor, duration) => {
    const { scale, x, y } = view.current
    apply({ scale: scale * factor, x: point.x - (point.x - x) * factor, y: point.y - (point.y - y) * factor }, duration)
  }
  const fraction = ({ clientX, clientY }) => {
    const box = viewport.current.getBoundingClientRect()
    return { x: (clientX - box.left) / box.width - 0.5, y: (clientY - box.top) / box.height - 0.5 }
  }
  const select = id => {
    const [x, y] = amenities.find(item => item.id === id).at
    const scale = Math.max(view.current.scale, FOCUS_ZOOM)
    setActive(id)
    apply({ scale, x: -(x - 0.5) * scale, y: -(y - 0.5) * scale })
  }
  const reset = (duration) => {
    setActive(null)
    apply({ scale: 1, x: 0, y: 0 }, duration)
  }

  const nearest = event => {
    const box = viewport.current.getBoundingClientRect()
    const { scale, x, y } = view.current
    let found = null, closest = REACH
    amenities.forEach(item => {
      const left = box.width * (0.5 + x + (item.at[0] - 0.5) * scale)
      const top = box.height * (0.5 + y + (item.at[1] - 0.5) * scale)
      const distance = Math.hypot(event.clientX - box.left - left, event.clientY - box.top - top)
      if (distance < closest) { closest = distance; found = item.id }
    })
    return found
  }

  // One pointer drags the zoomed picture, two pinch it; a press that barely
  // moved is a tap on a number.
  const onPointerDown = event => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, event)
    const [a, b] = [...pointers.current.values()]
    gesture.current = b
      ? { start: { ...view.current }, distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), centre: fraction({ clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 }), moved: true }
      : { start: { ...view.current }, x: event.clientX, y: event.clientY, moved: false }
  }
  const onPointerMove = event => {
    if (!pointers.current.has(event.pointerId)) { if (event.pointerType === 'mouse') setPointed(nearest(event)); return }
    pointers.current.set(event.pointerId, event)
    const g = gesture.current
    if (!g) return
    const [a, b] = [...pointers.current.values()]
    if (b && g.distance) {
      const factor = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / g.distance
      const centre = fraction({ clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 })
      apply({ scale: g.start.scale * factor, x: centre.x - (g.centre.x - g.start.x) * factor, y: centre.y - (g.centre.y - g.start.y) * factor }, 0.15)
      return
    }
    const dx = event.clientX - g.x, dy = event.clientY - g.y
    if (!g.moved && Math.hypot(dx, dy) < 8) return
    g.moved = true
    const box = viewport.current.getBoundingClientRect()
    apply({ ...g.start, x: g.start.x + dx / box.width, y: g.start.y + dy / box.height }, 0.2)
  }
  const onPointerEnd = event => {
    const tap = event.type === 'pointerup' && gesture.current && !gesture.current.moved
    pointers.current.delete(event.pointerId)
    gesture.current = null
    if (!tap) return
    const id = nearest(event)
    id ? select(id) : setActive(null)
  }

  // A number chosen on the picture brings its name into view in the list.
  useEffect(() => {
    const row = active && list.current.querySelector(`[data-amenity="${active}"]`)
    if (!row) return
    const box = list.current.getBoundingClientRect(), place = row.getBoundingClientRect()
    if (place.top >= box.top && place.bottom <= box.bottom) return
    list.current.scrollTo({ top: list.current.scrollTop + place.top - box.top - (box.height - place.height) / 2, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [active])

  // The page opens as it starts, like Residences and the E Brochure.
  useEffect(() => { if (menuOpen) reset(0) }, [menuOpen])
  useEffect(() => { const target = stage.current; return () => gsap.killTweensOf(target) }, [])

  const marked = amenities.find(item => item.id === (pointed ?? active))
  const zoomControls = className => <div className={`gap-2 ${className}`}>
    <button type="button" className="btn-icon" onClick={() => zoomAt({ x: 0, y: 0 }, 1.5)} aria-label="Zoom in"><Icon d="M12 5v14M5 12h14" /></button>
    <button type="button" className="btn-icon" onClick={() => zoomAt({ x: 0, y: 0 }, 1 / 1.5)} aria-label="Zoom out"><Icon d="M5 12h14" /></button>
    <button type="button" className="btn-icon" onClick={() => reset()} aria-label="Reset the plan"><Icon d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" /></button>
  </div>

  return <section data-tone="light" style={{ '--plan': ecodeck.ratio }} className="page grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)] gap-[clamp(0.6rem,2vh,1.25rem)] [grid-template-areas:'head'_'plan'_'list'] split:grid-cols-[minmax(0,1fr)_minmax(0,clamp(17rem,24vw,26rem))] split:grid-rows-[auto_minmax(0,1fr)] split:gap-x-[clamp(1.25rem,2.5vw,3rem)] split:[grid-template-areas:'head_list'_'plan_list'] short:grid-cols-[minmax(0,1fr)_minmax(0,14rem)]! short:[grid-template-areas:'plan_head'_'plan_list']!">
    <div className="flex min-w-0 items-end justify-between gap-4 [grid-area:head]">
      <PageHeading id="ecodeck" title="Ecodeck" subtitle="Layout, level 5" className="flex-1" />
      <div data-reveal className="short:hidden">{zoomControls('flex')}</div>
    </div>

    {/* The picture, as large as its place allows at its own proportion. */}
    <div data-reveal="fade" className="relative min-h-0 [container-type:size] [grid-area:plan] stack:aspect-(--plan) stack:max-h-[44dvh]">
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative" style={{ aspectRatio: ecodeck.ratio, width: `min(100cqw, calc(100cqh * ${ecodeck.ratio}))` }}>
          <div ref={viewport} onWheel={event => zoomAt(fraction(event), Math.exp(-event.deltaY * 0.0025), 0.25)}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onPointerLeave={() => setPointed(null)}
            className={`absolute inset-0 touch-none select-none overflow-hidden rounded-sm border border-plum-900/25 bg-plum-950 ${pointed ? 'cursor-pointer' : zoomed ? 'cursor-grab active:cursor-grabbing' : ''}`}>
            <div ref={stage} className="absolute inset-0 origin-center will-change-transform" style={{ '--inverse': 1 }}>
              {/* Zooming in asks for the sharper files; the picture on show stays until they arrive. */}
              <img src={ecodeck.src} srcSet={ecodeck.srcSet} sizes={zoomed ? '400vw' : '(min-width: 64rem) 75vw, 100vw'} alt={ecodeck.alt} draggable="false" decoding="async" className="size-full" />
              {marked && <Marker key={marked.id} amenity={marked} />}
            </div>
          </div>
          <p className="pointer-events-none absolute bottom-1.5 right-1.5 flex items-center gap-2 rounded-sm bg-plum-950/60 px-2 py-0.5 text-[0.6rem] tracking-[0.06em] text-ivory">
            <span className="flex items-center gap-1" role="img" aria-label="North points to the right">
              <svg viewBox="0 0 24 12" className="h-2 w-4 fill-none stroke-current" aria-hidden="true"><path d="M1 6h22M17 1l6 5-6 5" /></svg>N
            </span>
            Architect’s impression
          </p>
          <div data-tone="dark" className="absolute bottom-1.5 left-1.5 hidden short:block">{zoomControls('flex')}</div>
        </div>
      </div>
    </div>

    <aside data-reveal data-tone="dark" aria-label="Ecodeck amenities" className="flex min-h-0 flex-col rounded-sm bg-plum-900 text-fg [container-type:inline-size] [grid-area:list]">
      <div ref={list} className="page-scroll min-h-0 flex-1 p-[clamp(0.6rem,1.6vh,1.1rem)] @xl:columns-2 @xl:gap-6">
        {ecodeck.groups.map(group => <section key={group.title} className="mb-3 break-inside-avoid last:mb-0">
          <h2 className="eyebrow px-2 pb-1 pt-1.5 text-gold-200">{group.title}</h2>
          <ul>
            {group.items.map(item => <li key={item.id}>
              <button type="button" data-amenity={item.id} aria-pressed={active === item.id}
                onClick={() => active === item.id ? reset() : select(item.id)}
                onPointerEnter={event => { if (event.pointerType === 'mouse') setPointed(item.id) }} onPointerLeave={() => setPointed(null)}
                className={`flex min-h-11 w-full items-center gap-3 rounded-sm px-2 py-1 text-left text-[0.86rem] leading-tight transition-colors duration-300 ${active === item.id ? 'bg-gold-500 text-espresso' : pointed === item.id ? 'bg-plum-700/60 text-ivory' : 'text-ivory hover:bg-plum-700/60'}`}>
                <span className={`num grid size-7 shrink-0 place-items-center rounded-full border text-[0.72rem] ${active === item.id ? 'border-espresso/50' : 'border-gold-500/60'}`}>{item.id}</span>
                {item.name}
              </button>
            </li>)}
          </ul>
        </section>)}
      </div>
    </aside>
  </section>
}

// The chosen number, gold over the printed one with its name beside it. It
// keeps its size at every zoom level; near an edge its name stays inside.
function Marker({ amenity: { id, name, at: [x, y] } }) {
  const across = x < 0.25 ? 'left-0' : x > 0.75 ? 'right-0' : 'left-1/2 -translate-x-1/2'
  const down = y < 0.2 ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
  return <span aria-hidden="true" className="pointer-events-none absolute transition-opacity duration-300 starting:opacity-0" style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: 'translate(-50%, -50%) scale(var(--inverse))' }}>
    <span className="relative grid size-7 place-items-center rounded-full bg-gold-500 text-espresso outline-2 outline-ivory">
      <span className="num text-[0.72rem]">{id}</span>
      <span className={`absolute ${down} ${across} whitespace-nowrap rounded-sm bg-plum-900 px-2.5 py-1 text-[0.72rem] tracking-[0.03em] text-ivory`}>{name}</span>
    </span>
  </span>
}
