import { useMemo, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Ribbon from './Ribbon.jsx'
import useWarmEnvironment from './useWarmEnvironment.js'
import useDampedPointer from './useDampedPointer.js'
import ResidenceDepthArchitecture from './ResidenceDepthArchitecture.jsx'

export default function Scene({ bgColor, composition, motion, preview, quality }) {
  useWarmEnvironment()
  const { size } = useThree()
  const ribbonScale = Math.max(0.5, Math.min(1.6, size.width / size.height / (16 / 9)))
  const pointer = useDampedPointer()
  const keyRef = useRef()
  const topRibbon = useRef()
  const bottomRibbon = useRef()
  const arrangement = useRef()

  // shared, mutable light direction — the fragment shader reads this so
  // the anisotropic highlight tracks the light as the cursor moves it
  const lightDir = useMemo(() => new THREE.Vector3(-6, 4, -8).normalize(), [])
  const base = useMemo(() => new THREE.Vector3(-6, 4, -8), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    if ((motion || preview) && topRibbon.current && bottomRibbon.current) {
      const p = motion?.current.progress || 0
      const g = motion?.current.gallery || 0
      const outward = preview?.current.outward || 0
      const flat = preview?.current.flat || 0
      const shift = preview?.current.shift || 0
      // r poses the silk around the twin towers; rl is the small pull toward
      // them while Visual select is being considered.
      const r = motion?.current.residences || 0
      const rl = motion?.current.residenceLight || 0
      const sweep = motion?.current.residenceSweep || 0
      const nearPass = Math.sin(p * Math.PI)
      // Same meshes, materials and particles throughout the move. Never fade.
      // The back ribbon keeps its own depth slab, so it always passes behind
      // the towers; the front one sinks until only its edge crosses the frame.
      // Settled framing follows the upper/lower sweeps of the other pages:
      // a shallow rising top arc, with a second arc along the lower edge.
      // Keep the material and wrapping choreography independent of this pose.
      const mix = THREE.MathUtils.lerp
      topRibbon.current.position.set(mix(-6 + p * 10 - g * 7 + outward + shift, .4 + rl, r), mix(4.4 + p * .4 - g * .1, 4.45, r), -4 + nearPass * .85)
      topRibbon.current.rotation.z = mix(.48 - p * .3 + g * .18 - flat, .2, r)
      topRibbon.current.scale.setScalar(mix(1 + p * .12 + g * .08, 1, r))
      topRibbon.current.position.x += sweep * .55
      topRibbon.current.position.y += sweep * .3
      // Raise the lower silk into view, leading from bottom-centre to right.
      bottomRibbon.current.position.set(mix(6.7 + p - g + outward, 2.4, r), mix(-3.4 - p * .5 + g * .35, -4.9, r), 0)
      bottomRibbon.current.rotation.z = mix(.65 - p * .3 + g * .18 - flat, .22, r)
      bottomRibbon.current.scale.setScalar(mix(1 + g * .08, 1, r))
      bottomRibbon.current.position.x -= sweep * .65
      bottomRibbon.current.position.y += sweep * .8
      arrangement.current.updateMatrixWorld(true)
    }
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
      <group ref={arrangement} rotation={[0, 0, composition === 'menu' ? -0.5 : 0]} scale={[ribbonScale, 1, 1]}>
      <group ref={topRibbon} position={[-6, 4.4, -4.0]} rotation={[0, 0, 0.48]}>
        <Ribbon amp={1.4} freq={0.62} twist={1.6} twistFreq={0.6} speed={0.22}
                width={2.5} zCentre={0} zHalf={1.3}
                pointer={pointer} motion={motion} preview={preview} lightDir={lightDir} bgColor={bgColor} />
      </group>
      <group ref={bottomRibbon} position={[6.7, -3.4, 0]} rotation={[0, 0, 0.65]}>
        <Ribbon amp={1.5} width={2.3} freq={0.65} zCentre={0} zHalf={1.5}
                wrapOffset={Math.PI}
                pointer={pointer} motion={motion} preview={preview} lightDir={lightDir} bgColor={bgColor} />
      </group>
      </group>
      <ResidenceDepthArchitecture motion={motion} />
    </>
  )
}

