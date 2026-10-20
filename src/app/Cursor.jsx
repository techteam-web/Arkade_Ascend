import { useEffect, useRef } from 'react'
import { gsap } from './reveal.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

// The pointer's follower (DESIGN.md): a gold ring trailing the native cursor,
// which always stays visible. Over anything that answers a click it widens;
// over a target marked data-cursor="Label" it fills and names the action
// ("Drag", "Open", "View"). It follows the tone of what is under it, and it
// exists only for a mouse, never on touch or under reduced motion.
// It also drives [data-magnetic] controls: within reach, they lean a few
// pixels toward the pointer (CSS `translate`, separate from GSAP transforms).
const CLICKABLE = 'a[href], button:not(:disabled), [role="button"], [role="tab"], select, summary, input[type="range"], label[for]'
const REACH = 1.6     // magnetic reach, as a multiple of the control's half-size
const PULL = 0.28     // share of the offset the control moves
const MAX_PULL = 12   // pixels

export default function Cursor() {
  const root = useRef(null)
  const ring = useRef(null)
  const dot = useRef(null)
  const label = useRef(null)

  useEffect(() => {
    const mouse = matchMedia('(hover: hover) and (pointer: fine)')
    if (!mouse.matches || prefersReducedMotion()) return
    const el = root.current
    const ringX = gsap.quickTo(ring.current, 'x', { duration: 0.5, ease: 'power3' })
    const ringY = gsap.quickTo(ring.current, 'y', { duration: 0.5, ease: 'power3' })
    const dotX = gsap.quickTo(dot.current, 'x', { duration: 0.12, ease: 'power2' })
    const dotY = gsap.quickTo(dot.current, 'y', { duration: 0.12, ease: 'power2' })
    let magnet = null
    const pulls = new Map()
    const pull = node => {
      if (!pulls.has(node)) {
        gsap.set(node, { '--mx': 0, '--my': 0 })
        pulls.set(node, { x: gsap.quickTo(node, '--mx', { duration: 0.6, ease: 'power3' }), y: gsap.quickTo(node, '--my', { duration: 0.6, ease: 'power3' }) })
      }
      return pulls.get(node)
    }
    const release = () => {
      if (!magnet) return
      const p = pull(magnet)
      p.x(0); p.y(0)
      magnet = null
    }

    const move = event => {
      if (event.pointerType !== 'mouse') return
      ringX(event.clientX); ringY(event.clientY)
      dotX(event.clientX); dotY(event.clientY)
      if (el.dataset.shown !== 'true') {
        gsap.set([ring.current, dot.current], { x: event.clientX, y: event.clientY })
        el.dataset.shown = 'true'
      }
      // The nearest magnetic control within reach leans toward the pointer.
      const target = event.target.closest?.('[data-magnetic]')
      if (target !== magnet) release()
      if (target && !target.disabled) {
        const box = target.getBoundingClientRect()
        const dx = event.clientX - (box.left + box.width / 2)
        const dy = event.clientY - (box.top + box.height / 2)
        if (Math.abs(dx) < box.width / 2 * REACH && Math.abs(dy) < box.height / 2 * REACH) {
          magnet = target
          const p = pull(target)
          p.x(gsap.utils.clamp(-MAX_PULL, MAX_PULL, dx * PULL))
          p.y(gsap.utils.clamp(-MAX_PULL, MAX_PULL, dy * PULL))
        }
      }
    }
    const over = event => {
      const node = event.target
      const named = node.closest?.('[data-cursor]')
      const clickable = node.closest?.(CLICKABLE)
      // A control inside a named area (a pin on the map, a button over the
      // orbit) answers as a control, not as the area.
      const inner = clickable && named && named !== clickable && named.contains(clickable)
      const text = inner ? null : named?.dataset.cursor
      if (text && text !== 'none') {
        label.current.textContent = text
        el.dataset.state = 'label'
      } else el.dataset.state = clickable && text !== 'none' ? 'link' : ''
      el.dataset.tone = node.closest?.('[data-tone]')?.dataset.tone ?? 'dark'
    }
    const leave = () => { el.dataset.shown = 'false'; release() }
    const down = () => { el.dataset.pressed = 'true' }
    const up = () => { el.dataset.pressed = 'false' }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    window.addEventListener('pointerdown', down, { passive: true })
    window.addEventListener('pointerup', up, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      document.documentElement.removeEventListener('pointerleave', leave)
      pulls.forEach((_, node) => gsap.set(node, { '--mx': 0, '--my': 0 }))
    }
  }, [])

  return <div ref={root} className="cursor" aria-hidden="true" data-shown="false">
    <div ref={ring} className="cursor-ring">
      <span className="cursor-circle" />
      <span ref={label} className="cursor-label" />
    </div>
    <span ref={dot} className="cursor-dot" />
  </div>
}
