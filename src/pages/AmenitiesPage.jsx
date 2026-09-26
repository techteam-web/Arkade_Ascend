import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { ImageSlot, PageHeading, TemplateNote } from '../components/PageKit.jsx'
import { ChevronIcon } from '../components/Brand.jsx'
import { amenities } from '../content/template.js'
import { pad } from '../app/routes.js'
import useStepper from '../hooks/useStepper.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

const COUNT = amenities.length

// One framed image at a time with a numbered index beside it. Images
// cross-fade; the caption rises softly on each change.
export default function AmenitiesPage() {
  const [index, setIndex] = useState(0)
  const root = useRef(null)
  const caption = useRef(null)
  const active = amenities[index]
  const select = next => setIndex(((next % COUNT) + COUNT) % COUNT)
  useStepper(root, { onNext: () => select(index + 1), onPrev: () => select(index - 1), lock: 600 })

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      gsap.from('[data-amenity-copy]', { autoAlpha: 0, y: 10, duration: 0.7, stagger: 0.05, ease: 'silk' })
    }, caption)
    return () => context.revert()
  }, [index])

  return <section ref={root} className="page page-scroll grid grid-cols-[minmax(0,1fr)] content-start gap-[clamp(1rem,3vh,2rem)] split:grid-rows-[auto_minmax(0,1fr)_auto] split:content-stretch">
    <div className="flex items-start justify-between gap-6">
      <PageHeading id="amenities" title="Amenities" subtitle="Life beyond home" className="flex-1" />
      <TemplateNote className="mt-3 hidden max-w-[16rem] text-right md:block">Indicative amenities · renders to follow</TemplateNote>
    </div>

    <div className="grid gap-[clamp(1.25rem,3vw,3rem)] split:min-h-0 split:grid-rows-[minmax(0,1fr)] split:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] 3xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <figure data-reveal="fade" className="relative m-0 aspect-4/3 overflow-hidden rounded-sm border border-line split:aspect-auto split:h-full split:min-h-0" aria-live="polite">
        {amenities.map((amenity, i) => <div key={amenity.id} aria-hidden={i !== index}
          className={`absolute inset-0 transition-opacity duration-700 ease-silk ${i === index ? 'opacity-100' : 'opacity-0'}`}>
          <ImageSlot src={amenity.image} alt={i === index ? amenity.name : ''} label={amenity.name} />
        </div>)}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-ink/85 via-ink/35 to-transparent" />
        <figcaption ref={caption} className="absolute inset-x-0 bottom-0 px-[clamp(1.25rem,3vw,2.5rem)] pb-[clamp(1.1rem,3vh,2.25rem)] text-ivory">
          <p data-amenity-copy className="eyebrow text-gold-300!">{active.level} · <span className="num">{pad(index + 1)} / {pad(COUNT)}</span></p>
          <h2 data-amenity-copy className="display mt-3 text-[clamp(1.5rem,min(2.8vw,5vh),2.8rem)] leading-[1.04]">{active.name}</h2>
          <p data-amenity-copy className="mt-2 max-w-[46ch] short:hidden text-[clamp(0.8rem,0.74rem+0.22vw,0.98rem)] leading-relaxed text-ivory/80">{active.copy}</p>
        </figcaption>
      </figure>

      <ol data-reveal className="-mx-2 px-2 py-1 split:max-h-full split:min-h-0 split:self-center split:overflow-y-auto split:overscroll-contain" aria-label="Amenities">
        {amenities.map((amenity, i) => <li key={amenity.id}>
          <button type="button" onClick={() => select(i)} aria-current={i === index ? 'true' : undefined}
            className="group flex min-h-11 w-full items-baseline gap-4 border-b border-line py-[clamp(0.35rem,1.1vh,0.8rem)] text-left outline-offset-[-2px]">
            <span className={`num w-6 shrink-0 text-[0.66rem] transition-colors duration-500 ${i === index ? 'text-accent' : 'text-muted'}`}>{pad(i + 1)}</span>
            <span className={`min-w-0 font-display text-[clamp(1rem,min(1.6vw,3vh),1.6rem)] uppercase leading-tight transition-[color,translate] duration-500 ease-silk group-hover:translate-x-1 group-focus-visible:translate-x-1 ${i === index ? 'text-fg' : 'text-muted'}`}>{amenity.name}</span>
            <span className={`ml-auto h-px shrink-0 self-center bg-accent transition-[width] duration-500 ease-silk ${i === index ? 'w-8' : 'w-0'}`} aria-hidden="true" />
          </button>
        </li>)}
      </ol>
    </div>

    <div data-reveal className="flex items-center justify-between gap-4">
      <TemplateNote className="md:hidden">Indicative amenities</TemplateNote>
      <div className="ml-auto flex items-center gap-3">
        <button type="button" className="btn-icon" onClick={() => select(index - 1)} aria-label="Previous amenity"><ChevronIcon direction="left" /></button>
        <p className="num w-16 text-center text-base text-fg">{pad(index + 1)}<span className="text-muted"> / {pad(COUNT)}</span></p>
        <button type="button" className="btn-icon" onClick={() => select(index + 1)} aria-label="Next amenity"><ChevronIcon /></button>
      </div>
    </div>
  </section>
}
