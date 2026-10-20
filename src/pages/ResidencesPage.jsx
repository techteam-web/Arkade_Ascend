import { forwardRef, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { gsap } from '../app/reveal.js'
import { useShell } from '../app/ShellContext.js'
import { ArrowIcon, ChevronIcon, Roll } from '../components/Brand.jsx'
import { PageHeading } from '../components/PageKit.jsx'
import UnitFinder from '../components/UnitFinder.jsx'
import ViewOverlay from '../components/ViewOverlay.jsx'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'
import { onSale, openFloors as floorsOpen, selectable, stepFloor, towers } from '../scenes/building/floors.js'

// Only floors with homes, open for selection, in a wing on sale, light up and can be chosen.
const canPick = (tower, n) => onSale(tower) && selectable(tower, n)
const openFloors = floorsOpen(towers.find(tower => onSale(tower.id))?.id ?? towers[0].id).join('–')

const OrbitView = lazy(() => import('../scenes/orbit/OrbitView.jsx'))

// The rendered orbit, on the page's own plum: the city fades out at the edges.
const FADE = '[mask-image:linear-gradient(90deg,transparent,#000_16%,#000_84%,transparent),linear-gradient(transparent,#000_10%,#000_78%,transparent)] [mask-composite:intersect]'
// Visual selection keeps the city to its sides, only softening the edges.
const FADE_SELECT = '[mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent),linear-gradient(transparent,#000_5%,#000_88%,transparent)] [mask-composite:intersect]'
// The orbit's note, small at the render's bottom right (client, 16 Oct 2026);
// in Visual selection, at the selection's bottom right corner, below the panel.
const RenderNote = () => <p className="pointer-events-none absolute bottom-0 right-0 text-[0.52rem] uppercase tracking-[0.22em] text-muted/90">Architect’s impression</p>

export default function ResidencesPage() {
  const { go, menuOpen } = useShell()
  // Visual selection or the unit finder takes over the page; ?finder (from a
  // plan's "back to results") opens straight into the finder, and
  // ?finder=compare straight back into the comparison the plan was opened from.
  const [params] = useSearchParams()
  const [mode, setMode] = useState(() => params.has('finder') ? 'finder' : null)
  const visual = mode === 'visual'
  const finder = mode === 'finder'
  // The chosen floor belongs to one tower: { tower, n }, n null until chosen.
  const [choice, setChoice] = useState({ tower: towers[0].id, n: null })
  const [preview, setPreview] = useState(null)
  const step = direction => setChoice(value => ({ ...value, n: stepFloor(value.tower, value.n, direction) }))
  // The drone view of a wing at a floor, over the whole presentation.
  const [viewing, setViewing] = useState(null)
  const pickTower = id => setChoice(value => ({ tower: id, n: value.n && selectable(id, value.n) ? value.n : null }))
  const [turn, setTurn] = useState({ count: 0, direction: 1 })
  const rotate = direction => setTurn(value => ({ count: value.count + 1, direction }))
  const chosen = choice.n ? choice : null
  const shown = preview ?? chosen
  const previewing = preview && (preview.tower !== choice.tower || preview.n !== choice.n)
  const litWing = preview?.tower ?? choice.tower
  // The floor data for the orbit's opening angle starts loading as the page
  // opens, so pointing at a floor in Visual selection works at once.
  useEffect(() => { import('../scenes/orbit/engine.js').then(module => module.prefetchFloors()).catch(() => {}) }, [])
  const art = useRef(null)
  const intro = useRef(null)
  const region = useRef(null)          // the visual selection or the finder, whichever has the page
  const visualOpener = useRef(null)
  const finderOpener = useRef(null)

  // The text column fades away and the chosen way of exploring takes the
  // page: the tower's orbit, where a floor is chosen to see its plans, or
  // the unit finder. Leaving brings the text back.
  const open = next => {
    const duration = prefersReducedMotion() ? 0 : 0.4
    gsap.to(intro.current, { autoAlpha: 0, y: -8, duration, ease: 'power2.in', overwrite: true, onComplete: () => setMode(next) })
  }
  const close = () => setMode(null)
  // Leaving for the menu closes whichever way of exploring is open, quietly
  // behind the menu, so coming back always finds the page as it starts.
  const quiet = useRef(false)
  useEffect(() => {
    if (!menuOpen) return
    gsap.killTweensOf(intro.current)
    setPreview(null)
    setViewing(null)
    if (mode) { quiet.current = true; setMode(null) }
    else gsap.set(intro.current, { autoAlpha: 1, y: 0 })
  }, [menuOpen])
  const was = useRef(mode)
  useLayoutEffect(() => {
    const previous = was.current
    if (previous === mode) return
    was.current = mode
    if (quiet.current) {
      quiet.current = false
      gsap.set([intro.current, art.current], { autoAlpha: 1, y: 0, overwrite: true })
      return
    }
    const reduced = prefersReducedMotion()
    if (mode) {
      // Fade opacity only, so the arriving side stays focusable.
      gsap.fromTo(region.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: reduced ? 0 : 0.8, ease: 'silk', overwrite: true })
      region.current.querySelector('h2')?.focus({ preventScroll: true })
    } else {
      gsap.fromTo(intro.current, { opacity: 0, visibility: 'inherit', y: 10 }, { opacity: 1, y: 0, duration: reduced ? 0 : 0.7, ease: 'silk', overwrite: true })
      ;(previous === 'finder' ? finderOpener : visualOpener).current?.focus({ preventScroll: true })
      gsap.fromTo(art.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0 : 0.7, ease: 'silk', overwrite: true })
    }
  }, [mode])
  // Arriving straight into the finder: its heading takes focus, as a page's h1 would.
  useEffect(() => { if (finder) region.current?.querySelector('h2')?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    if (!mode) return
    const onKey = event => {
      if (viewing || event.target.closest?.('input, select, [role="dialog"]') || event.defaultPrevented) return
      if (event.key === 'Escape') { event.preventDefault(); close() }
      if (!visual) return
      if (event.key === 'ArrowUp') { event.preventDefault(); step(1) }
      if (event.key === 'ArrowDown') { event.preventDefault(); step(-1) }
      if (event.key === 'ArrowLeft') { event.preventDefault(); rotate(-1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); rotate(1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, viewing])
  const openPlan = ({ plan, home, from = 'finder' }) => go(`/floor-plans?${home ? `home=${home}` : `plan=${plan}`}&from=${from}`)

  return <section className={`page page-scroll flex flex-col gap-8 ${mode ? '' : 'split:grid split:grid-cols-[minmax(0,29rem)_minmax(0,1fr)] split:gap-x-[5vw] 3xl:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]'}`}>
    <div ref={intro} hidden={!!mode} className="flex flex-col justify-center-safe gap-[clamp(1.25rem,4vh,2.5rem)]">
      <PageHeading id="residences" title="Residences" subtitle="Discover your residence" />
      <div>
        <p data-reveal className="eyebrow mb-3">Two ways to explore</p>
        <div className="flex max-w-md flex-col">
          <PathButton ref={visualOpener} number="01" title="Visual selection" copy="Choose a wing and floor on the building to see its plans." onClick={() => open('visual')} pressed={visual} />
          <PathButton ref={finderOpener} number="02" title="Unit finder" copy="Filter every Wing A home by configuration, unit, floor, size and features." onClick={() => open('finder')} pressed={finder} />
        </div>
      </div>
    </div>

    <div className="relative min-h-[46vh] flex-1 split:min-h-0">
      {visual
        ? <div ref={region} role="region" aria-label="Visual selection" className="absolute inset-0 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">01 · Visual selection</p>
              <h2 tabIndex={-1} className="display mt-2 text-[clamp(1.5rem,2.4vw,2.4rem)] text-fg outline-none">Select a floor</h2>
              <p className="mt-2 max-w-xl text-[0.58rem] uppercase leading-relaxed tracking-[0.22em] text-muted/90">Floors <span className="num">{openFloors}</span> open · higher floors to follow</p>
            </div>
            <button type="button" className="btn-icon" onClick={close} aria-label="Close visual selection">
              <svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19" /></svg>
            </button>
          </div>
          {/* Point at Wing A or Wing B to preview that wing's floor, click or
              tap to choose it, then open its plans. The panel sits below the
              model (beside it on short screens), never over it. */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 short:flex-row short:items-center">
            <div className="relative min-h-[40vh] flex-1 self-stretch split:min-h-0">
              <Suspense fallback={null}>
                {/* The whole tower up to its terrace, and the city across the full
                    width: no zoom, a lighter fade, the crop moved down where the
                    crown needs it (client, 16 Oct 2026). */}
                <OrbitView pickable sky={false} fit="crown" floor={chosen} onFloor={setChoice} onHover={setPreview} canPick={canPick} turn={turn} className={FADE_SELECT}
                  label="Rendered orbit of Wing A and Wing B. Point at a wing's floor to preview it, click or tap to select it; drag to turn the tower; use the up and down arrow keys to change floor within the chosen wing." />
              </Suspense>
            </div>
            <div className="glass-panel flex flex-wrap items-center gap-x-6 gap-y-3 rounded-sm px-5 py-4 split:mx-auto split:w-full split:max-w-4xl short:w-[19rem]! short:shrink-0 short:flex-col short:gap-y-2 short:py-3 short:flex-nowrap short:items-stretch">
              {/* The note always keeps two lines and the figure a fixed width,
                  so the panel (and the model above it) never changes size. */}
              <div className="flex min-w-44 flex-1 items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <p className="eyebrow">{previewing ? 'Preview' : 'Floor'}</p>
                  <p className="mt-1 min-h-[2lh] text-[0.62rem] uppercase leading-relaxed tracking-[0.2em] text-muted">{shown ? `Wing ${shown.tower}` : <><span className="pointer-coarse:hidden">Point at a wing, click a floor</span><span className="hidden pointer-coarse:inline">Tap a floor on a wing</span></>}</p>
                </div>
                <p className="num w-[2ch] text-right text-4xl leading-none text-fg" aria-live="polite" aria-label={chosen ? `Wing ${chosen.tower}, floor ${chosen.n} selected` : 'No floor selected'}>{shown ? String(shown.n).padStart(2, '0') : '—'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <div role="group" aria-label="Wing" className="flex items-center gap-2">
                  <span className="eyebrow mr-1 short:hidden" aria-hidden="true">Wing</span>
                  {/* One gold pill follows the wing being pointed at on the
                      building, else the chosen one, gliding between the two;
                      the chosen wing keeps a gold ring while another is previewed. */}
                  <div className="relative flex gap-2">
                    <span aria-hidden="true" className="absolute left-0 top-0 size-11 rounded-full bg-gold-500 transition-[translate] duration-500 ease-silk motion-reduce:transition-none"
                      style={{ translate: `calc(${Math.max(0, towers.findIndex(tower => tower.id === litWing))} * (2.75rem + 0.5rem)) 0` }} />
                    {towers.map(tower => <button key={tower.id} type="button" aria-pressed={choice.tower === tower.id} disabled={!onSale(tower.id)}
                      aria-label={onSale(tower.id) ? `Wing ${tower.id}` : `Wing ${tower.id}, not on sale at present`} title={onSale(tower.id) ? undefined : 'Not on sale at present'} onClick={() => pickTower(tower.id)}
                      className={`relative grid size-11 place-items-center rounded-full border text-[0.66rem] font-medium uppercase tracking-[0.2em] transition-[color,border-color] duration-500
                        ${litWing === tower.id ? 'border-transparent text-espresso' : choice.tower === tower.id ? 'border-gold-500/80 text-fg' : 'border-line text-muted hover:border-accent hover:text-fg focus-visible:text-fg'} disabled:cursor-not-allowed disabled:opacity-35`}>{tower.id}</button>)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-icon" aria-label="Floor down" onClick={() => step(-1)}><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg></button>
                  <button type="button" className="btn-icon" aria-label="Floor up" onClick={() => step(1)}><svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6" /></svg></button>
                  <button type="button" className="btn-icon max-sm:hidden short:hidden" aria-label="Turn the building left" onClick={() => rotate(-1)}><ChevronIcon direction="left" /></button>
                  <button type="button" className="btn-icon max-sm:hidden short:hidden" aria-label="Turn the building right" onClick={() => rotate(1)}><ChevronIcon /></button>
                </div>
              </div>
              <button type="button" className="btn-lux whitespace-nowrap" disabled={!chosen} onClick={() => go(`/floor-plans?wing=${choice.tower}&floor=${choice.n}`)}><Roll>Floor plans</Roll><ArrowIcon className="shrink-0" /></button>
            </div>
          </div>
          <p className="-mt-2 text-right text-[0.52rem] uppercase tracking-[0.22em] text-muted/90">Architect’s impression</p>
        </div>
        : finder
          ? <UnitFinder ref={region} reopen={params.get('finder')} onClose={close} onOpenPlan={openPlan} onView={setViewing} />
          : <div ref={art} className="absolute inset-0 flex flex-col">
            <div data-reveal="fade" className="relative min-h-0 flex-1">
              <Suspense fallback={null}><OrbitView sky={false} zoom={1.3} className={FADE} label="Rendered orbit of the Arkade Ascend tower. Drag to turn it." /></Suspense>
              <RenderNote />
            </div>
          </div>}
    </div>
    {viewing && <ViewOverlay wing={viewing.wing} floor={viewing.floor} unit={viewing.unit} onClose={() => setViewing(null)} />}
  </section>
}

const PathButton = forwardRef(function PathButton({ number, title, copy, onClick, pressed }, ref) {
  return <button ref={ref} type="button" data-reveal onClick={onClick} aria-expanded={pressed} data-cursor="Open"
    className="group relative flex min-h-20 items-center gap-[clamp(1rem,2vw,1.75rem)] border-b border-line py-[clamp(0.9rem,2.4vh,1.4rem)] text-left">
    <span className="num self-start pt-[0.45em] text-[0.7rem] tracking-[0.2em] text-accent">{number}</span>
    <span className="min-w-0 flex-1">
      <span className="block font-display text-[clamp(1.45rem,min(2.25vw,4.6vh),2.4rem)] uppercase leading-none text-fg transition-[translate] duration-700 ease-silk group-hover:translate-x-2 group-focus-visible:translate-x-2"><Roll>{title}</Roll></span>
      <span className="mt-2 block max-w-[38ch] text-[0.78rem] leading-relaxed text-muted">{copy}</span>
    </span>
    <span data-magnetic className="grid size-12 shrink-0 place-items-center rounded-full border border-line text-accent transition-[background-color,border-color,color] duration-500 group-hover:border-accent group-hover:bg-accent group-hover:text-espresso group-focus-visible:border-accent group-focus-visible:bg-accent group-focus-visible:text-espresso">
      <ArrowIcon className="h-2.5 w-6 fill-none stroke-current stroke-[1.2]" />
    </span>
    <span className="absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-gold-400 transition-transform duration-700 ease-silk group-hover:scale-x-100 group-focus-visible:scale-x-100" />
  </button>
})
