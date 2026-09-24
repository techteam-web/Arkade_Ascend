import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { SplitText } from 'gsap/SplitText'
import { useShell } from '../app/ShellContext.js'
import { setScenePreset } from '../scenes/sceneStore.js'
import { ArkadeMark, ArrowIcon, BrandLockup } from '../components/Brand.jsx'
import { pad } from '../app/routes.js'
import { project } from '../content/project.js'
import useStepper from '../hooks/useStepper.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

// Brochure pages 1–4 as four chapters. Each chapter re-themes the shared
// 3D scene: satin cover, the gilded silk of page 2, page 3's plum, then the
// arrival photograph of page 4.
const chapters = [
  { id: 'life', label: 'Neu Gen life', scene: 'cover' },
  { id: 'masterpiece', label: 'A masterpiece', scene: 'gilded' },
  { id: 'homebuyers', label: 'Want it all', scene: 'homebuyers' },
  { id: 'heart', label: 'Neu Gen heart', scene: 'heart' },
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
      timeline.to(outgoing.querySelectorAll('[data-ch]'), { autoAlpha: 0, y: -22, filter: 'blur(6px)', duration: reduced ? 0 : 0.55, stagger: 0.03, ease: 'power2.in' })
        .set(outgoing, { autoAlpha: 0 })
    }
    timeline.set(incoming, { autoAlpha: 1 })
    const items = [...incoming.querySelectorAll('[data-ch]')]
    gsap.set(items, { clearProps: 'opacity,visibility,filter,transform' })
    items.forEach(item => { const split = splits.current.get(item); if (split) gsap.set(split.lines, { clearProps: 'transform' }) })
    if (reduced) return
    items.forEach((item, index) => {
      const at = (outgoing ? 0.6 : 0.1) + Math.min(index * 0.09, 0.9)
      const split = splits.current.get(item)
      if (split) timeline.from(split.lines, { yPercent: 115, duration: 1.3, stagger: 0.11 }, at)
      else if (item.dataset.ch === 'image') timeline.from(item, { scale: 1.16, autoAlpha: 0, duration: 2.4, ease: 'expo.out' }, at - 0.3)
      else if (item.dataset.ch === 'rule') timeline.from(item, { scaleX: 0, duration: 1.3, ease: 'curtain' }, at)
      else if (item.dataset.ch === 'glyph') timeline.from(item, { autoAlpha: 0, yPercent: 12, duration: 2.2, ease: 'expo.out' }, at - 0.2)
      else timeline.from(item, { autoAlpha: 0, y: 26, filter: 'blur(6px)', duration: 1.2 }, at)
    })
  }

  const last = chapter === chapters.length - 1
  return <section ref={root} className="absolute inset-0 overflow-hidden" aria-roledescription="presentation" aria-label="Neu Gen life">
    <Cover active={chapter === 0} />
    <Masterpiece active={chapter === 1} />
    <Homebuyers active={chapter === 2} />
    <Heart active={chapter === 3} />

    <nav data-reveal="fade" aria-label="Chapters" className="absolute right-(--gutter) top-1/2 z-10 hidden -translate-y-1/2 flex-col items-end gap-1 sm:flex short:hidden">
      {chapters.map((item, index) => <button key={item.id} type="button" onClick={() => change(index)} aria-current={chapter === index ? 'step' : undefined}
        className="group flex min-h-11 items-center gap-4 text-ivory">
        <span className={`text-[0.58rem] uppercase tracking-[0.3em] transition-all duration-500 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-80 group-focus-visible:translate-x-0 group-focus-visible:opacity-80`}>{item.label}</span>
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
      <h1 tabIndex={-1} className="display mt-3 text-gold-400 outline-none" aria-label="Malad's Neu Gen life has arrived">
        <span data-ch="lines" className="block text-[clamp(4.5rem,min(17vw,24vh),15rem)] leading-[0.84] tracking-[0.04em]">Neu<br />Gen</span>
      </h1>
      <p data-ch className="mt-4 flex items-center gap-5 font-display text-[clamp(1rem,2vw,1.7rem)] uppercase tracking-[0.3em] text-gold-400">
        <span data-ch="rule" className="h-px w-[clamp(2.5rem,7vw,6rem)] bg-gold-400/70" />Life<span data-ch="rule" className="h-px w-[clamp(2.5rem,7vw,6rem)] bg-gold-400/70" />
      </p>
      <p data-ch className="mt-7 font-display text-[clamp(0.85rem,1.4vw,1.2rem)] uppercase tracking-[0.5em] text-gold-400/90 short:mt-3">Has arrived</p>
      <div data-ch className="mt-[clamp(2rem,9vh,6rem)] flex flex-col items-center gap-3 text-ivory short:mt-4">
        <span className="flex items-center gap-4"><ArkadeMark className="h-9 w-auto" /><span className="h-9 w-px bg-ivory/70" /><span className="text-2xl font-bold tracking-[0.04em]">ARKADE</span></span>
        <span className="text-[0.62rem] uppercase tracking-[0.72em] pl-[0.72em]">Developers</span>
      </div>
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
      <div data-ch className="flex flex-col items-center">
        <p className="mb-4 text-[0.6rem] uppercase tracking-[0.9em] pl-[0.9em] text-ivory/85">Presenting</p>
        <BrandLockup size="lg" className="text-ivory! drop-shadow-[0_1px_16px_rgba(90,60,30,.35)]" />
      </div>
    </div>
  </Chapter>
}

// Page 3: plum ground, the NEU GEN glyphs as a watermark.
function Homebuyers({ active }) {
  return <Chapter active={active} label="The new generation homebuyers want it all">
    <div aria-hidden="true" className="pointer-events-none absolute left-[-4vw] top-1/2 -translate-y-1/2 select-none max-md:left-1/2 max-md:-translate-x-1/2 max-md:opacity-60">
      <div data-ch="glyph" className="font-display uppercase leading-[0.8] text-[#5a4046]/45 text-[clamp(12rem,min(38vw,52vh),42rem)] tracking-[-0.02em]">Neu<br />Gen</div>
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

// Page 4: the arrival photograph with the frosted NEU GEN HEART panel.
function Heart({ active }) {
  return <Chapter active={active} label="Neu Gen heart">
    <div data-ch="image" className="absolute inset-0">
      <img src="/brochure/lifestyle-arrival.webp" alt="A couple arriving at a grand, warmly lit entrance beside a chauffeured car" className="size-full object-cover object-[30%_50%]" />
      <div className="absolute inset-y-0 right-0 w-full bg-gradient-to-l from-plum-950/85 via-plum-950/45 to-transparent md:w-3/5" />
      <div className="absolute inset-0 bg-gradient-to-t from-espresso/70 via-transparent to-espresso/30" />
    </div>
    <div className="page flex items-center justify-center md:justify-end md:pr-[max(calc(var(--gutter)+4rem),11vw)]">
      <div data-ch className="glass-panel w-[min(26rem,86vw)] px-[clamp(1.5rem,3vw,3rem)] py-[clamp(1.75rem,5vh,3.5rem)] text-center">
        <p className="display text-[clamp(3rem,min(7vw,11vh),6rem)] leading-[0.84] text-gold-400">Neu<br />Gen</p>
        <p className="mt-[clamp(0.9rem,2vh,1.4rem)] font-display text-[clamp(1rem,1.6vw,1.4rem)] uppercase tracking-[0.3em] text-gold-400">Heart</p>
        <p className="mt-6 text-[clamp(0.66rem,0.8vw,0.8rem)] font-medium uppercase leading-[2] tracking-[0.14em] text-ivory">{project.heart}</p>
      </div>
    </div>
    <p className="absolute bottom-3 left-(--gutter) text-[0.5rem] uppercase tracking-[0.2em] text-ivory/50">All representational image</p>
  </Chapter>
}
