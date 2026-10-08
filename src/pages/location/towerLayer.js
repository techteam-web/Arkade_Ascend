import * as THREE from 'three'
import maplibregl from 'maplibre-gl'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { gsap } from '../../app/reveal.js'
import { prefersReducedMotion } from '../../hooks/useMediaQuery.js'
import { FINISHES, MAP_FIN, MAP_FINISHES } from '../../scenes/building/finishes.js'
import { sceneStore } from '../../scenes/sceneStore.js'

// The tower on the Location map: a three.js scene drawn inside MapLibre's own
// WebGL context (a custom layer), so it shares the map's camera and depth
// buffer: the city's buildings hide it, and it hides them, as they should. It
// draws only when the map does; there is no loop of its own.
//
// Each frame it draws, over what the map has drawn so far:
// 1. the weather: haze thickening towards the horizon, the sky above it, a
//    deck of soft clouds high over the city (seen from above, when zoomed
//    out) and their shadows drifting over the ground;
// 2. the shadows round the foot of the site and the tower's own;
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

const CLOUD_BASE = 1800   // metres
const CLOUD_TOP = 2600
// What each quality draws: clouds (levels through the deck, and whether
// their sun side is lit), soft taps per sun shadow, and how often the wind
// redraws a still map (it moves less than a pixel a frame). Low-power
// devices keep the haze, the sun and the shadows, without clouds.
export const QUALITY = {
  high: { levels: 8, sunlit: 1, taps: 8, fps: 15 },
  low: { levels: 4, sunlit: 0, taps: 4, fps: 10 },
  none: { levels: 0, sunlit: 0, taps: 4, fps: 0 },
}
const COVER = 0.62         // cloudiness the deck needs: about a quarter of the sky
const ARRIVAL_COVER = 0.2  // how much more cloud there is as the visit begins
const CLOUD_SHADE = 0.13   // how much the clouds' shadows darken the ground
const WIND = [9, 4]        // metres per second, east and south: off the sea

// The sun's shadows of the tower: a depth map drawn from the sun (see
// prerender), looked up with a few soft taps. 1 is sunlit, 0 in shadow.
const SUN_GLSL = /* glsl */ `
uniform highp sampler2DShadow uSunMap;
uniform mat4 uSunMatrix;
uniform vec2 uSunSoft;        // blur radius (uv) and depth bias
const vec2 TAPS[8] = vec2[8](vec2(-0.61, 0.33), vec2(0.18, 0.93), vec2(0.86, 0.29), vec2(0.52, -0.71),
  vec2(-0.27, -0.82), vec2(-0.94, -0.21), vec2(0.04, 0.12), vec2(-0.33, 0.57));
float sunlight(vec3 world, vec3 normal) {
  vec4 at = uSunMatrix * vec4(world + normal * 0.3, 1.0);
  vec3 p = at.xyz / at.w;
  if (p.z >= 1.0 || p.x <= 0.0 || p.y <= 0.0 || p.x >= 1.0 || p.y >= 1.0) return 1.0;
  float lit = 0.0;
  for (int i = 0; i < TAP_COUNT; i++) lit += texture(uSunMap, vec3(p.xy + TAPS[i] * uSunSoft.x, p.z - uSunSoft.y));
  return lit / float(TAP_COUNT);
}
`

// The clouds: one deck, 1.8 to 2.6 km up, drawn from one cloudiness field
// that drifts with the wind (a tileable noise texture, sampled at three
// scales: banks, single clouds and their detail). The shadows on the ground
// come from the same field, along the sun, so they belong to the clouds.
const CLOUD_GLSL = /* glsl */ `
uniform sampler2D uNoise;
uniform float uTime;
uniform vec2 uDrift;          // the wind, in metres per second
uniform vec3 uSun;            // towards the sun
uniform vec4 uCloud;          // how much the deck shows, its threshold, shadow strength, shadow threshold
const float BASE = ${CLOUD_BASE.toFixed(1)};
const float TOP = ${CLOUD_TOP.toFixed(1)};
const mat2 TURN_A = mat2(0.88, 0.48, -0.48, 0.88);
const mat2 TURN_B = mat2(0.62, -0.78, 0.78, 0.62);
const mat2 TURN_C = mat2(-0.13, 0.99, -0.99, -0.13);
// How cloudy the sky is over a point, 0 to 1, spread about evenly.
float field(vec2 p) {
  p -= uDrift * uTime;
  return texture2D(uNoise, TURN_A * p / 5200.0).r * 0.6
    + texture2D(uNoise, TURN_B * p / 21000.0 + 0.31).g * 0.3
    + texture2D(uNoise, TURN_C * p / 1400.0 + 0.67).g * 0.1;
}
// Cloud at a height through the deck (0 its base, 1 its top): higher up it
// takes more cloudiness, so each cloud domes.
float cloudAt(float value, float h, float threshold) {
  float edge = threshold + h * 0.18;
  return smoothstep(edge, edge + 0.08, value);
}
// How deep in the clouds' shadow a point is: the deck along the sun.
float cloudShade(vec3 at) {
  vec2 under = at.xz + uSun.xz * ((mix(BASE, TOP, 0.3) - at.y) / uSun.y);
  return cloudAt(field(under), 0.3, uCloud.w) * uCloud.z;
}
const vec3 CLOUD_SHADOW = vec3(0.36, 0.35, 0.42);   // what their shadows darken towards
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
uniform float uGlow;          // dusk: lights behind the glass
varying vec3 vWorld;
${HAZE_GLSL}
${SUN_GLSL}
${CLOUD_GLSL}
void main() {
  // Flat faces, turned towards the viewer (the model's parts are two-sided).
  vec3 normal = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (dot(normal, uEye - vWorld) < 0.0) normal = -normal;
  float value = dot(uColor, vec3(0.2126, 0.7152, 0.0722));
  // Faces turned from the sun and those in the tower's own shadow (a wing
  // on the podium, one wing on the other) take the same shade.
  float directional = clamp(dot(normal, uLight), 0.0, 1.0);
  if (directional > 0.0) directional *= sunlight(vWorld, normal);
  directional = mix(1.0 - uIntensity, max(1.0 - value + uIntensity, 1.0), directional);
  // Walls darken a little towards the ground, as the city's do (MapLibre
  // spares walls that face due east or west).
  if (abs(normal.y) < 0.5 && abs(normal.z) > 0.001) directional *= mix(uWall.x, uWall.y, clamp(vWorld.y / uHeight, 0.0, 1.0));
  vec3 color = clamp((uColor + 0.03) * directional * uLightColor, 0.3 * (1.0 - uLightColor), vec3(1.0));
  // Glass takes on the sky, the more so the more obliquely it is seen.
  float grazing = 1.0 - clamp(dot(normal, normalize(uEye - vWorld)), 0.0, 1.0);
  color = mix(color, uSky, uGloss * (0.3 + 0.7 * grazing * grazing * grazing));
  // At dusk the homes light up: about half the windows, each its own warmth.
  if (uGlow > 0.0 && uGloss > 0.5 && abs(normal.y) < 0.7) {
    vec2 across = normalize(vec2(-normal.z, normal.x));
    vec2 cell = floor(vec2(dot(vWorld.xz, across) / 2.6, vWorld.y / 3.2));
    float pick = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
    float on = step(0.45, pick) * (0.55 + 0.45 * fract(pick * 7.13));
    color = mix(color, vec3(1.0, 0.8, 0.53) * (0.86 + 0.14 * fract(pick * 3.7)), uGlow * on * 0.9);
  }
#if CLOUD_LEVELS > 0
  color = mix(color, CLOUD_SHADOW, cloudShade(vWorld));
#endif
  color = mix(color, uHaze, haze(distance(vWorld, uEye) / max(uEye.y, 1.0)));
  gl_FragColor = vec4(color, 1.0);
}`

// The weather: one quad over the whole view. Each corner carries the near
// and far points of its ray; per pixel, the ray gives the clouds it passes
// through, then the haze and the clouds' shadow on the ground, or the sky
// above the horizon. The output is premultiplied: the city drawn so far is
// darkened by the shadow, veiled by the haze and covered by the clouds.
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
uniform vec3 uEye;
uniform vec4 uClear;          // what the camera frames: its middle and half size, in metres
uniform float uClearSoft;
varying vec4 vNear;
varying vec4 vFar;
${HAZE_GLSL}
${CLOUD_GLSL}
uniform vec3 uCloudLit;       // sunlit tops
uniform vec3 uCloudDim;       // shaded undersides

// The deck along a ray, nearest level first: premultiplied colour, cover.
// Each pixel offsets its levels a little (a fine, even dither), so they
// blend into one volume instead of showing as stacked sheets.
vec4 clouds(vec3 eye, vec3 ray, float shown) {
  vec4 sum = vec4(0.0);
  bool above = eye.y > (BASE + TOP) * 0.5;
  float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  for (int i = 0; i < CLOUD_LEVELS; i++) {
    float h = (float(i) + dither) / float(CLOUD_LEVELS);
    if (above) h = 1.0 - h;
    float t = (mix(BASE, TOP, h) - eye.y) / ray.y;
    if (t <= 0.0) continue;
    vec2 p = eye.xz + ray.xz * t;
    float value = field(p);
    float cover = cloudAt(value, h, uCloud.y) * shown;
    if (cover < 0.003) continue;
    // Brighter towards the tops and on the side that faces the sun, where
    // the cloud thins towards it.
    float lit = 0.4 + 0.6 * h;
#if SUNLIT_CLOUDS
    lit += (value - field(p + normalize(uSun.xz) * 300.0)) * 3.0;
#endif
    vec3 color = mix(mix(uCloudDim, uCloudLit, clamp(lit, 0.0, 1.0)), uHaze, haze(t / max(eye.y, 1.0)));
    float a = cover * LEVEL_ALPHA;
    sum += (1.0 - sum.a) * vec4(color * a, a);
  }
  return sum;
}

void main() {
  vec3 ray = normalize(vFar.xyz / vFar.w - vNear.xyz / vNear.w);
  vec3 eye = uEye;
  vec4 deck = vec4(0.0);
#if CLOUD_LEVELS > 0
  if (uCloud.x > 0.0) {
    // From above, the clouds part where they would stand between the
    // camera and what it frames (the tower, a journey).
    float shown = uCloud.x;
    if (eye.y > TOP && ray.y < 0.0) {
      vec2 q = abs(eye.xz + ray.xz * (eye.y / -ray.y) - uClear.xy) - uClear.zw;
      shown *= smoothstep(0.0, uClearSoft, length(max(q, 0.0)) + min(max(q.x, q.y), 0.0));
    }
    if (shown > 0.0) deck = clouds(eye, ray, shown);
  }
#endif
  if (ray.y >= 0.0) {
    gl_FragColor = vec4(deck.rgb + (1.0 - deck.a) * mix(uHaze, uSky, smoothstep(0.0, 0.4, ray.y)), 1.0);
    return;
  }
  float mist = haze(1.0 / -ray.y);
  float shade = 0.0;
#if CLOUD_LEVELS > 0
  shade = cloudShade(eye + ray * (eye.y / -ray.y));
#endif
  gl_FragColor = vec4(deck.rgb + (1.0 - deck.a) * (CLOUD_SHADOW * shade * (1.0 - mist) + uHaze * mist),
    1.0 - (1.0 - deck.a) * (1.0 - shade) * (1.0 - mist));
}`

// The shadows on the ground: a soft one round the foot of the site (its
// outline, blurred) and the tower's own, cast by the sun. The model's
// ground covers the plane within the site, and shades itself there.
const shadowVertex = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`

const shadowFragment = /* glsl */ `
uniform sampler2D uMask;
uniform vec3 uMaskRect;       // the mask's west and south edges, and its span
uniform float uStrength;
uniform float uCast;
uniform vec3 uEye;
varying vec3 vWorld;
${HAZE_GLSL}
${SUN_GLSL}
void main() {
  vec2 uv = vec2(vWorld.x - uMaskRect.x, uMaskRect.y - vWorld.z) / uMaskRect.z;
  // The long shadow lightens towards its tip, as the sky fills it in.
  float reach = length(vWorld.xz - (uMaskRect.xy + vec2(0.5, -0.5) * uMaskRect.z));
  float thrown = (1.0 - sunlight(vWorld, vec3(0.0, 1.0, 0.0))) * uCast * mix(1.0, 0.45, smoothstep(50.0, 350.0, reach));
  float shade = max(texture2D(uMask, uv).r * uStrength, thrown);
  gl_FragColor = vec4(0.3, 0.21, 0.18, shade * (1.0 - haze(distance(vWorld, uEye) / max(uEye.y, 1.0))));
}`

// Day and dusk: haze at the horizon, the sky above, the sky in the glass,
// and the clouds' lit and shaded sides.
const HAZE = ['#f8f1e2', '#f5dbca']
const SKY = ['#ebe5d9', '#e1c4c6']
const GLASS_SKY = ['#eee8da', '#f0cfba']
const CLOUD_LIT = ['#fffcf5', '#ffd9bd']
const CLOUD_DIM = ['#d9d1cc', '#bda6b3']
const SHADOW_STRENGTH = 0.42
const SHADOW_BLUR = 7      // metres
const CAST_STRENGTH = 0.22 // the tower's own shadow on the ground
const SUN_MAP = 1024       // texels across the sun's view of the tower
const SUN_SOFT = 2         // metres of blur at a sun shadow's edge
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

// The clouds' noise: two channels of tileable gradient noise, five octaves
// each, every value replaced by its rank (through a fine histogram) so that
// a threshold reads as cover: 0.75 leaves a quarter of the texture over it.
function cloudNoise(size = 256) {
  const data = new Uint8Array(size * size * 2)
  const ease = t => t * t * t * (t * (t * 6 - 15) + 10)
  const values = new Float32Array(size * size)
  for (const channel of [0, 1]) {
    let seed = channel ? 7919 : 104729
    const random = () => (seed = seed * 16807 % 2147483647) / 2147483647
    values.fill(0)
    for (let octave = 0, amplitude = 1; octave < 5; octave++, amplitude /= 2) {
      const period = 4 << octave
      const gx = new Float32Array(period * period), gy = new Float32Array(period * period)
      for (let i = 0; i < gx.length; i++) { const a = random() * Math.PI * 2; gx[i] = Math.cos(a); gy[i] = Math.sin(a) }
      for (let y = 0; y < size; y++) {
        const v = y / size * period, iy = Math.floor(v), fy = v - iy, sy = ease(fy)
        const row0 = iy * period, row1 = (iy + 1) % period * period
        for (let x = 0; x < size; x++) {
          const u = x / size * period, ix = Math.floor(u), fx = u - ix, sx = ease(fx), ix1 = (ix + 1) % period
          const a = gx[row0 + ix] * fx + gy[row0 + ix] * fy
          const b = gx[row0 + ix1] * (fx - 1) + gy[row0 + ix1] * fy
          const c = gx[row1 + ix] * fx + gy[row1 + ix] * (fy - 1)
          const d = gx[row1 + ix1] * (fx - 1) + gy[row1 + ix1] * (fy - 1)
          const top = a + (b - a) * sx
          values[y * size + x] += (top + (c + (d - c) * sx - top) * sy) * amplitude
        }
      }
    }
    let low = Infinity, high = -Infinity
    for (const value of values) { low = Math.min(low, value); high = Math.max(high, value) }
    const bins = new Float64Array(4096), scale = (bins.length - 1) / (high - low)
    for (const value of values) bins[Math.round((value - low) * scale)]++
    for (let i = 1; i < bins.length; i++) bins[i] += bins[i - 1]
    for (let i = 0; i < values.length; i++) data[i * 2 + channel] = Math.round(bins[Math.round((values[i] - low) * scale)] / values.length * 255)
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGFormat)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

const smoothstep = (low, high, value) => THREE.MathUtils.smoothstep(value, low, high)

const PODIUM = 21          // the podium's roof, under the wings (metres)

const insideRing = ([x, z], ring) => {
  let inside = false
  for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) {
    const [xa, za] = ring[a], [xb, zb] = ring[b]
    if ((za > z) !== (zb > z) && x < (xb - xa) * (z - za) / (zb - za) + xa) inside = !inside
  }
  return inside
}

export function createTowerLayer({ src, lngLat, bearing, ground, footprints = [], height = 131.25, quality = 'high', onFrame }) {
  let tier = QUALITY[quality] ?? QUALITY.high
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
    uSky: { value: rgb(GLASS_SKY[0]) },
    uHaze: { value: rgb(HAZE[0]) },
    uCloudLit: { value: rgb(CLOUD_LIT[0]) },
    uCloudDim: { value: rgb(CLOUD_DIM[0]) },
    uGlow: { value: 0 },
    uSunMap: { value: null },
    uSunMatrix: { value: new THREE.Matrix4() },
    uSunSoft: { value: new THREE.Vector2() },
    uSun: { value: new THREE.Vector3(0, 1, 0) },
    uNoise: { value: null },
    uTime: { value: 0 },
    uDrift: { value: new THREE.Vector2(...WIND) },
    uCloud: { value: new THREE.Vector4() },
  }
  // One set of defines for every material. Fewer levels let each one cover
  // more, so the deck is as dense.
  const defines = {}
  const define = () => Object.assign(defines, { TAP_COUNT: tier.taps, CLOUD_LEVELS: tier.levels, SUNLIT_CLOUDS: tier.sunlit, LEVEL_ALPHA: (1 - 0.5 ** (5 / Math.max(1, tier.levels))).toFixed(3) })
  define()
  // Each finish shares the light; its colour and gloss are its own.
  const finishes = new Map()
  const finish = ({ color, gloss }) => {
    const key = `${color} ${gloss}`
    if (!finishes.has(key)) finishes.set(key, new THREE.ShaderMaterial({
      vertexShader: towerVertex, fragmentShader: towerFragment, side: THREE.DoubleSide, defines,
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
  // The sun's view of the tower, for its shadows: a depth map, redrawn only
  // when the tower's height or the sun's direction changes.
  let sunTarget, sunCamera, sunMaterial, sunKey = ''
  const sunReach = new THREE.Sphere()      // the whole model, standing
  const sun = uniforms.uSun.value
  const BIAS = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)

  const hazeSky = { value: rgb(SKY[0]) }

  // The weather: the stretch of ground the camera frames (its middle and
  // half size, in metres), which the clouds keep clear of, and the extra
  // cloud the visit's first view comes down through. The wind moves on a
  // clock of its own, which stops whenever the clouds should be still.
  const weather = { x: 0, z: 0, hx: 400, hz: 400, arrival: 0 }
  const clock = { time: 0, last: performance.now() }
  let ticker = 0
  const drifting = () => tier.fps > 0 && !prefersReducedMotion() && !document.hidden && !sceneStore.menuOpen && !sceneStore.leaving

  // What every pass of a frame shares: the light, and how far up the tower
  // stands (the zoom, its rise, the 3D or plan view).
  const update = () => {
    mapLight(map, uniforms)
    sun.copy(uniforms.uLight.value).normalize()
    const zoom = THREE.MathUtils.clamp((map.getZoom() - RAMP[0]) / (RAMP[1] - RAMP[0]), 0, 1)
    standing = tower.children.length ? stand.rise * zoom * stand.plan : 0
    tower.scale.y = Math.max(standing, 0.0001)
    tower.visible = standing > 0.001
  }

  const repaint = () => map?.triggerRepaint()
  // The wind redraws a still map now and then; a moving one draws anyway.
  // MapLibre places its labels afresh on every frame it draws and, with
  // their fade, keeps drawing until that settles (about 300 ms), which would
  // make every gust a run of frames. So once the camera has rested a moment,
  // labels are placed at once (as before the map's first idle), and each
  // gust is one frame; any camera move brings the fade back.
  let fade = null, movedAt = 0
  const rest = () => { if (fade === null && '_fadeDuration' in map) { fade = map._fadeDuration; map._fadeDuration = 0 } }
  const wake = () => { movedAt = performance.now(); if (fade !== null) { map._fadeDuration = fade; fade = null } }
  const blow = () => {
    clearInterval(ticker)
    if (!tier.fps) return
    ticker = setInterval(() => {
      if (!drifting()) return
      if (!map.isMoving() && performance.now() - movedAt > 1000) rest()
      repaint()
    }, 1000 / tier.fps)
  }
  const track = tween => { motions = motions.filter(motion => motion.isActive()); motions.push(tween) }
  const animate = (key, to, duration) => {
    if (prefersReducedMotion()) { stand[key] = to; repaint(); return }
    track(gsap.to(stand, { [key]: to, duration, ease: 'silk', overwrite: 'auto', onUpdate: repaint }))
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

    // Day (0) to dusk (1): the sky, haze, clouds and glass take on the
    // evening's colours and the windows light up (the sun is the map's).
    setDusk(t) {
      const blend = (target, [day, dusk]) => target.lerpVectors(rgb(day), rgb(dusk), t)
      blend(uniforms.uHaze.value, HAZE)
      blend(hazeSky.value, SKY)
      blend(uniforms.uSky.value, GLASS_SKY)
      blend(uniforms.uCloudLit.value, CLOUD_LIT)
      blend(uniforms.uCloudDim.value, CLOUD_DIM)
      uniforms.uGlow.value = t
      repaint()
    },

    // Lighter weather, for a device that struggles: the materials recompile.
    setQuality(name) {
      if (!renderer || !QUALITY[name] || QUALITY[name] === tier) return
      tier = QUALITY[name]
      define()
      ;[hazeScene, shadowScene, scene].forEach(group => group.traverse(object => { if (object.material) object.material.needsUpdate = true }))
      blow()
      repaint()
    },

    // What the camera now frames (places, as [lng, lat]), so the clouds keep
    // clear of it; they ease over with the camera's flight. The arrival
    // starts in a fuller deck that parts around the tower as it descends.
    focus(points, { duration = 1.8, arrival = false } = {}) {
      const [x0, z0, x1, z1] = points.map(toWorld).reduce((box, [x, z]) => [Math.min(box[0], x), Math.min(box[1], z), Math.max(box[2], x), Math.max(box[3], z)], [Infinity, Infinity, -Infinity, -Infinity])
      const target = { x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: Math.max(400, (x1 - x0) * 0.6 + 250), hz: Math.max(400, (z1 - z0) * 0.6 + 250), arrival: 0 }
      if (prefersReducedMotion()) { Object.assign(weather, target); repaint(); return }
      if (arrival) Object.assign(weather, { x: target.x, z: target.z, hx: 0, hz: 0, arrival: 1 })
      track(gsap.to(weather, { ...target, duration, ease: arrival ? 'power2.inOut' : 'silk', overwrite: 'auto', onUpdate: repaint }))
    },

    onAdd(instance, gl) {
      map = instance
      // three.js needs WebGL 2; without it the map simply has no tower.
      if (typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext)) return
      renderer = new THREE.WebGLRenderer({ canvas: instance.getCanvas(), context: gl })
      renderer.autoClear = false
      camera = new THREE.Camera()
      camera.matrixWorldAutoUpdate = false

      hazeScene = new THREE.Scene()
      if (tier.levels) uniforms.uNoise.value = cloudNoise()
      const hazeQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
        vertexShader: hazeVertex, fragmentShader: hazeFragment, defines,
        transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false,
        uniforms: { ...uniforms, uInverse: { value: inverse }, uSky: hazeSky, uClear: { value: new THREE.Vector4() }, uClearSoft: { value: 700 } },
      }))
      hazeQuad.frustumCulled = false
      hazeScene.add(hazeQuad)
      instance.on('move', wake)
      blow()

      // The sun's depth map: compared in hardware, filtered for soft edges.
      sunTarget = new THREE.WebGLRenderTarget(SUN_MAP, SUN_MAP, { depthTexture: new THREE.DepthTexture(SUN_MAP, SUN_MAP, THREE.UnsignedIntType) })
      sunTarget.depthTexture.compareFunction = THREE.LessEqualCompare
      sunTarget.depthTexture.minFilter = sunTarget.depthTexture.magFilter = THREE.LinearFilter
      uniforms.uSunMap.value = sunTarget.depthTexture
      sunCamera = new THREE.OrthographicCamera()
      sunMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide })

      shadowScene = new THREE.Scene()
      if (ground?.length) {
        // The site's soft outline over 240 m; the plane reaches further, for
        // the tower's long shadow (longest at dusk, about 400 m).
        const span = 240
        const { texture, centre } = shadowMask(ground.map(toWorld), span, 256, SHADOW_BLUR)
        shadow = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1100).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
          vertexShader: shadowVertex, fragmentShader: shadowFragment, transparent: true, depthWrite: false, defines,
          uniforms: {
            uMask: { value: texture }, uMaskRect: { value: new THREE.Vector3(centre[0] - span / 2, centre[1] + span / 2, span) },
            uStrength: { value: 0 }, uCast: { value: 0 }, uEye: uniforms.uEye, uHaze: uniforms.uHaze,
            uSunMap: uniforms.uSunMap, uSunMatrix: uniforms.uSunMatrix, uSunSoft: uniforms.uSunSoft,
          },
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
        tower.updateMatrixWorld(true)
        new THREE.Box3().setFromObject(tower).getBoundingSphere(sunReach)
        // It rises into place, as the map's own buildings do.
        if (stand.rise < 1) animate('rise', 1, 1.1)
        repaint()
      }, undefined, () => {})
    },

    // Before the map draws: the tower as the sun sees it, as depth, when
    // that has changed since it was last drawn.
    prerender() {
      if (!renderer) return
      update()
      if (!tower.visible) return
      const key = `${standing.toFixed(4)} ${sun.toArray().map(value => value.toFixed(4))}`
      if (key === sunKey) return
      sunKey = key
      const { center, radius } = sunReach
      const far = radius * 2 + 100 + 600   // past the model, to the end of its shadow
      Object.assign(sunCamera, { left: -radius, right: radius, top: radius, bottom: -radius, near: 1, far })
      sunCamera.position.copy(center).addScaledVector(sun, radius + 100)
      sunCamera.up.set(0, 1, 0)
      if (Math.abs(sun.y) > 0.99) sunCamera.up.set(0, 0, -1)
      sunCamera.lookAt(center)
      sunCamera.updateMatrixWorld()
      sunCamera.updateProjectionMatrix()
      uniforms.uSunMatrix.value.copy(BIAS).multiply(sunCamera.projectionMatrix).multiply(sunCamera.matrixWorldInverse)
      uniforms.uSunSoft.value.set(SUN_SOFT / (radius * 2), 0.25 / (far - 1))
      renderer.resetState()
      renderer.setRenderTarget(sunTarget)
      renderer.clear()
      scene.overrideMaterial = sunMaterial
      renderer.render(scene, sunCamera)
      scene.overrideMaterial = null
      renderer.setRenderTarget(null)
    },

    render(gl, options) {
      if (!renderer) return
      camera.projectionMatrix.fromArray(options.defaultProjectionData.mainMatrix).multiply(place)
      inverse.copy(camera.projectionMatrix).invert()
      camera.projectionMatrixInverse.copy(inverse)
      eyeOf(camera.projectionMatrix, uniforms.uEye.value)
      update()
      // The deck shows from well above it (and from well below, in the sky),
      // and thins and parts as the camera comes down towards it.
      const now = performance.now()
      if (drifting()) clock.time += Math.min(now - clock.last, 100) / 1000
      clock.last = now
      uniforms.uTime.value = clock.time
      const altitude = uniforms.uEye.value.y
      const above = smoothstep(CLOUD_TOP * 1.4, CLOUD_TOP * 2.6, altitude)
      const below = 1 - smoothstep(CLOUD_BASE * 0.4, CLOUD_BASE * 0.75, altitude)
      uniforms.uCloud.value.set(Math.max(above, below), COVER + (1 - above) * 0.1 - weather.arrival * ARRIVAL_COVER, CLOUD_SHADE, COVER)
      hazeScene.children[0].material.uniforms.uClear.value.set(weather.x, weather.z, weather.hx, weather.hz)
      const low = THREE.MathUtils.lerp(0.7, 0.98, 1 - uniforms.uIntensity.value)
      uniforms.uWall.value.set(low, Math.max(low, Math.sqrt(height / 150)))
      if (shadow) {
        shadow.material.uniforms.uStrength.value = SHADOW_STRENGTH * standing
        shadow.material.uniforms.uCast.value = CAST_STRENGTH * standing
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
      clearInterval(ticker)
      if (map) { wake(); map.off('move', wake) }
      uniforms.uNoise.value?.dispose()
      motions.forEach(motion => motion.kill())
      const materials = new Set(finishes.values())
      ;[hazeScene, shadowScene, scene].forEach(group => group?.traverse(object => {
        object.geometry?.dispose()
        if (object.material) materials.add(object.material)
      }))
      materials.forEach(material => { material.uniforms?.uMask?.value?.dispose(); material.dispose() })
      sunMaterial?.dispose()
      sunTarget?.depthTexture.dispose()
      sunTarget?.dispose()
      renderer?.dispose()
      renderer = hazeScene = shadowScene = scene = camera = tower = shadow = map = sunTarget = sunCamera = sunMaterial = null
      motions = []
    },
  }
}
