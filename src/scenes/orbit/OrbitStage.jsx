import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { prefersReducedMotion } from '../../hooks/useMediaQuery.js'
import { TUNING, shortestDelta, wrap } from './engine.js'
import { MAX_LEVELS, orbitFragment, orbitVertex } from './shaders.js'

export const LIGHT = { day: 0, evening: 0.5, night: 1 }
// The renders a light needs: day or night alone, or both for evening.
const platesFor = light => light <= 0 ? ['day'] : light >= 1 ? ['night'] : ['day', 'night']

const EMPTY = new THREE.DataTexture(new Uint8Array(4), 1, 1)
EMPTY.needsUpdate = true

// One GPU texture per pass; each new frame is copied into it.
function streamTexture() {
  const t = new THREE.Texture()
  t.flipY = false   // not supported for ImageBitmap: the shader flips instead
  t.generateMipmaps = false
  t.minFilter = t.magFilter = THREE.LinearFilter
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

// The orbit, drawn on demand: a frame is rendered only while the view moves,
// a frame arrives, the light changes or the pointer moves over the depth
// parallax; still, it draws nothing. All passes of a frame land together, so
// depth, matte and colour always line up.
export default function OrbitStage({ engine, controller, world, light, sky, pickable, floor, zoom, onFloor, onHover, onReady }) {
  const { frames, source } = engine
  const { count } = source
  const size = useThree(state => state.size)
  const invalidate = useThree(state => state.invalidate)
  const textures = useMemo(() => ({ day: streamTexture(), night: streamTexture(), depth: streamTexture(), alpha: streamTexture() }), [])
  const uniforms = useMemo(() => ({
    uDay: { value: textures.day }, uNight: { value: textures.night }, uDepth: { value: textures.depth }, uAlpha: { value: textures.alpha },
    uCover: { value: new THREE.Vector2(1, 1) }, uShift: { value: new THREE.Vector2() },
    uT: { value: 1 }, uFromW: { value: LIGHT[light] }, uToW: { value: LIGHT[light] },
    uParallax: { value: new THREE.Vector2() }, uParallaxAmt: { value: TUNING.parallax }, uSky: { value: sky ? 1 : 0 },
    uWorldA: { value: EMPTY }, uWorldB: { value: EMPTY }, uWorldStep: { value: new THREE.Vector2(0.02, 0.01) }, uWorldTexel: { value: new THREE.Vector2(1, 1) },
    uWorldOn: { value: 0 }, uTower: { value: new THREE.Vector4() }, uFloorMin: { value: 0 },
    uFloorSel: { value: 0 }, uFloorHover: { value: 0 }, uWingSel: { value: 0 }, uWingHover: { value: 0 },
    uWingMid: { value: new THREE.Vector2() }, uWingDir: { value: new THREE.Vector2(1, 0) }, uHasWings: { value: 0 },
    uWingMap: { value: EMPTY }, uWingMapRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uHasWingMap: { value: 0 },
    uLevels: { value: new Float32Array(MAX_LEVELS).fill(1e5) }, uLevelCount: { value: 0 },
  }), [textures])
  const st = useRef({
    shown: -1, uploaded: { day: -1, night: -1, depth: -1, alpha: -1 }, light: LIGHT[light], transition: null,
    cover: new THREE.Vector2(1, 1), zoom, hover: new THREE.Vector2(), worldFrame: -1, hovered: null, ready: false,
  }).current
  // The latest props, for the frame loop and the pointer callbacks.
  const live = useRef({})
  live.current = { light: LIGHT[light], pickable, onFloor, onHover, onReady, zoom }

  useEffect(() => frames.onDecoded(invalidate), [frames, invalidate])
  useEffect(() => world?.onLoaded(invalidate), [world, invalidate])
  useEffect(() => {
    controller.onChange = invalidate
    return () => { controller.onChange = null }
  }, [controller, invalidate])
  useEffect(() => { uniforms.uSky.value = sky ? 1 : 0; invalidate() }, [sky, uniforms, invalidate])

  // The chosen floor, lit on its own wing.
  useEffect(() => {
    const names = world?.manifest.wings?.names ?? ['A', 'B']
    uniforms.uFloorSel.value = floor ? floor.n + 1 : 0
    uniforms.uWingSel.value = floor ? Math.max(0, names.indexOf(floor.tower)) : 0
    invalidate()
  }, [floor, world, uniforms, invalidate])

  // "Cover" fit: fill the view, crop the overflow.
  useEffect(() => {
    const view = size.width / Math.max(1, size.height)
    const image = source.width / source.height
    st.cover.set(view > image ? 1 : view / image, view > image ? image / view : 1)
    invalidate()
  }, [size, source, st, invalidate])

  // Image uv (v up) under a point of the view (0..1, v up).
  const toImage = (sx, sy) => {
    const c = uniforms.uCover.value
    return [(sx - 0.5) * c.x + 0.5 + uniforms.uShift.value.x, (sy - 0.5) * c.y + 0.5 + uniforms.uShift.value.y]
  }
  const pickAt = (sx, sy) => {
    if (!world || st.worldFrame !== st.shown || st.transition) return null
    const [u, v] = toImage(sx, sy)
    const hit = world.pick(st.shown, u, v)
    return hit && hit.floor > 0 ? { tower: world.wingName(hit.wing), n: hit.floor, wing: hit.wing } : null
  }
  useEffect(() => {
    controller.onTap = (sx, sy) => {
      if (!live.current.pickable) return
      const hit = pickAt(sx, sy)
      if (hit) live.current.onFloor?.({ tower: hit.tower, n: hit.n })
    }
    return () => { controller.onTap = null }
  })

  useEffect(() => () => {
    for (const layer of Object.keys(st.uploaded)) if (st.uploaded[layer] >= 0) frames.unpin(layer, st.uploaded[layer])
    Object.values(textures).forEach(t => t.dispose())
    engine.frame = st.shown >= 0 ? st.shown : engine.frame
  }, [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const now = state.clock.elapsedTime
    const reduced = prefersReducedMotion()
    const want = live.current.light
    controller.update(dt)

    const pending = !st.transition && want !== st.light
    const draw = [...new Set(['depth', 'alpha', ...platesFor(st.light), ...(st.transition ? platesFor(st.transition.to) : [])])]
    const needed = pending ? [...new Set([...draw, ...platesFor(want)])] : draw

    // Keep a decoded window around the view, leaning into the spin.
    const target = controller.frame
    const ahead = Math.max(1, Math.floor(frames.capacity / needed.length) - 3)
    for (let o = -2; o <= ahead; o++) {
      const i = wrap(target + o * controller.direction, count)
      for (const layer of needed) frames.ensure(layer, i)
    }
    // Show the target frame, or the nearest fully decoded one on the way.
    const isReady = i => draw.every(layer => frames.peek(layer, i) !== undefined)
    let frame = st.shown
    if (st.shown < 0) { if (isReady(target)) frame = target }
    else for (let s = shortestDelta(st.shown, target, count); s !== 0; s -= Math.sign(s)) {
      const i = wrap(st.shown + s, count)
      if (isReady(i)) { frame = i; break }
    }
    if (frame < 0) return
    if (pending) for (const layer of platesFor(want)) frames.ensure(layer, frame)
    for (const layer of needed) {
      if (st.uploaded[layer] === frame) continue
      const bitmap = frames.peek(layer, frame)
      if (!bitmap) continue
      textures[layer].image = bitmap
      textures[layer].needsUpdate = true
      if (st.uploaded[layer] >= 0) frames.unpin(layer, st.uploaded[layer])
      frames.pin(layer, frame)
      st.uploaded[layer] = frame
    }
    st.shown = frame
    if (!st.ready && draw.every(layer => st.uploaded[layer] === frame)) { st.ready = true; live.current.onReady?.() }

    // A change of light starts once its renders for this very frame are on
    // the GPU, so the angle holds and nothing waits half way.
    if (pending && platesFor(want).every(layer => st.uploaded[layer] === frame)) {
      uniforms.uFromW.value = st.light
      uniforms.uToW.value = want
      if (reduced) st.light = want
      else { st.transition = { start: now, to: want }; uniforms.uT.value = 0 }
    }
    if (st.transition) {
      const p = Math.min((now - st.transition.start) / TUNING.transitionSeconds, 1)
      uniforms.uT.value = p
      if (p >= 1) { st.light = st.transition.to; st.transition = null }
    }

    st.zoom += (live.current.zoom - st.zoom) * (reduced ? 1 : 1 - Math.exp(-dt * 8))
    uniforms.uCover.value.copy(st.cover).divideScalar(st.zoom)
    // depth parallax follows the mouse, never a drag or reduced motion
    const h = controller.dragging || reduced ? { x: 0, y: 0 } : controller.hover
    uniforms.uParallax.value.lerp(st.hover.set(h.x, h.y), 1 - Math.exp(-dt * 3))

    // Floors: world data for the frame on screen, decoded once the orbit settles.
    const worldTex = live.current.pickable && world ? world.textures(st.shown, !controller.moving) : null
    const worldFrame = worldTex ? st.shown : -1
    if (worldFrame !== st.worldFrame) {
      st.worldFrame = worldFrame
      if (worldTex) {
        const m = world.manifest
        uniforms.uWorldA.value = worldTex[0]
        uniforms.uWorldB.value = worldTex[1]
        uniforms.uWorldStep.value.set(m.xyStep, m.zStep)
        uniforms.uWorldTexel.value.set(1 / m.width, 1 / m.height)
        uniforms.uTower.value.set(m.tower.minX, m.tower.maxX, m.tower.minY, m.tower.maxY)
        uniforms.uFloorMin.value = m.levels[1] - 0.05
        uniforms.uLevels.value.fill(1e5)
        uniforms.uLevels.value.set(m.levels.slice(0, MAX_LEVELS))
        uniforms.uLevelCount.value = Math.min(m.levels.length, MAX_LEVELS)
        if (m.wings) { uniforms.uWingMid.value.fromArray(m.wings.mid); uniforms.uWingDir.value.fromArray(m.wings.dir); uniforms.uHasWings.value = 1 }
        if (m.wingsMap && world.wingMap) {
          uniforms.uWingMap.value = world.wingMap.texture
          uniforms.uWingMapRect.value.set(m.wingsMap.x0, m.wingsMap.y0, m.wingsMap.w * m.wingsMap.res, m.wingsMap.h * m.wingsMap.res)
          uniforms.uHasWingMap.value = 1
        }
      } else {
        uniforms.uWorldA.value = uniforms.uWorldB.value = EMPTY
      }
    }
    const worldOn = worldTex && !st.transition ? 1 : 0
    uniforms.uWorldOn.value += (worldOn - uniforms.uWorldOn.value) * (reduced ? 1 : 1 - Math.exp(-dt * 10))

    // The floor under the mouse, lit lightly; reported when it changes.
    let hovered = null
    if (live.current.pickable && controller.hovering && !controller.dragging) {
      const hit = pickAt(controller.hover.x * 0.5 + 0.5, controller.hover.y * 0.5 + 0.5)
      if (hit) hovered = hit
    }
    const key = hovered ? `${hovered.tower}${hovered.n}` : ''
    if (key !== (st.hovered ?? '')) {
      st.hovered = key
      const reported = live.current.onHover?.(hovered ? { tower: hovered.tower, n: hovered.n } : null)
      // the page says whether that floor has homes; only those light up
      st.hoverLit = reported !== false && hovered
    }
    uniforms.uFloorHover.value = st.hoverLit ? hovered.n + 1 : 0
    uniforms.uWingHover.value = st.hoverLit ? hovered.wing : 0

    // Draw again while anything is still on its way.
    const settled = (a, b) => Math.abs(a - b) < 0.002
    const moving = controller.moving || st.transition || frame !== target
      || !settled(st.zoom, live.current.zoom) || st.hover.distanceTo(uniforms.uParallax.value) > 0.002
      || !settled(uniforms.uWorldOn.value, worldOn) || draw.some(layer => st.uploaded[layer] !== frame)
    if (moving) invalidate()
  })

  return <mesh frustumCulled={false}>
    <planeGeometry args={[2, 2]} />
    {/* Written straight through, premultiplied: the canvas composites it over the page. */}
    <shaderMaterial vertexShader={orbitVertex} fragmentShader={orbitFragment} uniforms={uniforms} depthTest={false} depthWrite={false} blending={THREE.NoBlending} />
  </mesh>
}
