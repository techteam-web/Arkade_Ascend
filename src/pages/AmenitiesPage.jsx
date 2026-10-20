import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from '../app/reveal.js'
import { ImageSlot, PageHeading, RiseImage } from '../components/PageKit.jsx'
import { prefetchImages } from '../app/prefetch.js'
import { ChevronIcon } from '../components/Brand.jsx'
import { amenityGroups, club } from '../content/project.js'
import { pad } from '../app/routes.js'
import useStepper from '../hooks/useStepper.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'
import { useShell } from '../app/ShellContext.js'

// Club Ark from the brochure, as one sequence of photographs in its groups;
// an amenity without a photograph yet shows the framed placeholder.
// Each name reads "Heading – Subline": the photograph carries the subline,
// the list the heading (the whole name where there is no subline).
const splitName = name => {
  const [heading, ...rest] = name.split(/\s+[–-]\s+/)
  return { heading, line: rest.join(' – ') || name }
}
const AMENITIES = amenityGroups.flatMap(group => group.items.map(item => ({ ...item, group, ...splitName(item.name) })))
const COUNT = AMENITIES.length
const PHOTO_SIZES = '(min-width: 64rem) 60vw, 100vw'
const SLIDE_MS = 4000   // an amenity with several pictures shows each for this long, in turn

// One framed photograph at a time, the brochure's groups and the chosen
// group's amenities beside it. Photographs cross-fade; the caption rises
// softly on each change. Wheel, swipe and arrow keys step through them all.
export default function AmenitiesPage() {
  const [index, setIndex] = useState(0)
  const root = useRef(null)
  const caption = useRef(null)
  const active = AMENITIES[index]
  // Several pictures (the lap pool): the first, then the others, in turn,
  // from the first again whenever the amenity is chosen; paused behind the menu.
  const { menuOpen } = useShell()
  const [lightbox, setLightbox] = useState(false)
  const opener = useRef(null)
  const paused = menuOpen || lightbox   // the pictures hold still behind the menu and while full screen
  const slides = active.images ?? null
  const [run, setRun] = useState({ at: index, slide: 0 })
  const slide = run.at === index ? run.slide : 0      // a new amenity starts at its first
  useEffect(() => { setRun({ at: index, slide: 0 }) }, [index])   // and so does a return to it
  useEffect(() => {
    if (!slides || slides.length < 2 || paused) return
    const timer = setTimeout(() => setRun({ at: index, slide: (slide + 1) % slides.length }), SLIDE_MS)
    return () => clearTimeout(timer)
  }, [slides, slide, index, paused])
  const shownImage = slides ? slides[slide] ?? slides[0] : null
  const select = next => setIndex(((next % COUNT) + COUNT) % COUNT)
  const chooseGroup = group => select(AMENITIES.findIndex(item => item.group === group))
  useStepper(root, { onNext: () => select(index + 1), onPrev: () => select(index - 1), lock: 600, keys: !lightbox })
  const picture = shownImage ? { src: shownImage.src, srcSet: shownImage.srcSet, note: shownImage.note ?? active.note }
    : active.image && { src: active.image, srcSet: active.srcSet, note: active.note }
  const closeLightbox = () => { setLightbox(false); requestAnimationFrame(() => opener.current?.focus({ preventScroll: true })) }
  // The amenities either side load ahead, so stepping shows them at once.
  useEffect(() => prefetchImages([-1, 1].flatMap(step => {
    const next = AMENITIES[(index + step + COUNT) % COUNT]
    return next.images ?? (next.image ? [{ src: next.image, srcSet: next.srcSet }] : [])
  }), PHOTO_SIZES), [index])
  // Full screen: Escape closes it, the arrow keys step through the amenities.
  useEffect(() => {
    if (!lightbox) return
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); closeLightbox() }
      if (event.key === 'ArrowLeft') { event.preventDefault(); select(index - 1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); select(index + 1) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [lightbox, index])

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      gsap.from('[data-amenity-copy]', { autoAlpha: 0, y: 10, duration: 0.7, stagger: 0.05, ease: 'silk' })
    }, caption)
    return () => context.revert()
  }, [index])

  // The groups as one row of tabs: across the page above the photograph and
  // the list where there is room (the list then starts level with the
  // photograph's top), otherwise above the list.
  return <section ref={root} className="page page-scroll grid grid-cols-[minmax(0,1fr)] content-start gap-[clamp(1rem,3vh,2rem)] split:grid-rows-[auto_minmax(0,1fr)_auto] split:content-stretch roomy:grid-rows-[auto_auto_minmax(0,1fr)_auto]">
    <PageHeading id="amenities" title="Amenities" subtitle={`Presenting ${club.name} · ${club.line.toLowerCase()}`} />
    <div data-reveal className="hidden roomy:block"><GroupTabs active={active.group} onChoose={chooseGroup} /></div>

    <div className="grid gap-[clamp(1.25rem,3vw,3rem)] split:min-h-0 split:grid-rows-[minmax(0,1fr)] split:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] 3xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
      <figure data-reveal="fade" className="relative m-0 aspect-4/3 overflow-hidden rounded-sm border border-line bg-plum-950 split:aspect-auto split:h-full split:min-h-0" aria-live="polite">
        {/* The shown photograph rises in over the last (an amenity with
            several pictures rises through them in turn); one without a
            photograph yet shows the framed placeholder. */}
        {picture
          ? <RiseImage src={picture.src} srcSet={picture.srcSet} sizes={PHOTO_SIZES} alt={active.name} focus={shownImage?.focus ?? active.focus} />
          : <div className="absolute inset-0"><ImageSlot label="Image to follow" className="pb-[22%]" /></div>}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-ink/85 via-ink/35 to-transparent" />
        <figcaption ref={caption} className="absolute inset-x-0 bottom-0 px-[clamp(1.25rem,3vw,2.5rem)] pb-[clamp(1.1rem,3vh,2.25rem)] text-ivory">
          <p data-amenity-copy className="eyebrow text-gold-300!">{active.group.label} · <span className="num">{pad(index + 1)} / {pad(COUNT)}</span></p>
          <h2 data-amenity-copy className="display mt-3 text-[clamp(1.5rem,min(2.8vw,5vh),2.8rem)] normal-case leading-[1.1]">{active.line}</h2>
        </figcaption>
        {active.image && <div className="absolute right-3 top-3 flex items-center gap-3">
          <p className="photo-note">{shownImage?.note ?? active.note ?? 'Representational image'}</p>
          <button ref={opener} type="button" className="btn-icon" onClick={() => setLightbox(true)} aria-label={`View ${active.name} full screen`}>
            <svg viewBox="0 0 24 24"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" /></svg>
          </button>
        </div>}
        {/* One thin segment per picture: the shown one fills over its time,
            those before it stay full. */}
        {slides && slides.length > 1 && <div aria-hidden="true" className="pointer-events-none absolute left-[clamp(1.25rem,3vw,2.5rem)] top-[clamp(1rem,2.6vh,1.5rem)] flex w-[clamp(4.5rem,9vw,7rem)] gap-1.5">
          {slides.map((picture, k) => <span key={picture.src} className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-ivory/30 shadow-[0_1px_4px_rgba(0,0,0,.35)]">
            {k < slide && <span className="absolute inset-0 bg-gold-300" />}
            {/* restarts with its timer, also when the menu closes */}
            {k === slide && <span key={`${index}-${slide}-${paused}`} className="slide-fill absolute inset-0 bg-gold-300 motion-reduce:animate-none"
              style={{ '--slide-time': `${SLIDE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }} />}
          </span>)}
        </div>}
      </figure>

      <div data-reveal className="flex min-w-0 flex-col gap-[clamp(0.75rem,2vh,1.25rem)] split:min-h-0">
        <div className="shrink-0 roomy:hidden"><GroupTabs active={active.group} onChoose={chooseGroup} /></div>
        {active.group.line && <p key={`line-${active.group.id}`} className="finder-in shrink-0 text-right font-display text-[clamp(0.95rem,min(1.3vw,2.6vh),1.35rem)] leading-tight text-accent">{active.group.line}</p>}
        <ol key={active.group.id} className="-mx-2 px-2 split:min-h-0 split:overflow-y-auto split:overscroll-contain" aria-label={`${active.group.label} amenities`}>
          {active.group.items.map(item => {
            const i = AMENITIES.findIndex(entry => entry.id === item.id)
            return <li key={item.id} className="finder-in">
              <button type="button" onClick={() => select(i)} aria-current={i === index ? 'true' : undefined}
                className="group flex min-h-11 w-full items-baseline gap-4 border-b border-line py-[clamp(0.35rem,1.1vh,0.8rem)] text-left outline-offset-[-2px]">
                <span aria-hidden="true" className={`num w-6 shrink-0 text-[0.66rem] transition-colors duration-500 ${i === index ? 'text-accent' : 'text-muted'}`}>{pad(i + 1)}</span>
                <span className={`min-w-0 font-display text-[clamp(1rem,min(1.6vw,3vh),1.6rem)] leading-tight transition-[color,translate] duration-500 ease-silk group-hover:translate-x-1 group-focus-visible:translate-x-1 ${i === index ? 'text-fg' : 'text-muted'}`}>{AMENITIES[i].heading}{AMENITIES[i].line !== AMENITIES[i].heading && <span className="visually-hidden">: {AMENITIES[i].line}</span>}</span>
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

    {/* Portalled into the frame: above the page, still beneath the full-screen gate. */}
    {lightbox && picture && createPortal(<div role="dialog" aria-modal="true" aria-label={`${active.name}, full screen`} onClick={closeLightbox}
      className="absolute inset-0 z-70 grid grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] place-items-center bg-ink/95 p-[clamp(1rem,4vw,4rem)] backdrop-blur-md">
      <img key={picture.src} src={picture.src} srcSet={picture.srcSet} sizes="100vw" alt={active.name} draggable="false"
        onClick={event => event.stopPropagation()} className="finder-in max-h-full max-w-full select-none rounded-sm object-contain shadow-2xl" />
      <button type="button" autoFocus className="btn-icon absolute right-(--gutter) top-5" onClick={closeLightbox} aria-label="Close full screen">
        <svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19" /></svg>
      </button>
      <button type="button" className="btn-icon absolute left-(--gutter) top-1/2" onClick={event => { event.stopPropagation(); select(index - 1) }} aria-label="Previous amenity"><ChevronIcon direction="left" /></button>
      <button type="button" className="btn-icon absolute right-(--gutter) top-1/2" onClick={event => { event.stopPropagation(); select(index + 1) }} aria-label="Next amenity"><ChevronIcon /></button>
      <p className="absolute bottom-5 left-1/2 max-w-[70vw] -translate-x-1/2 text-center text-[0.6rem] uppercase tracking-[0.3em] text-gold-200 max-sm:bottom-12">{active.group.label} · <span className="num">{pad(index + 1)} / {pad(COUNT)}</span></p>
      <p className="absolute bottom-5 right-(--gutter) text-[0.55rem] uppercase tracking-[0.22em] text-ivory/70 max-sm:hidden">{picture.note ?? 'Representational image'}</p>
    </div>, document.querySelector('.page-frame') || document.body)}
  </section>
}

// Club Ark's groups as one row of text tabs over a hairline, a gold bar
// sliding under the chosen one. Where they do not fit (phones, short
// screens) the row scrolls sideways and keeps the chosen tab in view.
function GroupTabs({ active, onChoose }) {
  const bar = useRef(null)
  const [mark, setMark] = useState(null)
  useLayoutEffect(() => {
    const row = bar.current, tab = row?.querySelector('[aria-pressed="true"]')
    if (!tab) return
    const place = () => setMark({ x: tab.offsetLeft, width: tab.offsetWidth, scrolls: row.scrollWidth > row.clientWidth + 1 })
    place()
    if (row.scrollWidth > row.clientWidth) {
      row.scrollTo({ left: Math.max(0, tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }
    const observer = new ResizeObserver(place)
    observer.observe(row)
    return () => observer.disconnect()
  }, [active])
  return <div ref={bar} role="group" aria-label={`${club.name} groups`} data-own-gesture
    className={`relative flex gap-x-[clamp(1.1rem,2.4vw,3rem)] overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${mark?.scrolls ? '[mask-image:linear-gradient(90deg,transparent,#000_1.5rem,#000_calc(100%-1.5rem),transparent)]' : ''}`}>
    {amenityGroups.map(group => {
      const chosen = group === active
      return <button key={group.id} type="button" aria-pressed={chosen} onClick={() => onChoose(group)}
        className={`group relative flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap text-[clamp(0.66rem,0.78vw,0.84rem)] font-medium uppercase tracking-[0.18em] transition-colors duration-500 ${chosen ? 'text-fg' : 'text-muted hover:text-fg focus-visible:text-fg'}`}>
        {group.label}
        <span aria-hidden="true" className={`num hidden text-[0.6rem] tracking-[0.08em] transition-colors duration-500 xl:inline ${chosen ? 'text-accent' : 'text-muted/70'}`}>{pad(group.items.length)}</span>
      </button>
    })}
    {mark && <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-[2px] bg-accent transition-[translate,width] duration-500 ease-silk motion-reduce:transition-none"
      style={{ translate: `${mark.x}px 0`, width: mark.width }} />}
  </div>
}
