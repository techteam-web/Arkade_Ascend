import * as THREE from 'three'
import { gsap } from '../../app/reveal.js'

// The Gallery's stage (DESIGN.md): every render on one strip that bends away
// like the inside of a curved screen. Drag it (or use the wheel, the arrows
// or the buttons) and it runs on with the throw, the pictures splitting their
// colour and the strip rippling with the speed, then settles on the nearest
// picture. The one at the centre is in full colour; the others dim and cool
// as they curve away. A click on the centre one opens it full screen; on any
// other, brings it to the centre.
//
// createGalleryStage(canvas, { onIndex, onOpen, reduced }) ->
//   { setItems(items, index), goTo(index), step(direction), dispose() }
const vertex = /* glsl */ `
  uniform float uVelocity, uTime, uBend;
  varying vec2 vUv;
  varying float vSide;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    // bend away with distance from the centre, and ripple with the speed
    world.z -= world.x * world.x * uBend;
    world.y += sin(world.x * 1.6 - uTime * 2.0) * uVelocity * 0.06;
    vSide = world.x;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`
const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec4 uFit;            // cover scale (xy) and offset (zw)
  uniform float uVelocity, uReady, uRise;
  varying vec2 vUv;
  varying float vSide;
  void main() {
    // the picture rises into its frame as the strip arrives
    vec2 uv = vUv;
    if (uv.y > uRise) discard;
    vec2 t = vec2(uv.x, uv.y + (1.0 - uRise)) * uFit.xy + uFit.zw;
    float shift = clamp(uVelocity, -1.0, 1.0) * 0.012;
    vec3 col = vec3(texture2D(uMap, t + vec2(shift, 0.0)).r, texture2D(uMap, t).g, texture2D(uMap, t - vec2(shift, 0.0)).b);
    // the centre in full colour; the others dim and cool as they curve away
    float away = clamp(abs(vSide) / 2.2, 0.0, 1.0);
    float grey = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(grey) * vec3(0.92, 0.9, 1.0), away * 0.8);
    col *= mix(1.0, 0.22, smoothstep(0.0, 1.0, away));
    // a whisper of vignette inside each frame
    vec2 c = vUv - 0.5;
    col *= 1.0 - dot(c, c) * 0.35;
    gl_FragColor = vec4(col * uReady, 1.0);
    #include <colorspace_fragment>
  }
`

const HEIGHT = 1          // a picture's height in world units
const GAP = 0.16
const widthOf = aspect => HEIGHT * THREE.MathUtils.clamp(aspect || 1.6, 0.72, 1.9)

// Cover-fit of a picture (aspect w/h) in a frame (w/h), around a focus point.
function fitFor(aspect, frame, focus = '50% 50%') {
  const [fx, fy] = String(focus).split(/\s+/).map(value => (parseFloat(value) || 50) / 100)
  let sx = 1, sy = 1
  if (aspect > frame) sx = frame / aspect
  else sy = aspect / frame
  return new THREE.Vector4(sx, sy, (1 - sx) * fx, (1 - sy) * (1 - (fy ?? 0.5)))
}

export function createGalleryStage(canvas, { onIndex, onOpen, reduced = false } = {}) {
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch { return null }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
  const loader = new THREE.TextureLoader()
  const shared = { uVelocity: { value: 0 }, uTime: { value: 0 }, uBend: { value: reduced ? 0.04 : 0.09 } }
  const geometry = new THREE.PlaneGeometry(1, 1, 32, 8)

  let cards = []          // { mesh, centre, width, item }
  let total = 1           // the strip's whole length; it loops, so pictures sit either side
  const wrap = value => ((value + total / 2) % total + total) % total - total / 2
  let position = 0        // the strip's offset: the world x at the screen's centre
  let index = 0
  let velocity = 0
  let settle = null
  let needsRender = true
  let disposed = false

  const centreOf = i => cards[i]?.centre ?? 0
  const nearest = x => cards.reduce((best, card, i) => Math.abs(wrap(card.centre - x)) < Math.abs(wrap(cards[best].centre - x)) ? i : best, 0)

  const fit = () => {
    const width = canvas.clientWidth, height = canvas.clientHeight
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // a picture takes about 70% of the stage's height (less on tall screens,
    // so a wide one still fits the width)
    const vfov = THREE.MathUtils.degToRad(camera.fov)
    const byHeight = HEIGHT / 0.8 / 2 / Math.tan(vfov / 2)
    const widest = Math.max(...cards.map(card => card.width), 1.6)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect)
    const byWidth = widest / 0.86 / 2 / Math.tan(hfov / 2)
    camera.position.set(0, 0, Math.max(byHeight, byWidth))
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    needsRender = true
  }

  const setItems = (items, start = 0) => {
    cards.forEach(card => { card.mesh.material.uniforms.uMap.value?.dispose(); card.mesh.material.dispose(); scene.remove(card.mesh) })
    let x = 0
    cards = items.map((item, i) => {
      const width = widthOf(item.aspect)
      const material = new THREE.ShaderMaterial({
        vertexShader: vertex, fragmentShader: fragment,
        uniforms: { ...shared, uMap: { value: null }, uFit: { value: fitFor(item.aspect, width / HEIGHT, item.focus) }, uReady: { value: 0 }, uRise: { value: reduced ? 1 : 0 } },
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.scale.set(width, HEIGHT, 1)
      mesh.userData.index = i
      scene.add(mesh)
      const centre = x + width / 2
      x += width + GAP
      loader.load(item.src, texture => {
        if (disposed) { texture.dispose(); return }
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
        material.uniforms.uMap.value = texture
        gsap.to(material.uniforms.uReady, { value: 1, duration: reduced ? 0 : 0.6, ease: 'power2.out', onUpdate: () => { needsRender = true } })
        needsRender = true
      })
      return { mesh, centre, width, item }
    })
    // a short strip is repeated round the loop only in spirit: it still needs
    // room either side of the centre, at least a screen and a half
    total = Math.max(x, 7)
    index = Math.max(0, Math.min(cards.length - 1, start))
    position = centreOf(index)
    velocity = 0
    fit()
    // the strip rises into place, picture by picture from the centre out
    cards.forEach((card, i) => {
      const u = card.mesh.material.uniforms.uRise
      if (reduced) { u.value = 1; return }
      gsap.fromTo(u, { value: 0 }, { value: 1, duration: 1.1, ease: 'curtain', delay: 0.15 + Math.abs(i - index) * 0.07, onUpdate: () => { needsRender = true } })
    })
    onIndex?.(index)
    needsRender = true
  }

  const goTo = target => {
    if (!cards.length) return
    const next = (target + cards.length) % cards.length
    settle?.kill()
    const from = position
    const to = position + wrap(centreOf(next) - position)
    index = next
    onIndex?.(index)
    if (reduced) { position = to; needsRender = true; return }
    const state = { x: from }
    settle = gsap.to(state, {
      x: to, duration: 1.1, ease: 'expo.out',
      onUpdate: () => {
        velocity = (state.x - position) * 8
        position = state.x
        needsRender = true
      },
      onComplete: () => { velocity = 0; needsRender = true },
    })
  }

  // --- dragging, with a throw ---
  const drag = { active: false, x: 0, start: 0, moved: 0, id: null, last: 0, speed: 0 }
  const worldPerPixel = () => {
    const vfov = THREE.MathUtils.degToRad(camera.fov)
    return (2 * camera.position.z * Math.tan(vfov / 2)) / Math.max(1, canvas.clientHeight)
  }
  const onPointerDown = event => {
    settle?.kill()
    drag.active = true; drag.id = event.pointerId; drag.x = event.clientX; drag.start = event.clientX; drag.moved = 0; drag.last = performance.now(); drag.speed = 0
    canvas.setPointerCapture?.(event.pointerId)
  }
  const onPointerMove = event => {
    if (!drag.active || event.pointerId !== drag.id) return
    const dx = event.clientX - drag.x
    drag.x = event.clientX
    drag.moved = Math.max(drag.moved, Math.abs(event.clientX - drag.start))
    const now = performance.now()
    const step = -dx * worldPerPixel()
    position += step
    drag.speed = step / Math.max(1, now - drag.last) * 16
    drag.last = now
    velocity = THREE.MathUtils.clamp(drag.speed * 6, -1.5, 1.5)
    needsRender = true
  }
  const pick = event => {
    const rect = canvas.getBoundingClientRect()
    const ndc = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    const ray = new THREE.Raycaster()
    ray.setFromCamera(ndc, camera)
    return ray.intersectObjects(cards.map(card => card.mesh))[0]?.object.userData.index
  }
  const onPointerUp = event => {
    if (!drag.active || event.pointerId !== drag.id) return
    drag.active = false
    canvas.releasePointerCapture?.(event.pointerId)
    if (drag.moved < 6) {
      const hit = pick(event)
      if (hit === undefined) { goTo(index); return }
      if (hit === index) onOpen?.(index)
      else goTo(hit)
      return
    }
    // throw: carry on with the speed, then settle on the nearest picture
    goTo(nearest(position + drag.speed * 18))
  }
  let wheel = 0, wheelTimer
  const onWheel = event => {
    event.preventDefault()
    wheel += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    clearTimeout(wheelTimer)
    wheelTimer = setTimeout(() => { wheel = 0 }, 160)
    if (Math.abs(wheel) > 60) { goTo(index + Math.sign(wheel)); wheel = 0 }
  }
  canvas.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  const observer = new ResizeObserver(fit)
  observer.observe(canvas)

  const tick = (time, deltaMs) => {
    if (disposed || document.hidden) return
    const dt = Math.min(deltaMs / 1000, 0.05)
    if (!reduced) shared.uTime.value += dt
    if (!drag.active && !settle?.isActive()) velocity *= Math.pow(0.02, dt)
    if (Math.abs(velocity) > 0.001) needsRender = true
    shared.uVelocity.value += (velocity - shared.uVelocity.value) * Math.min(1, dt * 10)
    if (Math.abs(shared.uVelocity.value) > 0.001) needsRender = true
    if (!needsRender) return
    needsRender = false
    cards.forEach(card => { card.mesh.position.x = wrap(card.centre - position) })
    renderer.render(scene, camera)
  }
  gsap.ticker.add(tick)

  return {
    setItems,
    goTo,
    step(direction) { goTo(index + direction) },
    dispose() {
      disposed = true
      settle?.kill()
      gsap.ticker.remove(tick)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
      cards.forEach(card => { card.mesh.material.uniforms.uMap.value?.dispose(); card.mesh.material.dispose() })
      geometry.dispose()
      renderer.dispose()
    },
  }
}
