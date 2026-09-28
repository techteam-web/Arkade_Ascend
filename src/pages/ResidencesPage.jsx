import { forwardRef, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { useShell } from '../app/ShellContext.js'
import { ArrowIcon, ChevronIcon } from '../components/Brand.jsx'
import { Figure, ModelNote, PageHeading, TemplateNote } from '../components/PageKit.jsx'
import { units } from '../content/project.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'
import { selectable, stepFloor, towers } from '../scenes/building/floors.js'

const BuildingModel = lazy(() => import('../scenes/building/BuildingModel.jsx'))

const configurations = ['All', ...new Set(units.map(unit => unit.configuration))]
const sizes = [
  { id: 'any', label: 'Any size', min: 0 },
  { id: '1000', label: '1,000+ sq.ft', min: 1000 },
  { id: '1500', label: '1,500+ sq.ft', min: 1500 },
]
const sqft = value => `${value.toLocaleString('en-IN')} sq.ft`

export default function ResidencesPage() {
  const { go } = useShell()
  const [finder, setFinder] = useState(false)
  const [configuration, setConfiguration] = useState('All')
  const [size, setSize] = useState('any')
  const [visual, setVisual] = useState(false)
  // The chosen floor belongs to one tower: { tower, n }, n null until chosen.
  const [choice, setChoice] = useState({ tower: towers[0].id, n: null })
  const [preview, setPreview] = useState(null)
  const step = direction => setChoice(value => ({ ...value, n: stepFloor(value.tower, value.n, direction) }))
  const pickTower = id => setChoice(value => ({ tower: id, n: value.n && selectable(id, value.n) ? value.n : null }))
  const [turn, setTurn] = useState({ count: 0, direction: 1 })
  const rotate = direction => setTurn(value => ({ count: value.count + 1, direction }))
  const chosen = choice.n ? choice : null
  const shown = preview ?? chosen
  const previewing = preview && (preview.tower !== choice.tower || preview.n !== choice.n)
  const panel = useRef(null)
  const opener = useRef(null)
  const art = useRef(null)
  const intro = useRef(null)
  const selection = useRef(null)
  const visualOpener = useRef(null)
  const min = sizes.find(item => item.id === size).min
  const results = units.filter(unit => (configuration === 'All' || unit.configuration === configuration) && unit.totalArea >= min)

  // The finder slides in over the architecture; Escape or Close returns.
  useLayoutEffect(() => {
    const reduced = prefersReducedMotion()
    const context = gsap.context(() => {
      if (finder) {
        gsap.killTweensOf([art.current, panel.current])
        gsap.timeline()
          .to(art.current, { autoAlpha: 0.15, duration: reduced ? 0 : 0.6, ease: 'silk' }, 0)
          .fromTo(panel.current, { autoAlpha: 0, x: 40, clipPath: 'inset(0% 0% 0% 100%)' }, { autoAlpha: 1, x: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: reduced ? 0 : 1.1, ease: 'curtain' }, 0.1)
          .from(panel.current.querySelectorAll('[data-finder]'), { autoAlpha: 0, y: 16, stagger: 0.06, duration: reduced ? 0 : 0.8, ease: 'silk' }, 0.5)
          // Focus once the panel is visible again (hidden elements refuse it).
          .call(() => panel.current?.querySelector('h2')?.focus({ preventScroll: true }), null, reduced ? 0 : 0.55)
      } else {
        gsap.to(art.current, { autoAlpha: 1, duration: reduced ? 0 : 0.7, ease: 'silk', overwrite: true })
        gsap.to(panel.current, { autoAlpha: 0, x: 30, duration: reduced ? 0 : 0.45, ease: 'power2.in', overwrite: true })
      }
    })
    return () => context.kill()
  }, [finder])
  useEffect(() => {
    if (!finder) return
    const onKey = event => { if (event.key === 'Escape') { event.preventDefault(); close() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finder])
  const close = () => { setFinder(false); requestAnimationFrame(() => opener.current?.focus({ preventScroll: true })) }

  // Visual selection: the text column fades away and the building model takes
  // the centre of the page, where a floor is chosen to see its plans. Leaving
  // brings the text back.
  // An open unit finder closes first, so only the model is left on the page.
  const openVisual = () => {
    const duration = prefersReducedMotion() ? 0 : 0.4
    setFinder(false)
    gsap.to(intro.current, { autoAlpha: 0, y: -8, duration, ease: 'power2.in', overwrite: true, onComplete: () => setVisual(true) })
  }
  const closeVisual = () => setVisual(false)
  const was = useRef(visual)
  useLayoutEffect(() => {
    if (was.current === visual) return
    was.current = visual
    const reduced = prefersReducedMotion()
    if (visual) {
      gsap.set(panel.current, { autoAlpha: 0, overwrite: true })
      // Fade opacity only, so the arriving side stays focusable.
      gsap.fromTo(selection.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: reduced ? 0 : 0.8, ease: 'silk', overwrite: true })
      selection.current.querySelector('h2')?.focus({ preventScroll: true })
    } else {
      gsap.fromTo(intro.current, { opacity: 0, visibility: 'inherit', y: 10 }, { opacity: 1, y: 0, duration: reduced ? 0 : 0.7, ease: 'silk', overwrite: true })
      visualOpener.current?.focus({ preventScroll: true })
      gsap.fromTo(art.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0 : 0.7, ease: 'silk', overwrite: true })
    }
  }, [visual])
  useEffect(() => {
    if (!visual) return
    const onKey = event => {
      if (event.target.closest?.('input, [role="dialog"]') || event.defaultPrevented) return
      if (event.key === 'Escape') { event.preventDefault(); closeVisual() }
      if (event.key === 'ArrowUp') { event.preventDefault(); step(1) }
      if (event.key === 'ArrowDown') { event.preventDefault(); step(-1) }
      if (event.key === 'ArrowLeft') { event.preventDefault(); rotate(1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); rotate(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visual])

  return <section className={`page page-scroll flex flex-col gap-8 ${visual ? '' : 'split:grid split:grid-cols-[minmax(0,29rem)_minmax(0,1fr)] split:gap-x-[5vw] 3xl:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]'}`}>
    <div ref={intro} hidden={visual} className="flex flex-col justify-center-safe gap-[clamp(1.25rem,4vh,2.5rem)]">
      <PageHeading id="residences" title="Residences" subtitle="Discover your residence" />
      <div className="grid max-w-md grid-cols-3 gap-4">
        <Figure value="4 BHK" label="Configuration" />
        <Figure value={1562} suffix="sq.ft" label="RERA area, Unit 1" />
        <Figure value={51} suffix="sq.ft" label="Balcony" />
      </div>
      <div>
        <p data-reveal className="eyebrow mb-3">Two ways to explore</p>
        <div className="flex max-w-md flex-col">
          <PathButton ref={visualOpener} number="01" title="Visual selection" copy="Choose a tower and floor on the building to see its plans." onClick={openVisual} pressed={visual} />
          <PathButton ref={opener} number="02" title="Unit finder" copy="Filter residences by configuration and size." onClick={() => setFinder(true)} pressed={finder} />
        </div>
      </div>
    </div>

    <div className="relative min-h-[46vh] flex-1 split:min-h-0">
      {visual
        ? <div ref={selection} role="region" aria-label="Visual selection" className="absolute inset-0 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">01 · Visual selection</p>
              <h2 tabIndex={-1} className="display mt-2 text-[clamp(1.5rem,2.4vw,2.4rem)] text-fg outline-none">Select a floor</h2>
              <ModelNote className="mt-2 max-w-xl" />
            </div>
            <button type="button" className="btn-icon" onClick={closeVisual} aria-label="Close visual selection">
              <svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19" /></svg>
            </button>
          </div>
          {/* Point at Tower A or Tower B to preview that tower's floor, click or
              tap to choose it, then open its plans. The panel sits below the
              model (beside it on short screens), never over it. */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 short:flex-row short:items-center">
            <div className="relative min-h-[40vh] flex-1 self-stretch split:min-h-0">
              <Suspense fallback={null}>
                <BuildingModel selectable floor={chosen} onFloor={setChoice} onHover={setPreview} turn={turn}
                  label="3D model of Tower A and Tower B. Point at a tower's floor to preview it, click or tap to select it; use the up and down arrow keys to change floor within the chosen tower." />
              </Suspense>
            </div>
            <div className="glass-panel flex flex-wrap items-center gap-x-6 gap-y-3 rounded-sm px-5 py-4 split:mx-auto split:w-full split:max-w-4xl short:w-[19rem]! short:shrink-0 short:flex-col short:gap-y-2 short:py-3 short:flex-nowrap short:items-stretch">
              {/* The note always keeps two lines and the figure a fixed width,
                  so the panel (and the model above it) never changes size. */}
              <div className="flex min-w-44 flex-1 items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <p className="eyebrow">{previewing ? 'Preview' : 'Floor'}</p>
                  <p className="mt-1 min-h-[2lh] text-[0.62rem] uppercase leading-relaxed tracking-[0.2em] text-muted">{shown ? `Tower ${shown.tower}` : <><span className="pointer-coarse:hidden">Point at a tower, click a floor</span><span className="hidden pointer-coarse:inline">Tap a floor on a tower</span></>}</p>
                </div>
                <p className="num w-[2ch] text-right text-4xl leading-none text-fg" aria-live="polite" aria-label={chosen ? `Tower ${chosen.tower}, floor ${chosen.n} selected` : 'No floor selected'}>{shown ? String(shown.n).padStart(2, '0') : '—'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <div role="group" aria-label="Tower" className="flex items-center gap-2">
                  <span className="eyebrow mr-1 short:hidden" aria-hidden="true">Tower</span>
                  {towers.map(tower => <button key={tower.id} type="button" className="chip min-w-11" aria-pressed={choice.tower === tower.id} aria-label={`Tower ${tower.id}`} onClick={() => pickTower(tower.id)}>{tower.id}</button>)}
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-icon" aria-label="Floor down" onClick={() => step(-1)}><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg></button>
                  <button type="button" className="btn-icon" aria-label="Floor up" onClick={() => step(1)}><svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6" /></svg></button>
                  <button type="button" className="btn-icon max-sm:hidden short:hidden" aria-label="Turn the building left" onClick={() => rotate(1)}><ChevronIcon direction="left" /></button>
                  <button type="button" className="btn-icon max-sm:hidden short:hidden" aria-label="Turn the building right" onClick={() => rotate(-1)}><ChevronIcon /></button>
                </div>
              </div>
              <button type="button" className="btn-lux whitespace-nowrap" disabled={!chosen} onClick={() => go(`/floor-plans?tower=${choice.tower}&floor=${choice.n}`)}>Floor plans<ArrowIcon className="shrink-0" /></button>
            </div>
          </div>
        </div>
        : <div ref={art} className="absolute inset-0 flex flex-col">
          <div data-reveal="fade" className="relative min-h-0 flex-1">
            <Suspense fallback={null}><BuildingModel label="3D model of the Arkade Ascend tower. Drag to orbit." /></Suspense>
          </div>
          <ModelNote className="mx-auto max-w-xl text-center" />
        </div>}

      <div ref={panel} role="region" aria-label="Unit finder" inert={finder ? undefined : ''}
        className="glass-panel page-scroll invisible absolute inset-0 z-20 flex flex-col rounded-sm p-[clamp(1.25rem,3vw,2.5rem)] stack:fixed stack:inset-x-(--gutter) stack:top-(--header-h) stack:bottom-4 stack:bg-plum-950! stack:backdrop-blur-none short:fixed short:inset-x-(--gutter) short:top-(--header-h) short:bottom-3 short:bg-plum-950! short:backdrop-blur-none">
        <div data-finder className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">02 · Unit finder</p>
            <h2 tabIndex={-1} className="display mt-3 text-[clamp(1.8rem,3vw,3rem)] text-fg outline-none">Find your way home</h2>
          </div>
          <button type="button" className="btn-icon" onClick={close} aria-label="Close unit finder">
            <svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19" /></svg>
          </button>
        </div>
        <div data-finder className="mt-6 grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 text-[0.6rem] uppercase tracking-[0.3em] text-muted">Configuration</legend>
            <div className="flex flex-wrap gap-2">{configurations.map(item => <button key={item} type="button" className="chip" aria-pressed={configuration === item} onClick={() => setConfiguration(item)}>{item}</button>)}</div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[0.6rem] uppercase tracking-[0.3em] text-muted">Total area</legend>
            <div className="flex flex-wrap gap-2">{sizes.map(item => <button key={item.id} type="button" className="chip" aria-pressed={size === item.id} onClick={() => setSize(item.id)}>{item.label}</button>)}</div>
          </fieldset>
        </div>
        <span data-finder className="hairline mt-6 block" />
        <p data-finder className="mt-4 text-[0.62rem] uppercase tracking-[0.3em] text-muted" role="status">{results.length} {results.length === 1 ? 'residence' : 'residences'} found</p>
        <ul data-finder className="mt-3 flex-1 space-y-3">
          {results.map(unit => <li key={unit.id} className="grid gap-4 border border-line sm:grid-cols-[1fr_auto] sm:items-center bg-plum-950/30 px-5 py-4">
            <div>
              <p className="font-display text-2xl text-fg">Unit <span className="num text-[0.8em]">{unit.unit}</span> <span className="ml-2 font-sans text-xs tracking-[0.2em] text-accent">{unit.configuration}</span></p>
              <p className="num mt-1 text-[0.72rem] leading-relaxed text-muted">RERA {sqft(unit.reraArea)} · Balcony {sqft(unit.balcony)} · Total {sqft(unit.totalArea)}</p>
            </div>
            <button type="button" className="btn-lux justify-self-start" onClick={() => go('/floor-plans')}>Plan<ArrowIcon /></button>
          </li>)}
          {!results.length && <li className="py-8 text-center text-sm tracking-[0.04em] text-muted">No residences match these filters.</li>}
        </ul>
        <TemplateNote className="mt-4">Inventory connects here · availability and pricing on request</TemplateNote>
      </div>
    </div>
  </section>
}

const PathButton = forwardRef(function PathButton({ number, title, copy, onClick, pressed }, ref) {
  return <button ref={ref} type="button" data-reveal onClick={onClick} aria-expanded={pressed}
    className="group relative flex min-h-16 items-center gap-5 border-b border-line py-4 text-left">
    <span className="text-[0.62rem] tracking-[0.2em] text-accent">{number}</span>
    <span className="flex-1">
      <span className="block font-display text-[clamp(1.3rem,2vw,1.9rem)] uppercase leading-tight text-fg transition-transform duration-700 ease-silk group-hover:translate-x-2 group-focus-visible:translate-x-2">{title}</span>
      <span className="mt-1 block text-[0.72rem] text-muted">{copy}</span>
    </span>
    <ArrowIcon className="h-3 w-9 fill-none stroke-current stroke-[1.1] text-accent transition-transform duration-500 group-hover:translate-x-1.5" />
    <span className="absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-gold-400 transition-transform duration-700 ease-silk group-hover:scale-x-100 group-focus-visible:scale-x-100" />
  </button>
})
