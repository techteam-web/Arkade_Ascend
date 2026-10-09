import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router'
import { gsap } from '../app/reveal.js'
import { useShell } from '../app/ShellContext.js'
import { ArrowIcon } from '../components/Brand.jsx'
import { Figure, PageHeading } from '../components/PageKit.jsx'
import ViewOverlay from '../components/ViewOverlay.jsx'
import { floorExceptions, positions, typicalPlan, wing } from '../content/floorPlans.js'
import {
  area, featureLabel, features, floorRuns, floors, homeById, homeId, homes, homesOfType, ordinal, planById, typeAt,
} from '../content/inventory.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const Icon = ({ d }) => <svg viewBox="0 0 24 24"><path d={d} /></svg>
const [VIEW_W, VIEW_H] = typicalPlan.viewBox

// What a floor's notes say where it differs from the typical floor.
const floorNotes = {
  7: 'On the 7th floor, Unit 05 is a 2.5 BHK with a study room.',
  36: 'On the 36th floor, Unit 05 is a 3.5 BHK that extends over Unit 06’s place, so the floor has five homes.',
}

// What the page shows, from the address: a floor of Wing A (?floor=12, or
// none for the typical floor), and on it a unit (?unit=05). The unit finder
// links a home (?home=A-1205) or a plan (?plan=05-7); the visual selection
// links a wing and floor (?wing=A&floor=12). Wing B has no plans yet.
const resolve = params => {
  const otherWing = (params.get('wing') ?? params.get('tower'))?.toUpperCase()
  if (otherWing && otherWing !== wing) return { pending: otherWing }
  const home = homeById(params.get('home'))
  const asked = Number(params.get('floor'))
  const plan = planById(params.get('plan'))
  const floor = home?.floor ?? (floors.includes(asked) ? asked : plan?.floor ?? null)
  const unit = home?.position ?? params.get('unit') ?? plan?.unit ?? null
  const type = home?.type ?? (unit && positions.includes(unit) ? (floor ? typeAt(floor, unit) : plan ?? planById(unit)) : null)
  return { floor, type, home: home ?? (floor && type ? homeById(homeId(floor, type.unit)) : null) }
}

export default function FloorPlansPage() {
  const { go } = useShell()
  const [params, setParams] = useSearchParams()
  const { pending, floor, type, home } = resolve(params)
  const fromFinder = params.get('from') === 'finder'
  const [hovered, setHovered] = useState(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [viewing, setViewing] = useState(false)
  const sheet = useRef(null)
  const opener = useRef(null)

  // Every change is written back as Wing A, a floor and a unit.
  const show = ({ floor: nextFloor = floor, unit = type?.unit ?? null }) => {
    setHovered(null)
    setParams(value => {
      const next = new URLSearchParams()
      if (value.get('from')) next.set('from', value.get('from'))
      if (nextFloor) next.set('floor', nextFloor)
      if (unit && (!nextFloor || typeAt(nextFloor, unit))) next.set('unit', unit)
      return next
    }, { replace: true })
  }

  // The plan settles into place on arrival.
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !sheet.current) return
    const context = gsap.context(() => {
      gsap.from(sheet.current, { autoAlpha: 0, y: 16, duration: 1.1, delay: 0.3, ease: 'silk' })
    })
    return () => context.revert()
  }, [])

  const closeFullscreen = () => { setFullscreen(false); requestAnimationFrame(() => opener.current?.focus({ preventScroll: true })) }
  const keep = text => text.replaceAll(' ', ' ')

  if (pending) return <WingPending id={pending} onShow={() => show({ floor: Number(params.get('floor')) || null, unit: null })} />

  const subtitle = [`Wing ${wing}`, floor ? `Floor ${floor}` : 'Typical floor', home && `Home ${home.id}`, type && `Unit ${type.unit}`, type?.configuration]
  const plan = type
    ? { id: type.id, ...type.image, alt: `Floor plan of ${type.label}, ${type.configuration}, Wing ${wing}` }
    : { id: 'typical', ...typicalPlan, alt: `Typical floor plan of Wing ${wing}${floor ? `, floor ${floor}` : ''}, with its homes outlined` }
  const zones = type ? null : floorZones(floor)
  const title = type ? `${type.label} · ${type.configuration}` : `Wing ${wing} · ${floor ? `Floor ${floor}` : 'Typical floor'}`

  // Laptops set the plan beside the heading and the controls; phones and
  // tablets show the plan straight after the heading, sized to its drawing.
  return <section data-tone="light" className="page page-scroll flex flex-col gap-[clamp(1rem,3vh,1.75rem)] split:grid split:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] split:grid-rows-[auto_minmax(0,1fr)] split:gap-x-[4vw] 3xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
    <div className="flex shrink-0 flex-col gap-[clamp(1rem,3vh,1.75rem)] split:col-start-1">
      <PageHeading id="floor-plans" title="Floor Plans" subtitle={subtitle.filter(Boolean).map(keep).join('\u00a0· ')} />
      <div data-reveal className="-mt-2 flex flex-wrap gap-x-6">
        {type && <BackButton onClick={() => show({ unit: null })}>Typical floor plan</BackButton>}
        {fromFinder && <BackButton onClick={() => go('/residences?finder')}>Back to the unit finder</BackButton>}
        <button type="button" className="flex min-h-11 items-center gap-3 self-start text-[0.62rem] font-medium uppercase tracking-[0.24em] text-accent" onClick={() => setViewing(true)}>
          See view<ArrowIcon className="h-3 w-7 fill-none stroke-current stroke-[1.1]" />
        </button>
      </div>
    </div>

    <div className="relative flex min-h-[min(60vh,var(--plan-h))] shrink-0 flex-col split:col-start-2 split:row-span-2 split:row-start-1 split:min-h-0 short:min-h-[82vh]!"
      style={{ '--plan-h': `calc((100vw - 2 * var(--gutter, 1rem)) / ${plan.ratio} + 7rem)` }}>
      <div className="relative min-h-0 flex-1">
        <div ref={sheet} className="absolute inset-0">
          <PlanStage plan={plan} zones={zones} hovered={hovered} onHover={setHovered} onPick={unit => show({ unit })}
            actions={<button ref={opener} type="button" className="btn-icon" onClick={() => setFullscreen(true)} aria-label="View plan full screen">
              <Icon d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
            </button>}
            note={<p className="ml-auto text-right text-[0.58rem] uppercase tracking-[0.26em] text-muted/80 max-sm:hidden">
              {type ? `Wing ${wing} plan sheet · sizes as printed` : <><span className="pointer-coarse:hidden">Point at a home to see it, click to open its plan</span><span className="hidden pointer-coarse:inline">Tap a home to open its plan</span></>}
            </p>}
            keyPlan={type && <KeyPlan unit={type.unit} />} />
        </div>
      </div>
    </div>

    <div className="flex min-h-0 flex-col gap-[clamp(1rem,3vh,1.75rem)] split:col-start-1 split:row-start-2">
      {type
        ? <UnitDetails key={type.id} type={type} floor={floor} onShow={unit => show({ unit })} />
        : <FloorOverview floor={floor} hovered={hovered} onHover={setHovered} onFloor={n => show({ floor: n, unit: null })} onOpen={unit => show({ unit })} onFinder={() => go('/residences?finder')} />}
    </div>

    {viewing && <ViewOverlay wing={wing} floor={floor} onClose={() => setViewing(false)} />}
    {fullscreen && <PlanFullscreen plan={plan} zones={zones} title={title} hovered={hovered} onHover={setHovered}
      onPick={unit => show({ unit })} onClose={closeFullscreen} />}
  </section>
}

// The outlines on the typical plan: each position's home on this floor, or
// on the typical floor when no floor is chosen.
const floorZones = floor => positions.map(position => {
  const type = floor ? typeAt(floor, position) : planById(position)
  return { id: position, type, ...typicalPlan.zones[position] }
})

function BackButton({ onClick, children }) {
  return <button type="button" className="flex min-h-11 items-center gap-3 self-start text-[0.62rem] font-medium uppercase tracking-[0.24em] text-accent" onClick={onClick}>
    <svg viewBox="0 0 32 12" aria-hidden="true" className="h-3 w-7 fill-none stroke-current stroke-[1.1]"><path d="M31 6H3m5-5-5 5 5 5" /></svg>{children}
  </button>
}

// The typical floor: choose a floor, narrow its homes, open one.
function FloorOverview({ floor, hovered, onHover, onFloor, onOpen, onFinder }) {
  const [chosen, setChosen] = useState({ configuration: [], feature: [] })
  const [sort, setSort] = useState('unit')
  const entries = floorZones(floor)
  const present = entries.filter(entry => entry.type)
  const fits = (entry, skip) => (skip === 'configuration' || !chosen.configuration.length || chosen.configuration.includes(entry.type.configuration))
    && (skip === 'feature' || chosen.feature.every(id => entry.type.features.includes(id)))
  const shown = present.filter(entry => fits(entry))
  const sorted = sort === 'unit' ? shown : [...shown].sort((a, b) => (sort === 'area-asc' ? 1 : -1) * (a.type.reraArea - b.type.reraArea))
  const missing = entries.filter(entry => !entry.type)
  const toggle = (key, id) => setChosen(value => ({ ...value, [key]: value[key].includes(id) ? value[key].filter(item => item !== id) : [...value[key], id] }))
  const active = chosen.configuration.length + chosen.feature.length
  const configurations = [...new Set(present.map(entry => entry.type.configuration))].sort((a, b) => parseFloat(a) - parseFloat(b))
  const offered = features.filter(feature => present.some(entry => entry.type.features.includes(feature.id)))
  const count = (key, test) => present.filter(entry => fits(entry, key) && test(entry)).length
  // Tell the plan which homes the filters leave out.
  useEffect(() => { onHover(value => value && !shown.some(entry => entry.id === value) ? null : value) }, [shown.length])

  return <>
    <div data-reveal className="flex flex-col gap-2">
      <FloorRail floor={floor} onFloor={onFloor} />
      <p className="min-h-[2lh] text-[0.62rem] uppercase leading-relaxed tracking-[0.16em] text-muted" aria-live="polite">
        {floor ? floorNotes[floor] ?? <>Floor <span className="num">{floor}</span> follows the typical plan · homes <span className="num">{homeId(floor, '01')}</span> to <span className="num">{homeId(floor, '06')}</span></>
          : <>One plan serves floors <span className="num">{floors[0]}–{floors.at(-1)}</span> · Unit 05 differs on floors <span className="num">7</span> and <span className="num">36</span></>}
      </p>
    </div>

    <div data-reveal className="flex flex-col gap-3 border-t border-line pt-4">
      <div className="flex flex-wrap gap-1.5">
        {configurations.map(id => {
          const n = count('configuration', entry => entry.type.configuration === id)
          return <button key={id} type="button" className="chip" aria-pressed={chosen.configuration.includes(id)} disabled={!n && !chosen.configuration.includes(id)}
            onClick={() => toggle('configuration', id)} aria-label={`${id}, ${n} ${n === 1 ? 'home' : 'homes'}`}>{id}<span className="num ml-2 opacity-60">{n}</span></button>
        })}
        {offered.map(feature => {
          const on = chosen.feature.includes(feature.id)
          const n = count(null, entry => entry.type.features.includes(feature.id))
          return <button key={feature.id} type="button" className="chip" aria-pressed={on} disabled={!n && !on}
            onClick={() => toggle('feature', feature.id)} aria-label={`${feature.label}, ${n} ${n === 1 ? 'home' : 'homes'}`}>{feature.label}</button>
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-[0.6rem] uppercase tracking-[0.22em] text-muted"><span className="num text-fg">{shown.length}</span> of <span className="num">{present.length}</span> homes</p>
        <div className="flex items-center gap-2">
          {active > 0 && <button type="button" className="chip border-transparent!" onClick={() => setChosen({ configuration: [], feature: [] })}>Reset</button>}
          <div role="group" aria-label="Sort homes" className="flex gap-1 rounded-full border border-line p-1">
            {[['unit', 'Unit', 'Unit order'], ['area-desc', 'Largest', 'Largest first'], ['area-asc', 'Smallest', 'Smallest first']].map(([id, label, name]) =>
              <button key={id} type="button" className="chip border-transparent! px-3!" aria-pressed={sort === id} aria-label={name} onClick={() => setSort(id)}>{label}</button>)}
          </div>
        </div>
      </div>
    </div>

    <ul data-reveal className="page-scroll -mx-2 min-h-0 flex-1 px-2 py-1 [mask-image:linear-gradient(transparent,#000_0.6rem,#000_calc(100%-0.9rem),transparent)] stack:max-h-[40vh] stack:flex-none" onPointerLeave={() => onHover(null)}>
      {sorted.map(({ id, type }) => <li key={id}>
        <button type="button" onClick={() => onOpen(id)}
          onPointerEnter={event => { if (event.pointerType === 'mouse') onHover(id) }} onFocus={() => onHover(id)} onBlur={() => onHover(null)}
          aria-label={`${floor ? `Home ${homeId(floor, id)}, ` : ''}Unit ${id}, ${type.configuration}, ${area(type.reraArea)} square feet RERA carpet. Open its plan.`}
          className={`group grid min-h-12 w-full grid-cols-[2.6rem_minmax(0,1fr)_auto_1.75rem] py-1 items-center gap-x-3 border-b border-line text-left outline-offset-[-2px] transition-colors duration-500 ${hovered === id ? 'text-gold-700' : 'text-fg'}`}>
          <span className="num text-[1.35rem] leading-none">{id}</span>
          <span className="min-w-0">
            <span className="block text-[0.74rem] font-medium uppercase tracking-[0.14em]">{type.configuration}</span>
            <span className="block truncate text-[0.6rem] uppercase tracking-[0.12em] text-muted">{type.features.map(featureLabel).join(' · ') || `${type.bedrooms} bedrooms`}</span>
          </span>
          <span className="text-right"><span className="num text-[0.85rem]">{area(type.reraArea)}</span> <span className="text-[0.55rem] uppercase tracking-[0.14em] text-muted">sq.ft</span></span>
          <ArrowIcon className="h-3 w-7 justify-self-end fill-none stroke-current stroke-[1.1] text-accent transition-[translate] duration-500 group-hover:translate-x-1" />
        </button>
      </li>)}
      {!sorted.length && <li className="py-6 text-center text-[0.72rem] tracking-[0.04em] text-muted">No home on this floor matches these filters.</li>}
      {missing.map(({ id }) => <li key={id} className="flex min-h-12 items-center gap-3 border-b border-line text-muted">
        <span className="num w-[2.6rem] text-[1.35rem] leading-none opacity-50">{id}</span>
        <span className="text-[0.6rem] uppercase tracking-[0.16em]">Not on this floor · Unit 05 takes its place</span>
      </li>)}
    </ul>

    <button type="button" data-reveal className="group -mt-2 flex min-h-11 items-center gap-3 self-start text-[0.62rem] font-medium uppercase tracking-[0.24em] text-accent" onClick={onFinder}>
      Search all <span className="num">{homes.length}</span> homes in the unit finder<ArrowIcon className="h-3 w-7 fill-none stroke-current stroke-[1.1] transition-[translate] duration-500 group-hover:translate-x-1" />
    </button>
  </>
}

// Floors as a lift panel: one row of floor numbers that scrolls sideways,
// with the chosen floor kept in view. A gold dot marks the floors that differ
// from the typical plan. Left and right arrow keys step through the floors.
function FloorRail({ floor, onFloor }) {
  const rail = useRef(null)
  const step = direction => onFloor(floor ? clamp(floor + direction, floors[0], floors.at(-1)) : direction > 0 ? floors[0] : floors.at(-1))
  const differs = Object.keys(floorExceptions).map(Number)

  // Bring the chosen floor to the middle of the rail (only the rail scrolls).
  useEffect(() => {
    const box = rail.current
    const button = box?.querySelector(`[data-floor="${floor ?? 'typical'}"]`)
    if (!button) return
    const left = button.offsetLeft - (box.clientWidth - button.offsetWidth) / 2
    box.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [floor])

  const onKey = event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    step(event.key === 'ArrowRight' ? 1 : -1)
    requestAnimationFrame(() => rail.current?.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true }))
  }

  return <div className="flex flex-col gap-3">
    <div className="flex items-end justify-between gap-4">
      <div className="flex items-baseline gap-3">
        <p className="eyebrow">Floor</p>
        <p className="num text-[clamp(1.6rem,2.4vw,2.6rem)] leading-none text-fg" aria-hidden="true">{floor ? String(floor).padStart(2, '0') : 'All'}</p>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-icon" aria-label="Floor down" disabled={floor === floors[0]} onClick={() => step(-1)}><Icon d="m15 6-6 6 6 6" /></button>
        <button type="button" className="btn-icon" aria-label="Floor up" disabled={floor === floors.at(-1)} onClick={() => step(1)}><Icon d="m9 6 6 6-6 6" /></button>
      </div>
    </div>
    <div ref={rail} role="group" aria-label="Choose a floor" onKeyDown={onKey} data-own-gesture
      className="-mx-1 flex snap-x gap-1 overflow-x-auto overscroll-x-contain px-1 py-1 [mask-image:linear-gradient(90deg,transparent,#000_1.25rem,#000_calc(100%-1.25rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span aria-hidden="true" className="w-3 shrink-0" />
      <button type="button" data-floor="typical" aria-pressed={!floor} onClick={() => onFloor(null)}
        className="floor-key snap-center px-4! text-[0.6rem]! uppercase tracking-[0.2em]">Typical</button>
      {floors.map(n => <button key={n} type="button" data-floor={n} aria-pressed={floor === n} onClick={() => onFloor(n)}
        aria-label={`Floor ${n}${differs.includes(n) ? ', Unit 05 differs' : ''}`} className="floor-key num snap-center">
        {n}{differs.includes(n) && <span aria-hidden="true" className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-gold-500" />}
      </button>)}
      <span aria-hidden="true" className="w-3 shrink-0" />
    </div>
  </div>
}

// One home's plan: its areas, its rooms, and the other homes on the floor.
function UnitDetails({ type, floor, onShow }) {
  const of = homesOfType(type).map(home => home.floor)
  const neighbours = floorZones(floor).filter(entry => entry.type)
  return <>
    <div className="grid grid-cols-3 gap-3 border-y border-line py-4">
      <Figure value={type.reraArea} suffix="sq.ft" label="RERA carpet" />
      <Figure value={type.deck} suffix="sq.ft" label="Deck" />
      <Figure value={type.totalArea} suffix="sq.ft" label="Total area" />
    </div>
    <div data-reveal role="group" aria-label={floor ? `Homes on floor ${floor}` : 'Homes on the typical floor'}>
      <p className="eyebrow mb-2">{floor ? 'On this floor' : 'On the typical floor'}</p>
      <div className="flex flex-wrap gap-1.5">
        {neighbours.map(entry => <button key={entry.id} type="button" className="chip" aria-pressed={entry.id === type.unit}
          aria-label={`Unit ${entry.id}, ${entry.type.configuration}`} onClick={() => onShow(entry.id)}>
          <span className="num">{entry.id}</span><span className="ml-2 opacity-70">{entry.type.configuration}</span>
        </button>)}
      </div>
    </div>
    <div data-reveal className="flex min-h-0 flex-1 flex-col">
      <p className="eyebrow mb-2">Room schedule</p>
      <ul className="page-scroll -mx-2 min-h-0 flex-1 px-2 py-1 [mask-image:linear-gradient(transparent,#000_0.6rem,#000_calc(100%-0.9rem),transparent)] stack:max-h-[36vh] stack:flex-none">
        {type.rooms.map(room => <li key={room.name} className="flex min-h-10 items-center justify-between gap-4 border-b border-line pl-1">
          <span className="flex items-center gap-3">
            <span className="size-1.5 rounded-full bg-plum-700/25" />
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-fg">{room.name}</span>
          </span>
          <span className="num text-[0.8rem] text-muted">{room.size}</span>
        </li>)}
      </ul>
      <p className="mt-3 text-[0.6rem] uppercase leading-relaxed tracking-[0.16em] text-muted">
        {type.features.length ? `${type.features.map(featureLabel).join(' · ')} · ` : ''}
        <span className="num">{of.length}</span> {of.length === 1 ? 'home' : 'homes'} · {type.floor ? <><span className="num">{ordinal(type.floor)}</span> floor only</> : <>floors <span className="num">{floorRuns(of)}</span></>}
      </p>
    </div>
  </>
}

// Where the home sits on the floor, on the typical plan. North points to the
// right on the plan sheets.
function KeyPlan({ unit }) {
  return <figure className="relative flex items-center gap-3 border border-line bg-cream-50/70 p-1.5 pr-3" aria-label={`Key plan: Unit ${unit} highlighted on the floor`}>
    <div className="relative h-14" style={{ aspectRatio: typicalPlan.ratio }}>
      <img src={typicalPlan.src} alt="" className="size-full opacity-60" draggable="false" />
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden="true">
        <polygon points={typicalPlan.zones[unit].points} className="fill-gold-500/70 stroke-gold-700" strokeWidth="6" />
      </svg>
    </div>
    <span className="flex items-center gap-1 text-[0.55rem] font-semibold tracking-[0.2em] text-fg" aria-hidden="true">
      <svg viewBox="0 0 24 12" className="h-3 w-6 fill-none stroke-current"><path d="M1 6h22M17 1l6 5-6 5" /></svg>N
    </span>
  </figure>
}

// The plan with zoom (buttons, wheel), drag to pan when zoomed and, on the
// typical floor, its homes outlined: point at one to see it, click to open it.
function PlanStage({ plan, zones, hovered, onHover, onPick, actions, note, keyPlan }) {
  const view = useRef({ scale: 1, x: 0, y: 0 })
  const frame = useRef(null)
  const viewport = useRef(null)
  const stage = useRef(null)
  const drag = useRef(null)
  const dragged = useRef(false)
  const [zoomed, setZoomed] = useState(false)

  const apply = (next, duration = 0.9) => {
    const box = viewport.current.getBoundingClientRect()
    const scale = clamp(next.scale, 1, 4)
    // Keep the plan covering its frame at every zoom level.
    const limitX = (box.width * (scale - 1)) / 2
    const limitY = (box.height * (scale - 1)) / 2
    view.current = { scale, x: clamp(next.x, -limitX, limitX), y: clamp(next.y, -limitY, limitY) }
    setZoomed(scale > 1.01)
    gsap.to(stage.current, { ...view.current, duration: prefersReducedMotion() ? 0 : duration, ease: 'silk', overwrite: true })
  }
  const zoom = factor => apply({ scale: view.current.scale * factor, x: view.current.x * factor, y: view.current.y * factor })
  const reset = () => apply({ scale: 1, x: 0, y: 0 })

  // A new plan starts unzoomed and fades in (the frame owns this fade; the
  // page's sheet owns the arrival).
  useLayoutEffect(() => {
    apply({ scale: 1, x: 0, y: 0 }, 0)
    if (prefersReducedMotion()) return
    const tween = gsap.fromTo(frame.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, ease: 'silk', overwrite: true })
    return () => { tween.progress(1) }
  }, [plan.id])

  // A drag only starts once the pointer has moved, so a click still reaches
  // the home outlines when the plan is zoomed.
  const onPointerDown = event => {
    if (view.current.scale <= 1.01 || event.target.closest('button')) return
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, start: { ...view.current }, moving: false }
  }
  const onPointerMove = event => {
    const d = drag.current
    if (!d) return
    const dx = event.clientX - d.x, dy = event.clientY - d.y
    if (!d.moving && Math.hypot(dx, dy) < 5) return
    if (!d.moving) { d.moving = true; event.currentTarget.setPointerCapture(d.id) }
    apply({ ...d.start, x: d.start.x + dx, y: d.start.y + dy }, 0.25)
  }
  const endDrag = () => {
    dragged.current = Boolean(drag.current?.moving)
    drag.current = null
  }

  // The controls sit below the plan, never over the drawing.
  return <div className="flex size-full flex-col gap-3">
  <div className="grid min-h-0 flex-1 place-items-center @container-size">
  <div ref={frame} className="relative" style={{ aspectRatio: plan.ratio, width: `min(100cqw, calc(100cqh * ${plan.ratio}))` }}>
    <div ref={viewport} data-own-gesture
      onWheel={event => zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15)}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
      onClickCapture={event => { if (dragged.current) { dragged.current = false; event.stopPropagation() } }}
      className={`absolute inset-0 overflow-hidden rounded-sm border border-line bg-cream-50 shadow-[0_40px_80px_-30px_rgba(61,42,47,.45)] ${zoomed ? 'touch-none cursor-grab active:cursor-grabbing' : ''}`}>
      <div ref={stage} className="absolute inset-[3%] origin-center will-change-transform">
        <img src={plan.src} srcSet={plan.srcSet} sizes="(min-width: 64rem) 70vw, 100vw" alt={plan.alt} draggable="false" decoding="async"
          className="size-full select-none object-contain" />
        {zones && <ZoneLayer zones={zones} hovered={hovered} onHover={onHover} onPick={onPick} />}
      </div>
    </div>
  </div>
  </div>
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <button type="button" className="btn-icon" onClick={() => zoom(1.35)} aria-label="Zoom in"><Icon d="M12 5v14M5 12h14" /></button>
      <button type="button" className="btn-icon" onClick={() => zoom(1 / 1.35)} aria-label="Zoom out"><Icon d="M5 12h14" /></button>
      <button type="button" className="btn-icon" onClick={reset} aria-label="Reset zoom"><Icon d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" /></button>
      {actions}
      {note}
      {keyPlan && <div className="ml-auto">{keyPlan}</div>}
    </div>
  </div>
}

// The homes of the typical floor, outlined over its drawing. The outlines are
// for pointing; the list beside the plan is the keyboard way in.
function ZoneLayer({ zones, hovered, onHover, onPick }) {
  const hatch = useId()
  const at = ([x, y]) => ({ left: `${(x / VIEW_W) * 100}%`, top: `${(y / VIEW_H) * 100}%` })
  return <>
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden="true">
      <defs>
        <pattern id={hatch} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="14" height="14" className="fill-cream-50/80" /><line x1="0" y1="0" x2="0" y2="14" className="stroke-plum-700/25" strokeWidth="4" />
        </pattern>
      </defs>
      {zones.map(zone => {
        const on = hovered === zone.id
        return <polygon key={zone.id} points={zone.points} strokeWidth="3" vectorEffect="non-scaling-stroke"
          onPointerEnter={event => { if (zone.type && event.pointerType === 'mouse') onHover(zone.id) }}
          onPointerLeave={() => onHover(null)}
          onClick={() => zone.type && onPick(zone.id)}
          style={zone.type ? null : { fill: `url(#${CSS.escape(hatch)})` }}
          className={`transition-[fill,stroke] duration-500 ${!zone.type ? 'stroke-transparent'
            : on ? 'cursor-pointer fill-gold-400/30 stroke-gold-600' : 'cursor-pointer fill-transparent stroke-transparent'}`} />
      })}
    </svg>
    {zones.map(zone => <span key={zone.id} aria-hidden="true" style={at(zone.label)}
      className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-2 py-1 text-[clamp(0.45rem,0.9cqw,0.62rem)] uppercase tracking-[0.14em] shadow-md transition-colors duration-500 ${hovered === zone.id ? 'bg-gold-500 text-espresso' : `@max-lg:hidden ${zone.type ? 'bg-plum-800/90 text-cream-50' : 'bg-cream-50/90 text-muted'}`}`}>
      <span className="num">{zone.id}</span> · {zone.type ? zone.type.configuration : 'Not on this floor'}
    </span>)}
  </>
}

// The plan filling the presentation. It is portalled into the page frame so
// the full-screen gate still covers it if the visitor leaves full screen.
function PlanFullscreen({ plan, zones, title, hovered, onHover, onPick, onClose }) {
  const root = useRef(null)
  useLayoutEffect(() => {
    root.current.querySelector('[data-close]')?.focus({ preventScroll: true })
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      // Opacity only: a hidden ancestor would take focus away from Close.
      gsap.timeline({ defaults: { ease: 'silk' } })
        .from(root.current, { opacity: 0, duration: 0.6 })
        .from('[data-plan-sheet]', { y: 24, opacity: 0, duration: 1 }, 0.1)
    }, root)
    return () => context.revert()
  }, [])
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') { event.preventDefault(); onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(<div ref={root} role="dialog" aria-modal="true" aria-label={`${title} floor plan, full screen`} data-tone="light"
    className="absolute inset-0 z-70 flex flex-col bg-cream-100 px-(--gutter) pb-[clamp(0.75rem,3vh,2rem)] text-fg">
    <div className="flex h-(--header-h) shrink-0 items-center justify-between gap-4">
      <p className="eyebrow">{title}</p>
      <button type="button" data-close className="btn-icon" onClick={onClose} aria-label="Close full-screen plan"><Icon d="m5 5 14 14M19 5 5 19" /></button>
    </div>
    <div data-plan-sheet className="relative min-h-0 flex-1">
      <PlanStage plan={plan} zones={zones} hovered={hovered} onHover={onHover} onPick={onPick} />
    </div>
    <p className="mt-3 text-center text-[0.58rem] uppercase tracking-[0.26em] text-muted">{zones ? 'Tap a home to open its plan · drag to move when zoomed' : 'Drag to move when zoomed'}</p>
  </div>, document.querySelector('.page-frame') || document.body)
}

// Wing B is not on sale yet: its plans follow when they are supplied.
function WingPending({ id, onShow }) {
  return <section data-tone="light" className="page page-scroll flex flex-col justify-center-safe gap-8">
    <PageHeading id="floor-plans" title="Floor Plans" subtitle={`Wing ${id}`} />
    <div data-reveal className="max-w-lg border-t border-line pt-6">
      <p className="text-[clamp(0.9rem,1.1vw,1.1rem)] leading-relaxed text-muted">The Wing {id} floor plans will follow. The homes of Wing {wing} are open now, floor by floor.</p>
      <button type="button" className="btn-lux mt-6" onClick={onShow}>Wing {wing} floor plans<ArrowIcon /></button>
    </div>
  </section>
}
