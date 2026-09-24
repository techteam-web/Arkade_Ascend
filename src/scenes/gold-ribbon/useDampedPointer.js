import { useMemo, useRef, useLayoutEffect, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function useDampedPointer() {
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

