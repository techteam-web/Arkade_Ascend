import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from '../app/reveal.js'
import { prefetchImages } from '../app/prefetch.js'
import { PageHeading } from '../components/PageKit.jsx'
import GLImage from '../components/GLImage.jsx'
import { Roll } from '../components/Brand.jsx'
import { specifications } from '../content/project.js'
import { pad } from '../app/routes.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

// The brochure's tower, arrival, residences and safety pages. A category
// shows its own photograph; where the brochure pictures single features
// (bedrooms, kitchens, security), choosing one shows its photograph.
const firstPictured = spec => Math.max(0, spec.items.findIndex(item => item.image))
const pictureOf = (spec, item) => item?.image
  ? { src: item.image, note: item.note ?? spec.note, focus: item.focus }
  : { src: spec.image, srcSet: spec.srcSet, note: spec.note, focus: spec.focus }

export default function SpecificationsPage() {
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(firstPictured(specifications[0]))
  const [lightbox, setLightbox] = useState(false)
  const opener = useRef(null)
  const panel = useRef(null)
  const frame = useRef(null)
  // The last value animated in (not a first-run flag, which StrictMode's
  // double effects would use up and then replay the change over the entrance).
  const animated = useRef(0)
  const tabs = useRef([])
  const spec = specifications[index]
  const current = pictureOf(spec, spec.items[shown])

  // Every photograph loads ahead, so each category and feature shows at once.
  useEffect(() => prefetchImages(specifications.flatMap(item => [{ src: item.image, srcSet: item.srcSet }, ...item.items.map(entry => ({ src: entry.image }))]).filter(image => image.src), '(min-width: 48rem) 45vw, 100vw'), [])

  const chooseCategory = next => { setIndex(next); setShown(firstPictured(specifications[next])) }
  const closeLightbox = () => { setLightbox(false); requestAnimationFrame(() => opener.current?.focus({ preventScroll: true })) }
  // Escape closes the full-screen picture only.
  useEffect(() => {
    if (!lightbox) return
    const onKey = event => { if (event.key === 'Escape') { event.preventDefault(); closeLightbox() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [lightbox])

  // Each category arrives with an image wipe and its lines drawn in.
  useLayoutEffect(() => {
    if (animated.current === index) return
    animated.current = index
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'silk' } })
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
    chooseCategory(next)
    tabs.current[next]?.focus()
  }

  return <section className="page page-scroll flex flex-col gap-6 split:grid split:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] split:gap-x-[5vw] 3xl:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
    {/* Stacked (phones, portrait tablets) the parts keep their height and
        the page scrolls; side by side they share the viewport. */}
    <div className="flex shrink-0 flex-col gap-6 split:min-h-0 split:shrink split:justify-center-safe">
      <PageHeading id="specifications" title="Specifications" subtitle="Crafted in detail" />
      <div role="tablist" aria-label="Specification categories" aria-orientation="vertical" onKeyDown={onKeyDown} data-reveal
        className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 split:flex-col split:gap-0 split:overflow-visible" data-own-gesture>
        {specifications.map((item, i) => <button key={item.id} ref={element => { tabs.current[i] = element }} role="tab" id={`spec-tab-${item.id}`}
          aria-selected={index === i} aria-controls="spec-panel" tabIndex={index === i ? 0 : -1} onClick={() => chooseCategory(i)}
          className={`group flex min-h-11 shrink-0 items-center gap-4 text-left transition-colors duration-500 stack:rounded-full stack:border stack:px-4 split:border-b split:border-line split:py-1 ${index === i ? 'text-gold-300 stack:border-gold-500 stack:bg-gold-500 stack:text-espresso' : 'text-fg/70 hover:text-fg stack:border-line'}`}>
          <span className={`num hidden text-[0.68rem] split:inline ${index === i ? 'text-gold-400' : 'text-muted'}`}>{pad(i + 1)}</span>
          <span className="text-[0.74rem] font-medium uppercase tracking-[0.18em] split:transition-[translate] split:duration-700 split:ease-silk split:group-hover:translate-x-1.5"><Roll>{item.title}</Roll></span>
          <span className={`ml-auto hidden size-1.5 rounded-full bg-gold-400 transition-opacity duration-700 split:block ${index === i ? 'opacity-100' : 'opacity-0'}`} />
        </button>)}
      </div>
    </div>

    <div ref={panel} id="spec-panel" role="tabpanel" aria-labelledby={`spec-tab-${spec.id}`}
      className="grid shrink-0 items-center gap-8 split:min-h-0 split:shrink md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-[4vw]">
      <div ref={frame} data-reveal="mask" className="relative aspect-4/3 overflow-hidden rounded-sm border border-gold-500/25 bg-plum-950 md:aspect-auto md:h-[min(76cqh,52rem)] md:min-h-72">
        {/* A new photograph rises in over the last, through a liquid front; it ripples under the pointer. */}
        <GLImage src={current.src} srcSet={current.srcSet} sizes="(min-width: 48rem) 45vw, 100vw" alt={`${spec.title}: ${spec.items[shown]?.text ?? spec.line}`} focus={current.focus} />
        <button ref={opener} type="button" className="btn-icon absolute right-3 top-3 z-1" onClick={() => setLightbox(true)} aria-label={`View ${spec.title} image full screen`}>
          <svg viewBox="0 0 24 24"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" /></svg>
        </button>
        <p className="photo-note absolute bottom-2.5 left-3">{current.note ?? 'Representational image'}</p>
      </div>
      <div data-reveal>
        <p className="eyebrow num">{pad(index + 1)} / {pad(specifications.length)}</p>
        <h2 key={spec.id} data-spec-title className="display mt-4 text-[clamp(1.8rem,min(3.8vw,7.4vh),4.4rem)] leading-[0.95] text-fg">{spec.title}</h2>
        <p data-spec-title className="mt-3 max-w-[40ch] text-[0.62rem] uppercase leading-relaxed tracking-[0.2em] text-muted">{spec.line}</p>
        <ul className="mt-6">
          {spec.items.map((item, i) => {
            const bullet = <span className={`mt-2.5 size-1 shrink-0 rotate-45 transition-colors duration-500 ${shown === i && item.image ? 'bg-gold-200' : 'bg-gold-400'}`} aria-hidden="true" />
            return <li key={item.text} className="relative">
              <span data-spec-rule className="absolute inset-x-0 top-0 h-px bg-line" />
              {item.image
                ? <button type="button" aria-pressed={shown === i} onClick={() => setShown(i)}
                  className={`group flex min-h-11 w-full items-start gap-4 py-3 text-left text-[clamp(0.85rem,1vw,1.02rem)] leading-relaxed -outline-offset-2 transition-colors duration-500 ${shown === i ? 'text-gold-200' : 'text-fg/90 hover:text-fg'}`}>
                  <span data-spec-item className="flex flex-1 gap-4">{bullet}<span className="transition-[translate] duration-500 ease-silk group-hover:translate-x-1">{item.text}</span></span>
                  <span className={`mt-3 h-px shrink-0 bg-accent transition-[width] duration-500 ease-silk ${shown === i ? 'w-8' : 'w-0'}`} aria-hidden="true" />
                </button>
                : <span data-spec-item className="flex min-h-11 gap-4 py-3 text-[clamp(0.85rem,1vw,1.02rem)] leading-relaxed text-fg/90">{bullet}{item.text}</span>}
            </li>
          })}
        </ul>
      </div>
    </div>

    {/* Portalled into the frame: above the page, still beneath the full-screen gate. */}
    {lightbox && createPortal(<div role="dialog" aria-modal="true" aria-label={`${spec.title} image, full screen`} onClick={closeLightbox}
      className="absolute inset-0 z-70 grid grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] place-items-center bg-ink/95 p-[clamp(1rem,4vw,4rem)] backdrop-blur-md">
      <img src={current.src} srcSet={current.srcSet} sizes="100vw" alt={`${spec.title}: ${spec.items[shown]?.text ?? spec.line}`} draggable="false"
        onClick={event => event.stopPropagation()} className="max-h-full max-w-full select-none rounded-sm object-contain shadow-2xl" />
      <button type="button" autoFocus className="btn-icon absolute right-(--gutter) top-5" onClick={closeLightbox} aria-label="Close full screen">
        <svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19" /></svg>
      </button>
      <p className="absolute bottom-5 right-(--gutter) text-[0.55rem] uppercase tracking-[0.22em] text-ivory/70 max-sm:bottom-12">{current.note ?? 'Representational image'}</p>
    </div>, document.querySelector('.page-frame') || document.body)}
  </section>
}
