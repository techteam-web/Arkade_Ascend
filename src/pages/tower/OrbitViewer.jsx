import { useEffect, useRef, useState } from 'react'
import { orbit } from '../../content/project.js'
import { prefersReducedMotion } from '../../hooks/useMediaQuery.js'

const LAST = orbit.frames - 1
const FRAMES_PER_WIDTH = 150   // a drag across the whole view moves this many frames
const clamp = value => Math.min(LAST, Math.max(0, value))
const pad = i => String(i).padStart(3, '0')

// Frames arrive coarse to fine, so the whole flight can be dragged through
// almost at once and fills in as the rest load.
const loadOrder = () => {
  const order = []
  const seen = new Set()
  for (const stride of [45, 15, 5, 1]) {
    for (let i = 0; i <= LAST; i += stride) if (!seen.has(i)) { seen.add(i); order.push(i) }
  }
  return order
}

// The drone footage as a draggable orbit. Frames are drawn to a canvas on
// demand: dragging (or the wheel, the track and the arrow keys) sets a target
// frame, and the view eases towards it and glides on release, always showing
// one whole frame. Only frames near the view are
// decoded, off the main thread, so memory stays bounded. `children` (such as
// shading for text laid over the footage) sit between the footage and the
// drag hint and track.
export default function OrbitViewer({ onFirstMove, children }) {
  const box = useRef(null)
  const canvas = useRef(null)
  const state = useRef({ current: 0, target: 0, frame: 0, drawn: -1 })
  const [position, setPosition] = useState(0)
  const [loaded, setLoaded] = useState(0)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [moved, setMoved] = useState(false)
  const api = useRef({})

  useEffect(() => {
    const view = state.current
    const ctx = canvas.current.getContext('2d', { alpha: false })
    const width = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) <= 1100 ? orbit.widths[0] : orbit.widths[1]
    const blobs = new Array(orbit.frames)
    const bitmaps = new Map()         // index -> ImageBitmap, most recent last
    const decoding = new Set()
    const keep = width > 900 ? 40 : 56
    const controller = new AbortController()
    let raf = 0
    let alive = true
    let count = 0

    const size = () => {
      const rect = box.current.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.current.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.current.height = Math.max(1, Math.round(rect.height * dpr))
      view.drawn = -1
      draw()
    }

    const decode = i => {
      if (i < 0 || i > LAST || !blobs[i] || bitmaps.has(i) || decoding.has(i)) return
      decoding.add(i)
      createImageBitmap(blobs[i]).then(bitmap => {
        decoding.delete(i)
        if (!alive) { bitmap.close(); return }
        bitmaps.set(i, bitmap)
        // Keep only the frames nearest the view.
        while (bitmaps.size > keep) {
          let far = -1
          for (const j of bitmaps.keys()) if (far < 0 || Math.abs(j - view.current) > Math.abs(far - view.current)) far = j
          bitmaps.get(far).close()
          bitmaps.delete(far)
        }
        if (!ready) setReady(true)
        request()
      }).catch(() => { decoding.delete(i); if (!bitmaps.size) setFailed(true) })
    }

    // The nearest decoded frame to i, looking outwards.
    const nearest = i => {
      for (let d = 0; d <= LAST; d++) {
        if (bitmaps.has(i - d)) return i - d
        if (bitmaps.has(i + d)) return i + d
      }
      return -1
    }

    const cover = bitmap => {
      const cw = canvas.current.width, ch = canvas.current.height
      const scale = Math.max(cw / bitmap.width, ch / bitmap.height)
      const w = bitmap.width * scale, h = bitmap.height * scale
      ctx.drawImage(bitmap, (cw - w) / 2, (ch - h) / 2, w, h)
    }

    // Always one whole frame, never two blended: neighbouring frames are
    // half a second of flight apart, so a mix would show double buildings.
    const draw = () => {
      const i = Math.round(view.current)
      const shown = bitmaps.has(i) ? i : nearest(i)
      if (shown < 0 || shown === view.drawn) return
      view.drawn = shown
      cover(bitmaps.get(shown))
    }

    // Decode ahead in the direction of travel, and a little behind.
    const prefetch = () => {
      const i = Math.round(view.current)
      const ahead = view.target >= view.current ? 1 : -1
      for (let d = 0; d <= 10; d++) decode(i + ahead * d)
      for (let d = 1; d <= 3; d++) decode(i - ahead * d)
    }

    const tick = () => {
      raf = 0
      const reduced = prefersReducedMotion()
      const gap = view.target - view.current
      view.current = reduced || Math.abs(gap) < 0.002 ? view.target : view.current + gap * 0.16
      prefetch()
      draw()
      const frame = Math.round(view.current)
      if (frame !== view.frame) { view.frame = frame; setPosition(frame) }
      if (view.current !== view.target) request()
    }
    const request = () => { if (!raf && alive) raf = requestAnimationFrame(tick) }

    api.current = {
      to: (target, { instant = false } = {}) => {
        view.target = clamp(target)
        if (instant) view.current = view.target
        request()
      },
      get: () => view.target,
    }

    // Fetch every frame in coarse-to-fine order, a few at a time.
    const queue = loadOrder()
    const worker = async () => {
      while (alive && queue.length) {
        const i = queue.shift()
        try {
          const response = await fetch(`${orbit.path}/${width}/${pad(i)}.avif`, { signal: controller.signal })
          if (!response.ok) throw new Error(response.status)
          blobs[i] = await response.blob()
          count += 1
          if (count % 12 === 0 || count === orbit.frames) setLoaded(count)
          if (Math.abs(i - view.current) <= 10) decode(i)
        } catch (error) {
          if (!alive || error.name === 'AbortError') return
        }
      }
    }
    for (let n = 0; n < 6; n++) worker()

    const observer = new ResizeObserver(size)
    observer.observe(box.current)
    size()
    return () => {
      alive = false
      controller.abort()
      cancelAnimationFrame(raf)
      observer.disconnect()
      for (const bitmap of bitmaps.values()) bitmap.close()
      bitmaps.clear()
    }
  }, [])

  const firstMove = () => { if (!moved) { setMoved(true); onFirstMove?.() } }

  // Dragging: the view follows the pointer and glides on release.
  const drag = useRef(null)
  const onPointerDown = event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, start: api.current.get(), last: event.clientX, time: performance.now(), velocity: 0 }
  }
  const onPointerMove = event => {
    const d = drag.current
    if (!d) return
    const width = box.current.clientWidth || 1
    const now = performance.now()
    d.velocity = 0.8 * d.velocity + 0.2 * ((event.clientX - d.last) / Math.max(1, now - d.time))
    d.last = event.clientX
    d.time = now
    api.current.to(d.start - (event.clientX - d.x) / width * FRAMES_PER_WIDTH)
    if (Math.abs(event.clientX - d.x) > 4) firstMove()
  }
  const onPointerUp = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    if (!prefersReducedMotion()) {
      const width = box.current.clientWidth || 1
      api.current.to(api.current.get() - d.velocity * 320 / width * FRAMES_PER_WIDTH)
    }
  }

  const onWheel = event => {
    api.current.to(api.current.get() + (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * 0.12)
    firstMove()
  }

  const onKeyDown = event => {
    const steps = { ArrowRight: 3, ArrowUp: 3, ArrowLeft: -3, ArrowDown: -3, PageUp: 30, PageDown: -30 }
    if (event.key in steps) { event.preventDefault(); api.current.to(api.current.get() + steps[event.key]); firstMove() }
    if (event.key === 'Home') { event.preventDefault(); api.current.to(0); firstMove() }
    if (event.key === 'End') { event.preventDefault(); api.current.to(LAST); firstMove() }
  }

  // The track: press or drag anywhere on it to jump there.
  const seek = event => {
    const rect = event.currentTarget.getBoundingClientRect()
    api.current.to(((event.clientX - rect.left) / rect.width) * LAST)
    firstMove()
  }
  const onTrackDown = event => { event.currentTarget.setPointerCapture(event.pointerId); seek(event) }
  const onTrackMove = event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) seek(event) }

  const share = position / LAST
  const percent = Math.round((loaded / orbit.frames) * 100)

  return <div className="absolute inset-0">
    <div ref={box} data-own-gesture className="absolute inset-0 cursor-grab touch-pan-y select-none active:cursor-grabbing"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}>
      <img src={orbit.poster} alt="" draggable="false" className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`} />
      <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 size-full" />
    </div>
    {children}

    {/* The drag hint: shown until the first move. */}
    {!failed && <div aria-hidden="true" className={`pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-700 ${moved ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex items-center gap-4 rounded-full border border-ivory/25 bg-ink/45 px-5 py-3 text-ivory backdrop-blur-sm">
        <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="1.4"><path d="m15 6-6 6 6 6" /></svg>
        <span className="text-[0.66rem] font-medium uppercase tracking-[0.3em]">
          <span className="pointer-coarse:hidden">Drag to orbit</span><span className="hidden pointer-coarse:inline">Swipe to orbit</span>
        </span>
        <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="1.4"><path d="m9 6 6 6-6 6" /></svg>
      </div>
    </div>}

    {/* Position along the flight, as a slider. */}
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+clamp(1.25rem,5vh,3rem))] flex flex-col items-center gap-3 px-(--gutter)">
      <div role="slider" tabIndex={0} aria-label="Orbit position. Drag the view, or use the arrow keys." aria-valuemin={0} aria-valuemax={LAST} aria-valuenow={position}
        aria-valuetext={`${Math.round(share * 100)}% around`} onKeyDown={onKeyDown}
        onPointerDown={onTrackDown} onPointerMove={onTrackMove}
        className="pointer-events-auto relative flex h-11 w-[min(28rem,80vw)] cursor-pointer items-center rounded-full outline-offset-4">
        <span className="absolute inset-x-0 h-px bg-ivory/30" />
        <span className="absolute left-0 h-px bg-gold-200" style={{ width: `${share * 100}%` }} />
        <span className="absolute size-3 -translate-x-1/2 rounded-full border border-gold-100 bg-gold-300" style={{ left: `${share * 100}%` }} />
      </div>
      <p className="text-[0.58rem] uppercase tracking-[0.26em] text-ivory/90">
        {failed ? 'The orbit could not load' : loaded < orbit.frames ? <>Loading orbit <span className="num">{percent}</span>%</> : 'Drone footage over the site'}
      </p>
    </div>
  </div>
}
