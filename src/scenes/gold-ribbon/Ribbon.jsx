import { useMemo, useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { patchRibbon } from './material.js'
import RibbonDust from './RibbonDust.jsx'

export default function Ribbon({
  length = 36, width = 2.3, amp = 2.4, freq = 0.8,
  twist = 1.5, twistFreq = 0.85, speed = 0.3,
  segments = [900, 64],
  zCentre = 0, zHalf = 1.5,
  wrapOffset = 0,
  pointer,          // shared damped pointer ref
  motion,
  preview,
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
    uTransitionEnergy: { value: 0 },
    uWrap: { value: 0 },
    uWrapPhase: { value: 0 },
    uWrapOffset: { value: wrapOffset },
    uOrbit: { value: new THREE.Vector4(3, 0, 3, 3) },
    uOrbitToLocal: { value: new THREE.Matrix4() },
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
  }), [length, width, amp, freq, twist, twistFreq, speed, zCentre, zHalf, lightDir, bgColor, wrapOffset])

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
    [segments[0], segments[1]]
  )

  useLayoutEffect(() => {
    if (meshRef.current) meshRef.current.customDepthMaterial = depthMaterial
  }, [depthMaterial])

  useFrame((state, dt) => {
    // Advance continuously so folds travel along the strips rather than
    // barely rocking around the first frame. Cap tab-resume time jumps.
    // The attached dust shares this clock and the exact same deformation.
    // On the residences screen the silk is supporting architecture, so the
    // fold clock is dragged down to a near-idle crawl and the dust stays thin.
    const settled = motion?.current.residences || 0
    const wrapping = motion?.current.residenceDepth && !motion.current.residenceReturning
    const wrap = wrapping ? motion.current.residenceWrap || 0 : 0
    const damping = reducedMotion.current ? 1 : 1 - Math.exp(-Math.min(dt, .05) * 28)
    uniforms.uWrap.value += (wrap - uniforms.uWrap.value) * damping
    // At handoff the DOM takes over; no residual foreground geometry remains.
    if (!wrapping) uniforms.uWrap.value = 0
    uniforms.uWrapPhase.value = motion?.current.residenceWrapPhase || 0
    const orbit = motion?.current.residenceOrbit
    if (orbit) uniforms.uOrbit.value.set(orbit.x, orbit.y, orbit.radius, orbit.height)
    meshRef.current?.updateWorldMatrix(true, false)
    if (meshRef.current) uniforms.uOrbitToLocal.value.copy(meshRef.current.matrixWorld).invert().multiply(state.camera.matrixWorld)
    uniforms.uTransitionEnergy.value = (motion?.current.energy || 0) + (preview?.current.energy || 0) + (motion?.current.residenceLight || 0)
    uniforms.uAmp.value = amp * (1 - (preview?.current.flat || 0))
    if (!reducedMotion.current) uniforms.uTime.value += Math.min(dt, 0.05) * (1 + uniforms.uTransitionEnergy.value * 0.4) * (1 - settled * 0.58)
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

