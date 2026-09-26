import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { ImageSlot, PageHeading, TemplateNote } from '../components/PageKit.jsx'
import { specifications } from '../content/template.js'
import { pad } from '../app/routes.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

export default function SpecificationsPage() {
  const [index, setIndex] = useState(0)
  const panel = useRef(null)
  const first = useRef(true)
  const tabs = useRef([])
  const spec = specifications[index]

  // Each category arrives with an image wipe and its lines drawn in.
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return }
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'silk' } })
        .from('[data-spec-image] > *', { autoAlpha: 0, scale: 1.03, duration: 1 }, 0)
        .from('[data-spec-title]', { autoAlpha: 0, y: 12, duration: 0.8 }, 0.15)
        .from('[data-spec-rule]', { scaleX: 0, transformOrigin: '0 50%', duration: 0.9, stagger: 0.06 }, 0.2)
        .from('[data-spec-item]', { autoAlpha: 0, y: 8, duration: 0.7, stagger: 0.06 }, 0.25)
    }, panel)
    return () => context.revert()
  }, [index])

  const onKeyDown = event => {
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }
    let next = null
    if (event.key in keys) next = (index + keys[event.key] + specifications.length) % specifications.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = specifications.length - 1
    if (next === null) return
    event.preventDefault()
    setIndex(next)
    tabs.current[next]?.focus()
  }

  return <section className="page page-scroll flex flex-col gap-6 split:grid split:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] split:gap-x-[5vw] 3xl:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
    <div className="flex min-h-0 flex-col gap-6 split:justify-center-safe">
      <PageHeading id="specifications" title="Specifications" subtitle="Crafted in detail" />
      <div role="tablist" aria-label="Specification categories" aria-orientation="vertical" onKeyDown={onKeyDown} data-reveal
        className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 split:flex-col split:gap-0 split:overflow-visible" data-own-gesture>
        {specifications.map((item, i) => <button key={item.id} ref={element => { tabs.current[i] = element }} role="tab" id={`spec-tab-${item.id}`}
          aria-selected={index === i} aria-controls="spec-panel" tabIndex={index === i ? 0 : -1} onClick={() => setIndex(i)}
          className={`group flex min-h-11 shrink-0 items-center gap-4 text-left transition-colors duration-500 stack:rounded-full stack:border stack:px-4 split:border-b split:border-line split:py-1 ${index === i ? 'text-gold-300 stack:border-gold-500 stack:bg-gold-500 stack:text-espresso' : 'text-fg/70 hover:text-fg stack:border-line'}`}>
          <span className={`num hidden text-[0.68rem] split:inline ${index === i ? 'text-gold-400' : 'text-muted'}`}>{pad(i + 1)}</span>
          <span className="text-[0.74rem] font-medium uppercase tracking-[0.18em] split:transition-transform split:duration-700 split:group-hover:translate-x-1.5">{item.title}</span>
          <span className={`ml-auto hidden size-1.5 rounded-full bg-gold-400 transition-opacity duration-700 split:block ${index === i ? 'opacity-100' : 'opacity-0'}`} />
        </button>)}
      </div>
      <TemplateNote>Indicative specifications · to be confirmed</TemplateNote>
    </div>

    <div ref={panel} id="spec-panel" role="tabpanel" aria-labelledby={`spec-tab-${spec.id}`}
      className="grid min-h-0 items-center gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-[4vw]">
      <div data-reveal="mask" className="relative aspect-4/3 overflow-hidden rounded-sm border border-gold-500/25 md:aspect-4/5 md:h-[min(62cqh,46rem)] md:w-auto md:max-w-full md:justify-self-center">
        <div data-spec-image key={spec.id} className="absolute inset-0">
          <ImageSlot src={spec.image} alt={`${spec.title} concept`} label={`${spec.title} render`} />
        </div>
      </div>
      <div data-reveal>
        <p className="eyebrow num">{pad(index + 1)} / {pad(specifications.length)}</p>
        <h2 data-spec-title className="display mt-4 text-[clamp(1.6rem,min(3.4vw,7vh),3.8rem)] text-fg">{spec.title}</h2>
        <ul className="mt-8">
          {spec.items.map(item => <li key={item} className="relative py-4">
            <span data-spec-rule className="absolute inset-x-0 top-0 h-px bg-line" />
            <span data-spec-item className="flex gap-4 text-[clamp(0.85rem,1vw,1.02rem)] leading-relaxed text-fg/90">
              <span className="mt-2.5 size-1 shrink-0 rotate-45 bg-gold-400" aria-hidden="true" />{item}
            </span>
          </li>)}
        </ul>
      </div>
    </div>
  </section>
}
