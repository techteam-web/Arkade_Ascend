import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

gsap.registerPlugin(SplitText, CustomEase)
CustomEase.create('silk', '0.22, 1, 0.36, 1')
CustomEase.create('curtain', '0.76, 0, 0.24, 1')

// Pages mark elements with data-reveal; the stage choreographs them in DOM
// order when a route arrives, and releases them when it leaves.
//   up (default) | fade | lines | chars | title | line | line-v | mask | scale
// data-delay adds seconds to an element's slot.
const STEP = 0.075

export function revealIn(root) {
  const items = [...root.querySelectorAll('[data-reveal]')]
  const timeline = gsap.timeline({ defaults: { ease: 'silk' } })
  if (prefersReducedMotion()) {
    gsap.set(items, { autoAlpha: 1 })
    return timeline
  }
  items.forEach((item, index) => {
    const kind = item.dataset.reveal || 'up'
    const at = Math.min(index * STEP, 1.1) + Number(item.dataset.delay || 0)
    gsap.set(item, { autoAlpha: 1 })
    if (kind === 'lines' || kind === 'chars') {
      const split = SplitText.create(item, { type: kind === 'chars' ? 'lines,chars' : 'lines', mask: 'lines', linesClass: 'split-line' })
      timeline.from(kind === 'chars' ? split.chars : split.lines, {
        yPercent: 110, rotate: kind === 'chars' ? 4 : 0, duration: 1.25,
        stagger: kind === 'chars' ? 0.028 : 0.1,
      }, at)
    } else if (kind === 'title') {
      // For gradient-clipped lettering, which cannot be split into
      // transformed characters: the word rises through a mask and settles.
      timeline.from(item, { clipPath: 'inset(0% 0% 100% 0%)', yPercent: 18, letterSpacing: '0.24em', filter: 'blur(10px)', duration: 2, ease: 'expo.out' }, at)
    } else if (kind === 'line') {
      timeline.from(item, { scaleX: 0, transformOrigin: '0% 50%', duration: 1.4, ease: 'curtain' }, at)
    } else if (kind === 'line-v') {
      timeline.from(item, { scaleY: 0, transformOrigin: '50% 0%', duration: 1.4, ease: 'curtain' }, at)
    } else if (kind === 'mask') {
      timeline.from(item, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.5, ease: 'curtain' }, at)
        .from(item.querySelector('img, [data-mask-inner]') || item, { scale: 1.18, duration: 2.2 }, at)
    } else if (kind === 'scale') {
      timeline.from(item, { autoAlpha: 0, scale: 0.94, filter: 'blur(8px)', duration: 1.4 }, at)
    } else if (kind === 'fade') {
      timeline.from(item, { autoAlpha: 0, duration: 1.4, ease: 'power2.out' }, at)
    } else {
      timeline.from(item, { autoAlpha: 0, y: 26, filter: 'blur(6px)', duration: 1.2 }, at)
    }
  })
  countUp(root, timeline, 0.35)
  return timeline
}

// Figures marked data-count run up from zero; data-decimals keeps precision.
export function countUp(root, timeline = gsap.timeline(), at = 0) {
  root.querySelectorAll('[data-count]').forEach(element => {
    const end = Number(element.dataset.count)
    const decimals = Number(element.dataset.decimals || 0)
    const format = value => value.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    if (prefersReducedMotion()) { element.textContent = format(end); return }
    const counter = { value: 0 }
    timeline.to(counter, {
      value: end, duration: 1.9, ease: 'power3.out',
      onUpdate: () => { element.textContent = format(counter.value) },
    }, at)
  })
  return timeline
}

// Marked items lift away, then the whole page (plans, maps, carousels and
// anything unmarked) fades with them, so nothing lingers into the next page.
export function revealOut(root) {
  const items = [...root.querySelectorAll('[data-reveal]')].filter(item => item.getBoundingClientRect().width)
  const timeline = gsap.timeline()
  if (prefersReducedMotion()) return timeline
  if (items.length) timeline.to(items, { autoAlpha: 0, y: -14, filter: 'blur(5px)', duration: 0.45, ease: 'power2.in', stagger: { each: 0.015, from: 'start' } }, 0)
  return timeline.to(root, { autoAlpha: 0, duration: 0.4, ease: 'power2.in' }, 0.15)
}

// Hide marked elements before first paint so nothing flashes pre-animation.
export function primeReveal(root) {
  if (prefersReducedMotion()) return
  gsap.set(root.querySelectorAll('[data-reveal]'), { autoAlpha: 0 })
}

export { gsap }
