import { useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing'
import * as THREE from 'three'
import { presets, sceneStore } from '../sceneStore.js'
import { silkVertex, silkFragment, backdropVertex, backdropFragment, dustVertex, dustFragment } from './shaders.js'
import TowerModel from '../tower/TowerModel.jsx'
import GoldThreads from '../threads/GoldThreads.jsx'
import ArkadeEmblem from '../emblem/ArkadeEmblem.jsx'

const COLOR_KEYS = ['top', 'bottom', 'glow', 'shadow', 'mid', 'high', 'dustColor', 'threadColor', 'mistColor']
const NUMBER_KEYS = ['glowStrength', 'vignette', 'opacity', 'glitter', 'sheer', 'dust', 'speed', 'threads', 'threadLight', 'mist']
// Effects a preset does not mention stay off.
const DEFAULTS = { threads: 0, threadLight: 0, mist: 0, threadColor: '#e3c292', mistColor: '#b88a58', threadPose: { y: 0, rot: -0.06 } }
const POSE_KEYS = ['x', 'y', 'rot', 'scale']
const CAMERA_Z = 12
const FOV = 35
const HALF_HEIGHT = CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2))

// Three sheets make up the veil: a broad faint back layer, the hero band and
// a narrow wisp, each on its own depth and phase so they never move in step.
const LAYERS = [
  { width: 5.6, amp: 1.35, freq: 0.52, twist: 0.9, twistFreq: 0.34, phase: 1.3, billow: 0.26, opacity: 0.42, sheer: 0.7, z: -2.6, seed: 3.7 },
  { width: 3.7, amp: 1.2, freq: 0.6, twist: 1.35, twistFreq: 0.5, phase: 0, billow: 0.17, opacity: 1, sheer: 1, z: 0, seed: 1.1 },
  { width: 0.95, amp: 1.0, freq: 0.68, twist: 2.1, twistFreq: 0.85, phase: 2.4, billow: 0.05, opacity: 0.8, sheer: 1.3, z: 1.3, seed: 7.9 },
]
const LENGTH = 34

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export default function SilkScene({ quality = 'high', paused = false }) {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Canvas
        frameloop={paused ? 'never' : 'always'}
        dpr={quality === 'high' ? [1, 2] : [1, 1.5]}
        camera={{ position: [0, 0, CAMERA_Z], fov: FOV, near: 0.5, far: 60 }}
        gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.NoToneMapping }}
      >
        <World quality={quality} />
        {/* Bloom threshold sits near 1 so only HDR glints and hot creases
            bloom, never the cream or gold grounds themselves. */}
        {quality === 'high'
          ? <EffectComposer multisampling={4} disableNormalPass>
              <Bloom intensity={0.9} luminanceThreshold={0.98} luminanceSmoothing={0.25} mipmapBlur radius={0.72} />
            </EffectComposer>
          : <EffectComposer multisampling={0} disableNormalPass>
              <Bloom intensity={0.7} luminanceThreshold={0.98} luminanceSmoothing={0.25} mipmapBlur radius={0.72} />
              <SMAA />
            </EffectComposer>}
      </Canvas>
    </div>
  )
}

function createTheme(source) {
  const preset = { ...DEFAULTS, ...source }
  const theme = { glowPos: new THREE.Vector2(...preset.glowPos), pose: { ...preset.pose }, threadPose: { ...preset.threadPose } }
  COLOR_KEYS.forEach(key => { theme[key] = new THREE.Color(preset[key]) })
  NUMBER_KEYS.forEach(key => { theme[key] = preset[key] })
  return theme
}

function World({ quality }) {
  const theme = useMemo(() => createTheme(presets.home), [])
  const targets = useMemo(() => Object.fromEntries(Object.entries(presets).map(([name, preset]) => [name, createTheme(preset)])), [])
  const pointer = usePointer()
  useFrame((_, delta) => {
    const target = targets[sceneStore.preset] || targets.home
    const dt = Math.min(delta, 0.05)
    const k = reducedMotion() ? 1 : 1 - Math.exp(-dt * 1.9)
    const kPose = reducedMotion() ? 1 : 1 - Math.exp(-dt * 1.35)
    COLOR_KEYS.forEach(key => theme[key].lerp(target[key], k))
    NUMBER_KEYS.forEach(key => { theme[key] += (target[key] - theme[key]) * k })
    POSE_KEYS.forEach(key => { theme.pose[key] += (target.pose[key] - theme.pose[key]) * kPose })
    theme.threadPose.y += (target.threadPose.y - theme.threadPose.y) * kPose
    theme.threadPose.rot += (target.threadPose.rot - theme.threadPose.rot) * kPose
    theme.glowPos.lerp(target.glowPos, k)
  }, -2)
  return <>
    <Backdrop theme={theme} />
    <Veil theme={theme} pointer={pointer} quality={quality} />
    <GoldThreads theme={theme} quality={quality} />
    <TowerModel />
    <ArkadeEmblem quality={quality} />
    <CameraRig pointer={pointer} />
  </>
}

function Backdrop({ theme }) {
  const { size } = useThree()
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: backdropVertex, fragmentShader: backdropFragment,
    depthTest: false, depthWrite: false,
    uniforms: {
      uTop: { value: theme.top }, uBottom: { value: theme.bottom }, uGlow: { value: theme.glow },
      uGlowPos: { value: theme.glowPos }, uGlowStrength: { value: 0 }, uVignette: { value: 0 }, uAspect: { value: 1 },
      uMistColor: { value: theme.mistColor }, uMist: { value: 0 }, uTime: { value: 0 },
    },
  }), [theme])
  useFrame((_, delta) => {
    if (!reducedMotion()) material.uniforms.uTime.value += Math.min(delta, 0.05)
    material.uniforms.uMist.value = theme.mist
    material.uniforms.uGlowStrength.value = theme.glowStrength
    material.uniforms.uVignette.value = theme.vignette
    material.uniforms.uAspect.value = size.width / Math.max(size.height, 1)
  })
  useLayoutEffect(() => () => material.dispose(), [material])
  return <mesh material={material} renderOrder={-10} frustumCulled={false}><planeGeometry args={[2, 2]} /></mesh>
}

function Veil({ theme, pointer, quality }) {
  const { size, viewport } = useThree()
  const group = useRef()
  const clock = useRef(6)
  const lightDir = useMemo(() => new THREE.Vector3(), [])
  const localPointer = useMemo(() => new THREE.Vector3(), [])
  const segments = quality === 'high' ? [640, 56] : [300, 28]
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, segments[0], segments[1]), [segments[0], segments[1]])
  const materials = useMemo(() => LAYERS.map(layer => new THREE.ShaderMaterial({
    vertexShader: silkVertex, fragmentShader: silkFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 }, uLength: { value: LENGTH }, uWidth: { value: layer.width }, uAmp: { value: layer.amp },
      uFreq: { value: layer.freq }, uTwist: { value: layer.twist }, uTwistFreq: { value: layer.twistFreq },
      uPhase: { value: layer.phase }, uBillow: { value: layer.billow }, uSeed: { value: layer.seed },
      uPointer: { value: new THREE.Vector3() }, uPointerAmt: { value: 0 },
      uShadow: { value: theme.shadow }, uMid: { value: theme.mid }, uHigh: { value: theme.high },
      uLightDir: { value: lightDir }, uOpacity: { value: 0 }, uGlitter: { value: 0 }, uSheer: { value: 0.3 },
    },
  })), [theme, lightDir])
  const dust = useDust(quality === 'high' ? 950 : 480, theme)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    if (!reducedMotion()) clock.current += dt * theme.speed
    // Skip the veil's draw calls entirely on pages that use the threads.
    group.current.visible = theme.opacity > 0.004 || theme.dust > 0.004
    if (!group.current.visible) return
    const aspect = size.width / Math.max(size.height, 1)
    const halfW = HALF_HEIGHT * aspect
    const { x, y, rot, scale } = theme.pose
    // Portrait screens get a narrower veil; ultrawide ones a longer one.
    const fit = THREE.MathUtils.clamp(aspect / 1.25, 0.62, 1)
    group.current.position.set(x * halfW, y * HALF_HEIGHT, 0)
    group.current.rotation.z = rot
    group.current.scale.set(scale * fit * Math.max(1, aspect / 1.78), scale * fit, scale * fit)
    group.current.updateMatrixWorld()
    const p = pointer.current
    // A grazing key from the upper left, so the folds model strongly.
    lightDir.set(-0.62 + p.x * 0.5, 0.7 + p.y * 0.3, 0.32).normalize()
    localPointer.copy(p.world)
    group.current.worldToLocal(localPointer)
    materials.forEach((material, index) => {
      const u = material.uniforms
      u.uTime.value = clock.current
      u.uPointer.value.copy(localPointer)
      u.uPointerAmt.value = p.amount
      u.uOpacity.value = theme.opacity * LAYERS[index].opacity
      u.uSheer.value = Math.min(1, theme.sheer * LAYERS[index].sheer)
      u.uGlitter.value = theme.glitter
    })
    dust.material.uniforms.uTime.value = clock.current
    dust.material.uniforms.uAmount.value = theme.dust
    dust.material.uniforms.uPixelRatio.value = viewport.dpr
  })
  useLayoutEffect(() => () => { geometry.dispose(); materials.forEach(m => m.dispose()) }, [geometry, materials])

  return <group ref={group}>
    {LAYERS.map((layer, index) => <mesh key={index} geometry={geometry} material={materials[index]}
      position-z={layer.z} renderOrder={index} frustumCulled={false} />)}
    <points geometry={dust.geometry} material={dust.material} renderOrder={5} frustumCulled={false} />
  </group>
}

function useDust(count, theme) {
  const dust = useMemo(() => {
    const seeds = new Float32Array(count * 4)
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    const material = new THREE.ShaderMaterial({
      vertexShader: dustVertex, fragmentShader: dustFragment,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uSpan: { value: LENGTH * 0.9 }, uAmp: { value: LAYERS[1].amp }, uFreq: { value: LAYERS[1].freq },
        uPixelRatio: { value: 1 }, uSize: { value: 1 }, uColor: { value: theme.dustColor }, uAmount: { value: 0 },
      },
    })
    return { geometry, material }
  }, [count, theme])
  useLayoutEffect(() => () => { dust.geometry.dispose(); dust.material.dispose() }, [dust])
  return dust
}

// Mouse position in NDC and on the z = 0 plane, damped. Touch never moves
// the camera or the cloth, so scrolling a panel does not shake the scene.
function usePointer() {
  const { camera, gl } = useThree()
  const state = useRef({ x: 0, y: 0, tx: 0, ty: 0, amount: 0, target: 0, world: new THREE.Vector3() })
  const helpers = useMemo(() => ({ ray: new THREE.Raycaster(), plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), ndc: new THREE.Vector2() }), [])
  useLayoutEffect(() => {
    const move = event => {
      if (event.pointerType !== 'mouse' || reducedMotion()) return
      const box = gl.domElement.getBoundingClientRect()
      const s = state.current
      s.tx = ((event.clientX - box.left) / box.width) * 2 - 1
      s.ty = -((event.clientY - box.top) / box.height) * 2 + 1
      s.target = Math.abs(s.tx) <= 1 && Math.abs(s.ty) <= 1 ? 1 : 0
    }
    const leave = () => { state.current.target = 0 }
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [gl])
  useFrame((_, delta) => {
    const s = state.current
    const dt = Math.min(delta, 0.05)
    const k = 1 - Math.exp(-dt * 2.6)
    s.x += (s.tx - s.x) * k
    s.y += (s.ty - s.y) * k
    s.amount += (s.target - s.amount) * (1 - Math.exp(-dt * 1.8))
    helpers.ndc.set(s.x, s.y)
    helpers.ray.setFromCamera(helpers.ndc, camera)
    helpers.ray.ray.intersectPlane(helpers.plane, s.world)
  }, -1)
  return state
}

function CameraRig({ pointer }) {
  useFrame(({ camera }, delta) => {
    const k = 1 - Math.exp(-Math.min(delta, 0.05) * 1.6)
    camera.position.x += (pointer.current.x * 0.38 - camera.position.x) * k
    camera.position.y += (pointer.current.y * 0.24 - camera.position.y) * k
    camera.lookAt(0, 0, 0)
  })
  return null
}
