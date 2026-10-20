import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { gsap } from './reveal.js'
import { pad, sections } from './routes.js'
import { createLiquid } from './liquid.js'

// The Lift (DESIGN.md): the page transition, drawn in WebGL (liquid.js). Molten
// satin floods up the screen, a plum lining a breath ahead of the gold, each
// front rippling and domed, with a bright meniscus and highlights that flow;
// while the screen is covered the section number rolls over like a lift
// display, then the liquid drains away the same way and the new page rises
// behind it. Going back to an earlier section, the whole ride runs downward.
// It sits above the menu, so a choice in the menu rides the lift too.
// Without WebGL 2 the same ride runs as two CSS panels with domed edges.
//
// cover() resolves once the screen is covered (the route swaps then);
// reveal() lets the new page through. Both return timelines that the stage
// kills when a newer navigation overtakes them.
const stop = route => {
  const index = sections.findIndex(item => item.id === route?.id)
  return index < 0 ? { number: 'G', name: 'Arkade Ascend' } : { number: pad(index + 1), name: route.label }
}
// The CSS fallback's dome, in pixels (GSAP tweens numbers, not clamp()).
const dome = () => `${Math.round(Math.min(176, Math.max(56, window.innerHeight * 0.16)))}px`
const START = -0.32, END = 1.3   // just past either edge, beyond the fronts' ripple

const LiftCurtain = forwardRef(function LiftCurtain(_, ref) {
  const root = useRef(null)
  const canvas = useRef(null)
  const lining = useRef(null)
  const satin = useRef(null)
  const label = useRef(null)
  const from = useRef(null)
  const to = useRef(null)
  const name = useRef(null)
  const liquid = useRef(null)
  // what the liquid draws: each layer's tail and head along the travel
  const state = useRef({ lining: [START, START], satin: [START, START], direction: 1, wobble: 0 })
  const drawing = useRef(false)
  const draw = useRef(() => liquid.current?.set(state.current)).current

  useEffect(() => {
    liquid.current = createLiquid(canvas.current)
    if (liquid.current.ok) root.current.dataset.liquid = 'true'
    return () => { gsap.ticker.remove(draw); drawing.current = false; liquid.current?.dispose(); liquid.current = null }
  }, [])
  useLayoutEffect(() => {
    gsap.set(root.current, { autoAlpha: 0 })
    gsap.set([lining.current, satin.current], { yPercent: 100 })
  }, [])

  const startDrawing = () => { if (!drawing.current) { drawing.current = true; gsap.ticker.add(draw) } }
  const stopDrawing = () => { drawing.current = false; gsap.ticker.remove(draw) }
  const usesLiquid = () => liquid.current?.ok

  useImperativeHandle(ref, () => ({
    // Rise (direction 1) or descend (-1) over the screen; the display rolls
    // from the old stop to the new one while it is covered.
    cover({ fromRoute, toRoute, direction = 1 }) {
      const start = stop(fromRoute), end = stop(toRoute)
      from.current.textContent = start.number
      to.current.textContent = end.number
      name.current.textContent = end.name
      const s = state.current
      gsap.killTweensOf([s, s.lining, s.satin, lining.current, satin.current, from.current, to.current, name.current, label.current])
      gsap.set(root.current, { autoAlpha: 1 })
      gsap.set(from.current, { yPercent: 0 })
      gsap.set(to.current, { yPercent: 100 * direction })
      gsap.set(name.current, { autoAlpha: 0, y: 18 * direction })
      gsap.set(label.current, { y: 90 * direction, autoAlpha: 0 })
      const timeline = gsap.timeline({ defaults: { ease: 'curtain' } })
      if (usesLiquid()) {
        s.lining = [START, START]
        s.satin = [START, START]
        s.direction = direction
        s.wobble = 0
        startDrawing()
        timeline
          .to(s, { wobble: 1, duration: 0.35, ease: 'power2.out' }, 0)
          .to(s.lining, { 1: END, duration: 0.85 }, 0)
          .to(s.satin, { 1: END, duration: 0.85 }, 0.1)
          .to(s, { wobble: 0.18, duration: 0.6, ease: 'power2.inOut' }, 0.55)
      } else {
        const lead = direction > 0 ? '--dome-top' : '--dome-bottom'
        const panels = [lining.current, satin.current]
        gsap.set(panels, { yPercent: 100 * direction, '--dome-top': '0px', '--dome-bottom': '0px', [lead]: dome() })
        timeline
          .to(lining.current, { yPercent: 0, [lead]: '0px', duration: 0.78 }, 0)
          .to(satin.current, { yPercent: 0, [lead]: '0px', duration: 0.78 }, 0.09)
      }
      return timeline
        .to(label.current, { y: 0, autoAlpha: 1, duration: 0.95, ease: 'rise' }, 0.16)
        // the lift display rolls over to the new stop
        .to(from.current, { yPercent: -100 * direction, duration: 0.5, ease: 'expo.inOut' }, 0.62)
        .to(to.current, { yPercent: 0, duration: 0.5, ease: 'expo.inOut' }, 0.62)
        .to(name.current, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'rise' }, 0.72)
    },
    // A newer destination while the lift is already travelling: the display
    // shows it, and the stage swaps to it once the screen is covered.
    retarget(toRoute) {
      const end = stop(toRoute)
      to.current.textContent = end.number
      name.current.textContent = end.name
    },
    // Carry on the same way, letting the new page through.
    reveal({ direction = 1 }) {
      const s = state.current
      const done = () => {
        gsap.set(root.current, { autoAlpha: 0 })
        stopDrawing()
        s.lining = [START, START]
        s.satin = [START, START]
        liquid.current?.set(s)
      }
      const timeline = gsap.timeline({ defaults: { ease: 'curtain' }, onComplete: done })
        .to(label.current, { y: -110 * direction, autoAlpha: 0, duration: 0.7 }, 0)
      if (usesLiquid()) {
        startDrawing()
        timeline
          .to(s, { wobble: 1, duration: 0.3, ease: 'power2.out' }, 0)
          .to(s.satin, { 0: END, duration: 0.9 }, 0)
          .to(s.lining, { 0: END, duration: 0.9 }, 0.1)
      } else {
        const trail = direction > 0 ? '--dome-bottom' : '--dome-top'
        timeline
          .to(satin.current, { yPercent: -100 * direction, [trail]: dome(), duration: 0.82 }, 0)
          .to(lining.current, { yPercent: -100 * direction, [trail]: dome(), duration: 0.82 }, 0.1)
      }
      return timeline
    },
    // Straight off the screen, as when a navigation is cancelled.
    clear() {
      const s = state.current
      gsap.killTweensOf([s, s.lining, s.satin, lining.current, satin.current, from.current, to.current, name.current, label.current])
      s.lining = [START, START]
      s.satin = [START, START]
      s.wobble = 0
      stopDrawing()
      liquid.current?.set(s)
      gsap.set(root.current, { autoAlpha: 0 })
      gsap.set([lining.current, satin.current], { yPercent: 100 })
    },
  }), [])

  return <div ref={root} aria-hidden="true" className="lift pointer-events-none absolute inset-0 z-[55] overflow-hidden">
    <canvas ref={canvas} className="absolute inset-0 size-full" />
    <div ref={lining} className="lift-panel lift-lining lift-fallback" />
    <div ref={satin} className="lift-panel lift-satin lift-fallback" />
    <div ref={label} className="lift-label">
      <p className="lift-display num"><span ref={from} className="lift-digit">00</span><span ref={to} className="lift-digit lift-digit-next">01</span></p>
      <p ref={name} className="lift-name">Arkade Ascend</p>
    </div>
  </div>
})

export default LiftCurtain
