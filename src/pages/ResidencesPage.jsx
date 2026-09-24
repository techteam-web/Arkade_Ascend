import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { useShell } from '../app/ShellContext.js'
import { ArrowIcon } from '../components/Brand.jsx'
import { Figure, PageHeading, TemplateNote } from '../components/PageKit.jsx'
import { units } from '../content/project.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

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
  const [lit, setLit] = useState(null)
  const panel = useRef(null)
  const opener = useRef(null)
  const art = useRef(null)
  const min = sizes.find(item => item.id === size).min
  const results = units.filter(unit => (configuration === 'All' || unit.configuration === configuration) && unit.totalArea >= min)

  // The finder slides in over the architecture; Escape or Close returns.
  useLayoutEffect(() => {
    const reduced = prefersReducedMotion()
    const context = gsap.context(() => {
      if (finder) {
        gsap.killTweensOf([art.current, panel.current])
        gsap.timeline()
          .to(art.current, { autoAlpha: 0.18, scale: 0.96, filter: 'blur(3px)', duration: reduced ? 0 : 0.8, ease: 'silk' }, 0)
          .fromTo(panel.current, { autoAlpha: 0, x: 40, clipPath: 'inset(0% 0% 0% 100%)' }, { autoAlpha: 1, x: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: reduced ? 0 : 1.1, ease: 'curtain' }, 0.1)
          .from(panel.current.querySelectorAll('[data-finder]'), { autoAlpha: 0, y: 16, stagger: 0.06, duration: reduced ? 0 : 0.8, ease: 'silk' }, 0.5)
        panel.current.querySelector('h2')?.focus({ preventScroll: true })
      } else {
        gsap.to(art.current, { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: reduced ? 0 : 0.9, ease: 'silk', overwrite: true })
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

  return <section className="page page-scroll flex flex-col gap-8 split:grid split:grid-cols-[minmax(0,29rem)_minmax(0,1fr)] split:gap-x-[5vw] 3xl:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]">
    <div className="flex flex-col justify-center-safe gap-[clamp(1.25rem,4vh,2.5rem)]">
      <PageHeading id="residences" title="Residences" subtitle="Discover your residence" />
      <div className="grid max-w-md grid-cols-3 gap-4">
        <Figure value="4 BHK" label="Configuration" />
        <Figure value={1562} suffix="sq.ft" label="RERA area, Unit 1" />
        <Figure value={51} suffix="sq.ft" label="Balcony" />
      </div>
      <div>
        <p data-reveal className="eyebrow mb-3">Two ways to explore</p>
        <div className="flex max-w-md flex-col">
          <PathButton number="01" title="Floor plans" copy="Every room of Unit 1, measured." onClick={() => go('/floor-plans')} />
          <PathButton ref={opener} number="02" title="Unit finder" copy="Filter residences by configuration and size." onClick={() => setFinder(true)} pressed={finder} />
        </div>
      </div>
    </div>

    <div className="relative min-h-[46vh] split:min-h-0">
      <div ref={art} className="absolute inset-0 flex items-end justify-center" onPointerLeave={() => setLit(null)}>
        {['A', 'B'].map((tower, index) => <div key={tower} data-reveal="up" data-delay={index * 0.15} className={`relative h-full min-w-0 flex-1 ${index ? '-ml-[8%] mb-[4%] scale-[0.9]' : 'z-10'}`}><button type="button"
          onPointerEnter={event => { if (event.pointerType === 'mouse') setLit(tower) }} onFocus={() => setLit(tower)} onBlur={() => setLit(null)}
          onClick={() => go('/tower')} aria-label={`Tower ${tower}: view the tower in 3D`}
          className={`group relative size-full outline-offset-[-8px] transition-[filter,translate] duration-1000 ease-silk ${lit && lit !== tower ? 'brightness-[0.55] saturate-[0.7]' : lit === tower ? 'brightness-110 -translate-y-1' : ''}`}>
          <img src="/residences/tower-cutout.png" alt="" draggable="false" className={`absolute inset-0 size-full object-contain object-bottom ${index ? '-scale-x-100' : ''}`} />
          <span className={`absolute top-[14%] flex items-center gap-3 text-[0.6rem] uppercase tracking-[0.3em] text-gold-200 transition-opacity duration-700 ${index ? 'right-[4%] flex-row-reverse' : 'left-[4%]'} ${lit === tower ? 'opacity-100' : 'opacity-60'}`}>
            <span className="font-display text-lg tracking-[0.1em] text-ivory">Tower {tower}</span>
                      </span>
        </button></div>)}
      </div>
      <p data-reveal="fade" className="pointer-events-none absolute inset-x-0 bottom-0 text-center text-[0.55rem] uppercase tracking-[0.28em] text-gold-300/60">Concept illustration · tower names are placeholders</p>

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
              <p className="font-display text-2xl text-fg">Unit {unit.unit} <span className="ml-2 font-sans text-xs tracking-[0.2em] text-accent">{unit.configuration}</span></p>
              <p className="num mt-1 text-[0.72rem] leading-relaxed text-muted">RERA {sqft(unit.reraArea)} · Balcony {sqft(unit.balcony)} · Total {sqft(unit.totalArea)}</p>
            </div>
            <button type="button" className="btn-lux justify-self-start" onClick={() => go('/floor-plans')}>Plan<ArrowIcon /></button>
          </li>)}
          {!results.length && <li className="py-8 text-center font-serif text-lg italic text-muted">No residences match these filters.</li>}
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
