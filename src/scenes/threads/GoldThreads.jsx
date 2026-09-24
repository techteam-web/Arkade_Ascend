import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { threadVertex, threadFragment, beadVertex, beadFragment } from '../silk/shaders.js'

// A flowing surface woven from fine gold strands, the companion to the silk
// veil on pages that do not use the ribbon. `theme` supplies the blended
// opacity, colour, blending and pose.
export default function GoldThreads({ theme, quality }) {
  const { size, viewport } = useThree()
  const group = useRef()
  const clock = useRef(4)
  const lines = quality === 'high' ? 84 : 52
  const points = quality === 'high' ? 260 : 150

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uWidth: { value: 30 }, uHeight: { value: 3.6 }, uDepth: { value: 1.1 }, uAmp: { value: 0.9 },
    uLines: { value: lines }, uColor: { value: theme.threadColor }, uOpacity: { value: 0 }, uHot: { value: 1 }, uPixelRatio: { value: 1 },
  }), [lines, theme])

  const strands = useMemo(() => {
    const line = new Float32Array(lines * points)
    const along = new Float32Array(lines * points)
    const index = []
    for (let l = 0; l < lines; l++) {
      for (let p = 0; p < points; p++) {
        const i = l * points + p
        line[i] = (l + 0.5) / lines
        along[i] = p / (points - 1)
        if (p < points - 1) index.push(i, i + 1)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lines * points * 3), 3))
    geometry.setAttribute('aLine', new THREE.BufferAttribute(line, 1))
    geometry.setAttribute('aU', new THREE.BufferAttribute(along, 1))
    geometry.setIndex(index)
    const material = new THREE.ShaderMaterial({ vertexShader: threadVertex, fragmentShader: threadFragment, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    return { geometry, material }
  }, [lines, points, uniforms])

  const beads = useMemo(() => {
    const count = quality === 'high' ? 180 : 90
    const seeds = new Float32Array(count * 3)
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3))
    const material = new THREE.ShaderMaterial({ vertexShader: beadVertex, fragmentShader: beadFragment, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    return { geometry, material }
  }, [quality, uniforms])

  useLayoutEffect(() => () => {
    strands.geometry.dispose(); strands.material.dispose(); beads.geometry.dispose(); beads.material.dispose()
  }, [strands, beads])

  useFrame((_, delta) => {
    const visible = theme.threads > 0.004
    group.current.visible = visible
    if (!visible) return
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) clock.current += Math.min(delta, 0.05) * theme.speed
    const aspect = size.width / Math.max(size.height, 1)
    const halfH = 12 * Math.tan(THREE.MathUtils.degToRad(17.5))
    const portrait = THREE.MathUtils.clamp(aspect / 1.3, 0.55, 1)
    group.current.position.set(0, theme.threadPose.y * halfH, -1.5)
    group.current.rotation.z = theme.threadPose.rot
    group.current.scale.set(Math.max(1, aspect / 1.6), portrait, 1)
    uniforms.uTime.value = clock.current
    uniforms.uOpacity.value = theme.threads
    uniforms.uPixelRatio.value = viewport.dpr
    // Light grounds need normal blending; additive light vanishes on cream.
    const blending = theme.threadLight > 0.5 ? THREE.NormalBlending : THREE.AdditiveBlending
    if (strands.material.blending !== blending) { strands.material.blending = blending; strands.material.needsUpdate = true }
    uniforms.uHot.value = theme.threadLight > 0.5 ? 0.35 : 1
  })

  return <group ref={group} visible={false}>
    <lineSegments geometry={strands.geometry} material={strands.material} frustumCulled={false} renderOrder={2} />
    <points geometry={beads.geometry} material={beads.material} frustumCulled={false} renderOrder={3} />
  </group>
}
