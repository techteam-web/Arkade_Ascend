import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { drawIn } from './reveal.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'
import AscendLockup from '../components/AscendLockup.jsx'

// The presentation only runs in full screen. The whole gate is one button, so
// a tap or click anywhere (or Enter / Space) requests it. Leaving full screen
// brings the gate back over the paused presentation, with the route kept.
// Chromium's Keyboard Lock turns Esc into press-and-hold to leave full screen.
//
// The first time, the gate is also the loader (DESIGN.md, "Intro"): a gold
// shaft climbs the left of the screen with the real loading of the fonts and
// Home's first pictures, its counter riding up beside it from 00 to 100, while
// the Arkade Ascend lockup draws itself in. It never holds the visitor longer
// than LOADER_CAP; a tap before then simply enters. The tap lifts the gate
// away the way the lift curtain leaves, and Home rises behind it.
const holdToLeave = typeof navigator !== 'undefined' && !!navigator.keyboard?.lock
const LOADER_CAP = 2600
const FIRST_PICTURES = [
  '/gallery/exterior/cam02-twilight-1600.webp',
  '/logo/arkade-white.png',
]
const dome = () => `${Math.round(Math.min(170, Math.max(56, window.innerHeight * 0.15)))}px`

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = img.onerror = () => resolve()
    img.src = src
  })
}

export default function FullscreenGate({ open, resumed, keyboardLocked, supported, onEnter }) {
  const root = useRef(null)
  const panel = useRef(null)
  const button = useRef(null)
  const shaft = useRef(null)
  const counter = useRef(null)
  const lockup = useRef(null)
  // Loading is shown once, on the first opening; a paused gate is ready at once.
  const [ready, setReady] = useState(resumed)
  // What the gate says is fixed when it opens, so it never reads "paused"
  // while it lifts away after the first tap.
  const [paused, setPaused] = useState(resumed)
  useEffect(() => { if (open) setPaused(resumed) }, [open, resumed])
  const loaded = useRef({ value: 0, target: 0 })

  // Real progress: each file or the fonts settling moves the target; the
  // shown value eases toward it, and reaches 100 when all are in or the cap.
  useEffect(() => {
    if (resumed || ready) return
    const reduced = prefersReducedMotion()
    const tasks = [document.fonts?.ready ?? Promise.resolve(), ...FIRST_PICTURES.map(loadImage)]
    let done = 0
    let finished = false
    const state = loaded.current
    const paint = () => {
      const value = Math.round(state.value * 100)
      if (counter.current) counter.current.textContent = String(value).padStart(2, '0')
      if (shaft.current) gsap.set(shaft.current, { scaleY: state.value })
      // The counter rides the shaft's tip, stopping short of the top edge.
      if (counter.current) gsap.set(counter.current.parentElement, { bottom: `calc(${state.value * 100}% - ${state.value * 4.5}rem)` })
    }
    const finish = () => {
      if (finished) return
      finished = true
      gsap.to(state, { value: 1, duration: reduced ? 0 : 0.5, ease: 'power2.out', overwrite: true, onUpdate: paint, onComplete: () => setReady(true) })
    }
    tasks.forEach(task => task.then(() => {
      done += 1
      state.target = done / tasks.length
      if (done === tasks.length) finish()
      else gsap.to(state, { value: state.target * 0.92, duration: 0.6, ease: 'power2.out', overwrite: true, onUpdate: paint })
    }))
    const cap = setTimeout(finish, LOADER_CAP)
    paint()
    return () => clearTimeout(cap)
  }, [resumed, ready])

  // The lockup draws itself in while the presentation loads.
  useLayoutEffect(() => {
    if (!open || !lockup.current) return
    const context = gsap.context(() => {
      if (prefersReducedMotion()) return
      drawIn(lockup.current, gsap.timeline({ delay: 0.25 }))
    }, root)
    return () => context.revert()
  }, [open])

  useLayoutEffect(() => {
    if (!root.current) return
    const reduced = prefersReducedMotion()
    const context = gsap.context(() => {
      if (open) {
        gsap.set(root.current, { autoAlpha: 1 })
        gsap.set(panel.current, { yPercent: 0, '--dome-top': '0px', '--dome-bottom': '0px' })
        if (!reduced) {
          gsap.timeline({ defaults: { ease: 'expo.out' } })
            .from('.gate-rise', { autoAlpha: 0, y: 14, stagger: 0.08, duration: 1 }, 0.25)
        }
        button.current?.focus({ preventScroll: true })
      } else {
        if (reduced) { gsap.set(root.current, { autoAlpha: 0 }); return }
        // The gate lifts away like the lift curtain, its trailing edge domed.
        gsap.timeline({ onComplete: () => gsap.set(root.current, { autoAlpha: 0 }) })
          .to('.gate-content', { autoAlpha: 0, y: -40, duration: 0.45, ease: 'power2.in' }, 0)
          .to(panel.current, { yPercent: -100, '--dome-bottom': dome(), duration: 1, ease: 'curtain' }, 0.12)
      }
    }, root)
    return () => context.revert()
  }, [open])

  return <div ref={root} className="fixed inset-0 z-[100] overflow-hidden" aria-hidden={!open} inert={open ? undefined : ''}>
    <div ref={panel} className="lift-panel" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 46%, #2d1e22, #170e10 62%, #0c0708)' }} />
    <button ref={button} type="button" onClick={onEnter}
      className="gate-content group absolute inset-0 flex h-full w-full cursor-pointer flex-col items-center justify-center-safe overflow-y-auto px-6 py-10 text-center text-ivory outline-none"
      aria-label={paused ? 'Resume the presentation in full screen' : 'Enter the Arkade Ascend presentation in full screen'}>
      {/* The lift shaft and its counter, climbing with the loading. */}
      {!paused && <span aria-hidden="true" className={`pointer-events-none absolute bottom-0 left-(--gutter) top-0 w-px transition-opacity duration-1000 ${ready ? 'opacity-40' : ''}`}>
        <span className="absolute inset-0 bg-gold-500/15" />
        <span ref={shaft} className="absolute inset-0 origin-bottom scale-y-0 bg-linear-to-t from-gold-500 via-gold-300 to-gold-100" />
        <span className="absolute left-3 whitespace-nowrap text-left" style={{ bottom: '0%' }}>
          <span ref={counter} className={`num block text-[clamp(1.5rem,3vw,2.5rem)] leading-none text-gold-100 transition-opacity duration-700 ${ready ? 'opacity-0' : ''}`}>00</span>
          <span className={`mt-1 block text-[0.52rem] uppercase tracking-[0.3em] transition-opacity duration-700 ${ready ? 'opacity-0' : 'text-gold-300/70'}`}>Loading</span>
        </span>
      </span>}

      {paused && <span className="gate-rise eyebrow mb-8 short:mb-4">Presentation paused</span>}
      {/* The white Arkade Ascend · Malad West lockup, drawing itself in. */}
      <span ref={lockup} className="gate-rise block w-[min(36rem,78vw)] short:w-[min(24rem,58vw)]">
        <AscendLockup className="block aspect-[1029/162] h-auto w-full text-white" />
        <span className="sr-only">Arkade Ascend, Malad West</span>
      </span>
      <span className="gate-rise mt-10 block h-px w-[min(22rem,70vw)] bg-linear-to-r from-transparent via-gold-400/70 to-transparent short:mt-5" />
      <span className={`mt-10 flex items-center gap-5 transition-[opacity,translate] duration-1000 ease-silk short:mt-5 ${ready ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
        <span className="relative grid size-14 place-items-center rounded-full border border-gold-500/70 transition-colors duration-500 group-hover:bg-gold-500 group-hover:text-espresso group-focus-visible:bg-gold-500 group-focus-visible:text-espresso">
          <svg viewBox="0 0 20 20" className="size-5 fill-none stroke-current" strokeWidth="1.3" aria-hidden="true"><path d="M7 2H2v5M13 2h5v5M7 18H2v-5M13 18h5v-5" /></svg>
        </span>
        <span className="text-left">
          <span className="block font-display text-[clamp(1.1rem,2.2vw,1.6rem)] uppercase tracking-[0.06em]">
            <span className="pointer-fine:hidden">{paused ? 'Tap to resume' : 'Tap anywhere to begin'}</span>
            <span className="hidden pointer-fine:inline">{paused ? 'Click to resume' : 'Click anywhere to begin'}</span>
          </span>
          <span className="mt-1 block text-[0.64rem] uppercase tracking-[0.28em] text-gold-300/80">
            {supported ? 'Opens in full screen' : 'Best viewed in landscape'}
          </span>
        </span>
      </span>
      <span className={`mt-12 max-w-md text-[0.68rem] leading-relaxed tracking-[0.08em] text-ivory/60 [text-wrap:balance] transition-opacity delay-200 duration-1000 short:mt-5 ${ready ? 'opacity-100' : 'opacity-0'}`}>
        {supported
          ? keyboardLocked || holdToLeave ? 'This presentation is viewed in full screen only. Press and hold Esc to leave.' : 'This presentation is viewed in full screen only. Leaving full screen pauses it.'
          : 'Full screen is not available in this browser, so the presentation opens in the window.'}
      </span>
    </button>
  </div>
}
