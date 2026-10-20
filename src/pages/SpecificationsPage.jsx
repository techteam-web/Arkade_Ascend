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

  // The photograph runs edge to edge down the right of the screen, in WebGL
  // (a new one rises in over the last; it ripples under the pointer). The
  // category's name is set large across the photograph's edge, and its
  // features sit on a frosted panel over it. Portrait screens give the
  // photograph the top of the screen and the rest flows beneath it.
  return <section className="absolute inset-0 overflow-hidden" aria-label="Specifications">
    <div ref={frame} data-reveal="mask" className="absolute split:inset-y-0 split:left-[34%] split:right-0 split:[mask-image:linear-gradient(90deg,transparent,#000_34%)] stack:inset-x-0 stack:top-0 stack:h-[46cqh] stack:[mask-image:linear-gradient(transparent,#000_0%,#000_62%,transparent)]">
      <GLImage src={current.src} srcSet={current.srcSet} sizes="(min-width: 64rem) 66vw, 100vw" alt={`${spec.title}: ${spec.items[shown]?.text ?? spec.line}`} focus={current.focus} />
      {/* The photograph fades out at its left and its foot (a mask), into whatever ground is there. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,11,13,.55),transparent_22%,transparent_60%,rgba(18,11,13,.6))]" />
      <button ref={opener} type="button" className="btn-icon absolute right-(--gutter) top-[calc(var(--header-h)+0.5rem)] z-1" onClick={() => setLightbox(true)} aria-label={`View ${spec.title} image full screen`} data-magnetic>
        <svg viewBox="0 0 24 24"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" /></svg>
      </button>
      <p className="photo-note absolute right-(--gutter) split:bottom-(--credit-bottom) stack:top-[calc(var(--header-h)+3.6rem)]">{current.note ?? 'Representational image'}</p>
    </div>

    <div className="page page-scroll relative z-10 flex flex-col gap-6 split:grid split:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] split:grid-rows-[minmax(0,1fr)] split:gap-x-[3vw] stack:pt-[calc(46cqh-3.5rem)] 3xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="flex shrink-0 flex-col gap-6 split:min-h-0 split:justify-center-safe stack:order-2">
        {/* Beside the photograph on wide screens; over its top on portrait ones. */}
        <div className="stack:absolute stack:inset-x-(--gutter) stack:top-[calc(var(--header-h)+0.25rem)]"><PageHeading id="specifications" title="Specifications" subtitle="Crafted in detail" /></div>
        <div role="tablist" aria-label="Specification categories" aria-orientation="vertical" onKeyDown={onKeyDown} data-reveal
          className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 split:flex-col split:gap-0 split:overflow-visible" data-own-gesture>
          {specifications.map((item, i) => <button key={item.id} ref={element => { tabs.current[i] = element }} role="tab" id={`spec-tab-${item.id}`}
            aria-selected={index === i} aria-controls="spec-panel" tabIndex={index === i ? 0 : -1} onClick={() => chooseCategory(i)}
            className={`group flex min-h-11 shrink-0 items-center gap-4 text-left transition-colors duration-500 stack:rounded-full stack:border stack:px-4 split:border-b split:border-line split:py-[clamp(0.35rem,1.2vh,0.75rem)] ${index === i ? 'text-gold-200 stack:border-gold-500 stack:bg-gold-500 stack:text-espresso' : 'text-fg/65 hover:text-fg stack:border-line'}`}>
            <span className={`num hidden text-[0.68rem] split:inline ${index === i ? 'text-gold-300' : 'text-muted'}`}>{pad(i + 1)}</span>
            <span className="text-[0.74rem] font-medium uppercase tracking-[0.18em] split:font-display split:text-[clamp(1.1rem,min(1.7vw,3.4vh),1.8rem)] split:normal-case split:tracking-[0.01em] split:transition-[translate] split:duration-700 split:ease-silk split:group-hover:translate-x-1.5"><Roll>{item.title}</Roll></span>
            <span className={`ml-auto hidden h-px bg-gold-300 transition-[width] duration-700 ease-silk split:block ${index === i ? 'w-8' : 'w-0'}`} />
          </button>)}
        </div>
      </div>

      <div ref={panel} id="spec-panel" role="tabpanel" aria-labelledby={`spec-tab-${spec.id}`}
        className="relative flex min-h-0 flex-col gap-6 split:justify-between stack:order-1">
        <div className="stack:hidden" />
        {/* The category, large across the photograph's edge. */}
        <div className="pointer-events-none split:-ml-[min(10vw,9rem)]">
          <p className="eyebrow num text-gold-300!">{pad(index + 1)} / {pad(specifications.length)}</p>
          <h2 key={spec.id} data-spec-title className="display mt-3 text-[clamp(2.6rem,min(8vw,13vh),9.5rem)] leading-[0.88] text-ivory [text-shadow:0_4px_40px_rgba(18,11,13,.55)]">{spec.title}</h2>
          <p data-spec-title className="mt-4 max-w-[34ch] text-[0.66rem] uppercase leading-relaxed tracking-[0.22em] text-gold-100/90 [text-shadow:0_1px_12px_rgba(18,11,13,.7)]">{spec.line}</p>
        </div>
        <div data-reveal className="glass-panel w-full max-w-[34rem] self-end rounded-sm px-[clamp(1rem,1.8vw,1.6rem)] py-[clamp(0.5rem,1.4vh,1rem)] split:mb-[max(0px,calc(var(--credit-space)-1rem))]">
          <ul>
            {spec.items.map((item, i) => {
              const bullet = <span className={`mt-2.5 size-1 shrink-0 rotate-45 transition-colors duration-500 ${shown === i && item.image ? 'bg-gold-200' : 'bg-gold-400'}`} aria-hidden="true" />
              return <li key={item.text} className="relative">
                {i > 0 && <span data-spec-rule className="absolute inset-x-0 top-0 h-px bg-ivory/12" />}
                {item.image
                  ? <button type="button" aria-pressed={shown === i} onClick={() => setShown(i)}
                    className={`group flex min-h-11 w-full items-start gap-4 py-2.5 text-left text-[clamp(0.85rem,1vw,1.02rem)] leading-relaxed -outline-offset-2 transition-colors duration-500 ${shown === i ? 'text-gold-200' : 'text-ivory/90 hover:text-ivory'}`}>
                    <span data-spec-item className="flex flex-1 gap-4">{bullet}<span className="transition-[translate] duration-500 ease-silk group-hover:translate-x-1">{item.text}</span></span>
                    <span className={`mt-3 h-px shrink-0 bg-gold-300 transition-[width] duration-500 ease-silk ${shown === i ? 'w-8' : 'w-0'}`} aria-hidden="true" />
                  </button>
                  : <span data-spec-item className="flex min-h-11 gap-4 py-2.5 text-[clamp(0.85rem,1vw,1.02rem)] leading-relaxed text-ivory/90">{bullet}{item.text}</span>}
              </li>
            })}
          </ul>
        </div>
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
