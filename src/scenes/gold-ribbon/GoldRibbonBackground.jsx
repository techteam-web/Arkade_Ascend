import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, SMAA, ToneMapping, Noise, HueSaturation } from '@react-three/postprocessing'
import { ToneMappingMode, BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import Scene from './Scene.jsx'
import { BROCHURE } from './palette.js'

export { BROCHURE } from './palette.js'

export default function GoldRibbonBackground({
  bgColor = BROCHURE.plum,
  backdrop = 'radial-gradient(ellipse 120% 90% at 50% 42%, #4A333A 0%, #2A1D22 55%, #150E11 100%)',
  className,
  style,
  composition = 'landing',
  motion,
  preview,
  active = true,
  quality = 'high',   // 'high' | 'low' — drop to 'low' on mobile
}) {
  return (
    <div className={className}
         style={{ position: 'absolute', inset: 0, background: backdrop || bgColor, ...style }}>
      <Canvas
        frameloop={active ? 'always' : 'never'}
        shadows
        camera={{ position: [0, 0, 15], fov: 36, near: 4, far: 34 }}
        dpr={quality === 'high' ? [1, 2.5] : [1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NoToneMapping   // done in the composer instead
          gl.shadowMap.type = THREE.PCFSoftShadowMap
        }}
      >
        <Scene bgColor={bgColor} composition={composition} motion={motion} preview={preview} quality={quality} />
        {/* Crisp rendering: no depth blur or chromatic fringe on the ribbon and beads. */}
        <EffectComposer disableNormalPass multisampling={0}>
          <Bloom
            intensity={0.16}
            luminanceThreshold={1.05}
            luminanceSmoothing={0.3}
            mipmapBlur
          />


          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <HueSaturation saturation={0.06} />
          <Vignette eskil={false} offset={0.3} darkness={0.38} />
          <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.018} />
          <SMAA />
        </EffectComposer>
      </Canvas>
    </div>
  )
}



