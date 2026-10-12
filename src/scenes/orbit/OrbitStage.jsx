import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { prefersReducedMotion } from '../../hooks/useMediaQuery.js'
import { TUNING, saveData, shortestDelta, wrap } from './engine.js'
import { MAX_LEVELS, orbitFragment, orbitVertex, reliefFragment, reliefVertex } from './shaders.js'

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
    uRadial: { value: TUNING.transitionStyle === 'radial' ? 1 : 0 }, uSkyOnly: { value: 0 }, uAnimus: { value: TUNING.transitionStyle === 'animus' ? 1 : 0 }, uSilk: { value: TUNING.transitionStyle === 'silk' ? 1 : 0 }, uFlow: { value: TUNING.transitionStyle === 'flow' ? 1 : 0 },
    uGround: { value: new THREE.Matrix3() }, uHasGround: { value: 0 },
    uTowerBase: { value: new THREE.Vector2(0.5, 0.32) }, uTowerTop: { value: new THREE.Vector2(0.5, 0.73) }, uTowerRect: { value: new THREE.Vector4(0.4, 0.6, 0.3, 0.76) },
    uWorldA: { value: EMPTY }, uWorldB: { value: EMPTY }, uWorldStep: { value: new THREE.Vector2(0.02, 0.01) }, uWorldTexel: { value: new THREE.Vector2(1, 1) },
    uWorldOn: { value: 0 }, uTower: { value: new THREE.Vector4() }, uFloorMin: { value: 0 },
    uFloorSel: { value: 0 }, uFloorHover: { value: 0 }, uSelIn: { value: 1 }, uHovIn: { value: 1 }, uFocus: { value: 0 }, uWingSel: { value: 0 }, uWingHover: { value: 0 },
    uWingMid: { value: new THREE.Vector2() }, uWingDir: { value: new THREE.Vector2(1, 0) }, uHasWings: { value: 0 },
    uWingMap: { value: EMPTY }, uWingMapRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uHasWingMap: { value: 0 },
    uLevels: { value: new Float32Array(MAX_LEVELS).fill(1e5) }, uLevelCount: { value: 0 },
  }), [textures])
  // The relief for the 3D light change: the frame's city as a mesh, drawn
  // instead of the flat pass (which then paints only the sky behind it).
  const relief = useRef(null)
  const reliefMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: reliefVertex, fragmentShader: reliefFragment,
    uniforms: {
      ...uniforms,
      uCamMoved: { value: new THREE.Matrix4() }, uCamNow: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
      uSunDir: { value: new THREE.Vector2(-0.966, -0.259) }, uTopZ: { value: 125 }, uFloorH: { value: 3.15 }, uLevel0: { value: 0 },
      uBuffer: { value: new THREE.Vector2(1, 1) },
    },
    depthTest: true, depthWrite: true, blending: THREE.NoBlending, side: THREE.DoubleSide,
  }), [uniforms])
  const gl = useThree(state => state.gl)
  const st = useRef({
    shown: -1, uploaded: { day: -1, night: -1, depth: -1, alpha: -1 }, light: LIGHT[light], transition: null,
    cover: new THREE.Vector2(1, 1), zoom, hover: new THREE.Vector2(), worldFrame: -1, hovered: null, ready: false, groundFrame: -1,
  }).current
  // The latest props, for the frame loop and the pointer callbacks.
  const live = useRef({})
  live.current = { light: LIGHT[light], pickable, onFloor, onHover, onReady, zoom, sky }

  useEffect(() => frames.onDecoded(invalidate), [frames, invalidate])
  useEffect(() => world?.onLoaded(invalidate), [world, invalidate])
  useEffect(() => {
    controller.onChange = invalidate
    return () => { controller.onChange = null }
  }, [controller, invalidate])
  useEffect(() => { uniforms.uSky.value = sky ? 1 : 0; invalidate() }, [sky, uniforms, invalidate])
  // A new light or zoom asks for a frame at once; the loop carries it on.
  useEffect(() => { invalidate() }, [light, zoom, invalidate])

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
    relief.current?.geometry.dispose()
    reliefMaterial.dispose()
    for (const layer of Object.keys(st.uploaded)) if (st.uploaded[layer] >= 0) frames.unpin(layer, st.uploaded[layer])
    Object.values(textures).forEach(t => t.dispose())
    engine.frame = st.shown >= 0 ? st.shown : engine.frame
  }, [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
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

    // Where the tower stands in this frame and the ground under each pixel,
    // from the frame's camera, for the light change that radiates from it.
    if (world && st.groundFrame !== frame) {
      st.groundFrame = frame
      placeTower(uniforms, world.manifest, frame)
    }

    // A change of light starts once its renders for this very frame are on
    // the GPU, so the angle holds and nothing waits half way.
    // In 3D, it waits a moment for this frame's world data (loaded as the
    // orbit settles), then goes ahead flat without it.
    const want3d = live.current.sky && ['3d', 'animus'].includes(TUNING.transitionStyle) && !reduced && !saveData() && !!world
    const has3d = want3d && world.bytes(frame) !== null
    if (!pending) st.waitFrom = null
    if (pending && platesFor(want).every(layer => st.uploaded[layer] === frame)) {
      const now = state.clock.elapsedTime
      st.waitFrom ??= now
      if (!want3d || has3d || now - st.waitFrom > TUNING.reliefWait) {
        st.waitFrom = null
        uniforms.uFromW.value = st.light
        uniforms.uToW.value = want
        const [base, swing] = has3d ? (TUNING.transitionStyle === 'animus' ? TUNING.animusSeconds : TUNING.reliefSeconds)
          : TUNING[`${TUNING.transitionStyle}Seconds`] ?? TUNING.transitionSeconds
        if (reduced) st.light = want
        else {
          st.transition = { p: 0, seconds: base + swing * Math.abs(want - st.light), to: want, relief: has3d ? frame : -1 }
          uniforms.uT.value = 0
          if (has3d) buildRelief(relief.current, reliefMaterial.uniforms, world, frame, want > st.light)
        }
      }
    }
    if (st.transition) {
      // A different light chosen mid-change finishes this one quickly first.
      const rate = want !== st.transition.to ? 4 : 1
      st.transition.p = Math.min(st.transition.p + (dt * rate) / st.transition.seconds, 1)
      uniforms.uT.value = st.transition.p
      if (st.transition.p >= 1) { st.light = st.transition.to; st.transition = null }
    }
    // The relief stands in while its frame is on screen; the camera eases in,
    // up and round, and back to rest by the end of the change.
    const inRelief = st.transition?.relief === frame
    let out = 0
    if (inRelief) {
      const t = st.transition.p
      out = t < 0.45 ? 1 - (1 - t / 0.45) ** 3 : 1 - easeInOut((t - 0.45) / 0.55)
      moveCamera(reliefMaterial.uniforms, world.manifest, frame, out, uniforms.uToW.value > uniforms.uFromW.value ? 1 : -1)
      gl.getDrawingBufferSize(reliefMaterial.uniforms.uBuffer.value)
    }
    if (relief.current) relief.current.visible = inRelief
    uniforms.uSkyOnly.value = inRelief ? 1 : 0

    st.zoom += (live.current.zoom - st.zoom) * (reduced ? 1 : 1 - Math.exp(-dt * 8))
    // (the relief's overscan only; the flat styles never zoom)
    const push = inRelief ? 1 + TUNING.reliefMove.overscan * out : 1
    uniforms.uCover.value.copy(st.cover).divideScalar(st.zoom * push)
    // depth parallax follows the mouse, never a drag or reduced motion
    const h = controller.dragging || reduced ? { x: 0, y: 0 } : controller.hover
    uniforms.uParallax.value.lerp(st.hover.set(h.x, h.y), 1 - Math.exp(-dt * 3))

    // Floors: world data for the frame on screen, decoded once the orbit settles.
    // (Also on the Tower page for the 3D light change, unless saving data.)
    const worldTex = world && (live.current.pickable || want3d) ? world.textures(st.shown, !controller.moving) : null
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
    const worldOn = worldTex && live.current.pickable && !st.transition ? 1 : 0
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
    // A newly chosen or pointed floor fades its highlight in, quickly.
    const selKey = `${uniforms.uFloorSel.value}:${uniforms.uWingSel.value}`
    const hovKey = `${uniforms.uFloorHover.value}:${uniforms.uWingHover.value}`
    if (selKey !== st.selKey) { st.selKey = selKey; uniforms.uSelIn.value = 0 }
    if (hovKey !== st.hovKey) { st.hovKey = hovKey; uniforms.uHovIn.value = 0 }
    const rise = reduced ? 1 : 1 - Math.exp(-dt * 12)
    uniforms.uSelIn.value += (1 - uniforms.uSelIn.value) * rise
    uniforms.uHovIn.value += (1 - uniforms.uHovIn.value) * rise
    if (uniforms.uSelIn.value > 0.998) uniforms.uSelIn.value = 1
    if (uniforms.uHovIn.value > 0.998) uniforms.uHovIn.value = 1
    const focus = uniforms.uFloorSel.value > 0 || uniforms.uFloorHover.value > 0 ? 1 : 0
    uniforms.uFocus.value += (focus - uniforms.uFocus.value) * (reduced ? 1 : 1 - Math.exp(-dt * 8))

    // Draw again while anything is still on its way.
    const settled = (a, b) => Math.abs(a - b) < 0.002
    const moving = controller.moving || st.transition || pending || frame !== target
      || !settled(st.zoom, live.current.zoom) || st.hover.distanceTo(uniforms.uParallax.value) > 0.002
      || uniforms.uSelIn.value < 1 || uniforms.uHovIn.value < 1 || !settled(uniforms.uFocus.value, focus)
      || !settled(uniforms.uWorldOn.value, worldOn) || draw.some(layer => st.uploaded[layer] !== frame)
    if (moving) invalidate()
  })

  return <>
    <mesh frustumCulled={false} renderOrder={0}>
      <planeGeometry args={[2, 2]} />
      {/* Written straight through, premultiplied: the canvas composites it over the page. */}
      <shaderMaterial vertexShader={orbitVertex} fragmentShader={orbitFragment} uniforms={uniforms} depthTest={false} depthWrite={false} blending={THREE.NoBlending} />
    </mesh>
    <mesh ref={relief} frustumCulled={false} renderOrder={1} visible={false} material={reliefMaterial} />
  </>
}

// A frame's camera is a 3 x 4 projection from world metres (the tower's
// centre at the origin, z up) to image uv (v up). Its ground-plane part,
// inverted, takes a pixel back to the point of the ground it shows.
function placeTower(uniforms, manifest, frame) {
  const c = manifest.cameras?.[frame]
  if (!c) return
  const project = (x, y, z) => {
    const w = c[8] * x + c[9] * y + c[10] * z + c[11]
    return [(c[0] * x + c[1] * y + c[2] * z + c[3]) / w, (c[4] * x + c[5] * y + c[6] * z + c[7]) / w]
  }
  const top = manifest.levels[manifest.levels.length - 1] + 6   // the crown above the top floor
  const { minX, maxX, minY, maxY } = manifest.tower
  const corners = [minX, maxX].flatMap(x => [minY, maxY].flatMap(y => [project(x, y, 0), project(x, y, top)]))
  const us = corners.map(([u]) => u), vs = corners.map(([, v]) => v)
  uniforms.uTowerRect.value.set(Math.min(...us) - 0.005, Math.max(...us) + 0.005, Math.min(...vs) - 0.005, Math.max(...vs) + 0.005)
  uniforms.uTowerBase.value.fromArray(project(0, 0, 0))
  uniforms.uTowerTop.value.fromArray(project(0, 0, top))
  uniforms.uGround.value.set(c[0], c[1], c[3], c[4], c[5], c[7], c[8], c[9], c[11]).invert()
  uniforms.uHasGround.value = 1
}

const easeInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)
const projection = c => new THREE.Matrix4().set(c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8], c[9], c[10], c[11], 0, 0, 0, 1)
// The camera's centre: where its projection is undefined.
const cameraCentre = c => new THREE.Vector3(-c[3], -c[7], -c[11]).applyMatrix3(new THREE.Matrix3().set(c[0], c[1], c[2], c[4], c[5], c[6], c[8], c[9], c[10]).invert())

// The frame's city as a relief: one vertex every other pixel of its world
// maps, at its world position. Gaps in the maps (foliage, glass) take the
// depth of their neighbours; the sky lies far out. Every vertex stays on its
// own pixel's ray, so at rest the relief projects exactly onto the render.
const STEP = 2
const SKY_W = 12        // projective depth of the sky's points (the tower is at 1)
const SHARD = 6         // grid cells to a shard's side (about 24 px on a 1920 px screen)
function buildRelief(mesh, u, world, frame, darker) {
  if (!mesh) return
  const m = world.manifest, c = m.cameras[frame], { a, b } = world.bytes(frame)
  const { width, height, xyStep, zStep } = m
  const cols = Math.floor((width - 1) / STEP) + 1, rows = Math.floor((height - 1) / STEP) + 1, n = cols * rows
  const depth = new Float32Array(n)            // projective depth w; 0 where unknown
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const i = (r * STEP * width + k * STEP) * 4
    const qz = b[i + 1] * 256 + b[i + 2]
    if (!qz) continue
    const x = (a[i] * 256 + a[i + 1] - 32768) * xyStep, y = (a[i + 2] * 256 + b[i] - 32768) * xyStep, z = qz * zStep
    depth[r * cols + k] = c[8] * x + c[9] * y + c[10] * z + c[11]
  }
  for (let pass = 0; pass < 3; pass++) {
    const next = depth.slice()
    for (let j = 0; j < n; j++) {
      if (depth[j]) continue
      const k = j % cols
      const up = j >= cols ? depth[j - cols] : 0, down = j + cols < n ? depth[j + cols] : 0
      const left = k > 0 ? depth[j - 1] : 0, right = k < cols - 1 ? depth[j + 1] : 0
      const count = (up > 0) + (down > 0) + (left > 0) + (right > 0)
      if (count) next[j] = (up + down + left + right) / count
    }
    depth.set(next)
  }
  const inverse = new THREE.Matrix3().set(c[0], c[1], c[2], c[4], c[5], c[6], c[8], c[9], c[10]).invert()
  const position = new Float32Array(n * 3), far = new Float32Array(n), v = new THREE.Vector3()
  for (let j = 0; j < n; j++) {
    const r = Math.floor(j / cols), k = j % cols
    const uu = (Math.min(width - 1, k * STEP) + 0.5) / width, vv = 1 - (Math.min(height - 1, r * STEP) + 0.5) / height
    const w = depth[j] || SKY_W
    far[j] = depth[j] ? 0 : 1
    v.set(w * uu - c[3], w * vv - c[7], w - c[11]).applyMatrix3(inverse)
    position[j * 3] = v.x; position[j * 3 + 1] = v.y; position[j * 3 + 2] = v.z
  }
  // Square shards of SHARD x SHARD cells, each with its own copy of its edge
  // vertices so it can fly free in the animus style (at rest they meet
  // exactly). Each vertex knows its shard's centre and a random number, and
  // where it sits in the shard.
  const bCols = Math.ceil((cols - 1) / SHARD), bRows = Math.ceil((rows - 1) / SHARD)
  const most = bCols * bRows * (SHARD + 1) ** 2
  const pos = new Float32Array(most * 3), farOut = new Float32Array(most), shard = new Float32Array(most * 4), cell = new Float32Array(most * 4)
  const index = new Uint32Array(bCols * bRows * SHARD * SHARD * 6)
  let count = 0, o = 0
  for (let by = 0; by < bRows; by++) for (let bx = 0; bx < bCols; bx++) {
    const k0 = bx * SHARD, r0 = by * SHARD, kw = Math.min(SHARD, cols - 1 - k0), rh = Math.min(SHARD, rows - 1 - r0)
    let cx = 0, cy = 0, cz = 0, inCity = 0
    for (let rr = 0; rr <= rh; rr++) for (let kk = 0; kk <= kw; kk++) {
      const j = (r0 + rr) * cols + k0 + kk
      if (far[j]) continue
      cx += position[j * 3]; cy += position[j * 3 + 1]; cz += position[j * 3 + 2]; inCity++
    }
    const seed = (Math.sin(bx * 12.9898 + by * 78.233) * 43758.5453) % 1
    const base = count
    for (let rr = 0; rr <= rh; rr++) for (let kk = 0; kk <= kw; kk++) {
      const j = (r0 + rr) * cols + k0 + kk
      pos[count * 3] = position[j * 3]; pos[count * 3 + 1] = position[j * 3 + 1]; pos[count * 3 + 2] = position[j * 3 + 2]
      farOut[count] = far[j]
      shard.set(inCity ? [cx / inCity, cy / inCity, cz / inCity, Math.abs(seed)] : [position[j * 3], position[j * 3 + 1], position[j * 3 + 2], 0], count * 4)
      cell[count * 4] = kk; cell[count * 4 + 1] = rr; cell[count * 4 + 2] = kw; cell[count * 4 + 3] = rh
      count++
    }
    for (let rr = 0; rr < rh; rr++) for (let kk = 0; kk < kw; kk++) {
      const i = base + rr * (kw + 1) + kk
      index[o++] = i; index[o++] = i + kw + 1; index[o++] = i + 1
      index[o++] = i + 1; index[o++] = i + kw + 1; index[o++] = i + kw + 2
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, count * 3), 3))
  geometry.setAttribute('aFar', new THREE.BufferAttribute(farOut.subarray(0, count), 1))
  geometry.setAttribute('aShard', new THREE.BufferAttribute(shard.subarray(0, count * 4), 4))
  geometry.setAttribute('aCell', new THREE.BufferAttribute(cell.subarray(0, count * 4), 4))
  geometry.setIndex(new THREE.BufferAttribute(index.subarray(0, o), 1))
  mesh.geometry.dispose()
  mesh.geometry = geometry

  u.uCamNow.value.copy(projection(c))
  u.uCamPos.value.copy(cameraCentre(c))
  // the sun low over the sea in the west at dusk, rising in the east at dawn
  u.uSunDir.value.set(...(darker ? [-0.966, -0.259] : [0.985, -0.17]))
  u.uTopZ.value = m.levels[m.levels.length - 1] + 6
  u.uFloorH.value = m.floorHeight ?? 3.15
  u.uLevel0.value = m.levels[0] ?? 0
}

// The moved camera: in towards the tower, up, and round it, by `amount` of
// TUNING.reliefMove. Moving the camera is moving the world the other way.
function moveCamera(u, manifest, frame, amount, side) {
  const c = manifest.cameras[frame]
  const { dolly, rise, swing } = TUNING.reliefMove
  const centre = cameraCentre(c)
  const towards = new THREE.Vector3(-centre.x, -centre.y, 0).normalize()
  const world = new THREE.Matrix4()
    .makeTranslation(-towards.x * dolly * amount, -towards.y * dolly * amount, -rise * amount)
    .multiply(new THREE.Matrix4().makeRotationZ(-THREE.MathUtils.degToRad(swing) * amount * side))
  u.uCamMoved.value.copy(projection(c)).multiply(world)
}
