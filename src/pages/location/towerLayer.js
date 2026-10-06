import * as THREE from 'three'
import maplibregl from 'maplibre-gl'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { gsap } from '../../app/reveal.js'
import { prefersReducedMotion } from '../../hooks/useMediaQuery.js'
import { FINISHES, MAP_FIN, MAP_FINISHES } from '../../scenes/building/finishes.js'

// The tower on the Location map: a three.js scene drawn inside MapLibre's own
// WebGL context (a custom layer), so it shares the map's camera and depth
// buffer: the city's buildings hide it, and it hides them, as they should. It
// draws only when the map does; there is no loop of its own.
//
// Each frame it draws, over what the map has drawn so far:
// 1. the haze, thickening towards the horizon, and the sky above it;
// 2. a soft shadow round the foot of the site;
// 3. the tower, rising with the city's buildings as the map zooms in.
//
// The scene's world is the ground at the model's origin, in metres: x east,
// y up, z south. The camera's matrix carries that world into the map's
// Mercator space; inside it, the tower turns to its compass bearing.

// Haze grows with distance over the camera's height. For the ground that is
// the angle below the horizon, so the look holds at every zoom: none at the
// usual tilt's near edge, a veil at its far edge, solid at the horizon.
const HAZE_GLSL = /* glsl */ `
uniform vec3 uHaze;
float haze(float ratio) { return 1.0 - exp(-0.19 * max(ratio - 2.0, 0.0)); }
`

// MapLibre lights its buildings with one formula, in display colour, from a
// light given in spherical coordinates (src/shaders/fill_extrusion.vertex.glsl).
// The tower uses the same formula, per pixel, so it shades like the city.
const towerVertex = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`

const towerFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uGloss;         // how much sky the glass reflects
uniform vec3 uSky;
uniform vec3 uLight;          // MapLibre's light position, in this world's axes
uniform float uIntensity;
uniform vec3 uLightColor;
uniform vec3 uEye;
uniform vec2 uWall;           // wall shade at the foot and at the top
uniform float uHeight;
varying vec3 vWorld;
${HAZE_GLSL}
void main() {
  // Flat faces, turned towards the viewer (the model's parts are two-sided).
  vec3 normal = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (dot(normal, uEye - vWorld) < 0.0) normal = -normal;
  float value = dot(uColor, vec3(0.2126, 0.7152, 0.0722));
  float directional = clamp(dot(normal, uLight), 0.0, 1.0);
  directional = mix(1.0 - uIntensity, max(1.0 - value + uIntensity, 1.0), directional);
  // Walls darken a little towards the ground, as the city's do (MapLibre
  // spares walls that face due east or west).
  if (abs(normal.y) < 0.5 && abs(normal.z) > 0.001) directional *= mix(uWall.x, uWall.y, clamp(vWorld.y / uHeight, 0.0, 1.0));
  vec3 color = clamp((uColor + 0.03) * directional * uLightColor, 0.3 * (1.0 - uLightColor), vec3(1.0));
  // Glass takes on the sky, the more so the more obliquely it is seen.
  float grazing = 1.0 - clamp(dot(normal, normalize(uEye - vWorld)), 0.0, 1.0);
  color = mix(color, uSky, uGloss * (0.3 + 0.7 * grazing * grazing * grazing));
  color = mix(color, uHaze, haze(distance(vWorld, uEye) / max(uEye.y, 1.0)));
  gl_FragColor = vec4(color, 1.0);
}`

// The haze and sky: one quad over the whole view. Each corner carries the
// near and far points of its ray; per pixel, the ray's slope gives the haze
// over the ground, or the sky above the horizon.
const hazeVertex = /* glsl */ `
uniform mat4 uInverse;
varying vec4 vNear;
varying vec4 vFar;
void main() {
  vNear = uInverse * vec4(position.xy, -1.0, 1.0);
  vFar = uInverse * vec4(position.xy, 1.0, 1.0);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`

const hazeFragment = /* glsl */ `
uniform vec3 uSky;
varying vec4 vNear;
varying vec4 vFar;
${HAZE_GLSL}
void main() {
  vec3 ray = normalize(vFar.xyz / vFar.w - vNear.xyz / vNear.w);
  if (ray.y < 0.0) gl_FragColor = vec4(uHaze, haze(1.0 / -ray.y));
  else gl_FragColor = vec4(mix(uHaze, uSky, smoothstep(0.0, 0.4, ray.y)), 1.0);
}`

// A soft shadow round the foot of the site: its outline, blurred. The
// model's own ground covers it within the site, so it shows only outside.
const shadowVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`

const shadowFragment = /* glsl */ `
uniform sampler2D uMask;
uniform float uStrength;
uniform vec3 uEye;
varying vec2 vUv;
varying vec3 vWorld;
${HAZE_GLSL}
void main() {
  float shade = texture2D(uMask, vUv).r * uStrength;
  gl_FragColor = vec4(0.22, 0.15, 0.11, shade * (1.0 - haze(distance(vWorld, uEye) / max(uEye.y, 1.0))));
}`

const HAZE = '#f8f1e2'
const SKY = '#ebe5d9'
const GLASS_SKY = '#eee8da'
const SHADOW_STRENGTH = 0.42
const SHADOW_BLUR = 7      // metres
const RAMP = [13.5, 14.5]  // the city's buildings rise over these zooms

// '#rrggbb' to display-colour components, unconverted, as MapLibre uses them.
const rgb = hex => {
  const value = parseInt(hex.replace('#', '').slice(0, 6), 16)
  return new THREE.Vector3((value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255)
}

// MapLibre's light (style spec defaults where unset), in this world's axes.
const LIGHT_DEFAULTS = { anchor: 'viewport', position: [1.15, 210, 30], color: '#ffffff', intensity: 0.5 }
function mapLight(map, uniforms) {
  const light = { ...LIGHT_DEFAULTS, ...map.getLight() }
  const [r, azimuthal, polar] = light.position
  const a = (azimuthal + 90) * Math.PI / 180, p = polar * Math.PI / 180
  // Tile space: x east, y south, z up.
  let x = r * Math.cos(a) * Math.sin(p), y = r * Math.sin(a) * Math.sin(p)
  const z = r * Math.cos(p)
  if (light.anchor === 'viewport') {
    const b = map.getBearing() * Math.PI / 180, c = Math.cos(b), s = Math.sin(b)
    ;[x, y] = [c * x - s * y, s * x + c * y]
  }
  // MapLibre's wall normals point into the building (its rings wind so), so
  // the light reaches walls from the opposite side to its stated direction;
  // roofs are unaffected. The tower follows suit, so walls match the city's.
  uniforms.uLight.value.set(-x, z, -y)
  uniforms.uIntensity.value = light.intensity
  uniforms.uLightColor.value.copy(rgb(typeof light.color === 'string' && light.color.startsWith('#') ? light.color : '#ffffff'))
}

// The camera's position in the scene's world: the point that every
// perspective projection sends to the clip-space origin with w = 0.
const eyeMatrix = new THREE.Matrix3()
function eyeOf(matrix, target) {
  const m = matrix.elements
  eyeMatrix.set(m[0], m[4], m[8], m[1], m[5], m[9], m[3], m[7], m[11]).invert()
  return target.set(-m[12], -m[13], -m[15]).applyMatrix3(eyeMatrix)
}

// The finish each of the model's materials takes on the map: its map finish,
// else its Residences colour; near-white and textured parts become the light
// champagne of the fins, the rest keep their own colour. Near-invisible glass
// is left out.
function finishOf(material) {
  if (material.transparent && material.opacity < 0.2) return null
  const look = MAP_FINISHES[material.name] ?? FINISHES[material.name]
    ?? (material.map || material.color.getHSL({}).l > 0.85 ? MAP_FIN : { color: `#${material.color.getHexString()}` })
  return { color: look.color, gloss: look.gloss ?? 0 }
}

// The site outline as a blurred mask, `size` texels across `span` metres.
function shadowMask(outline, span, size, blur) {
  const mask = new Float32Array(size * size)
  const [cx, cz] = outline.reduce((sum, [x, z]) => [sum[0] + x / outline.length, sum[1] + z / outline.length], [0, 0])
  for (let j = 0; j < size; j++) {
    const z = cz + span / 2 - (j + 0.5) / size * span   // texture rows run north (v up)
    for (let i = 0; i < size; i++) {
      const x = cx - span / 2 + (i + 0.5) / size * span
      let inside = false
      for (let a = 0, b = outline.length - 1; a < outline.length; b = a++) {
        const [xa, za] = outline[a], [xb, zb] = outline[b]
        if ((za > z) !== (zb > z) && x < (xb - xa) * (z - za) / (zb - za) + xa) inside = !inside
      }
      mask[j * size + i] = inside ? 1 : 0
    }
  }
  // Three box blurs make a near-Gaussian one.
  const radius = Math.max(1, Math.round(blur / span * size))
  const pass = (from, to, step, along) => {
    for (let line = 0; line < size; line++) {
      let sum = 0
      const at = k => from[line * along + k * step]
      for (let k = -radius; k <= radius; k++) sum += k >= 0 && k < size ? at(k) : 0
      for (let k = 0; k < size; k++) {
        to[line * along + k * step] = sum / (radius * 2 + 1)
        const add = k + radius + 1, drop = k - radius
        if (add < size) sum += at(add)
        if (drop >= 0) sum -= at(drop)
      }
    }
  }
  const spare = new Float32Array(size * size)
  for (let n = 0; n < 3; n++) { pass(mask, spare, 1, size); pass(spare, mask, size, 1) }
  const bytes = Uint8Array.from(mask, value => Math.round(value * 255))
  const texture = new THREE.DataTexture(bytes, size, size, THREE.RedFormat)
  texture.minFilter = texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return { texture, centre: [cx, cz] }
}

const PODIUM = 21          // the podium's roof, under the wings (metres)

const insideRing = ([x, z], ring) => {
  let inside = false
  for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) {
    const [xa, za] = ring[a], [xb, zb] = ring[b]
    if ((za > z) !== (zb > z) && x < (xb - xa) * (z - za) / (zb - za) + xa) inside = !inside
  }
  return inside
}

export function createTowerLayer({ src, lngLat, bearing, ground, footprints = [], height = 131.25, onFrame }) {
  const origin = maplibregl.MercatorCoordinate.fromLngLat(lngLat, 0)
  const metre = origin.meterInMercatorCoordinateUnits()
  // World (x east, y up, z south, metres) to Mercator (x east, y south, z up).
  const place = new THREE.Matrix4().makeTranslation(origin.x, origin.y, origin.z)
    .scale(new THREE.Vector3(metre, -metre, metre))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
  // A place on the map to this world: metres east and south of the origin.
  const kx = 111320 * Math.cos(lngLat[1] * Math.PI / 180), ky = 110540
  const toWorld = ([lng, lat]) => [(lng - lngLat[0]) * kx, -(lat - lngLat[1]) * ky]
  // For picking: the wings as prisms to the top, the site to the podium roof.
  const wings = footprints.map(ring => ring.map(toWorld))
  const site = (ground ?? []).map(toWorld)
  const bounds = [...site, ...wings.flat()].reduce((box, [x, z]) => [Math.min(box[0], x), Math.min(box[1], z), Math.max(box[2], x), Math.max(box[3], z)], [Infinity, Infinity, -Infinity, -Infinity])

  const uniforms = {
    uLight: { value: new THREE.Vector3() },
    uIntensity: { value: 0.5 },
    uLightColor: { value: new THREE.Vector3(1, 1, 1) },
    uEye: { value: new THREE.Vector3() },
    uWall: { value: new THREE.Vector2(1, 1) },
    uHeight: { value: height },
    uSky: { value: rgb(GLASS_SKY) },
    uHaze: { value: rgb(HAZE) },
  }
  // Each finish shares the light; its colour and gloss are its own.
  const finishes = new Map()
  const finish = ({ color, gloss }) => {
    const key = `${color} ${gloss}`
    if (!finishes.has(key)) finishes.set(key, new THREE.ShaderMaterial({
      vertexShader: towerVertex, fragmentShader: towerFragment, side: THREE.DoubleSide,
      uniforms: { ...uniforms, uColor: { value: rgb(color) }, uGloss: { value: gloss } },
    }))
    return finishes.get(key)
  }

  // How far up the tower stands: its first rise, the zoom (with the city's
  // buildings), and the 3D or plan view. It is drawn only while above zero.
  const stand = { rise: prefersReducedMotion() ? 1 : 0, plan: 1 }
  let map, renderer, hazeScene, shadowScene, scene, camera, tower, shadow, motions = []
  const crown = new THREE.Vector3()        // where the label sits, in the model
  const projected = new THREE.Vector4()
  const inverse = new THREE.Matrix4()
  let standing = 0

  const repaint = () => map?.triggerRepaint()
  const animate = (key, to, duration) => {
    if (prefersReducedMotion()) { stand[key] = to; repaint(); return }
    motions.push(gsap.to(stand, { [key]: to, duration, ease: 'silk', overwrite: 'auto', onUpdate: repaint }))
  }

  // A point on the canvas, in CSS pixels, as a ray in the scene's world.
  const rayAt = ({ x, y }) => {
    const canvas = map.getCanvas()
    const ndc = [x / canvas.clientWidth * 2 - 1, 1 - y / canvas.clientHeight * 2]
    const near = new THREE.Vector4(ndc[0], ndc[1], -1, 1).applyMatrix4(inverse)
    const far = new THREE.Vector4(ndc[0], ndc[1], 1, 1).applyMatrix4(inverse)
    const from = new THREE.Vector3(near.x / near.w, near.y / near.w, near.z / near.w)
    const to = new THREE.Vector3(far.x / far.w, far.y / far.w, far.z / far.w)
    return { from, direction: to.sub(from).normalize() }
  }

  return {
    id: 'tower',
    type: 'custom',
    renderingMode: '3d',

    // Whether a point on the canvas (CSS pixels) falls on the tower: the ray
    // is walked through the site's box, a metre or so at a time, against the
    // wings and the podium (cheap enough to follow the pointer).
    hit(point) {
      if (!tower?.children.length || standing < 0.3 || !site.length) return false
      const { from, direction } = rayAt(point)
      const top = height * standing
      // Where the ray is within the box: x, z bounds and 0 to the top.
      let enter = 0, leave = Infinity
      for (const [origin, step, low, high] of [[from.x, direction.x, bounds[0], bounds[2]], [from.y, direction.y, 0, top], [from.z, direction.z, bounds[1], bounds[3]]]) {
        if (Math.abs(step) < 1e-9) { if (origin < low || origin > high) return false; continue }
        const a = (low - origin) / step, b = (high - origin) / step
        enter = Math.max(enter, Math.min(a, b))
        leave = Math.min(leave, Math.max(a, b))
      }
      if (!(enter < leave)) return false
      const steps = Math.min(400, Math.ceil(leave - enter))
      for (let i = 0; i <= steps; i++) {
        const t = enter + (leave - enter) * i / steps
        const at = [from.x + direction.x * t, from.z + direction.z * t], y = from.y + direction.y * t
        if (y <= PODIUM * standing && insideRing(at, site)) return true
        if (wings.some(ring => insideRing(at, ring))) return true
      }
      return false
    },
    // The plan view folds the tower away; the 3D view raises it again.
    setPlan(plan) { animate('plan', plan ? 0 : 1, 0.9) },

    onAdd(instance, gl) {
      map = instance
      // three.js needs WebGL 2; without it the map simply has no tower.
      if (typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext)) return
      renderer = new THREE.WebGLRenderer({ canvas: instance.getCanvas(), context: gl })
      renderer.autoClear = false
      camera = new THREE.Camera()
      camera.matrixWorldAutoUpdate = false

      hazeScene = new THREE.Scene()
      const hazeQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
        vertexShader: hazeVertex, fragmentShader: hazeFragment, transparent: true, depthTest: false, depthWrite: false,
        uniforms: { uInverse: { value: inverse }, uHaze: uniforms.uHaze, uSky: { value: rgb(SKY) } },
      }))
      hazeQuad.frustumCulled = false
      hazeScene.add(hazeQuad)

      shadowScene = new THREE.Scene()
      if (ground?.length) {
        const span = 240
        const { texture, centre } = shadowMask(ground.map(toWorld), span, 256, SHADOW_BLUR)
        shadow = new THREE.Mesh(new THREE.PlaneGeometry(span, span).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
          vertexShader: shadowVertex, fragmentShader: shadowFragment, transparent: true, depthWrite: false,
          uniforms: { uMask: { value: texture }, uStrength: { value: 0 }, uEye: uniforms.uEye, uHaze: uniforms.uHaze },
        }))
        // Just below the model's ground, which covers it within the site.
        shadow.position.set(centre[0], -0.4, centre[1])
        shadowScene.add(shadow)
      }

      scene = new THREE.Scene()
      tower = new THREE.Group()
      tower.rotation.y = -bearing * Math.PI / 180
      tower.visible = false
      scene.add(tower)
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(src, gltf => {
        if (!scene) return   // the map went first
        const looks = new Map()
        let top = 0
        gltf.scene.updateMatrixWorld(true)
        gltf.scene.traverse(object => {
          if (!object.isMesh) return
          const own = object.material
          if (!looks.has(own)) looks.set(own, finishOf(own))
          const look = looks.get(own)
          if (look) object.material = finish(look)
          else object.visible = false
          object.geometry.computeBoundingBox()
          top = Math.max(top, object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld).max.y)
        })
        looks.forEach((look, own) => { own.map?.dispose(); own.dispose() })
        // The label sits over the middle of the crowns.
        const crowns = new THREE.Box3(), point = new THREE.Vector3()
        gltf.scene.traverse(object => {
          if (!object.isMesh || !object.visible) return
          const position = object.geometry.attributes.position
          for (let i = 0; i < position.count; i += 7) {
            point.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld)
            if (point.y > top - 12) crowns.expandByPoint(point)
          }
        })
        crowns.getCenter(crown).setY(top)
        tower.add(gltf.scene)
        // It rises into place, as the map's own buildings do.
        if (stand.rise < 1) animate('rise', 1, 1.1)
        repaint()
      }, undefined, () => {})
    },

    render(gl, options) {
      if (!renderer) return
      camera.projectionMatrix.fromArray(options.defaultProjectionData.mainMatrix).multiply(place)
      inverse.copy(camera.projectionMatrix).invert()
      camera.projectionMatrixInverse.copy(inverse)
      eyeOf(camera.projectionMatrix, uniforms.uEye.value)
      mapLight(map, uniforms)
      const low = THREE.MathUtils.lerp(0.7, 0.98, 1 - uniforms.uIntensity.value)
      uniforms.uWall.value.set(low, Math.max(low, Math.sqrt(height / 150)))

      const zoom = THREE.MathUtils.clamp((map.getZoom() - RAMP[0]) / (RAMP[1] - RAMP[0]), 0, 1)
      standing = tower.children.length ? stand.rise * zoom * stand.plan : 0
      tower.scale.y = Math.max(standing, 0.0001)
      tower.visible = standing > 0.001
      if (shadow) {
        shadow.material.uniforms.uStrength.value = SHADOW_STRENGTH * standing
        shadow.visible = tower.visible
      }

      renderer.resetState()
      renderer.setViewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
      renderer.render(hazeScene, camera)
      if (tower.visible) {
        renderer.render(shadowScene, camera)
        renderer.render(scene, camera)
      }

      // Where the label goes: over the crowns, in CSS pixels on the canvas.
      if (onFrame) {
        let label = null
        if (tower.visible) {
          tower.updateMatrixWorld()
          const point = crown.clone().applyMatrix4(tower.matrixWorld)
          projected.set(point.x, point.y, point.z, 1).applyMatrix4(camera.projectionMatrix)
          if (projected.w > 0) {
            const canvas = map.getCanvas()
            label = { x: (projected.x / projected.w + 1) / 2 * canvas.clientWidth, y: (1 - projected.y / projected.w) / 2 * canvas.clientHeight }
          }
        }
        onFrame({ standing, label })
      }
    },

    onRemove() {
      motions.forEach(motion => motion.kill())
      const materials = new Set(finishes.values())
      ;[hazeScene, shadowScene, scene].forEach(group => group?.traverse(object => {
        object.geometry?.dispose()
        if (object.material) materials.add(object.material)
      }))
      materials.forEach(material => { material.uniforms?.uMask?.value?.dispose(); material.dispose() })
      renderer?.dispose()
      renderer = hazeScene = shadowScene = scene = camera = tower = shadow = map = null
      motions = []
    },
  }
}
