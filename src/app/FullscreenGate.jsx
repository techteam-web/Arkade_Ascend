import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'
import AscendLockup from '../components/AscendLockup.jsx'

// The presentation only runs in full screen. The whole gate is one button, so
// a tap or click anywhere (or Enter / Space) requests it. Leaving full screen
// brings the gate back over the paused presentation, with the route kept.
// Chromium's Keyboard Lock turns Esc into press-and-hold to leave full screen.
const holdToLeave = typeof navigator !== 'undefined' && !!navigator.keyboard?.lock

export default function FullscreenGate({ open, resumed, keyboardLocked, supported, onEnter }) {
  const root = useRef(null)
  const button = useRef(null)

  useLayoutEffect(() => {
    if (!root.current) return
    const reduced = prefersReducedMotion()
    const context = gsap.context(() => {
      if (open) {
        gsap.set(root.current, { autoAlpha: 1 })
        if (!reduced) {
          gsap.timeline({ defaults: { ease: 'expo.out' } })
            .from('[data-petal]', { autoAlpha: 0, stagger: 0.05, duration: 0.9 }, 0.1)
            .from('.gate-rise', { autoAlpha: 0, y: 10, stagger: 0.08, duration: 1 }, 0.25)
            .from('.gate-rule', { scaleX: 0, duration: 1.1, ease: 'expo.inOut' }, 0.3)
        }
        button.current?.focus({ preventScroll: true })
      } else {
        gsap.to(root.current, { autoAlpha: 0, duration: reduced ? 0 : 0.9, ease: 'power2.inOut', overwrite: true })
      }
    }, root)
    return () => context.revert()
  }, [open])

  return <div ref={root} className="fixed inset-0 z-[100]" aria-hidden={!open} inert={open ? undefined : ''}>
    <button ref={button} type="button" onClick={onEnter}
      className="group absolute inset-0 flex h-full w-full cursor-pointer flex-col items-center justify-center-safe overflow-y-auto px-6 py-10 text-center text-ivory outline-none"
      style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 48%, rgba(27,17,19,.25), rgba(18,11,13,.82) 62%, rgba(12,7,8,.97))' }}
      aria-label={resumed ? 'Resume the presentation in full screen' : 'Enter the Arkade Ascend presentation in full screen'}>
      <span className="gate-rise eyebrow mb-8 short:mb-4">{resumed ? 'Presentation paused' : 'Arkade Developers presents'}</span>
      {/* The white Arkade Ascend · Malad West lockup, as on Home. */}
      <span className="gate-rise block w-[min(34rem,80vw)] short:w-[min(24rem,60vw)]">
        <AscendLockup className="block aspect-[1029/162] h-auto w-full text-white" />
        <span className="sr-only">Arkade Ascend, Malad West</span>
      </span>
      <span className="gate-rule hairline mt-10 w-[min(22rem,70vw)] short:mt-5" />
      <span className="gate-rise mt-10 flex items-center gap-5 short:mt-5">
        <span className="relative grid size-14 place-items-center rounded-full border border-gold-500/70 transition-colors duration-500 group-hover:bg-gold-500 group-hover:text-espresso group-focus-visible:bg-gold-500 group-focus-visible:text-espresso">
          <svg viewBox="0 0 20 20" className="size-5 fill-none stroke-current" strokeWidth="1.3" aria-hidden="true"><path d="M7 2H2v5M13 2h5v5M7 18H2v-5M13 18h5v-5" /></svg>
        </span>
        <span className="text-left">
          <span className="block font-display text-[clamp(1.1rem,2.2vw,1.6rem)] uppercase tracking-[0.06em]">
            {resumed ? 'Tap to resume' : 'Tap anywhere to begin'}
          </span>
          <span className="mt-1 block text-[0.64rem] uppercase tracking-[0.28em] text-gold-300/80">
            {supported ? 'Opens in full screen' : 'Best viewed in landscape'}
          </span>
        </span>
      </span>
      <span className="gate-rise mt-12 max-w-md text-[0.68rem] leading-relaxed tracking-[0.08em] text-ivory/55 short:mt-5">
        {supported
          ? keyboardLocked || holdToLeave ? 'This presentation is viewed in full screen only. Press and hold Esc to leave.' : 'This presentation is viewed in full screen only. Leaving full screen pauses it.'
          : 'Full screen is not available in this browser, so the presentation opens in the window.'}
      </span>
    </button>
  </div>
}
