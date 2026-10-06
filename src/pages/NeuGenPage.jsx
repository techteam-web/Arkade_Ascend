import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { drawIn, gsap, settleReveal } from '../app/reveal.js'
import { SplitText } from 'gsap/SplitText'
import { useShell } from '../app/ShellContext.js'
import { setScenePreset } from '../scenes/sceneStore.js'
import { ArrowIcon } from '../components/Brand.jsx'
import NeuGenMark from '../components/NeuGenMark.jsx'
import { pad } from '../app/routes.js'
import { project } from '../content/project.js'
import useStepper from '../hooks/useStepper.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

// The brochure's opening pages as four chapters. Each chapter re-themes the
// shared 3D scene: satin cover, the gilded silk, the plum of the new
// generation homebuyers, then the balcony photograph that welcomes visitors
// to the Neu Gen life (page 5 of the 24 Sep 2026 brochure).
const chapters = [
  { id: 'life', label: 'Neu Gen life', scene: 'cover' },
  { id: 'masterpiece', label: 'A masterpiece', scene: 'gilded' },
  { id: 'homebuyers', label: 'Want it all', scene: 'homebuyers' },
  { id: 'welcome', label: 'Welcome', scene: 'heart' },
]

export default function NeuGenPage() {
  const { go } = useShell()
  const [chapter, setChapter] = useState(0)
  const root = useRef(null)
  const previous = useRef(null)
  const splits = useRef(new Map())
  const running = useRef(null)
  const change = next => setChapter(current => Math.max(0, Math.min(chapters.length - 1, typeof next === 'function' ? next(current) : next)))
  useStepper(root, { onNext: () => change(c => c + 1), onPrev: () => change(c => c - 1), lock: 1300 })

  useEffect(() => { setScenePreset(chapters[chapter].scene) }, [chapter])

  // Line splits are made once, after the fonts settle.
  useLayoutEffect(() => {
    const sections = root.current.querySelectorAll('[data-chapter]')
    gsap.set(sections, { autoAlpha: 0 })
    let cancelled = false
    document.fonts.ready.then(() => {
      if (cancelled) return
      root.current.querySelectorAll('[data-ch="lines"]').forEach(element => {
        splits.current.set(element, SplitText.create(element, { type: 'lines', mask: 'lines', linesClass: 'split-line' }))
      })
      play(null, 0)
    })
    return () => { cancelled = true; running.current?.kill(); splits.current.forEach(split => split.revert()); splits.current.clear() }
  }, [])

  useLayoutEffect(() => {
    if (previous.current === null) { previous.current = chapter; return }
    if (previous.current === chapter) return
    play(previous.current, chapter)
    previous.current = chapter
  }, [chapter])

  // One chapter animation at a time: a new one stops the last and settles
  // every other chapter first, so quick clicks never blend two chapters.
  function play(from, to) {
    running.current?.kill()
    const sections = root.current.querySelectorAll('[data-chapter]')
    const outgoing = from === null || from === to ? null : sections[from]
    const incoming = sections[to]
    sections.forEach(section => { if (section !== incoming && section !== outgoing) gsap.set(section, { autoAlpha: 0 }) })
    const reduced = prefersReducedMotion()
    const timeline = gsap.timeline({ defaults: { ease: 'silk' } })
    running.current = timeline
    if (outgoing) {
      timeline.to(outgoing.querySelectorAll('[data-ch]'), { autoAlpha: 0, y: -8, duration: reduced ? 0 : 0.45, ease: 'power2.in' })
        .set(outgoing, { autoAlpha: 0 })
    }
    timeline.set(incoming, { autoAlpha: 1 })
    const items = [...incoming.querySelectorAll('[data-ch]')]
    gsap.set(items, { clearProps: 'opacity,visibility,filter,transform' })
    items.forEach(item => { const split = splits.current.get(item); if (split) gsap.set(split.lines, { clearProps: 'transform' }) })
    if (reduced) { settleReveal(incoming); return }
    items.forEach((item, index) => {
      const at = (outgoing ? 0.5 : 0.1) + Math.min(index * 0.07, 0.7)
      const split = splits.current.get(item)
      if (split) timeline.from(split.lines, { yPercent: 100, duration: 1, stagger: 0.08 }, at)
      else if (item.dataset.ch === 'image') timeline.from(item, { scale: 1.04, autoAlpha: 0, duration: 1.6, ease: 'power2.out' }, at - 0.3)
      else if (item.dataset.ch === 'rule') timeline.from(item, { scaleX: 0, duration: 1.1 }, at)
      else if (item.dataset.ch === 'glyph') timeline.from(item, { autoAlpha: 0, duration: 1.6, ease: 'power2.out' }, at - 0.2)
      else if (item.dataset.ch === 'draw') drawIn(item, timeline, at)
      else timeline.from(item, { autoAlpha: 0, y: 14, duration: 1 }, at)
    })
  }

  const last = chapter === chapters.length - 1
  return <section ref={root} className="absolute inset-0 overflow-hidden" aria-roledescription="presentation" aria-label="Neu Gen life">
    <Cover active={chapter === 0} />
    <Masterpiece active={chapter === 1} />
    <Homebuyers active={chapter === 2} />
    <Welcome active={chapter === 3} />

    <nav data-reveal="fade" aria-label="Chapters" className="absolute right-(--gutter) top-1/2 z-10 hidden -translate-y-1/2 flex-col items-end gap-1 xl:flex short:hidden">
      {chapters.map((item, index) => <button key={item.id} type="button" onClick={() => change(index)} aria-current={chapter === index ? 'step' : undefined}
        className="group relative flex min-h-11 min-w-11 items-center justify-end gap-4 text-ivory">
        {/* The name shows on hover or focus, outside the button's own box, so
            the hit area stays small and never reaches into the page. */}
        <span className={`pointer-events-none absolute right-full mr-3 whitespace-nowrap text-[0.58rem] uppercase tracking-[0.3em] transition-all duration-500 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-80 group-focus-visible:translate-x-0 group-focus-visible:opacity-80`}>{item.label}</span>
        <span className={`h-px transition-all duration-700 ${chapter === index ? 'w-6 bg-gold-200' : 'w-2.5 bg-ivory/40 group-hover:w-4'}`} />
        <span className="num w-5 text-[0.68rem] opacity-80">{pad(index + 1)}</span>
      </button>)}
    </nav>

    <div data-reveal="fade" className="absolute inset-x-(--gutter) bottom-[clamp(1rem,4vh,2.5rem)] z-10 flex items-center justify-between gap-4 text-ivory">
      <p className="num text-[0.72rem]" aria-live="polite">
        <span className="text-gold-200">{pad(chapter + 1)}</span> / {pad(chapters.length)}<span className="visually-hidden">, {chapters[chapter].label}</span>
      </p>
      <div className="flex items-center gap-3">
        <button type="button" className="btn-icon" onClick={() => change(c => c - 1)} disabled={chapter === 0} aria-label="Previous chapter">
          <svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6" /></svg>
        </button>
        {last
          ? <button type="button" className="btn-lux" onClick={() => go('/tower')}>The tower<ArrowIcon /></button>
          : <button type="button" className="btn-lux" onClick={() => change(c => c + 1)}>Continue<ArrowIcon /></button>}
      </div>
    </div>
  </section>
}

function Chapter({ active, children, className = '', label }) {
  return <section data-chapter aria-label={label} aria-hidden={!active} inert={active ? undefined : ''} className={`absolute inset-0 ${className}`}>{children}</section>
}

// Page 1: satin, NEU / GEN, Life, has arrived.
function Cover({ active }) {
  return <Chapter active={active} label="Malad's Neu Gen life has arrived">
    <div data-ch="image" className="absolute inset-0">
      <img src="/brochure/cover-satin.webp" alt="" className="size-full object-cover opacity-95" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(18,11,13,.15),rgba(18,11,13,.7)_75%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-espresso/90 to-transparent" />
    </div>
    <div className="page page-scroll flex flex-col items-center justify-center-safe text-center">
      <p data-ch className="font-display text-[clamp(1rem,2.2vw,1.9rem)] uppercase tracking-[0.34em] text-gold-400">Malad&rsquo;s</p>
      {/* The brochure's monogram draws itself in (NeuGenMark). */}
      <h1 tabIndex={-1} className="mt-[clamp(0.75rem,2.5vh,1.5rem)] text-gold-400 outline-none" aria-label="Malad's Neu Gen life has arrived">
        <NeuGenMark withLife data-ch="draw" className="block h-auto w-[clamp(11rem,min(56vw,46vh),34rem)]" />
      </h1>
      <p data-ch className="mt-[clamp(1rem,3.5vh,2rem)] font-display text-[clamp(0.85rem,1.4vw,1.2rem)] uppercase tracking-[0.5em] text-gold-400/90 short:mt-3">Has arrived</p>
    </div>
  </Chapter>
}

// Page 2: the gilded silk spread, text left and lockup right.
function Masterpiece({ active }) {
  return <Chapter active={active} label="A masterpiece made for those who think ahead">
    <div className="page page-scroll grid [align-content:safe_center] items-center gap-y-16 text-ivory md:grid-cols-2 sm:pr-[calc(var(--gutter)+4rem)] short:gap-y-6">
      <h2 data-ch="lines" className="mx-auto max-w-[30ch] text-center text-[clamp(0.8rem,1.15vw,1.15rem)] font-medium uppercase leading-[2.2] tracking-[0.24em] drop-shadow-[0_1px_12px_rgba(90,60,30,.35)]">
        A masterpiece made for those who think ahead.
      </h2>
      {/* The Arkade Ascend lockup scales with the viewport, inside its column. */}
      <div data-ch className="flex w-full flex-col items-center">
        <p className="mb-4 text-[0.6rem] uppercase tracking-[0.9em] pl-[0.9em] text-ivory/85 short:mb-3">Presenting</p>
        <img src="/logo/arkade-ascend-white.webp" alt="Arkade Ascend, Malad West" width="2400" height="373" draggable="false"
          className="h-auto w-[min(100%,clamp(17rem,30vw,32rem))] select-none drop-shadow-[0_1px_16px_rgba(90,60,30,.35)]" />
      </div>
    </div>
  </Chapter>
}

// Page 3: plum ground, the NEU GEN glyphs as a watermark.
function Homebuyers({ active }) {
  return <Chapter active={active} label="The new generation homebuyers want it all">
    <div aria-hidden="true" className="pointer-events-none absolute left-[-4vw] top-1/2 -translate-y-1/2 select-none max-md:left-1/2 max-md:-translate-x-1/2 max-md:opacity-60">
      <NeuGenMark data-ch="glyph" className="block h-[clamp(19rem,min(60vw,82vh),66rem)] w-auto text-[#5a4046]/45" />
    </div>
    <div className="page page-scroll grid [align-content:safe_center] items-center gap-10 md:grid-cols-2 md:gap-[6vw] sm:pr-[calc(var(--gutter)+4rem)]">
      <h2 data-ch="lines" className="display text-center text-[clamp(1.8rem,3.4vw,3.6rem)] leading-[1.18] text-gold-300 drop-shadow-[0_2px_18px_rgba(33,22,26,.55)]">
        The<br />new generation<br />homebuyers,<br /><span className="text-ivory">want it all.</span>
      </h2>
      <div className="mx-auto max-w-md md:mx-0">
        <span data-ch="rule" className="mb-6 block h-px w-16 origin-left bg-gold-500/70" />
        <p data-ch className="text-[clamp(0.9rem,1.05vw,1.1rem)] leading-[1.95] text-ivory/90 drop-shadow-[0_1px_12px_rgba(33,22,26,.6)]">{project.homebuyers}</p>
      </div>
    </div>
  </Chapter>
}

// Brochure page 5: the balcony at dusk, and its WELCOME TO NEU GEN LIFE
// copy in the frosted card. Landscape screens float the card at the right,
// beside her. Portrait phones and tablets give the photograph the top of the
// screen and the card the dark ground below, so the card never covers her.
// The card always clears the chapter buttons along the bottom.
function Welcome({ active }) {
  return <Chapter active={active} label="Welcome to the Neu Gen life">
    <div data-ch="image" className="absolute inset-0 bg-espresso">
      <div className="absolute inset-0 max-lg:portrait:bottom-[38%]">
        <img src="/brochure/welcome-balcony-1600.webp" srcSet="/brochure/welcome-balcony-1600.webp 1600w, /brochure/welcome-balcony-2880.webp 2880w" sizes="100vw"
          alt="A woman in a flowing gown on a high balcony at dusk, looking out over the city" className="size-full object-cover object-[0%_55%] max-lg:portrait:object-[6%_60%]" />
        <div className="absolute inset-x-0 bottom-0 hidden h-2/5 bg-linear-to-t from-espresso to-transparent max-lg:portrait:block" />
      </div>
      <div className="absolute inset-y-0 right-0 w-3/5 bg-linear-to-l from-plum-950/75 via-plum-950/30 to-transparent max-lg:portrait:hidden" />
      <div className="absolute inset-0 bg-linear-to-t from-espresso/65 via-transparent to-espresso/25" />
    </div>
    {/* From 1280px the card also clears the chapter index (and its names,
        shown on hover); below that the index gives way to the bottom bar. */}
    <div className="page flex items-center justify-end pb-[clamp(4.75rem,11vh,7rem)] pr-[calc(var(--gutter)+2rem)] xl:pr-[calc(var(--gutter)+11.5rem)]
      max-lg:portrait:items-end max-lg:portrait:justify-center max-lg:portrait:pr-(--gutter) short:pb-[4.5rem]">
      <div data-ch className="glass-panel w-[min(28rem,100%)] px-[clamp(1.25rem,3vw,3rem)] py-[clamp(1.1rem,4.5vh,3.25rem)] text-center lg:max-xl:w-[min(24rem,100%)]
        max-lg:portrait:w-[min(34rem,100%)] short:w-[min(30rem,58vw)] short:py-3">
        <p className="text-[clamp(0.56rem,0.7vw,0.7rem)] font-medium uppercase tracking-[0.32em] pl-[0.32em] text-ivory/90">Welcome to</p>
        <NeuGenMark data-ch="draw" title="Neu Gen" className="mx-auto mt-[clamp(0.6rem,1.8vh,1.1rem)] block h-auto w-[clamp(6.5rem,min(12vw,17vh),11rem)] text-ivory short:mt-1.5 short:w-24" />
        <p className="mt-[clamp(0.6rem,2vh,1.25rem)] flex items-center justify-center gap-4 text-[clamp(0.8rem,1.2vw,1.1rem)] font-medium uppercase tracking-[0.42em] pl-[0.42em] text-ivory short:mt-1.5">
          <span className="h-px w-[clamp(1.75rem,4vw,3.5rem)] bg-ivory/60" aria-hidden="true" />Life<span className="h-px w-[clamp(1.75rem,4vw,3.5rem)] bg-ivory/60" aria-hidden="true" />
        </p>
        <p className="mt-[clamp(0.75rem,3vh,1.75rem)] text-left text-[clamp(0.7rem,0.85vw,0.86rem)] leading-[1.85] tracking-[0.02em] text-ivory/90 sm:text-justify sm:[text-align-last:left] compact-h:leading-[1.65] short:mt-2 short:text-[0.66rem]">{project.welcome}</p>
      </div>
    </div>
    <p className="absolute bottom-3 left-(--gutter) text-[0.5rem] uppercase tracking-[0.2em] text-ivory/50">All representational image</p>
  </Chapter>
}
