import React, { useMemo, useRef, useLayoutEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  EffectComposer, Bloom, DepthOfField, Vignette, SMAA, ToneMapping,
  ChromaticAberration, Noise, HueSaturation,
} from '@react-three/postprocessing'
import { ToneMappingMode, BlendFunction } from 'postprocessing'
import * as THREE from 'three'

/* ==================================================================
 * GOLD SILK RIBBON — realism pass
 *
 * What changed from the first version, and why:
 *
 *  1. OPAQUE, not transparent. This is the structural one. A
 *     transparent material with depthWrite:false writes no depth, so
 *     it cannot self-shadow, cannot be depth-of-field'd, and sorts
 *     badly against itself. The reference ribbon is essentially opaque
 *     anyway — you only see through it at the very thinnest edges.
 *     Going opaque unlocks shadows + DOF, which is most of the realism.
 *
 *  2. ANISOTROPIC specular (Kajiya-Kay). Silk's highlight is a long
 *     band running ALONG the weave, not a round dot. This is the single
 *     biggest material cue and no amount of roughness tuning fakes it.
 *
 *  3. Real self-shadowing via a customDepthMaterial carrying the same
 *     vertex displacement. Without the matching depth material the
 *     shadow is cast by the flat undeformed plane, which looks broken.
 *
 *  4. Bloom + DOF + vignette, because the reference is a photograph
 *     and photographs have a lens.
 * ================================================================== */

const TAU = 6.283185307

/* ---------- shared ribbon geometry, used by BOTH the visible
     material and the depth material that casts the shadow ---------- */
const ribbonPars = /* glsl */ `
  uniform float uTime, uLength, uWidth, uAmp, uFreq;
  uniform float uTwist, uTwistFreq, uSpeed;
  uniform vec3  uPointer;      // cursor, in world space on the z=0 plane
  uniform float uPointerAmt;   // eased 0..1 presence
  uniform float uPointerR;     // falloff radius
  uniform float uZCentre;      // centre of this ribbon's depth slab
  uniform float uZHalf;        // half-thickness of that slab

  varying float vEdge;
  varying float vTwistT;
  varying float vDepth;
  varying vec3  vTan;          // along-length direction, for anisotropy
  varying vec2  vSilkUV;

  void ribbonFrame(float u, out vec3 centre, out vec3 tangent, out vec3 across) {
    float t = uTime * uSpeed;

    float x = (u - 0.5) * uLength;
    float y = uAmp * sin(u * TAU * uFreq + t)
            + uAmp * 0.35 * sin(u * TAU * uFreq * 2.17 - t * 0.7);
    float z = uAmp * 0.55 * cos(u * TAU * uFreq * 0.75 + t * 0.55);
    centre = vec3(x, y, z);

    // cursor bulge — lifts the sheet toward the camera near the pointer.
    // Applied to the CENTRELINE inside this function so the finite-
    // difference normals below pick it up automatically.
    float d = length(centre.xy - uPointer.xy);
    float bulge = uPointerAmt * exp(-(d * d) / (2.0 * uPointerR * uPointerR));
    centre.z += bulge * 1.05;

    float e = 0.0015;
    float x2 = (u + e - 0.5) * uLength;
    float y2 = uAmp * sin((u + e) * TAU * uFreq + t)
             + uAmp * 0.35 * sin((u + e) * TAU * uFreq * 2.17 - t * 0.7);
    float z2 = uAmp * 0.55 * cos((u + e) * TAU * uFreq * 0.75 + t * 0.55);
    vec3 c2 = vec3(x2, y2, z2);
    float d2 = length(c2.xy - uPointer.xy);
    c2.z += uPointerAmt * exp(-(d2 * d2) / (2.0 * uPointerR * uPointerR)) * 1.05;

    tangent = normalize(c2 - centre);

    vec3 up   = vec3(0.0, 0.0, 1.0);
    vec3 side = normalize(cross(tangent, up));
    vec3 nrm  = normalize(cross(side, tangent));

    // the pointer also adds a little local twist, so the sheet turns
    // to face you rather than only swelling
    float a = uTwist * sin(u * TAU * uTwistFreq + t * 0.8)
            + bulge * 0.9;
    across = side * cos(a) + nrm * sin(a);
  }

  vec3 ribbonPoint(float u, float v) {
    vec3 c, tg, ac;
    ribbonFrame(u, c, tg, ac);
    vec3 p = c + ac * (v - 0.5) * uWidth;

    // DEPTH SLAB — the collision fix.
    //
    // The two ribbons cross in screen space on purpose; what looked wrong
    // was them interpenetrating where they met. The twist is the reason:
    // when the band rolls edge-on its cross-section points along Z, so it
    // sweeps +/- width/2 in DEPTH, easily enough to punch through the
    // other ribbon. Confining each to its own disjoint slab of Z makes the
    // intersection impossible by construction, whatever they do in X/Y.
    //
    // Soft-bounded with an algebraic sigmoid, not clamped: a hard clamp
    // would flatten the roll into a crease. s/sqrt(1+s^2) is smooth,
    // asymptotic to +/-1, and works on GLSL ES 1.00 (tanh does not).
    float s = (p.z - uZCentre) / uZHalf;
    p.z = uZCentre + uZHalf * (s * inversesqrt(1.0 + s * s));
    return p;
  }
`.replace(/\bTAU\b/g, '6.283185307')

const ribbonDisplace = /* glsl */ `
  float u = uv.x, v = uv.y;
  transformed = ribbonPoint(u, v);
`

const ribbonDisplaceWithNormals = /* glsl */ `
  float u = uv.x, v = uv.y;
  float e = 0.002;

  vec3 p  = ribbonPoint(u, v);
  vec3 pu = ribbonPoint(min(u + e, 1.0), v);
  vec3 pv = ribbonPoint(u, min(v + e, 1.0));

  vEdge   = abs(v - 0.5) * 2.0;
  vSilkUV = uv;
  vTwistT = abs(sin(u * 6.283185307 * uTwistFreq + uTime * uSpeed * 0.8));
  vDepth  = p.z;

  transformed = p;
  vec3 n = normalize(cross(normalize(pu - p), normalize(pv - p)));
  objectNormal = n;
  vNormal = normalize(normalMatrix * n);
  vTan = normalize(normalMatrix * normalize(pu - p));
`

const fragHelpers = /* glsl */ `
  varying float vEdge;
  varying float vTwistT;
  varying float vDepth;
  varying vec3  vTan;
  varying vec2  vSilkUV;
  uniform vec3  uLightDir;
  uniform vec3  uBgColor;

  float hash21(vec2 p){
    p = fract(p * vec2(233.34, 851.73));
    p += dot(p, p + 23.45);
    return fract(p.x * p.y);
  }

  // shadowed bronze -> mid gold -> hot highlight
  vec3 goldRamp(float t){
    // Linear-light bronze palette: dark folds, copper-gold body, warm crest.
    vec3 lo  = vec3(0.025, 0.009, 0.004);
    vec3 mid = vec3(0.300, 0.135, 0.052);
    vec3 hi  = vec3(0.820, 0.510, 0.250);
    return t < 0.5
      ? mix(lo,  mid, smoothstep(0.0, 0.5, t))
      : mix(mid, hi,  smoothstep(0.5, 1.0, t));
  }

  // Kajiya-Kay anisotropic specular: the highlight is a BAND along the
  // tangent, not a dot around the normal. This is what silk does.
  float silkSpec(vec3 T, vec3 L, vec3 V, float exponent){
    float TdotL = dot(T, L);
    float TdotV = dot(T, V);
    float s = sqrt(max(1.0 - TdotL * TdotL, 0.0))
            * sqrt(max(1.0 - TdotV * TdotV, 0.0))
            - TdotL * TdotV;
    return pow(max(s, 0.0), exponent);
  }
`

const fragBody = /* glsl */ `
  vec3 T = normalize(vTan);
  vec3 N = normalize(vNormal);

  vec3 V = normalize(vViewPosition);
  vec3 L = normalize((viewMatrix * vec4(uLightDir, 0.0)).xyz);

  // translucency — silk is lit THROUGH as well as on
  float back  = pow(max(dot(-N, L), 0.0), 2.0);
  float front = max(dot(N, L), 0.0);
  float through = back * 0.62 + front * 0.42;

  // two anisotropic lobes: a broad soft one and a tight hot one.
  // The tight lobe is what reads as the bright crease at the fold.
  float specBroad = silkSpec(T, L, V, 24.0) * 0.24;
  float specHot   = silkSpec(T, L, V, 140.0) * 0.38;

  float lum = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float t = clamp(lum * 0.10 + through * 0.90 + specBroad * 0.50, 0.0, 1.0);

  vec3 col = goldRamp(pow(t, 1.12));
  // Fine lengthwise silk grain stays on the fabric as the ribbon moves.
  float weave = hash21(floor(vSilkUV * vec2(1500.0, 420.0)));
  float fibres = sin(vSilkUV.y * 1800.0 + sin(vSilkUV.x * 65.0) * 2.0);
  col *= 0.89 + weave * 0.17 + fibres * 0.045;
  col += vec3(1.0, 0.69, 0.36) * specHot;

  // gold dust, clustered along the fold and scintillating with view angle
  vec2  cell    = floor(vSilkUV * vec2(2400.0, 600.0));
  float grain   = hash21(cell);
  float flicker = hash21(cell + 17.3);
  float sparkle = smoothstep(0.985, 1.0, grain)
                * pow(vTwistT, 2.5)
                * smoothstep(0.22, 0.70, t)
                * (0.5 + 0.5 * flicker) * 0.35;
  col += vec3(1.0, 0.65, 0.30) * sparkle;

  // Thin edges bleed into the background instead of ending on a hard cut.
  // Kept tight: against a DARK ground a wide blend reads as a dirty dark
  // halo tracing the silhouette rather than as a soft edge.
  float edgeFade = 1.0 - smoothstep(0.93, 1.0, vEdge);
  col = mix(uBgColor, col, edgeFade);

  // aerial perspective: far parts sink toward the background colour
  float far = smoothstep(2.0, 12.0, abs(vDepth));
  col = mix(col, uBgColor, far * 0.34);

  gl_FragColor.rgb = col;
  gl_FragColor.a = 1.0;
`

function patchRibbon(mat, uniforms, withNormals) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + ribbonPars)
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n' +
          (withNormals ? ribbonDisplaceWithNormals : ribbonDisplace)
      )
    if (withNormals) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + fragHelpers)
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + fragBody)
    }
  }
  // three's program cache key is derived from material properties and does
  // NOT account for onBeforeCompile. Two materials with identical property
  // signatures but different injected GLSL can therefore collide and get
  // served the wrong compiled program — which shows up as intermittent
  // black or garbage frames. Give each variant its own key.
  mat.customProgramCacheKey = () => (withNormals ? 'ribbon-visible-bronze-v2' : 'ribbon-depth-v1')
  mat.needsUpdate = true
  return mat
}

function useWarmEnvironment() {
  const { gl, scene } = useThree()
  useLayoutEffect(() => {
    const size = 64
    const data = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) {
      const t = y / (size - 1)
      const r = THREE.MathUtils.lerp(255, 66, t)
      const g = THREE.MathUtils.lerp(240, 40, t)
      const b = THREE.MathUtils.lerp(212, 22, t)
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    tex.mapping = THREE.EquirectangularReflectionMapping
    tex.needsUpdate = true
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromEquirectangular(tex).texture
    scene.environment = env
    return () => { env.dispose(); tex.dispose(); pmrem.dispose() }
  }, [gl, scene])
}

// Dust uses the very same deformation function and uniform objects as its
// ribbon. Both edges stay attached through twists, parallax and pointer bends.
function RibbonDust({ uniforms }) {
  const { gl } = useThree()
  const geometry = useMemo(() => {
    const count = 3600
    const seeds = new Float32Array(count * 3)
    const random = (i, salt) => {
      const n = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
      return n - Math.floor(n)
    }
    for (let i = 0; i < count; i++) {
      seeds[i * 3] = random(i, 1)
      seeds[i * 3 + 1] = random(i, 2)
      seeds[i * 3 + 2] = random(i, 3)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(seeds, 3))
    return result
  }, [])
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uPixelRatio: { value: gl.getPixelRatio() } },
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      ${ribbonPars}
      uniform float uPixelRatio;
      varying float vDustAlpha;
      varying float vDustWarmth;
      void main() {
        float u = 0.002 + position.x * 0.996;
        float edge = step(0.5, position.y);
        float spread = fract(position.y * 2.0);
        vec3 anchor = ribbonPoint(u, edge);
        vec3 inside = ribbonPoint(u, mix(0.02, 0.98, edge));
        vec3 outward = normalize(anchor - inside);
        float phase = position.z * 6.283185307;
        float flutter = sin(uTime * 0.8 + phase);
        // A dense fringe close to the edge, tapering into sparse floating dust.
        float distanceFromEdge = 0.015 + pow(spread, 2.8) * 0.85;
        vec3 p = anchor + outward * distanceFromEdge * (1.0 + flutter * 0.12);
        p.z += sin(phase * 3.0 + uTime) * distanceFromEdge * 0.25;
        vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = clamp((0.8 + position.z * 2.0) * uPixelRatio * 15.0 / -viewPosition.z, 1.0, 6.0);
        vDustAlpha = mix(0.8, 0.12, spread) * (0.75 + flutter * 0.25);
        vDustWarmth = position.z;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vDustAlpha;
      varying float vDustWarmth;
      void main() {
        float radius = length(gl_PointCoord - 0.5) * 2.0;
        if (radius >= 1.0) discard;
        float alpha = (1.0 - smoothstep(0.1, 1.0, radius)) * vDustAlpha;
        vec3 gold = mix(vec3(0.55, 0.27, 0.07), vec3(1.0, 0.78, 0.40), vDustWarmth);
        gl_FragColor = vec4(gold, alpha);
      }
    `,
  }), [uniforms, gl])
  useFrame(() => { material.uniforms.uPixelRatio.value = gl.getPixelRatio() })
  useLayoutEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

/* ---------- one ribbon ---------- */
function Ribbon({
  length = 26, width = 2.3, amp = 2.4, freq = 0.8,
  twist = 1.5, twistFreq = 0.85, speed = 0.3,
  segments = [900, 64],
  zCentre = 0, zHalf = 1.5,
  pointer,          // shared damped pointer ref
  lightDir,
  bgColor = '#9B703D',
}) {
  const meshRef = useRef()
  const reducedMotion = useRef(false)

  useLayoutEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reducedMotion.current = preference.matches }
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])

  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uLength:     { value: length },
    uWidth:      { value: width },
    uAmp:        { value: amp },
    uFreq:       { value: freq },
    uTwist:      { value: twist },
    uTwistFreq:  { value: twistFreq },
    uSpeed:      { value: speed },
    uPointer:    { value: new THREE.Vector3(0, 0, 0) },
    uPointerAmt: { value: 0 },
    uPointerR:   { value: 3.2 },
    uZCentre:    { value: zCentre },
    uZHalf:      { value: zHalf },
    uLightDir:   { value: lightDir },
    uBgColor:    { value: new THREE.Color(bgColor) },
  }), [length, width, amp, freq, twist, twistFreq, speed, zCentre, zHalf, lightDir, bgColor])

  const material = useMemo(() => patchRibbon(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#C9924D'),
      side: THREE.DoubleSide,
      roughness: 0.42,
      metalness: 0.0,
      sheen: 1.0,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color('#FFE6B8'),
      clearcoat: 0.18,
      clearcoatRoughness: 0.55,
      envMapIntensity: 0.4,
      // OPAQUE — see the header note. This is what lets it self-shadow.
      transparent: false,
      depthWrite: true,
    }),
    uniforms, true
  ), [uniforms])

  // The shadow caster needs the SAME displacement, or the ribbon casts
  // the shadow of a flat rectangle.
  const depthMaterial = useMemo(() => patchRibbon(
    new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      side: THREE.DoubleSide,
    }),
    uniforms, false
  ), [uniforms])

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(1, 1, segments[0], segments[1]),
    [segments]
  )

  useLayoutEffect(() => {
    if (meshRef.current) meshRef.current.customDepthMaterial = depthMaterial
  }, [depthMaterial])

  useFrame((state, dt) => {
    // Advance continuously so folds travel along the strips rather than
    // barely rocking around the first frame. Cap tab-resume time jumps.
    // The attached dust shares this clock and the exact same deformation.
    if (!reducedMotion.current) uniforms.uTime.value += Math.min(dt, 0.05)
    if (pointer) {
      uniforms.uPointer.value.copy(pointer.current.world)
      // Deformation happens in ribbon-local space; each ribbon is translated
      // and rotated differently, so convert the shared world-space cursor.
      meshRef.current?.worldToLocal(uniforms.uPointer.value)
      uniforms.uPointerAmt.value = pointer.current.amt
    }
  })

  return (
    <>
      <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow frustumCulled={false} />
      <RibbonDust uniforms={uniforms} />
    </>
  )
}

/* ---------- damped pointer + camera parallax ----------
 * Everything the cursor drives is exponentially smoothed. Raw pointer
 * values feel twitchy and cheap; the damping is what makes it read as
 * heavy fabric responding, rather than a mouse-follow gimmick.
 */
function useDampedPointer() {
  const { camera, gl } = useThree()
  const ref = useRef({
    ndc: new THREE.Vector2(0, 0),
    target: new THREE.Vector2(0, 0),
    world: new THREE.Vector3(0, 0, 0),
    amt: 0,
    targetAmt: 0,
  })

  const onMove = useCallback((e) => {
    if (e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const s = ref.current
    const bounds = gl.domElement.getBoundingClientRect()
    if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) {
      s.targetAmt = 0
      return
    }
    s.target.set(
      ((e.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((e.clientY - bounds.top) / bounds.height) * 2 + 1
    )
    s.targetAmt = 1
  }, [gl])

  const onLeave = useCallback(() => { ref.current.targetAmt = 0 }, [])

  useLayoutEffect(() => {
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [onMove, onLeave])

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
  const ray = useMemo(() => new THREE.Raycaster(), [])

  useFrame((state, dt) => {
    const s = ref.current
    // frame-rate independent exponential damping
    const k = 1 - Math.exp(-dt * 3.0)
    s.ndc.lerp(s.target, k)
    s.amt += (s.targetAmt - s.amt) * (1 - Math.exp(-dt * 2.0))

    // project the cursor onto the ribbon's z=0 plane
    ray.setFromCamera(s.ndc, camera)
    ray.ray.intersectPlane(plane, s.world)

    // camera parallax — small. 0.6 world units is plenty at this FOV.
    camera.position.x += (s.ndc.x * 0.6 - camera.position.x) * (1 - Math.exp(-dt * 2.0))
    camera.position.y += (s.ndc.y * 0.4 - camera.position.y) * (1 - Math.exp(-dt * 2.0))
    camera.lookAt(0, 0, 0)
  })

  return ref
}

function Scene({ bgColor, composition }) {
  useWarmEnvironment()
  const { size } = useThree()
  const ribbonScale = Math.max(0.5, Math.min(1.6, size.width / size.height / (16 / 9)))
  const pointer = useDampedPointer()
  const keyRef = useRef()

  // shared, mutable light direction — the fragment shader reads this so
  // the anisotropic highlight tracks the light as the cursor moves it
  const lightDir = useMemo(() => new THREE.Vector3(-6, 4, -8).normalize(), [])
  const base = useMemo(() => new THREE.Vector3(-6, 4, -8), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    if (!keyRef.current) return
    const s = pointer.current
    // the key light drifts opposite the cursor, so the specular band
    // sweeps across the silk as you move
    tmp.set(base.x - s.ndc.x * 2.4, base.y + s.ndc.y * 1.8, base.z)
    keyRef.current.position.lerp(tmp, 1 - Math.exp(-dt * 1.8))
    lightDir.copy(keyRef.current.position).normalize()
  })

  return (
    <>
      <ambientLight intensity={0.06} />
      <directionalLight
        ref={keyRef}
        position={[-6, 4, -8]}
        intensity={1.12}
        color="#FFE9C4"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0008}
        shadow-radius={6}
      />
      <directionalLight position={[8, -3, 5]} intensity={0.3} color="#A8692B" />

      {/* Two ribbons kept strictly apart: same frequency and phase, so their
          centrelines are parallel curves that can never intersect, separated
          by more than their combined half-widths. Differing the frequency is
          what made them cross before — two sines of different period always
          meet somewhere. */}
      {/* The crossing composition is back. The two ribbons overlap in
          SCREEN space — that is the shape we want — but they are pinned to
          disjoint slabs of depth, so the back one always passes cleanly
          behind. Back slab: -4.0 +/- 1.3  =>  [-5.3, -2.7]
          Front slab:  0.0 +/- 1.5  =>  [-1.5,  1.5]
          1.2 units of clearance between them at the worst case. */}
      <group rotation={[0, 0, composition === 'menu' ? -0.5 : 0]} scale={[ribbonScale, 1, 1]}>
      <group position={[-6, 4.4, -4.0]} rotation={[0, 0, 0.48]}>
        <Ribbon amp={1.4} freq={0.62} twist={1.6} twistFreq={0.6} speed={0.22}
                width={3.9} zCentre={0} zHalf={1.3}
                pointer={pointer} lightDir={lightDir} bgColor={bgColor} />
      </group>
      <group position={[6.7, -3.4, 0]} rotation={[0, 0, 0.65]}>
        <Ribbon amp={1.5} width={3.2} freq={0.65} zCentre={0} zHalf={1.5}
                pointer={pointer} lightDir={lightDir} bgColor={bgColor} />
      </group>
      </group>
    </>
  )
}

/* Palette sampled from the brochure PDF:
     #473138  deep plum   — page 3 ground AND page 5's copy panel
     #191213  espresso    — cover, and the panel on page 4
     #F4EDCC  cream/bone  — location map, floor plans
     #9B703D  gold ground — page 2 ONLY, and it is the weak spread.
   Gold on gold has almost no contrast, which is why the ribbon read as
   muddy. On the plum it behaves like the cover: gold as the accent. */
export const BROCHURE = {
  plum:     '#3A272D',
  espresso: '#191213',
  cream:    '#F4EDCC',
  gold:     '#9B703D',
}

export default function GoldRibbonBackground({
  bgColor = BROCHURE.plum,
  backdrop = 'radial-gradient(ellipse 120% 90% at 50% 42%, #4A333A 0%, #2A1D22 55%, #150E11 100%)',
  className,
  style,
  composition = 'landing',
  quality = 'high',   // 'high' | 'low' — drop to 'low' on mobile
}) {
  return (
    <div className={className}
         style={{ position: 'absolute', inset: 0, background: backdrop || bgColor, ...style }}>
      <Canvas
        shadows
        camera={{ position: [0, 0, 15], fov: 36, near: 4, far: 34 }}
        dpr={quality === 'high' ? [1, 2] : [1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NoToneMapping   // done in the composer instead
          gl.shadowMap.type = THREE.PCFSoftShadowMap
        }}
      >
        <Scene bgColor={bgColor} composition={composition} />
        {/* multisampling MUST stay 0 while DepthOfField is in the chain:
            an MSAA target's depth buffer cannot be sampled directly, and the
            resolve produces intermittent black frames on many drivers.
            SMAA replaces the antialiasing as a post pass. */}
        <EffectComposer disableNormalPass multisampling={0}>
          <Bloom
            intensity={0.42}
            luminanceThreshold={0.72}
            luminanceSmoothing={0.3}
            mipmapBlur
          />
          {quality === 'high' ? (
            <DepthOfField
              worldFocusDistance={15}
              worldFocusRange={9}
              bokehScale={2.6}
            />
          ) : null}
          {/* ---- the lens pass ----
              None of this adds surface information; it is what separates a
              clean render from a photograph. CA is radial only, so the
              centre stays sharp and only the corners fringe, the way a real
              lens behaves. The grain goes LAST (after tone mapping) because
              film grain lives in the print, not in the scene. */}
          {quality === 'high' ? (
            <ChromaticAberration
              offset={[0.0007, 0.0007]}
              radialModulation
              modulationOffset={0.35}
            />
          ) : null}
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <HueSaturation saturation={0.06} />
          <Vignette eskil={false} offset={0.3} darkness={0.38} />
          <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.11} />
          <SMAA />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
