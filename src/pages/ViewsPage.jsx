import { useEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { useShell } from '../app/ShellContext.js'
import { PageHeading } from '../components/PageKit.jsx'
import { ChevronIcon } from '../components/Brand.jsx'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

// 360° drone panoramas over the site, one per time of day, as tiled cube maps
// (exported by the Marzipano Tool into public/views/<id>/). The day and night
// tiles are re-projected onto the evening shot's frame (see
// public/asset-notes.md), so one direction shows the same place in all three.
const LEVELS = [
  { tileSize: 256, size: 256, fallbackOnly: true },
  { tileSize: 512, size: 512 },
  { tileSize: 512, size: 1024 },
  { tileSize: 512, size: 2048 },
  { tileSize: 512, size: 4096 },
]
const FACE_SIZE = 3600
// Drawn bottom to top in this order (see blend below).
const TIMES = [
  { id: 'day', label: 'Day', caption: 'Malad West in daylight.' },
  { id: 'evening', label: 'Evening', caption: 'The sun sets over the suburb.' },
  { id: 'night', label: 'Night', caption: 'The city lights up after dark.' },
]
const deg = Math.PI / 180
// Opens on the tall tower on the skyline, the same in every time of day; the
// still fallbacks are rendered from this view. Radians; positive pitch looks down.
const INITIAL_VIEW = { yaw: 0.105, pitch: 0.03, fov: 1.47 }
const SPIN = 2.3 * deg        // per second: one turn in about two and a half minutes
const SPIN_EASE = 0.6         // seconds for the spin to ease in or out
const RESUME_AFTER = 4000     // ms after the last drag or step
const FADE = 1                // seconds for a time-of-day crossfade
const HIDDEN = { opacity: 0, rect: { relativeWidth: 0, relativeHeight: 0 } }
const only = id => Object.fromEntries(TIMES.map(item => [item.id, item.id === id ? 1 : 0]))

function SpinIcon({ paused }) {
  return <svg viewBox="0 0 20 24" fill="none" aria-hidden="true" strokeLinejoin="round">
    <path d={paused ? 'M6.5 5.5v13l10-6.5z' : 'M7 6v12m6-12v12'} />
  </svg>
}

export default function ViewsPage() {
  const { menuOpen } = useShell()
  const [time, setTime] = useState('evening')
  const [spinning, setSpinning] = useState(() => !prefersReducedMotion())
  const [failed, setFailed] = useState(false)
  const frame = useRef(null)
  const pano = useRef(null)                  // { view, layers, loop } once loaded
  const mix = useRef(only(time))             // weight of each time of day, summing to 1
  const aim = useRef({ yaw: 0 })             // tweened by the look arrows
  const motion = useRef({ pace: 0, held: false, last: 0, resume: 0 })
  const spinOn = useRef(false)
  spinOn.current = spinning && !menuOpen
  const grade = TIMES.find(item => item.id === time)

  // Any mix of the three layers: each layer's opacity is its share of all the
  // weight at and beneath it, so the lowest visible layer is opaque and the
  // frame is exactly the weighted blend, even when a fade is interrupted.
  // Unused layers get an empty rect, so they neither draw nor load tiles.
  const blend = () => {
    const layers = pano.current?.layers
    if (!layers) return
    let beneath = 0
    TIMES.forEach(({ id }) => {
      const weight = mix.current[id] > 0.002 ? mix.current[id] : 0
      beneath += weight
      layers[id].setEffects(weight ? { opacity: weight / beneath } : HIDDEN)
    })
  }
  const wake = () => {
    motion.current.last = performance.now()
    pano.current?.loop.renderOnNextFrame()
  }
  // Dragging or stepping holds the spin; it eases back in after a pause.
  const hold = () => {
    const m = motion.current
    clearTimeout(m.resume)
    m.held = true
    m.pace = 0
  }
  const release = () => {
    const m = motion.current
    clearTimeout(m.resume)
    m.resume = setTimeout(() => { m.held = false; wake() }, RESUME_AFTER)
  }

  // The viewer loads with the page, in its own chunk.
  useEffect(() => {
    let instance
    let cancelled = false
    const m = motion.current
    const context = gsap.context(() => {})
    import('marzipano').then(({ default: Marzipano }) => {
      if (cancelled) return
      try {
        instance = new Marzipano.Viewer(frame.current, { controls: { mouseViewMode: 'drag' }, stage: { progressive: true } })
      } catch {
        setFailed(true)
        return
      }
      // Keys are handled below, so they never reach the panorama behind the menu.
      const controls = instance.controls()
      Object.keys(controls.methods()).filter(name => /Key/.test(name)).forEach(name => controls.disableMethod(name))
      // One scene, one view, three layers: every time of day always looks the
      // same way, so a crossfade stays in register mid-drag or mid-spin.
      const limiter = Marzipano.RectilinearView.limit.traditional(FACE_SIZE, 100 * deg, 120 * deg)
      const view = new Marzipano.RectilinearView(INITIAL_VIEW, limiter)
      const scene = instance.createEmptyScene({ view })
      const layers = {}
      TIMES.forEach(({ id }) => {
        layers[id] = scene.createLayer({
          source: Marzipano.ImageUrlSource.fromString(`/views/${id}/{z}/{f}/{y}/{x}.jpg`, { cubeMapPreviewUrl: `/views/${id}/preview.jpg` }),
          geometry: new Marzipano.CubeGeometry(LEVELS),
          pinFirstLevel: true,
        })
      })
      scene.switchTo({ transitionDuration: 0, transitionUpdate: () => {} })
      const loop = instance.renderLoop()
      pano.current = { view, layers, loop }
      blend()
      // Once the first view is sharp, keep a mid level of every time of day in
      // memory, so a crossfade starts from real detail rather than the preview
      // (a lighter level on phones and touch screens).
      const stage = instance.stage()
      const warm = stable => {
        if (!stable) return
        stage.removeEventListener('renderComplete', warm)
        const level = matchMedia('(max-width: 900px), (pointer: coarse)').matches ? 1 : 2
        TIMES.forEach(({ id }) => layers[id].pinLevel(level))
      }
      stage.addEventListener('renderComplete', warm)

      // The spin advances inside Marzipano's own frame, just before it draws;
      // with the spin stopped and nothing else moving, nothing is drawn.
      // Changes made mid-frame do not schedule another, so ask for it.
      loop.addEventListener('beforeRender', () => {
        const now = performance.now()
        const dt = Math.min(0.1, (now - m.last) / 1000)
        m.last = now
        const target = spinOn.current && !m.held ? SPIN : 0
        m.pace += (target - m.pace) * Math.min(1, dt / SPIN_EASE)
        if (!target && m.pace < SPIN / 200) { m.pace = 0; return }
        view.setYaw(view.yaw() + m.pace * dt)
        loop.renderOnNextFrame()
      })
      controls.addEventListener('active', () => { gsap.killTweensOf(aim.current); hold() })
      controls.addEventListener('inactive', release)
      wake()
      context.add(() => {
        if (!prefersReducedMotion()) gsap.from(frame.current, { autoAlpha: 0, duration: 1, ease: 'power2.out' })
      })
    }).catch(() => { if (!cancelled) setFailed(true) })
    return () => {
      cancelled = true
      clearTimeout(m.resume)
      gsap.killTweensOf([aim.current, mix.current])
      context.revert()
      instance?.destroy()
      pano.current = null
    }
  }, [])

  // Turning the spin back on, or closing the menu, resumes it at once.
  useEffect(() => {
    if (!spinning || menuOpen) return
    clearTimeout(motion.current.resume)
    motion.current.held = false
    wake()
  }, [spinning, menuOpen])

  // Changing the time of day crossfades in place, from whatever is on screen.
  const show = id => {
    setTime(id)
    gsap.to(mix.current, { ...only(id), duration: prefersReducedMotion() ? 0 : FADE, ease: 'sine.inOut', overwrite: true, onUpdate: blend })
  }
  const look = direction => {
    const view = pano.current?.view
    if (!view) return
    hold()
    aim.current.yaw = view.yaw()
    gsap.to(aim.current, {
      yaw: aim.current.yaw + direction * 40 * deg, duration: prefersReducedMotion() ? 0 : 0.9, ease: 'power2.inOut', overwrite: true,
      onUpdate: () => view.setYaw(aim.current.yaw), onComplete: release,
    })
  }

  useEffect(() => {
    const onKey = event => {
      if (event.target.closest?.('input, [role="dialog"]') || event.defaultPrevented) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); look(-1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); look(1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return <section className="absolute inset-0 overflow-hidden" aria-label="Views">
    {failed
      // The stills share one framing, so they crossfade in place too: the new
      // one fades in on top and the old one leaves once it is covered.
      ? <div className="absolute inset-0 isolate">
        {TIMES.map(item => <img key={item.id} src={`/views/${item.id}/still.webp`}
          alt={item.id === time ? `Aerial view over Malad West, ${item.label.toLowerCase()}` : ''} aria-hidden={item.id !== time || undefined}
          className={`absolute inset-0 size-full object-cover transition-opacity motion-reduce:transition-none ${item.id === time ? 'z-1 opacity-100 duration-1000' : 'opacity-0 delay-1000 duration-0'}`} />)}
      </div>
      : <div ref={frame} data-own-gesture role="img" aria-label={`360-degree aerial view over Malad West, ${grade.label.toLowerCase()}. Drag to look around.`}
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing" />}
    {/* Shade the corners that carry text, so it reads over bright sky. */}
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,11,13,.62),transparent_30%,transparent_62%,rgba(18,11,13,.85))]" />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_42%_at_0%_0%,rgba(18,11,13,.55),transparent)]" />

    <div className="page pointer-events-none flex flex-col justify-between">
      <div className="flex"><PageHeading id="views" title="Views" subtitle="The city from above" className="pointer-events-auto flex-1" /></div>

      <div className="pointer-events-auto flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div data-reveal className="max-w-sm">
          <p className="eyebrow">{grade.label} · <span className="num">120</span> m aerial</p>
          <p className="mt-2 text-[clamp(0.95rem,1.2vw,1.2rem)] tracking-[0.02em] text-ivory/90" aria-live="polite">{grade.caption}</p>
        </div>
        <div data-reveal className="glass-panel flex flex-wrap items-center gap-2 self-start rounded-full p-2 sm:gap-3 md:self-auto">
          <div role="group" aria-label="Time of day" className="flex gap-1">
            {TIMES.map(item => <button key={item.id} type="button" className="chip border-transparent! max-[22rem]:px-2.5" aria-pressed={time === item.id} onClick={() => show(item.id)}>{item.label}</button>)}
          </div>
          {!failed && <>
            <span className="h-6 w-px bg-gold-500/30 max-sm:hidden" aria-hidden="true" />
            <div className="flex items-center gap-1">
              <button type="button" className="btn-icon border-transparent!" onClick={() => setSpinning(on => !on)}
                aria-label={spinning ? 'Stop rotation' : 'Start rotation'}><SpinIcon paused={!spinning} /></button>
              {/* On phones the panorama is dragged; the arrows join from sm up. */}
              <button type="button" className="btn-icon border-transparent! max-sm:hidden" onClick={() => look(-1)} aria-label="Look left"><ChevronIcon direction="left" /></button>
              <button type="button" className="btn-icon border-transparent! max-sm:hidden" onClick={() => look(1)} aria-label="Look right"><ChevronIcon /></button>
            </div>
          </>}
        </div>
      </div>
      <p className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.5rem] uppercase tracking-plus text-ivory/45">
        <span className="num">360</span>° aerial panorama<span className="max-sm:hidden"> · views from each residence vary</span>
      </p>
    </div>
  </section>
}
