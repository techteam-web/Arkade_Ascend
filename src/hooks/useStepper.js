import { useEffect, useRef } from 'react'
import { useShell } from '../app/ShellContext.js'

// Page-level stepping for a non-scrolling presentation: wheel / trackpad,
// touch swipes, and arrow / Page keys, with a short lock so one gesture moves
// one step. Wheel and swipe are ignored inside [data-own-gesture] (sliders,
// pannable maps) and inside scrollable regions that can still scroll.
export default function useStepper(target, { onNext, onPrev, lock = 1100, axis = 'both', keys = true }) {
  const { menuOpen } = useShell()
  const handlers = useRef({ onNext, onPrev })
  handlers.current = { onNext, onPrev }
  const lockedUntil = useRef(0)

  useEffect(() => {
    const element = target.current
    if (!element || menuOpen) return
    const step = direction => {
      const now = performance.now()
      if (now < lockedUntil.current) return
      lockedUntil.current = now + lock
      direction > 0 ? handlers.current.onNext?.() : handlers.current.onPrev?.()
    }
    const scrollable = node => {
      for (let el = node; el && el !== element; el = el.parentElement) {
        if (el.dataset?.ownGesture !== undefined) return true
        if (el.scrollHeight > el.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(el).overflowY)) return true
      }
      return false
    }
    let accumulated = 0
    let reset
    const wheel = event => {
      if (scrollable(event.target)) return
      const delta = axis === 'x' ? event.deltaX || event.deltaY : Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      accumulated += delta
      clearTimeout(reset)
      reset = setTimeout(() => { accumulated = 0 }, 180)
      if (Math.abs(accumulated) > 45) { step(Math.sign(accumulated)); accumulated = 0 }
    }
    let start = null
    const down = event => { if (event.pointerType !== 'mouse' && !scrollable(event.target)) start = { x: event.clientX, y: event.clientY } }
    const up = event => {
      if (!start) return
      const dx = event.clientX - start.x, dy = event.clientY - start.y
      start = null
      const horizontal = Math.abs(dx) > Math.abs(dy)
      if (axis === 'y' && horizontal) return
      if (axis === 'x' && !horizontal) return
      const distance = horizontal ? dx : dy
      if (Math.abs(distance) > 50) step(distance < 0 ? 1 : -1)
    }
    const cancel = () => { start = null }
    const key = event => {
      if (!keys || event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey) return
      if (event.target.closest?.('input, textarea, select, [role="slider"], [role="tablist"], [data-own-keys]')) return
      if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(event.key)) { event.preventDefault(); step(1) }
      if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); step(-1) }
    }
    element.addEventListener('wheel', wheel, { passive: true })
    element.addEventListener('pointerdown', down)
    element.addEventListener('pointerup', up)
    element.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', key)
    return () => {
      clearTimeout(reset)
      element.removeEventListener('wheel', wheel)
      element.removeEventListener('pointerdown', down)
      element.removeEventListener('pointerup', up)
      element.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', key)
    }
  }, [target, menuOpen, lock, axis, keys])
}
