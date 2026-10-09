import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

// A 360° panorama viewer over tiled cube maps (Marzipano Tool exports). Every
// scene is one layer of a single view, so changing `active` is an in-place
// crossfade even mid-drag or mid-spin, as on the Views page. Scenes are fixed
// for the viewer's life: give it a new `key` to show another set.
//
// scenes: [{ id, url }], url being the export's folder (preview.jpg, {z}/{f}/{y}/{x}.jpg).
const LEVELS = [
  { tileSize: 256, size: 256, fallbackOnly: true },
  { tileSize: 512, size: 512 },
  { tileSize: 512, size: 1024 },
  { tileSize: 512, size: 2048 },
  { tileSize: 512, size: 4096 },
]
const FACE_SIZE = 4096
const deg = Math.PI / 180
const SPIN = 2.3 * deg        // per second: one turn in about two and a half minutes
const SPIN_EASE = 0.6         // seconds for the spin to ease in or out
const RESUME_AFTER = 4000     // ms after the last drag or step
const FADE = 1                // seconds for a crossfade
const HIDDEN = { opacity: 0, rect: { relativeWidth: 0, relativeHeight: 0 } }

const PanoramaViewer = forwardRef(function PanoramaViewer({ scenes, active, start, spinning, paused, label, className = '' }, ref) {
  const frame = useRef(null)
  const pano = useRef(null)                  // { view, layers, loop } once loaded
  const mix = useRef(Object.fromEntries(scenes.map(scene => [scene.id, scene.id === active ? 1 : 0])))
  const aim = useRef({ yaw: 0 })             // tweened by look()
  const motion = useRef({ pace: 0, held: false, last: 0, resume: 0 })
  const spinOn = useRef(false)
  spinOn.current = spinning && !paused
  const [failed, setFailed] = useState(false)

  // Any mix of the layers: each layer's opacity is its share of all the weight
  // at and beneath it, so the lowest visible layer is opaque and the frame is
  // exactly the weighted blend, even when a fade is interrupted. Unused layers
  // get an empty rect, so they neither draw nor load tiles.
  const blend = () => {
    const layers = pano.current?.layers
    if (!layers) return
    let beneath = 0
    scenes.forEach(({ id }) => {
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

  useImperativeHandle(ref, () => ({
    look(direction) {
      const view = pano.current?.view
      if (!view) return
      hold()
      aim.current.yaw = view.yaw()
      gsap.to(aim.current, {
        yaw: aim.current.yaw + direction * 40 * deg, duration: prefersReducedMotion() ? 0 : 0.9, ease: 'power2.inOut', overwrite: true,
        onUpdate: () => view.setYaw(aim.current.yaw), onComplete: release,
      })
    },
  }))

  // The viewer loads with its page section, in the Views page's chunk.
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
      // Keys are handled by the page, so they never reach the panorama behind the menu.
      const controls = instance.controls()
      Object.keys(controls.methods()).filter(name => /Key/.test(name)).forEach(name => controls.disableMethod(name))
      const limiter = Marzipano.RectilinearView.limit.traditional(FACE_SIZE, 100 * deg, 120 * deg)
      const view = new Marzipano.RectilinearView(start, limiter)
      const scene = instance.createEmptyScene({ view })
      const layers = {}
      scenes.forEach(({ id, url }) => {
        layers[id] = scene.createLayer({
          source: Marzipano.ImageUrlSource.fromString(`${url}/{z}/{f}/{y}/{x}.jpg`, { cubeMapPreviewUrl: `${url}/preview.jpg` }),
          geometry: new Marzipano.CubeGeometry(LEVELS),
          pinFirstLevel: true,
        })
      })
      scene.switchTo({ transitionDuration: 0, transitionUpdate: () => {} })
      const loop = instance.renderLoop()
      pano.current = { view, layers, loop }
      blend()
      // Once the first view is sharp, keep a coarse level of every scene in
      // memory, so a crossfade starts from real detail rather than the preview.
      const stage = instance.stage()
      const warm = stable => {
        if (!stable) return
        stage.removeEventListener('renderComplete', warm)
        const level = scenes.length > 3 || matchMedia('(max-width: 900px), (pointer: coarse)').matches ? 1 : 2
        scenes.forEach(({ id }) => layers[id].pinLevel(level))
      }
      stage.addEventListener('renderComplete', warm)

      // The spin advances inside Marzipano's own frame, just before it draws;
      // with the spin stopped and nothing else moving, nothing is drawn.
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
    if (!spinning || paused) return
    clearTimeout(motion.current.resume)
    motion.current.held = false
    wake()
  }, [spinning, paused])

  // Changing the scene crossfades in place, from whatever is on screen.
  useEffect(() => {
    const to = Object.fromEntries(scenes.map(scene => [scene.id, scene.id === active ? 1 : 0]))
    gsap.to(mix.current, { ...to, duration: prefersReducedMotion() ? 0 : FADE, ease: 'sine.inOut', overwrite: true, onUpdate: blend })
  }, [active])

  if (failed) {
    return <div role="img" aria-label={label} className={`grid place-items-center p-6 text-center ${className}`}>
      <p className="max-w-sm text-[0.7rem] uppercase leading-relaxed tracking-[0.2em] text-muted">The 360° view needs WebGL, which this browser does not offer.</p>
    </div>
  }
  return <div ref={frame} data-own-gesture role="img" aria-label={label} className={`cursor-grab touch-none active:cursor-grabbing ${className}`} />
})

export default PanoramaViewer
