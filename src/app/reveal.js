import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

gsap.registerPlugin(SplitText, CustomEase)
CustomEase.create('silk', '0.22, 1, 0.36, 1')
CustomEase.create('curtain', '0.76, 0, 0.24, 1')

// Pages mark elements with data-reveal; the stage choreographs them in DOM
// order when a route arrives, and releases them when it leaves. Motion is
// deliberately quiet: short rises and fades, no blur, no overshoot.
//   up (default) | fade | lines | chars | title | line | line-v | mask | scale
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
    if (kind === 'lines' || kind === 'chars') {
      const split = SplitText.create(item, { type: 'lines', mask: 'lines', linesClass: 'split-line' })
      timeline.from(split.lines, { yPercent: 100, duration: 1, stagger: 0.08 }, at)
    } else if (kind === 'title') {
      // Gradient-clipped lettering cannot be split, so it fades up whole.
      timeline.from(item, { autoAlpha: 0, yPercent: 6, duration: 1.4 }, at)
    } else if (kind === 'line') {
      timeline.from(item, { scaleX: 0, transformOrigin: '0% 50%', duration: 1.1 }, at)
    } else if (kind === 'line-v') {
      timeline.from(item, { scaleY: 0, transformOrigin: '50% 0%', duration: 1.1 }, at)
    } else if (kind === 'mask') {
      timeline.from(item, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'curtain' }, at)
        .from(item.querySelector('img, [data-mask-inner]') || item, { scale: 1.04, duration: 1.6 }, at)
    } else if (kind === 'scale') {
      timeline.from(item, { autoAlpha: 0, scale: 0.98, duration: 1 }, at)
    } else if (kind === 'fade') {
      timeline.from(item, { autoAlpha: 0, duration: 1, ease: 'power2.out' }, at)
    } else {
      timeline.from(item, { autoAlpha: 0, y: 14, duration: 0.9 }, at)
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

// The whole page (plans, maps, carousels and anything unmarked) fades out
// together, so nothing lingers into the next page.
export function revealOut(root) {
  const items = [...root.querySelectorAll('[data-reveal]')].filter(item => item.getBoundingClientRect().width)
  const timeline = gsap.timeline()
  if (prefersReducedMotion()) return timeline
  if (items.length) timeline.to(items, { autoAlpha: 0, y: -6, duration: 0.35, ease: 'power2.in' }, 0)
  return timeline.to(root, { autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, 0.05)
}

// Hide marked elements before first paint so nothing flashes pre-animation.
export function primeReveal(root) {
  if (prefersReducedMotion()) return
  gsap.set(root.querySelectorAll('[data-reveal]'), { autoAlpha: 0 })
}

export { gsap }
