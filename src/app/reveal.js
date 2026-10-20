import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

gsap.registerPlugin(SplitText, CustomEase, DrawSVGPlugin)
CustomEase.create('silk', '0.22, 1, 0.36, 1')
CustomEase.create('curtain', '0.76, 0, 0.24, 1')

CustomEase.create('rise', '0.16, 1, 0.3, 1')

// Pages mark elements with data-reveal; the stage choreographs them in DOM
// order when a route arrives, and releases them when it leaves. The motion
// verb is "rise" (DESIGN.md): lines and letters rise out of their masks,
// pictures unveil from the bottom up, everything else lifts into place.
//   up (default) | fade | lines | chars | title | line | line-v | mask | scale | draw
// data-delay adds seconds to an element's slot.
const STEP = 0.06

export function revealIn(root) {
  const items = [...root.querySelectorAll('[data-reveal]')]
  const timeline = gsap.timeline({ defaults: { ease: 'silk' } })
  if (prefersReducedMotion()) {
    gsap.set(items, { autoAlpha: 1 })
    return timeline
  }
  items.forEach((item, index) => {
    const kind = item.dataset.reveal || 'up'
    const at = Math.min(index * STEP, 0.8) + Number(item.dataset.delay || 0)
    gsap.set(item, { autoAlpha: 1 })
    if (kind === 'chars') {
      // Each letter rises out of its line's mask, a breath after the last,
      // turning upright as it comes, like a lift display rolling over.
      // Each letter flips up out of its line in 3D, a breath after the last.
      const split = SplitText.create(item, { type: 'chars,lines', mask: 'lines', linesClass: 'split-line split-3d', charsClass: 'split-char' })
      timeline.from(split.chars, { yPercent: 70, rotationX: -95, z: -40, autoAlpha: 0, duration: 1.25, stagger: { each: 0.035, from: 'start' }, ease: 'expo.out' }, at)
    } else if (kind === 'lines') {
      const split = SplitText.create(item, { type: 'lines', mask: 'lines', linesClass: 'split-line' })
      timeline.from(split.lines, { yPercent: 105, duration: 1.05, stagger: 0.085, ease: 'rise' }, at)
    } else if (kind === 'title') {
      // Gradient-clipped lettering cannot be split, so it fades up whole.
      timeline.from(item, { autoAlpha: 0, yPercent: 6, duration: 1.4 }, at)
    } else if (kind === 'line') {
      timeline.from(item, { scaleX: 0, transformOrigin: '0% 50%', duration: 1.1 }, at)
    } else if (kind === 'line-v') {
      timeline.from(item, { scaleY: 0, transformOrigin: '50% 0%', duration: 1.1 }, at)
    } else if (kind === 'mask') {
      // Pictures unveil from the bottom up while the picture inside settles.
      timeline.fromTo(item, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.25, ease: 'curtain', clearProps: 'clipPath' }, at)
        .from(item.querySelector('img, [data-mask-inner]') || item, { scale: 1.16, yPercent: 4, duration: 1.8, ease: 'rise' }, at)
    } else if (kind === 'scale') {
      timeline.from(item, { autoAlpha: 0, scale: 0.98, duration: 1 }, at)
    } else if (kind === 'climb') {
      // A marker climbing a scale: --climb runs 0 to 1 and the counter inside
      // ([data-climb-count]) rolls up to data-climb-to, floor by floor.
      const counter = item.querySelector('[data-climb-count]')
      const top = Number(item.dataset.climbTo || 1)
      const state = { value: 0 }
      const paint = () => {
        item.style.setProperty('--climb', state.value)
        if (counter) counter.textContent = String(Math.round(state.value * top)).padStart(2, '0')
      }
      paint()
      timeline.to(state, { value: 1, duration: 2.6, ease: 'power2.inOut', onUpdate: paint }, at)
    } else if (kind === 'draw') {
      drawIn(item, timeline, at)
    } else if (kind === 'fade') {
      timeline.from(item, { autoAlpha: 0, duration: 1, ease: 'power2.out' }, at)
    } else {
      timeline.from(item, { autoAlpha: 0, y: 22, duration: 1, ease: 'rise' }, at)
    }
  })
  countUp(root, timeline, 0.3)
  return timeline
}

// Figures marked data-count run up from zero; data-decimals keeps precision.
export function countUp(root, timeline = gsap.timeline(), at = 0) {
  root.querySelectorAll('[data-count]').forEach(element => {
    const end = Number(element.dataset.count)
    const decimals = Number(element.dataset.decimals || 0)
    const format = value => value.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    element.textContent = format(end)
    if (prefersReducedMotion()) return
    // Gotham's figures are proportional: hold the final width while counting
    // so the unit beside the number never shifts.
    const size = parseFloat(getComputedStyle(element).fontSize) || 16
    Object.assign(element.style, { display: 'inline-block', minWidth: `${element.getBoundingClientRect().width / size}em` })
    const counter = { value: 0 }
    timeline.to(counter, {
      value: end, duration: 1.4, ease: 'power3.out',
      onUpdate: () => { element.textContent = format(counter.value) },
    }, at)
  })
  return timeline
}

// The whole page (plans, maps, carousels and anything unmarked) leaves
// together, so nothing lingers into the next page. It drifts the way the lift
// travels (up for a later section, down for an earlier one) as the curtain
// passes over it.
export function revealOut(root, direction = 1) {
  const items = [...root.querySelectorAll('[data-reveal]')].filter(item => item.getBoundingClientRect().width)
  const timeline = gsap.timeline()
  if (prefersReducedMotion()) return timeline
  if (items.length) timeline.to(items, { autoAlpha: 0, y: -26 * direction, duration: 0.5, stagger: 0.012, ease: 'power3.in' }, 0)
  return timeline.to(root, { y: -48 * direction, duration: 0.8, ease: 'curtain' }, 0)
    .to(root, { autoAlpha: 0, duration: 0.3, ease: 'power1.in' }, 0.45)
}

// Line art (AscendLockup, NeuGenMark): each outline draws in, then its fill
// rises and the outline lets go, ending exactly on the artwork. Lines (the
// rules) keep their own stroke opacity once drawn.
export function drawIn(item, timeline, at = 0) {
  const shapes = item.querySelectorAll('[data-draw]')
  const filled = item.querySelectorAll('[data-draw="fill"]')
  return timeline.fromTo(shapes, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.2, stagger: 0.03, ease: 'power2.inOut' }, at)
    .fromTo(filled, { fillOpacity: 0, strokeOpacity: 1 }, { fillOpacity: 1, duration: 0.7, stagger: 0.03, ease: 'power1.out' }, at + 0.8)
    .to(filled, { strokeOpacity: 0, duration: 0.5, stagger: 0.03, ease: 'power1.out' }, at + 1.3)
}

// Line art shown finished, not half drawn (a page restored mid-exit, a
// chapter shown with reduced motion).
export function settleReveal(root) {
  gsap.set(root.querySelectorAll('[data-draw]'), { drawSVG: '100%' })
  gsap.set(root.querySelectorAll('[data-draw="fill"]'), { fillOpacity: 1, strokeOpacity: 0 })
}

// Hide marked elements before first paint so nothing flashes pre-animation.
export function primeReveal(root) {
  if (prefersReducedMotion()) return
  gsap.set(root.querySelectorAll('[data-reveal]'), { autoAlpha: 0 })
}

export { gsap }
