import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { gsap } from '../../app/reveal.js'
import { FIN, FINISHES } from '../../scenes/building/finishes.js'
import { silkFragment, silkVertex } from '../../scenes/silk/shaders.js'

// Home's 3D stage (DESIGN.md, "the Ascent"): the tower itself, from the
// project's model, standing at dusk. As Home arrives a gold band of light
// climbs the building floor by floor and its windows come on behind it, the
// camera rides up beside it, and ASCEND rises letter by letter in the
// space behind the tower. Satin ribbons drift across; the camera keeps a slow
// orbit, leans with the pointer and can be dragged round.
//
// createHomeScene(canvas, options) -> { dispose }. options:
//   onRise(progress)   the band's height, 0 to 1, while it climbs (and 1 after)
//   onReady()          the model is in and the first frame is drawn
//   reduced            reduced motion: the finished frame, still
//   low                compact or touch device: lighter rendering
const MODEL = '/models/ascend-map.glb'
const HEIGHT = 10           // the tower is scaled to this height
const STOREYS = 37
const WORD = 'ASCEND'

const backdropVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
`
// A dusk sky that never quite stands still: plum overhead, a warm glow low
// behind the tower, soft cloud drifting through it, and a vignette.
const backdropFragment = /* glsl */ `
  uniform float uTime, uAspect;
  uniform vec2 uLean;
  varying vec2 vUv;
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
  void main() {
    vec2 uv = vUv;
    vec2 p = (uv - vec2(0.5, 0.38)) * vec2(uAspect, 1.0);
    // linear light (the output pass tone-maps and converts to sRGB)
    vec3 top = vec3(0.006, 0.0032, 0.0042);
    vec3 mid = vec3(0.036, 0.015, 0.019);
    vec3 low = vec3(0.17, 0.062, 0.036);
    float h = uv.y;
    vec3 col = mix(low, mid, smoothstep(0.08, 0.42, h));
    col = mix(col, top, smoothstep(0.38, 1.0, h));
    // drifting cloud, warped, lit gold low down
    vec2 q = uv * vec2(uAspect * 1.6, 2.4) + vec2(uTime * 0.012, 0.0) + uLean * 0.05;
    float c = fbm(q + fbm(q * 1.7 + uTime * 0.02) * 1.3);
    col = mix(col, col * 1.6 + vec3(0.02, 0.008, 0.004), smoothstep(0.45, 0.85, c) * (1.0 - smoothstep(0.2, 0.9, h)) * 0.7);
    // the warm glow behind the tower
    float g = exp(-dot(p, p) * 2.6);
    col += vec3(0.16, 0.05, 0.014) * g * 0.8;
    // vignette and dither
    vec2 v = (uv - 0.5) * vec2(min(uAspect, 2.0), 1.0);
    col *= 1.0 - 0.55 * smoothstep(0.35, 1.15, length(v));
    col += (hash(gl_FragCoord.xy + uTime) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
  }
`

// A letter of the word, rising inside its own box (uLift 0 to 1).
const letterVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const letterFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uLift, uOpacity, uTime, uSheen;
  varying vec2 vUv;
  void main() {
    vec2 uv = vec2(vUv.x, vUv.y - (1.0 - uLift) * 1.05);
    if (uv.y < 0.0 || uv.y > 1.0) discard;
    vec4 t = texture2D(uMap, uv);
    // a light that sweeps across the letters now and then
    float s = smoothstep(0.08, 0.0, abs(vUv.x * 0.6 + vUv.y * 0.25 - uSheen));
    vec3 col = t.rgb + vec3(1.0, 0.85, 0.6) * s * 0.35;
    gl_FragColor = vec4(col, t.a * uOpacity);
    #include <colorspace_fragment>
  }
`

const groundVertex = letterVertex
// A pool of warm light round the tower's foot, fading into the dusk.
const groundFragment = /* glsl */ `
  uniform float uRise;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    vec3 col = mix(vec3(0.09, 0.034, 0.022), vec3(0.008, 0.004, 0.005), smoothstep(0.0, 0.7, r));
    float ring = exp(-pow((r - 0.12) / 0.018, 2.0)) * 0.55 * (0.4 + 0.6 * uRise);
    col += vec3(1.0, 0.68, 0.36) * ring;
    float a = 1.0 - smoothstep(0.35, 1.0, r);
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`

// The ribbons: the brochure's gold satin (src/scenes/silk/shaders.js).
const RIBBONS = [
  { width: 1.6, amp: 1.0, freq: 0.55, twist: 1.2, twistFreq: 0.5, phase: 0.4, billow: 0.14, opacity: 0.6, sheer: 0.55, seed: 1.1, at: [0, -1.6, 3.4], rot: -0.18, scale: 0.42 },
  { width: 3.2, amp: 1.25, freq: 0.48, twist: 0.9, twistFreq: 0.34, phase: 2.1, billow: 0.24, opacity: 0.42, sheer: 0.62, seed: 3.7, at: [0, 2.8, -4.2], rot: 0.14, scale: 0.48 },
]

export function createHomeScene(canvas, { onRise, onReady, reduced = false, low = false } = {}) {
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, alpha: false, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.4 : 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = environment
  scene.environmentIntensity = 0.2

  // light: a low warm key from the setting sun on one face, a cool rim on
  // the other, a faint fill, so the two faces read apart
  const key = new THREE.DirectionalLight('#ffb27a', 3.1)
  key.position.set(-16, 6, 9)
  const rim = new THREE.DirectionalLight('#8ea6d4', 1.2)
  rim.position.set(14, 8, -10)
  scene.add(key, rim, new THREE.HemisphereLight('#5a3e44', '#120b0d', 0.16))

  const uniforms = {
    uTime: { value: 0 },
    uRise: { value: reduced ? 1 : 0 },
    uBand: { value: reduced ? 0 : 1 },
    uHeight: { value: HEIGHT },
  }

  // the sky
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader: backdropVertex, fragmentShader: backdropFragment, depthTest: false, depthWrite: false,
    uniforms: { uTime: uniforms.uTime, uAspect: { value: 1 }, uLean: { value: new THREE.Vector2() } },
  }))
  backdrop.renderOrder = -10
  backdrop.frustumCulled = false
  scene.add(backdrop)

  // the ground's pool of light
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    vertexShader: groundVertex, fragmentShader: groundFragment, transparent: true, depthWrite: false,
    uniforms: { uRise: uniforms.uRise },
  }))
  ground.position.y = -0.02
  scene.add(ground)

  // The camera's rig: the word and the ribbons ride with it, so they keep
  // their place on screen whichever way the camera has turned.
  const rig = new THREE.Group()
  scene.add(rig)

  // --- the word, behind the tower ---
  const letters = []
  const word = new THREE.Group()
  rig.add(word)
  const buildWord = () => {
    const size = 300
    const font = `400 ${size}px "Billie Eilish", "Didot", serif`
    const probe = document.createElement('canvas').getContext('2d')
    probe.font = font
    const track = size * 0.14
    const advances = [...WORD].map(ch => probe.measureText(ch).width)
    const total = advances.reduce((a, b) => a + b, 0) + track * (WORD.length - 1)
    let x = -total / 2
    ;[...WORD].forEach((ch, i) => {
      const w = Math.ceil(advances[i] + size * 0.2)
      const h = Math.ceil(size * 1.05)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const g = c.getContext('2d')
      g.font = font
      g.textBaseline = 'alphabetic'
      const fill = g.createLinearGradient(0, 0, 0, h)
      fill.addColorStop(0, '#fbf3e6')
      fill.addColorStop(0.62, '#efdcc0')
      fill.addColorStop(1, '#c8a174')
      g.fillStyle = fill
      g.fillText(ch, size * 0.1, size * 0.86)
      const texture = new THREE.CanvasTexture(c)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = 4
      const material = new THREE.ShaderMaterial({
        vertexShader: letterVertex, fragmentShader: letterFragment, transparent: true, depthWrite: false,
        uniforms: { uMap: { value: texture }, uLift: { value: reduced ? 1 : 0 }, uOpacity: { value: 1 }, uTime: uniforms.uTime, uSheen: { value: -1 } },
      })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w / size, h / size), material)
      mesh.position.x = (x + advances[i] / 2) / size
      mesh.renderOrder = -5
      word.add(mesh)
      letters.push(mesh)
      x += advances[i] + track
    })
    word.userData.width = total / size
  }

  // --- the ribbons ---
  const ribbons = RIBBONS.map(layer => {
    const material = new THREE.ShaderMaterial({
      vertexShader: silkVertex, fragmentShader: silkFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 }, uLength: { value: 34 }, uWidth: { value: layer.width }, uAmp: { value: layer.amp },
        uFreq: { value: layer.freq }, uTwist: { value: layer.twist }, uTwistFreq: { value: layer.twistFreq },
        uPhase: { value: layer.phase }, uBillow: { value: layer.billow }, uSeed: { value: layer.seed },
        uPointer: { value: new THREE.Vector3() }, uPointerAmt: { value: 0 },
        uShadow: { value: new THREE.Color('#5a3a22') }, uMid: { value: new THREE.Color('#c9a06a') }, uHigh: { value: new THREE.Color('#fff2d6') },
        uLightDir: { value: new THREE.Vector3(-0.62, 0.7, 0.32).normalize() }, uOpacity: { value: 0 }, uSheer: { value: layer.sheer },
      },
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, low ? 260 : 520, low ? 24 : 44), material)
    mesh.frustumCulled = false
    const holder = new THREE.Group()
    holder.position.set(...layer.at)
    holder.rotation.z = layer.rot
    holder.scale.setScalar(layer.scale)
    holder.add(mesh)
    rig.add(holder)
    return { mesh, material, layer }
  })

  // --- the tower ---
  const tower = new THREE.Group()
  tower.visible = false
  scene.add(tower)
  const materials = new Map()
  const lift = material => {
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, { uRise: uniforms.uRise, uBand: uniforms.uBand, uHeight: uniforms.uHeight, uTime: uniforms.uTime })
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          float hy = clamp(vWorld.y / uHeight, 0.0, 1.0);
          diffuseColor.rgb *= mix(0.5, 1.0, smoothstep(0.0, 0.32, hy)) * mix(1.0, 1.08, smoothstep(0.7, 1.0, hy));`)
        .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;\nuniform float uRise, uBand, uHeight, uTime;\nfloat lhash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float hh = clamp(vWorld.y / uHeight, 0.0, 1.0);
          float band = exp(-pow((hh - uRise) / 0.008, 2.0)) * uBand;
          float trail = smoothstep(uRise, uRise - 0.08, hh) * step(hh, uRise) * uBand;
          totalEmissiveRadiance += vec3(1.0, 0.7, 0.36) * (band * 2.6 + trail * 0.05);
          #ifdef IS_GLASS
            // the dusk in the glass: warm low down, plum overhead, a glint of
            // the low sun, stronger at grazing angles (the facets are flat)
            vec3 toEye = normalize(vViewPosition);
            vec3 rw = normalize((vec4(reflect(-toEye, normal), 0.0) * viewMatrix).xyz);
            float fres = pow(1.0 - clamp(abs(dot(normal, toEye)), 0.0, 1.0), 2.5);
            vec3 sky = mix(vec3(0.2, 0.075, 0.035), vec3(0.016, 0.007, 0.011), smoothstep(-0.05, 0.55, rw.y));
            sky += vec3(1.0, 0.55, 0.25) * pow(max(dot(rw, normalize(vec3(-0.6, 0.16, 0.78))), 0.0), 22.0) * 0.85;
            totalEmissiveRadiance += sky * (0.1 + 0.9 * fres);
            float floorId = floor(hh * ${STOREYS}.0);
            float bay = floor((vWorld.x * 0.83 + vWorld.z * 1.21) * 2.2);
            float on = step(0.42, lhash(vec2(floorId, bay)));
            float warm = 0.75 + 0.25 * lhash(vec2(bay, floorId + 7.0));
            float flicker = 0.92 + 0.08 * sin(uTime * 0.7 + floorId * 3.1 + bay);
            totalEmissiveRadiance += vec3(1.0, 0.62, 0.3) * step(hh, uRise - 0.006) * on * warm * flicker * 1.9;
          #endif
        `)
    }
    return material
  }
  const finishFor = source => {
    if (source.transparent && source.opacity < 0.2) return null
    if (materials.has(source.name)) return materials.get(source.name)
    const look = FINISHES[source.name] ?? (source.map || source.color.getHSL({}).l > 0.85 ? FIN : { color: `#${source.color.getHexString()}`, roughness: 0.7 })
    const glass = source.name === '[Color M02]' || source.name === '<auto>16'
    // The map copy has no normals (it was lightened for the map), so every
    // face is shaded flat, which suits the architecture.
    const material = lift(new THREE.MeshStandardMaterial({
      color: glass ? '#1f262c' : look.color, roughness: glass ? 0.12 : look.roughness ?? 0.7, metalness: glass ? 0.65 : look.metalness ?? 0,
      envMapIntensity: glass ? 1.6 : 0.85, flatShading: true,
    }))
    // keep the material's own defines (STANDARD) and add the glass flag
    if (glass) material.defines = { ...material.defines, IS_GLASS: '' }
    materials.set(source.name, material)
    return material
  }

  let ready = false
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(MODEL, gltf => {
    if (disposed) return
    const model = gltf.scene
    model.traverse(object => {
      if (!object.isMesh) return
      const material = finishFor(object.material)
      if (material) { object.material.map?.dispose(); object.material.dispose(); object.material = material }
      else object.visible = false
    })
    // Stand it on the ground, centred, HEIGHT tall.
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const scale = HEIGHT / size.y
    model.scale.setScalar(scale)
    const centre = box.getCenter(new THREE.Vector3()).multiplyScalar(scale)
    model.position.set(-centre.x, -box.min.y * scale, -centre.z)
    tower.add(model)
    tower.userData.radius = Math.max(size.x, size.z) * scale / 2
    tower.visible = true
    ready = true
    begin()
  }, undefined, () => { if (!disposed) { tower.visible = false; ready = true; begin() } })

  // --- post: a bloom for the band, the windows and the satin's highlights ---
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  // only what is brighter than white glows: the band, the windows, satin highlights
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), low ? 0.7 : 0.95, 0.5, 1.2)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  // --- camera: a slow orbit round the tower, leaning with the pointer ---
  // The model was lightened for the map: its faces were kept only where
  // they show from at most 10 degrees below the horizon, so the camera never
  // looks steeply up. On arrival it rides up beside the light at about the
  // light's own height, then draws back to the hero framing.
  // The hero framing stands the podium just clear of the foot's controls.
  const view = { azimuth: 0.62, radius: 30, distance: 1, camY: HEIGHT * 0.78, lookY: HEIGHT * 0.48 }
  const hero = { distance: 1, camY: HEIGHT * 0.78, lookY: HEIGHT * 0.48 }
  let intro = null       // the arrival's timeline (below)
  const lean = { x: 0, y: 0, tx: 0, ty: 0 }
  const drag = { active: false, x: 0, velocity: 0, id: null }
  const target = new THREE.Vector3()
  const fit = () => {
    // Far enough that the tower (and its ribbons) fill about 72% of the
    // height on landscape screens, 60% on portrait ones (their foot is
    // taller), standing a little higher; narrow screens step back to fit width.
    const portrait = camera.aspect < 0.8
    hero.lookY = HEIGHT * (portrait ? 0.4 : 0.48)
    if (!intro?.isActive()) view.lookY = hero.lookY
    const vfov = THREE.MathUtils.degToRad(camera.fov)
    const byHeight = (HEIGHT * 0.5) / Math.tan(vfov / 2) / (portrait ? 0.6 : 0.74)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect)
    // The podium is wide: on a portrait screen its ends may run a little
    // off the sides, so the tower itself stands taller there.
    const byWidth = ((tower.userData.radius ?? 1.6) * (portrait ? 0.86 : 1.15)) / Math.tan(hfov / 2)
    view.radius = Math.max(byHeight, byWidth) + 1.5
  }
  let needsRender = true
  const resize = () => {
    const width = canvas.clientWidth, height = canvas.clientHeight
    if (!width || !height) return
    needsRender = true
    renderer.setSize(width, height, false)
    composer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    backdrop.material.uniforms.uAspect.value = width / height
    fit()
    placeWord()
  }
  const placeWord = () => {
    if (!word.userData.width) return
    // Behind the tower, about 86% of the screen's width (less on tall screens).
    const distance = view.radius + 7
    const visibleH = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
    const visibleW = visibleH * camera.aspect
    const s = Math.min(visibleW * 0.94 / word.userData.width, visibleH * 0.36)
    word.scale.setScalar(s)
    word.position.set(0, -0.02 * s, -7)
  }

  const onPointerMove = event => {
    if (event.pointerType !== 'mouse') return
    lean.tx = (event.clientX / window.innerWidth) * 2 - 1
    lean.ty = (event.clientY / window.innerHeight) * 2 - 1
    if (drag.active && event.pointerId === drag.id) {
      const dx = event.clientX - drag.x
      drag.x = event.clientX
      view.azimuth -= dx * 0.005
      drag.velocity = -dx * 0.005
    }
  }
  const onPointerDown = event => {
    drag.active = true; drag.x = event.clientX; drag.id = event.pointerId; drag.velocity = 0
    canvas.setPointerCapture?.(event.pointerId)
  }
  const onPointerUp = event => {
    if (event.pointerId !== drag.id) return
    drag.active = false
    canvas.releasePointerCapture?.(event.pointerId)
  }
  // touch drags turn it too
  const onTouchMove = event => {
    if (!drag.active || event.pointerType === 'mouse' || event.pointerId !== drag.id) return
    const dx = event.clientX - drag.x
    drag.x = event.clientX
    view.azimuth -= dx * 0.006
    drag.velocity = -dx * 0.006
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  canvas.addEventListener('pointermove', onTouchMove, { passive: true })
  canvas.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)

  // --- the arrival ---
  const begin = () => {
    resize()
    if (reduced) { onRise?.(1); needsRender = true; onReady?.(); return }
    const rise = { value: 0 }
    intro = gsap.timeline()
      // the light climbs the tower floor by floor; the camera rides with it
      .fromTo(rise, { value: 0 }, {
        value: 1, duration: 3.8, ease: 'power2.inOut',
        onUpdate: () => {
          uniforms.uRise.value = rise.value * 1.02
          onRise?.(rise.value)
          // beside the band, a little above it, close in
          view.camY = HEIGHT * (0.12 + rise.value * 0.74)
          view.lookY = HEIGHT * (0.06 + rise.value * 0.72)
        },
      }, 0.2)
      .fromTo(view, { distance: 0.46 }, { distance: 0.62, duration: 3.8, ease: 'power1.inOut' }, 0.2)
      // then it draws back to the whole tower
      .to(view, { distance: hero.distance, camY: hero.camY, lookY: hero.lookY, duration: 2.2, ease: 'power3.inOut' }, 3.4)
      .to(uniforms.uBand, { value: 0, duration: 1.2, ease: 'power2.out' }, 3.9)
    letters.forEach((letter, i) => intro.to(letter.material.uniforms.uLift, { value: 1, duration: 1.3, ease: 'expo.out' }, 1.25 + i * 0.09))
    ribbons.forEach((ribbon, i) => intro.to(ribbon.material.uniforms.uOpacity, { value: ribbon.layer.opacity, duration: 2.4, ease: 'power2.out' }, 0.9 + i * 0.4))
    onReady?.()
  }
  if (reduced) ribbons.forEach(ribbon => { ribbon.material.uniforms.uOpacity.value = ribbon.layer.opacity })

  // the sheen across the word, every few seconds
  let sheenAt = 6
  let elapsed = 0
  let disposed = false
  const render = delta => {
    const dt = Math.min(delta, 0.05)
    elapsed += dt
    if (!reduced) {
      uniforms.uTime.value += dt
      // slow orbit; a drag throws it, then it eases back to its own pace
      if (!drag.active) {
        drag.velocity *= Math.pow(0.04, dt)
        view.azimuth += dt * 0.045 + drag.velocity
      }
      lean.x += (lean.tx - lean.x) * (1 - Math.exp(-dt * 2.2))
      lean.y += (lean.ty - lean.y) * (1 - Math.exp(-dt * 2.2))
      if (elapsed > sheenAt) {
        sheenAt = elapsed + 7 + Math.random() * 3
        letters.forEach(letter => gsap.fromTo(letter.material.uniforms.uSheen, { value: -0.3 + letter.position.x * 0.04 }, { value: 1.4, duration: 1.6, ease: 'power2.inOut' }))
      }
    }
    const azimuth = view.azimuth + lean.x * 0.1
    const radius = view.radius * view.distance
    target.set(0, view.lookY - lean.y * 0.25, 0)
    camera.position.set(Math.sin(azimuth) * radius, view.camY - lean.y * 0.5, Math.cos(azimuth) * radius)
    camera.lookAt(target)
    // the rig sits at the tower and faces the camera
    rig.position.copy(target)
    rig.quaternion.copy(camera.quaternion)
    backdrop.material.uniforms.uLean.value.set(lean.x, lean.y)
    ribbons.forEach(({ material }) => { material.uniforms.uTime.value = 6 + uniforms.uTime.value * 0.7 })
    composer.render(dt)
  }
  const tick = (time, deltaMs) => {
    if (disposed || !ready || document.hidden) return
    // Under reduced motion it is one still frame, redrawn only on a resize.
    if (reduced && !needsRender) return
    needsRender = false
    render(deltaMs / 1000)
  }
  gsap.ticker.add(tick)

  document.fonts?.load('400 300px "Billie Eilish"').catch(() => {}).finally(() => {
    if (disposed) return
    buildWord()
    placeWord()
    needsRender = true
  })

  return {
    dispose() {
      disposed = true
      intro?.kill()
      gsap.ticker.remove(tick)
      observer.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointermove', onTouchMove)
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      scene.traverse(object => {
        object.geometry?.dispose()
        const list = Array.isArray(object.material) ? object.material : object.material ? [object.material] : []
        list.forEach(material => { material.uniforms?.uMap?.value?.dispose(); material.dispose() })
      })
      environment.dispose()
      pmrem.dispose()
      composer.dispose()
      renderer.dispose()
    },
  }
}
