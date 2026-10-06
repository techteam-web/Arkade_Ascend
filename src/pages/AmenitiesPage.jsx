import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { PageHeading } from '../components/PageKit.jsx'
import { ChevronIcon } from '../components/Brand.jsx'
import { amenityGroups, club } from '../content/project.js'
import { pad } from '../app/routes.js'
import useStepper from '../hooks/useStepper.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

// Club Ark from the brochure, as one sequence of photographs in five groups.
const AMENITIES = amenityGroups.flatMap(group => group.items.map(item => ({ ...item, group })))
const COUNT = AMENITIES.length

// One framed photograph at a time, the brochure's groups and the chosen
// group's amenities beside it. Photographs cross-fade; the caption rises
// softly on each change. Wheel, swipe and arrow keys step through them all.
export default function AmenitiesPage() {
  const [index, setIndex] = useState(0)
  const root = useRef(null)
  const caption = useRef(null)
  const active = AMENITIES[index]
  const select = next => setIndex(((next % COUNT) + COUNT) % COUNT)
  const chooseGroup = group => select(AMENITIES.findIndex(item => item.group === group))
  useStepper(root, { onNext: () => select(index + 1), onPrev: () => select(index - 1), lock: 600 })

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      gsap.from('[data-amenity-copy]', { autoAlpha: 0, y: 10, duration: 0.7, stagger: 0.05, ease: 'silk' })
    }, caption)
    return () => context.revert()
  }, [index])

  return <section ref={root} className="page page-scroll grid grid-cols-[minmax(0,1fr)] content-start gap-[clamp(1rem,3vh,2rem)] split:grid-rows-[auto_minmax(0,1fr)_auto] split:content-stretch">
    <PageHeading id="amenities" title="Amenities" subtitle={`Presenting ${club.name} · ${club.line.toLowerCase()}`} />

    <div className="grid gap-[clamp(1.25rem,3vw,3rem)] split:min-h-0 split:grid-rows-[minmax(0,1fr)] split:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] 3xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
      <figure data-reveal="fade" className="relative m-0 aspect-4/3 overflow-hidden rounded-sm border border-line bg-plum-950 split:aspect-auto split:h-full split:min-h-0" aria-live="polite">
        {/* Only the shown photograph and its neighbours load. */}
        {AMENITIES.map((amenity, i) => {
          const near = Math.min(Math.abs(i - index), COUNT - Math.abs(i - index)) <= 1
          return <img key={amenity.id} src={near ? amenity.image : undefined} alt={i === index ? amenity.name : ''} aria-hidden={i !== index} draggable="false"
            className={`absolute inset-0 size-full select-none object-cover transition-opacity duration-700 ease-silk ${i === index ? 'opacity-100' : 'opacity-0'}`}
            style={{ objectPosition: amenity.focus }} />
        })}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-ink/85 via-ink/35 to-transparent" />
        <figcaption ref={caption} className="absolute inset-x-0 bottom-0 px-[clamp(1.25rem,3vw,2.5rem)] pb-[clamp(1.1rem,3vh,2.25rem)] text-ivory">
          <p data-amenity-copy className="eyebrow text-gold-300!">{active.group.label} · <span className="num">{pad(index + 1)} / {pad(COUNT)}</span></p>
          <h2 data-amenity-copy className="display mt-3 text-[clamp(1.5rem,min(2.8vw,5vh),2.8rem)] leading-[1.04]">{active.name}</h2>
          <p data-amenity-copy className="mt-2 max-w-[46ch] text-[0.62rem] uppercase leading-relaxed tracking-[0.2em] text-ivory/80 short:hidden">{active.group.line}</p>
        </figcaption>
        <p className="pointer-events-none absolute right-3 top-3 text-[0.5rem] uppercase tracking-[0.2em] text-ivory/60 [text-shadow:0_1px_6px_rgba(0,0,0,.5)]">All representational image</p>
      </figure>

      <div data-reveal className="flex min-w-0 flex-col gap-[clamp(0.75rem,2vh,1.25rem)] split:min-h-0 split:self-center">
        {/* Phones keep the groups on one row that scrolls sideways. */}
        <div role="group" aria-label={`${club.name} groups`} data-own-gesture
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] split:flex-wrap split:overflow-visible">
          {amenityGroups.map(group => <button key={group.id} type="button" className="chip shrink-0" aria-pressed={active.group === group} onClick={() => chooseGroup(group)}>
            {group.label}
          </button>)}
        </div>
        <ol key={active.group.id} className="-mx-2 px-2 py-1 split:min-h-0 split:overflow-y-auto split:overscroll-contain" aria-label={`${active.group.label} amenities`}>
          {active.group.items.map(item => {
            const i = AMENITIES.findIndex(entry => entry.id === item.id)
            return <li key={item.id} className="finder-in">
              <button type="button" onClick={() => select(i)} aria-current={i === index ? 'true' : undefined}
                className="group flex min-h-11 w-full items-baseline gap-4 border-b border-line py-[clamp(0.35rem,1.1vh,0.8rem)] text-left outline-offset-[-2px]">
                <span className={`num w-6 shrink-0 text-[0.66rem] transition-colors duration-500 ${i === index ? 'text-accent' : 'text-muted'}`}>{pad(i + 1)}</span>
                <span className={`min-w-0 font-display text-[clamp(1rem,min(1.6vw,3vh),1.6rem)] uppercase leading-tight transition-[color,translate] duration-500 ease-silk group-hover:translate-x-1 group-focus-visible:translate-x-1 ${i === index ? 'text-fg' : 'text-muted'}`}>{item.name}</span>
                <span className={`ml-auto h-px shrink-0 self-center bg-accent transition-[width] duration-500 ease-silk ${i === index ? 'w-8' : 'w-0'}`} aria-hidden="true" />
              </button>
            </li>
          })}
        </ol>
      </div>
    </div>

    <div data-reveal className="flex items-center justify-end gap-3">
      <button type="button" className="btn-icon" onClick={() => select(index - 1)} aria-label="Previous amenity"><ChevronIcon direction="left" /></button>
      <p className="num w-16 text-center text-base text-fg">{pad(index + 1)}<span className="text-muted"> / {pad(COUNT)}</span></p>
      <button type="button" className="btn-icon" onClick={() => select(index + 1)} aria-label="Next amenity"><ChevronIcon /></button>
    </div>
  </section>
}
