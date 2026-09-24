import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export default function useWarmEnvironment() {
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

