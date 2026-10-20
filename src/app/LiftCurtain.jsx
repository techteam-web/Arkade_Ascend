import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { gsap } from './reveal.js'
import { pad, sections } from './routes.js'

// The Lift (DESIGN.md): the page transition. Two layers sweep past the
// screen, the plum lining a breath before the gold satin, each with a domed
// leading edge that flattens as it covers. While the screen is covered the
// section number rolls over like a lift display, then the layers carry on the
// same way, their trailing edges domed, and the new page rises behind them.
// Going back to an earlier section, the whole ride runs downward.
//
// cover() resolves once the screen is covered (the route swaps then);
// reveal() lets the new page through. Both return timelines that the stage
// kills when a newer navigation overtakes them.
// The dome's height in pixels (GSAP tweens numbers, not clamp()).
const dome = () => `${Math.round(Math.min(176, Math.max(56, window.innerHeight * 0.16)))}px`

// What the lift display says for a route: its section number and name.
const stop = route => {
  const index = sections.findIndex(item => item.id === route?.id)
  return index < 0 ? { number: '00', name: 'Arkade Ascend' } : { number: pad(index + 1), name: route.label }
}

const LiftCurtain = forwardRef(function LiftCurtain(_, ref) {
  const root = useRef(null)
  const lining = useRef(null)
  const satin = useRef(null)
  const label = useRef(null)
  const from = useRef(null)
  const to = useRef(null)
  const name = useRef(null)
  const sheen = useRef(null)

  useLayoutEffect(() => {
    gsap.set(root.current, { autoAlpha: 0 })
    gsap.set([lining.current, satin.current], { yPercent: 100 })
  }, [])

  useImperativeHandle(ref, () => ({
    // Rise (direction 1) or descend (-1) over the screen; the display rolls
    // from the old stop to the new one while it is covered.
    cover({ fromRoute, toRoute, direction = 1 }) {
      const start = stop(fromRoute), end = stop(toRoute)
      from.current.textContent = start.number
      to.current.textContent = end.number
      name.current.textContent = end.name
      const lead = direction > 0 ? '--dome-top' : '--dome-bottom'
      const panels = [lining.current, satin.current]
      gsap.killTweensOf([...panels, from.current, to.current, name.current, label.current, sheen.current])
      gsap.set(root.current, { autoAlpha: 1 })
      gsap.set(panels, { yPercent: 100 * direction, '--dome-top': '0px', '--dome-bottom': '0px', [lead]: dome() })
      gsap.set(from.current, { yPercent: 0 })
      gsap.set(to.current, { yPercent: 100 * direction })
      gsap.set(name.current, { autoAlpha: 0, y: 18 * direction })
      gsap.set(label.current, { y: 90 * direction })
      gsap.set(sheen.current, { xPercent: -120 })
      return gsap.timeline({ defaults: { ease: 'curtain' } })
        .to(lining.current, { yPercent: 0, [lead]: '0px', duration: 0.78 }, 0)
        .to(satin.current, { yPercent: 0, [lead]: '0px', duration: 0.78 }, 0.09)
        .to(label.current, { y: 0, duration: 0.95, ease: 'rise' }, 0.12)
        .to(sheen.current, { xPercent: 120, duration: 1.4, ease: 'power2.inOut' }, 0.15)
        // the lift display rolls over to the new stop
        .to(from.current, { yPercent: -100 * direction, duration: 0.5, ease: 'expo.inOut' }, 0.62)
        .to(to.current, { yPercent: 0, duration: 0.5, ease: 'expo.inOut' }, 0.62)
        .to(name.current, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'rise' }, 0.72)
    },
    // Carry on the same way, letting the new page through.
    reveal({ direction = 1 }) {
      const trail = direction > 0 ? '--dome-bottom' : '--dome-top'
      return gsap.timeline({ defaults: { ease: 'curtain' }, onComplete: () => gsap.set(root.current, { autoAlpha: 0 }) })
        .to(label.current, { y: -110 * direction, duration: 0.8 }, 0)
        .to(satin.current, { yPercent: -100 * direction, [trail]: dome(), duration: 0.82 }, 0)
        .to(lining.current, { yPercent: -100 * direction, [trail]: dome(), duration: 0.82 }, 0.1)
    },
    // A newer destination while the lift is already travelling: the display
    // shows it, and the stage swaps to it once the screen is covered.
    retarget(toRoute) {
      const end = stop(toRoute)
      to.current.textContent = end.number
      name.current.textContent = end.name
    },
    // Straight off the screen, as when a navigation is cancelled.
    clear() {
      gsap.killTweensOf([lining.current, satin.current, from.current, to.current, name.current, label.current, sheen.current])
      gsap.set(root.current, { autoAlpha: 0 })
      gsap.set([lining.current, satin.current], { yPercent: 100 })
    },
  }), [])

  return <div ref={root} aria-hidden="true" className="lift pointer-events-none absolute inset-0 z-[25] overflow-hidden">
    <div ref={lining} className="lift-panel lift-lining" />
    <div ref={satin} className="lift-panel lift-satin">
      <div ref={sheen} className="lift-sheen" />
      <div ref={label} className="lift-label">
        <p className="lift-display num"><span ref={from} className="lift-digit">00</span><span ref={to} className="lift-digit lift-digit-next">01</span></p>
        <p ref={name} className="lift-name">Arkade Ascend</p>
      </div>
    </div>
  </div>
})

export default LiftCurtain
