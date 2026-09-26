import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { PageHeading } from '../components/PageKit.jsx'
import { ChevronIcon } from '../components/Brand.jsx'
import { viewLevels } from '../content/template.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

// Colour grades over the one skyline image for three times of day.
const TIMES = [
  { id: 'morning', label: 'Morning', filter: 'brightness(1.12) saturate(.78) hue-rotate(-14deg) contrast(.92)', wash: 'linear-gradient(180deg, rgba(255,240,215,.34), rgba(255,226,190,.08) 55%, transparent)' },
  { id: 'sunset', label: 'Sunset', filter: 'none', wash: 'linear-gradient(180deg, rgba(40,20,20,.1), transparent 60%)' },
  { id: 'night', label: 'Night', filter: 'brightness(.42) saturate(.65) hue-rotate(10deg) contrast(1.15)', wash: 'linear-gradient(180deg, rgba(14,10,32,.55), rgba(20,12,30,.25) 60%, rgba(10,6,12,.4))' },
]
const WIDTH = 1.75   // panorama width as a multiple of the viewport

export default function ViewsPage() {
  const [level, setLevel] = useState(1)
  const [time, setTime] = useState('sunset')
  const [progress, setProgress] = useState(0.5)
  const frame = useRef(null)
  const pano = useRef(null)
  const lift = useRef(null)
  const pan = useRef({ x: 0, min: 0 })
  const drag = useRef(null)
  const grade = TIMES.find(item => item.id === time)

  // City lights for the night grade: fixed positions across the lower half.
  const lights = useMemo(() => Array.from({ length: 90 }, (_, i) => ({
    left: `${(Math.sin(i * 91.7) * 0.5 + 0.5) * 100}%`,
    top: `${56 + (Math.sin(i * 13.3) * 0.5 + 0.5) * 30}%`,
    delay: `${(i * 0.37) % 4}s`,
    size: 1 + ((i * 7) % 3),
  })), [])

  const place = (x, duration = 1.2) => {
    const box = frame.current.getBoundingClientRect()
    const min = -(box.width * WIDTH - box.width)
    pan.current = { x: Math.min(0, Math.max(min, x)), min }
    setProgress(min ? pan.current.x / min : 0.5)
    gsap.to(pano.current, { x: pan.current.x, duration: prefersReducedMotion() ? 0 : duration, ease: 'expo.out', overwrite: 'auto' })
  }
  useLayoutEffect(() => {
    const box = frame.current.getBoundingClientRect()
    place(-(box.width * WIDTH - box.width) * 0.5, 0)
    const resize = () => place(pan.current.x / (pan.current.min || 1) * -(frame.current.getBoundingClientRect().width * (WIDTH - 1)), 0)
    window.addEventListener('resize', resize)
    const context = gsap.context(() => {
      if (!prefersReducedMotion()) gsap.from(frame.current, { autoAlpha: 0, duration: 1.2, ease: 'power2.out' })
    })
    return () => { window.removeEventListener('resize', resize); context.revert() }
  }, [])

  // Higher floors sit further above the skyline: less zoom, more horizon.
  useLayoutEffect(() => {
    const t = level / (viewLevels.length - 1)
    gsap.to(lift.current, { scale: 1.22 - t * 0.22, yPercent: 7 - t * 12, duration: prefersReducedMotion() ? 0 : 1.3, ease: 'power2.inOut', overwrite: true })
  }, [level])

  useEffect(() => {
    const onKey = event => {
      if (event.target.closest?.('input, button[role="tab"]')) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); place(pan.current.x + innerWidth * 0.2) }
      if (event.key === 'ArrowRight') { event.preventDefault(); place(pan.current.x - innerWidth * 0.2) }
      if (event.key === 'ArrowUp') { event.preventDefault(); setLevel(value => Math.min(viewLevels.length - 1, value + 1)) }
      if (event.key === 'ArrowDown') { event.preventDefault(); setLevel(value => Math.max(0, value - 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onPointerDown = event => {
    if (event.target.closest('button, input')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, start: pan.current.x, last: event.clientX, time: performance.now(), velocity: 0 }
  }
  const onPointerMove = event => {
    const d = drag.current
    if (!d) return
    const now = performance.now()
    d.velocity = (event.clientX - d.last) / Math.max(1, now - d.time)
    d.last = event.clientX
    d.time = now
    place(d.start + event.clientX - d.x, 0.35)
  }
  const onPointerUp = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    place(pan.current.x + d.velocity * 420, 1.6)   // glide on release
  }

  return <section className="absolute inset-0 overflow-hidden" aria-label="Views">
    <div ref={frame} data-own-gesture className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onWheel={event => place(pan.current.x - (event.deltaX || event.deltaY) * 1.2, 0.8)}>
      <div ref={lift} className="absolute inset-0 origin-[50%_70%]">
        <div ref={pano} className="absolute inset-y-0 left-0" style={{ width: `${WIDTH * 100}%` }}>
          <img src="/mumbai-dusk.png" alt="Illustrative view across a Mumbai suburban skyline towards distant hills" draggable="false"
            className="size-full select-none object-cover transition-[filter] duration-1600" style={{ filter: grade.filter }} />
          <div className="absolute inset-0 transition-opacity duration-1600" style={{ opacity: time === 'night' ? 1 : 0 }} aria-hidden="true">
            {lights.map((light, i) => <span key={i} className="absolute rounded-full bg-[#ffd9a0]/80"
              style={{ left: light.left, top: light.top, width: light.size, height: light.size, animationDelay: light.delay }} />)}
          </div>
        </div>
      </div>
      {TIMES.map(item => <div key={item.id} aria-hidden="true" className="pointer-events-none absolute inset-0 transition-opacity duration-1600" style={{ background: item.wash, opacity: time === item.id ? 1 : 0 }} />)}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,11,13,.6),transparent_26%,transparent_66%,rgba(18,11,13,.82))]" />
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-1800" style={{ opacity: (viewLevels.length - 1 - level) * 0.18, background: 'radial-gradient(ellipse at 50% 80%, rgba(236,211,168,.25), transparent 60%)' }} />
    </div>

    <div className="page pointer-events-none flex flex-col justify-between">
      <div className="flex items-start justify-between gap-6">
        <PageHeading id="views" title="Views" subtitle="The city from above" className="pointer-events-auto flex-1" />
        <div data-reveal className="pointer-events-auto hidden flex-col items-end gap-1 sm:flex" role="group" aria-label="Elevation">
          {viewLevels.map((item, i) => <button key={item.floor} type="button" aria-pressed={level === i} onClick={() => setLevel(i)}
            className="group flex min-h-11 items-center gap-4 text-ivory">
            <span className={`text-[0.6rem] uppercase tracking-[0.3em] transition-opacity duration-500 ${level === i ? 'opacity-90' : 'opacity-50 group-hover:opacity-80'}`}>{item.label}</span>
                        <span className={`num w-12 text-right text-2xl leading-none transition-colors duration-500 ${level === i ? 'text-gold-200' : 'text-ivory/40'}`}>{String(item.floor).padStart(2, '0')}</span>
          </button>)}
        </div>
      </div>

      <div className="pointer-events-auto flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div data-reveal className="max-w-sm">
          <p className="eyebrow">Level {viewLevels[level].floor} · {viewLevels[level].label}</p>
          <p className="mt-2 text-[clamp(0.95rem,1.2vw,1.2rem)] tracking-[0.02em] text-ivory/90" aria-live="polite">{viewLevels[level].caption}</p>
        </div>
        <div data-reveal className="glass-panel flex flex-wrap items-center gap-3 rounded-full p-2">
          <div role="group" aria-label="Time of day" className="flex gap-1">
            {TIMES.map(item => <button key={item.id} type="button" className="chip border-transparent!" aria-pressed={time === item.id} onClick={() => setTime(item.id)}>{item.label}</button>)}
          </div>
          <span className="hidden h-6 w-px bg-gold-500/30 sm:block" />
          <div className="flex items-center gap-2 sm:hidden" role="group" aria-label="Elevation">
            {viewLevels.map((item, i) => <button key={item.floor} type="button" className="chip border-transparent!" aria-pressed={level === i} onClick={() => setLevel(i)} aria-label={`Level ${item.floor}`}>{item.floor}</button>)}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-icon border-transparent!" onClick={() => place(pan.current.x + innerWidth * 0.25)} aria-label="Look left"><ChevronIcon direction="left" /></button>
            <span className="relative hidden h-px w-20 bg-gold-500/30 sm:block" aria-hidden="true">
              <span className="absolute -top-0.75 size-1.75 -translate-x-1/2 rounded-full bg-gold-200" style={{ left: `${progress * 100}%` }} />
            </span>
            <button type="button" className="btn-icon border-transparent!" onClick={() => place(pan.current.x - innerWidth * 0.25)} aria-label="Look right"><ChevronIcon /></button>
          </div>
        </div>
      </div>
      <p className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.5rem] uppercase tracking-[0.24em] text-ivory/45">Illustrative<span className="max-sm:hidden"> view</span> · not the actual view<span className="max-sm:hidden"> from the property</span></p>
    </div>
  </section>
}
