import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from '../app/reveal.js'
import { SplitText } from 'gsap/SplitText'
import { ImageSlot, PageHeading } from '../components/PageKit.jsx'
import GLImage from '../components/GLImage.jsx'
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

  // Each amenity's line rises letter by letter as it arrives; its labels lift in.
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      const title = caption.current?.querySelector('[data-amenity-title]')
      if (title) {
        const split = SplitText.create(title, { type: 'words,chars', mask: 'words', charsClass: 'split-char' })
        gsap.from(split.chars, { yPercent: 115, rotate: 7, duration: 1, stagger: 0.018, ease: 'rise' })
      }
      gsap.from('[data-amenity-copy]', { autoAlpha: 0, y: 14, duration: 0.8, stagger: 0.06, ease: 'rise' })
    }, caption)
    return () => context.revert()
  }, [index])

  // The amenity fills the page, edge to edge, in WebGL (it rises in over the
  // last and ripples under the pointer). Over it: the heading and the
  // groups along the top, and at the foot the amenity's line set large, with
  // its group's list and the steps on a frosted panel beside it.
  return <section ref={root} className="absolute inset-0 overflow-hidden" aria-label="Amenities">
    <div data-reveal="fade" className="absolute inset-0 bg-plum-950" aria-live="polite">
      {picture
        ? <GLImage src={picture.src} srcSet={picture.srcSet} sizes="100vw" alt={active.name} focus={shownImage?.focus ?? active.focus} />
        : <ImageSlot label="Image to follow" className="pb-[22%]" />}
    </div>
    {/* Shade the sides that carry type. */}
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(18,11,13,.8),rgba(18,11,13,.3)_42%,transparent_68%)] stack:bg-[linear-gradient(180deg,rgba(18,11,13,.25),transparent_30%)]" />
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,11,13,.8),rgba(18,11,13,.5)_30%,transparent_46%,transparent_52%,rgba(18,11,13,.9))]" />

    <div className="page pointer-events-none flex flex-col gap-[clamp(0.75rem,2.4vh,1.5rem)]">
      <div className="pointer-events-auto flex flex-col gap-[clamp(0.75rem,2.4vh,1.5rem)] split:max-w-[min(100%,56rem)]">
        <PageHeading id="amenities" title="Amenities" subtitle={`Presenting ${club.name} · ${club.line.toLowerCase()}`} onPhoto />
        <div data-reveal><GroupTabs active={active.group} onChoose={chooseGroup} /></div>
      </div>

      <div className="mt-auto grid items-end gap-[clamp(1rem,3vw,3rem)] split:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <div ref={caption} className="pointer-events-auto min-w-0">
          <p data-amenity-copy className="eyebrow flex items-center gap-3 text-gold-300!"><span>{active.group.label}</span><span className="h-px w-8 bg-gold-300/60" aria-hidden="true" /><span className="num">{pad(index + 1)} / {pad(COUNT)}</span></p>
          <h2 key={index} data-amenity-title className="display mt-[clamp(0.6rem,1.8vh,1.1rem)] max-w-[16ch] text-[clamp(2.2rem,min(6.4vw,10.5vh),7rem)] normal-case leading-[0.95] text-ivory [text-shadow:0_2px_30px_rgba(18,11,13,.45)]">{active.line}</h2>
          {active.group.line && <p data-amenity-copy className="mt-[clamp(0.6rem,1.8vh,1.1rem)] font-display text-[clamp(1rem,min(1.5vw,2.8vh),1.5rem)] leading-tight text-gold-200/95">{active.group.line}</p>}
          {/* One thin segment per picture: the shown one fills over its time. */}
          {slides && slides.length > 1 && <div aria-hidden="true" className="mt-4 flex w-[clamp(5rem,10vw,8rem)] gap-1.5">
            {slides.map((picture, k) => <span key={picture.src} className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-ivory/30">
              {k < slide && <span className="absolute inset-0 bg-gold-300" />}
              {k === slide && <span key={`${index}-${slide}-${paused}`} className="slide-fill absolute inset-0 bg-gold-300 motion-reduce:animate-none"
                style={{ '--slide-time': `${SLIDE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }} />}
            </span>)}
          </div>}
        </div>

        <div data-reveal className="glass-panel pointer-events-auto flex min-w-0 flex-col gap-3 rounded-sm p-[clamp(0.9rem,1.6vw,1.4rem)] split:max-h-[min(46vh,30rem)]">
          <ol key={active.group.id} aria-label={`${active.group.label} amenities`}
            className="-mx-1 min-h-0 overflow-y-auto overscroll-contain px-1 stack:flex stack:gap-2 stack:overflow-x-auto stack:overflow-y-visible stack:[scrollbar-width:none]">
            {active.group.items.map(item => {
              const i = AMENITIES.findIndex(entry => entry.id === item.id)
              return <li key={item.id} className="finder-in shrink-0">
                <button type="button" onClick={() => select(i)} aria-current={i === index ? 'true' : undefined}
                  className="group flex min-h-11 w-full items-baseline gap-3 border-b border-ivory/10 py-[clamp(0.3rem,1vh,0.6rem)] text-left outline-offset-[-2px] stack:rounded-full stack:border stack:px-4 stack:py-0 stack:items-center">
                  <span aria-hidden="true" className={`num w-6 shrink-0 text-[0.62rem] transition-colors duration-500 stack:hidden ${i === index ? 'text-gold-300' : 'text-ivory/50'}`}>{pad(i + 1)}</span>
                  <span className={`min-w-0 whitespace-nowrap font-display text-[clamp(1rem,min(1.45vw,2.8vh),1.45rem)] leading-tight transition-[color,translate] duration-500 ease-silk group-hover:translate-x-1 group-focus-visible:translate-x-1 stack:text-[0.95rem] ${i === index ? 'text-ivory' : 'text-ivory/60'}`}>
                    {AMENITIES[i].heading}{AMENITIES[i].line !== AMENITIES[i].heading && <span className="visually-hidden">: {AMENITIES[i].line}</span>}
                  </span>
                  <span className={`ml-auto h-px shrink-0 self-center bg-gold-300 transition-[width] duration-500 ease-silk stack:hidden ${i === index ? 'w-6' : 'w-0'}`} aria-hidden="true" />
                </button>
              </li>
            })}
          </ol>
          <div className="flex items-center justify-between gap-3 border-t border-ivory/15 pt-3">
            {active.image && <button ref={opener} type="button" className="btn-icon" onClick={() => setLightbox(true)} aria-label={`View ${active.name} full screen`} data-magnetic>
              <svg viewBox="0 0 24 24"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" /></svg>
            </button>}
            <div className="ml-auto flex items-center gap-2">
              <button type="button" className="btn-icon" onClick={() => select(index - 1)} aria-label="Previous amenity" data-magnetic><ChevronIcon direction="left" /></button>
              <p className="num w-14 text-center text-[0.95rem] text-ivory">{pad(index + 1)}<span className="text-ivory/50"> / {pad(COUNT)}</span></p>
              <button type="button" className="btn-icon" onClick={() => select(index + 1)} aria-label="Next amenity" data-magnetic><ChevronIcon /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p className="photo-note absolute bottom-(--credit-bottom) right-(--gutter) z-10">{shownImage?.note ?? active.note ?? 'Representational image'}</p>

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
  // A scrolling row fades only at an edge with more tabs beyond it.
  const edges = () => {
    const row = bar.current
    if (!row) return
    row.style.setProperty('--fade-start', row.scrollLeft > 2 ? '1.5rem' : '0px')
    row.style.setProperty('--fade-end', row.scrollLeft + row.clientWidth < row.scrollWidth - 2 ? '1.5rem' : '0px')
  }
  useLayoutEffect(() => {
    const row = bar.current, tab = row?.querySelector('[aria-pressed="true"]')
    if (!tab) return
    const place = () => { setMark({ x: tab.offsetLeft, width: tab.offsetWidth, scrolls: row.scrollWidth > row.clientWidth + 1 }); edges() }
    place()
    if (row.scrollWidth > row.clientWidth) {
      row.scrollTo({ left: Math.max(0, tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }
    const observer = new ResizeObserver(place)
    observer.observe(row)
    return () => observer.disconnect()
  }, [active])
  return <div ref={bar} role="group" aria-label={`${club.name} groups`} data-own-gesture onScroll={edges}
    className={`relative flex gap-x-[clamp(1.1rem,2.4vw,3rem)] overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${mark?.scrolls ? '[mask-image:linear-gradient(90deg,transparent,#000_var(--fade-start,1.5rem),#000_calc(100%-var(--fade-end,1.5rem)),transparent)]' : ''}`}>
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
