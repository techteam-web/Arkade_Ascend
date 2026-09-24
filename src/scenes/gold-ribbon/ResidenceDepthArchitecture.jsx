import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Temporary depth counterparts of the DOM artwork, inside the SAME canvas.
// Alpha testing leaves the skyline/ribbon visible around each silhouette.
export default function ResidenceDepthArchitecture({ motion }) {
  const { camera, gl } = useThree()
  const meshes = useRef([])
  const texture = useRef(null)
  const bounds = useRef(null)
  const position = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => {
    let disposed = false
    const asset = new THREE.TextureLoader().load('/residences/tower-cutout.png', loaded => {
      if (disposed) return
      loaded.colorSpace = THREE.SRGBColorSpace
      texture.current = loaded
      if (motion) motion.current.residenceDepthReady = true
    })
    // Scope to this experience, and measure only while transitioning.
    const frame = gl.domElement.closest('.page-frame')
    bounds.current = [...(frame?.querySelectorAll('.residence-tower') || [])]
    return () => {
      disposed = true
      asset.dispose()
      if (motion) motion.current.residenceDepthReady = false
    }
  }, [gl, motion])

  useFrame(() => {
    const active = !!motion?.current.residenceDepth && !motion.current.residenceReturning && !!texture.current
    const canvas = active ? gl.domElement.getBoundingClientRect() : null
    const depth = 15
    const viewHeight = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const viewWidth = viewHeight * camera.aspect
    const boxes = []
    meshes.current.forEach((mesh, index) => {
      if (!mesh) return
      mesh.visible = active
      const tower = bounds.current?.[index]
      if (!active || !tower || !canvas.width || !canvas.height) return
      const box = tower.getBoundingClientRect()
      const ratio = texture.current.image.width / texture.current.image.height
      const height = Math.min(box.height, box.width / ratio)
      const width = height * ratio
      const x = box.left + box.width / 2
      const y = box.bottom - height / 2
      position.set(((x - canvas.left) / canvas.width - .5) * viewWidth,
        (.5 - (y - canvas.top) / canvas.height) * viewHeight, -depth)
      boxes.push({ x: position.x, y: position.y, width: width / canvas.width * viewWidth, height: height / canvas.height * viewHeight })
      mesh.position.copy(position.applyMatrix4(camera.matrixWorld))
      mesh.quaternion.copy(camera.quaternion)
      mesh.scale.set(width / canvas.width * viewWidth, height / canvas.height * viewHeight, 1)
      mesh.material.opacity = Number(getComputedStyle(tower).opacity)
      if (mesh.material.map !== texture.current) {
        mesh.material.map = texture.current
        mesh.material.needsUpdate = true
      }
    })
    if (active && boxes.length === 2) {
      const left = Math.min(...boxes.map(box => box.x - box.width / 2))
      const right = Math.max(...boxes.map(box => box.x + box.width / 2))
      motion.current.residenceOrbit = {
        x: (left + right) / 2,
        y: (boxes[0].y + boxes[1].y) / 2,
        radius: Math.max(.8, (right - left) * .52),
        height: Math.max(1, Math.min(boxes[0].height, boxes[1].height) * .45),
      }
    }
  }, -1)

  return <group>{['A', 'B'].map((tower, index) => <mesh key={tower}
    ref={mesh => { meshes.current[index] = mesh }} visible={false} frustumCulled={false}>
    <planeGeometry args={[1, 1]} />
    <meshBasicMaterial transparent alphaTest={.08} depthWrite toneMapped={false} color="#c9bda9" />
  </mesh>)}</group>
}
