import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { drawIn, gsap, settleReveal } from '../app/reveal.js'
import { SplitText } from 'gsap/SplitText'
import { useShell } from '../app/ShellContext.js'
import { setScenePreset } from '../scenes/sceneStore.js'
import { ArrowIcon } from '../components/Brand.jsx'
import NeuGenMark from '../components/NeuGenMark.jsx'
import { pad } from '../app/routes.js'
import { neuGen } from '../content/project.js'
import useStepper from '../hooks/useStepper.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

// The Neu Gen story as five chapters, from the customer presentation (pages
// 6 to 9) and the brochure's gilded spread. Each chapter re-themes the shared
// 3D scene: gold silk behind the framed opening, the gilded silk, the plum of
// the new generation homebuyers and of the life they want, then the balcony
// photograph where the Neu Gen life brings it all together.
const chapters = [
  { id: 'arrival', label: 'Has arrived', scene: 'arrival' },
  { id: 'masterpiece', label: 'A masterpiece', scene: 'gilded' },
  { id: 'homebuyers', label: 'Want it all', scene: 'homebuyers' },
  { id: 'desired', label: 'Want more', scene: 'homebuyers' },
  { id: 'together', label: 'All together', scene: 'heart' },
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
    <Arrival active={chapter === 0} />
    <Masterpiece active={chapter === 1} />
    <Homebuyers active={chapter === 2} />
    <Desired active={chapter === 3} />
    <Together active={chapter === 4} />

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

// Presentation page 6: the gold silk runs behind a framed plum panel, and
// MALAD'S / NEU GEN / LIFE / HAS ARRIVED draws in at its centre. The panel is
// a little translucent, so the ribbons read through its lower edge.
function Arrival({ active }) {
  return <Chapter active={active} label="Malad's Neu Gen life has arrived">
    <div data-ch="glyph" aria-hidden="true" className="pointer-events-none absolute inset-x-[clamp(0.75rem,2.6vw,2.75rem)] top-[calc(var(--header-h)+0.25rem)] bottom-[clamp(4.5rem,11vh,6.75rem)] short:bottom-16">
      <div className="absolute inset-0 rounded-[2px] bg-[linear-gradient(180deg,rgba(52,31,30,.96),rgba(62,38,40,.93)_55%,rgba(64,40,42,.72))] shadow-[0_30px_80px_-40px_rgba(40,22,14,.8)]" />
      <div className="absolute inset-0 rounded-[2px] border border-gold-300/55" />
      <div className="absolute -inset-[clamp(0.3rem,0.6vw,0.55rem)] rounded-[3px] border border-gold-100/30" />
    </div>
    <div className="page page-scroll flex flex-col items-center justify-center-safe pb-[clamp(5.5rem,13vh,8rem)] text-center short:pb-20">
      <p data-ch className="font-display text-[clamp(1rem,min(2vw,3.6vh),1.9rem)] uppercase tracking-[0.34em] pl-[0.34em] text-gold-300">Malad&rsquo;s</p>
      {/* The brochure's monogram draws itself in (NeuGenMark). */}
      <h1 tabIndex={-1} className="mt-[clamp(0.6rem,2.2vh,1.4rem)] text-gold-300 outline-none" aria-label="Malad's Neu Gen life has arrived">
        <NeuGenMark withLife data-ch="draw" className="block h-auto w-[clamp(9.5rem,min(44vw,40vh),26rem)]" />
      </h1>
      <p data-ch className="mt-[clamp(0.9rem,3vh,1.75rem)] font-display text-[clamp(0.85rem,min(1.4vw,2.6vh),1.25rem)] uppercase tracking-[0.42em] pl-[0.42em] text-gold-300/95 short:mt-2">Has arrived</p>
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

// The NEU GEN glyphs, faint, behind the left half of the plum chapters.
function Watermark() {
  return <div aria-hidden="true" className="pointer-events-none absolute left-[-3vw] top-1/2 -translate-y-1/2 select-none max-md:left-1/2 max-md:-translate-x-1/2 max-md:opacity-50">
    <NeuGenMark data-ch="glyph" className="block h-[clamp(18rem,min(58vw,80vh),64rem)] w-auto text-[#5a4046]/45" />
  </div>
}

// Presentation page 7: the headline over the glyphs; across from it, the
// thought in gold and the way of living it describes, set off by a rule.
function Homebuyers({ active }) {
  const { title, lead, body } = neuGen.homebuyers
  return <Chapter active={active} label="The new generation homebuyers want it all">
    <Watermark />
    <div className="page page-scroll grid [align-content:safe_center] items-center gap-10 pb-[clamp(5rem,12vh,7.5rem)] md:grid-cols-2 md:gap-[6vw] sm:pr-[calc(var(--gutter)+4rem)] short:pb-16">
      <h2 data-ch="lines" className="display text-center text-[clamp(1.8rem,min(3.4vw,6.6vh),3.8rem)] leading-[1.16] text-gold-300 drop-shadow-[0_2px_18px_rgba(33,22,26,.55)]">
        {title[0]}<br />{title[1]}<br />{title[2]}<br /><span className="text-ivory">{title[3]}</span>
      </h2>
      <div className="relative mx-auto max-w-md md:mx-0 md:pl-[clamp(1.5rem,3vw,3rem)]">
        <span data-ch="rule" aria-hidden="true" className="absolute left-0 top-1 hidden h-[calc(100%-0.5rem)] w-px origin-top bg-linear-to-b from-gold-400/80 via-gold-500/40 to-transparent md:block" />
        <span data-ch="rule" aria-hidden="true" className="mb-6 block h-px w-14 origin-left bg-gold-500/70 md:hidden" />
        <p data-ch className="text-[clamp(1rem,min(1.45vw,2.8vh),1.4rem)] font-medium leading-[1.5] tracking-[0.01em] text-gold-300">{lead[0]}<br />{lead[1]}</p>
        <p data-ch className="mt-[clamp(1rem,3vh,1.75rem)] text-[clamp(0.9rem,1.05vw,1.1rem)] leading-[1.9] text-ivory/90">{body}</p>
      </div>
    </div>
  </Chapter>
}

// Presentation page 8: what the New-Gen life asks for, as six qualities in
// two columns, each with its index and a gold rule drawn in above it.
function Desired({ active }) {
  const { title, qualities } = neuGen.desired
  return <Chapter active={active} label="The New-Gen life, desired by those who want more">
    <Watermark />
    <div className="page page-scroll grid [align-content:safe_center] items-center gap-x-[6vw] gap-y-10 pb-[clamp(5rem,12vh,7.5rem)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:pr-[calc(var(--gutter)+4rem)] short:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] short:gap-y-4 short:pb-16">
      <h2 data-ch="lines" className="display text-center text-[clamp(1.7rem,min(3.1vw,6vh),3.4rem)] leading-[1.16] text-gold-300 drop-shadow-[0_2px_18px_rgba(33,22,26,.55)] short:text-[clamp(1.2rem,4.4vh,1.8rem)]">
        <span className="text-ivory">{title[0]}</span><br />{title[1]}<br />{title[2]}
      </h2>
      <ol className="grid gap-x-[clamp(1.5rem,3vw,3.5rem)] gap-y-[clamp(1rem,3.4vh,2.25rem)] sm:grid-cols-2 short:gap-y-2.5">
        {qualities.map((quality, i) => <li key={quality.name} className="relative pt-[clamp(0.7rem,1.8vh,1.1rem)] short:pt-1.5">
          <span data-ch="rule" aria-hidden="true" className="absolute inset-x-0 top-0 h-px origin-left bg-linear-to-r from-gold-400/70 via-gold-500/30 to-transparent" />
          <p data-ch className="flex items-baseline gap-3">
            <span className="num text-[0.66rem] text-gold-500/90">{pad(i + 1)}</span>
            <span className="text-[clamp(0.72rem,0.85vw,0.86rem)] font-medium uppercase tracking-[0.24em] text-gold-300">{quality.name}</span>
          </p>
          <p data-ch className="mt-2 text-[clamp(0.82rem,min(0.98vw,2vh),1rem)] leading-[1.7] text-ivory/88 short:mt-0.5 short:text-[0.72rem] short:leading-snug">{quality.line}</p>
        </li>)}
      </ol>
    </div>
  </Chapter>
}

// Presentation page 9: the balcony at dusk, and across the sky beside her
// THE / NEU GEN / LIFE / BRINGS IT ALL TOGETHER. Landscape screens set the
// words over the open sky at the right; portrait phones and tablets give
// the photograph the top of the screen and the words the dark ground below.
function Together({ active }) {
  const { line, close, image } = neuGen.together
  return <Chapter active={active} label="The Neu Gen life brings it all together">
    <div data-ch="image" className="absolute inset-0 bg-espresso">
      <div className="absolute inset-0 max-lg:portrait:bottom-[40%]">
        <img src={image.src} srcSet={image.srcSet} sizes="100vw" alt={image.alt} className="size-full object-cover object-[38%_55%] max-lg:portrait:object-[44%_60%]" />
        <div className="absolute inset-x-0 bottom-0 hidden h-2/5 bg-linear-to-t from-espresso to-transparent max-lg:portrait:block" />
      </div>
      <div className="absolute inset-y-0 right-0 w-3/5 bg-linear-to-l from-ink/55 via-ink/20 to-transparent max-lg:portrait:hidden" />
      <div className="absolute inset-0 bg-linear-to-t from-espresso/70 via-transparent to-espresso/20" />
    </div>
    <div className="page flex items-center justify-end pb-[clamp(4.75rem,11vh,7rem)] pr-[calc(var(--gutter)+1.5rem)] xl:pr-[calc(var(--gutter)+10rem)]
      max-lg:portrait:items-end max-lg:portrait:justify-center max-lg:portrait:pr-(--gutter) short:pb-[4.25rem]">
      <div className="w-[min(30rem,100%)] text-center text-ivory drop-shadow-[0_2px_16px_rgba(20,10,8,.45)] lg:max-xl:w-[min(25rem,100%)] short:w-[min(26rem,52vw)]">
        <NeuGenMark withThe withLife data-ch="draw" title="The Neu Gen life" className="mx-auto block h-auto w-[clamp(8rem,min(17vw,30vh),15rem)] short:w-28" />
        <p data-ch className="mt-[clamp(0.8rem,2.6vh,1.6rem)] font-display text-[clamp(1rem,min(1.75vw,3.4vh),1.7rem)] uppercase tracking-[0.18em] pl-[0.18em] short:mt-1.5">{line}</p>
        <span data-ch="rule" aria-hidden="true" className="mx-auto mt-[clamp(0.8rem,2.4vh,1.4rem)] block h-px w-12 bg-gold-200/70 short:hidden" />
        <p data-ch className="mt-[clamp(0.8rem,2.4vh,1.4rem)] text-[clamp(0.84rem,1vw,1.02rem)] leading-[1.75] text-ivory/92 short:mt-1.5 short:text-[0.7rem]">{close[0]}<br />{close[1]}</p>
      </div>
    </div>
    <p className="absolute bottom-3 left-(--gutter) text-[0.5rem] uppercase tracking-[0.2em] text-ivory/55">Representative image</p>
  </Chapter>
}
