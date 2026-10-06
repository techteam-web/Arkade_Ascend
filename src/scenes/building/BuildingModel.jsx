import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { gsap } from '../../app/reveal.js'
import { buildingModel as model } from '../../content/template.js'
import { prefersReducedMotion } from '../../hooks/useMediaQuery.js'
import { floorBase, selectable as isResidential, towerById } from './floors.js'
import { FIN, FINISHES } from './finishes.js'

const UP = new THREE.Vector3(0, 1, 0)
const TARGET = new THREE.Vector3(0, model.top * 0.46, 0)
const DISTANCE = 330
const START = { azimuth: 0.62, elevation: 0.2 }

const loadModel = loader => loader.setMeshoptDecoder(MeshoptDecoder)

// The model's CAD materials, recoloured to the concept render (finishes.js).
const finished = new WeakSet()
const finish = root => root.traverse(object => {
  if (!object.isMesh || finished.has(object.material)) return
  const material = object.material
  finished.add(material)
  const hsl = material.color.getHSL({})
  const look = FINISHES[material.name] ?? (!material.map && hsl.l > 0.85 && material.opacity === 1 ? FIN : null)
  if (!look) return
  material.color.set(look.color)
  if (look.roughness !== undefined) material.roughness = look.roughness
  if (look.metalness !== undefined) material.metalness = look.metalness
})

// A wing's outline raised through its residential floors, for picking floors.
const prisms = new Map()
const prism = outline => {
  if (!prisms.has(outline)) {
    const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z)))
    const height = floorBase(model.lastFloor + 1) - floorBase(model.firstFloor)
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
    geometry.rotateX(Math.PI / 2)   // shape (x, z) at depth d -> (x, -d, z)
    geometry.translate(0, floorBase(model.lastFloor + 1), 0)
    prisms.set(outline, geometry)
  }
  return prisms.get(outline)
}

// Clipping planes that keep only what lies inside a convex outline.
const outlinePlanes = outline => {
  const cx = outline.reduce((sum, p) => sum + p[0], 0) / outline.length
  const cz = outline.reduce((sum, p) => sum + p[1], 0) / outline.length
  return outline.map(([x, z], i) => {
    const [nx, nz] = outline[(i + 1) % outline.length]
    const normal = new THREE.Vector3(-(nz - z), 0, nx - x).normalize()
    if (normal.x * (cx - x) + normal.z * (cz - z) < 0) normal.negate()
    return new THREE.Plane(normal, -(normal.x * x + normal.z * z))
  })
}

// The tower's architectural model on its own canvas, rendered on demand. Drag
// to orbit, pinch or scroll to zoom. With `selectable`, pointing at Tower A or
// Tower B previews that tower's floor and clicking selects it; `floor` and the
// callbacks carry { tower, n }. `turn` is a counter the page bumps
// (with a direction) to rotate the view from buttons or keys.
export default function BuildingModel({ selectable = false, floor = null, onFloor, onHover, turn, label }) {
  const [ready, setReady] = useState(false)
  return <div className="absolute inset-0" data-own-gesture role="img" aria-label={label}>
    <WithoutWebGL>
      <Canvas frameloop="demand" dpr={[1, 1.75]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 30, near: 5, far: 3000, position: [0, 0, DISTANCE] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.9; gl.localClippingEnabled = true }}>
        <Suspense fallback={null}>
          <Scene selectable={selectable} floor={floor} onFloor={onFloor} onHover={onHover} turn={turn} onReady={() => setReady(true)} />
        </Suspense>
      </Canvas>
    </WithoutWebGL>
    <p aria-hidden="true" className={`pointer-events-none absolute inset-0 grid place-items-center text-[0.62rem] uppercase tracking-[0.3em] text-gold-200/70 transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`}>Loading model</p>
  </div>
}

function Scene({ selectable, floor, onFloor, onHover, turn, onReady }) {
  const gltf = useLoader(GLTFLoader, model.src, loadModel)
  const { gl, scene, invalidate } = useThree()
  const group = useRef(null)
  const [hover, setHover] = useState(null)

  // A copy per canvas (two pages can be on screen during a transition). The
  // model itself never takes pointer events; floors are picked on the boxes
  // below.
  const building = useMemo(() => {
    finish(gltf.scene)
    const copy = gltf.scene.clone(true)
    copy.traverse(object => { object.raycast = () => {} })
    return copy
  }, [gltf])

  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = environment
    scene.environmentIntensity = 0.28
    invalidate()
    onReady?.()
    return () => { scene.environment = null; environment.dispose(); pmrem.dispose() }
  }, [gl, scene])

  // Arrive with a short settle, once, when the page mounts.
  useEffect(() => {
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      gsap.from(group.current.position, { y: -6, duration: 1, ease: 'power2.out', onUpdate: invalidate })
    })
    return () => context.revert()
  }, [])

  const pickFloor = (event, tower) => {
    const n = model.firstFloor + Math.floor((event.point.y - model.firstY) / model.floorHeight)
    return isResidential(tower, n) ? { tower, n } : null
  }
  const same = (a, b) => a?.tower === b?.tower && a?.n === b?.n
  const setPreview = next => { if (same(next, hover)) return; setHover(next); onHover?.(next); invalidate() }

  return <>
    {/* Warm key light from the upper front right; the room environment adds
        soft fill and reflections in the glass. */}
    <directionalLight position={[160, 200, 120]} intensity={1.9} color="#ffe6c4" />
    <directionalLight position={[-180, 60, 60]} intensity={0.3} color="#cdb7c2" />
    <hemisphereLight args={['#f1e2cf', '#2a1c20', 0.25]} />
    <group ref={group}>
      <primitive object={building} />
      {selectable && <>
        {model.wings.map(wing => <mesh key={wing.id} geometry={prism(wing.outline)}
          onPointerMove={event => { event.stopPropagation(); setPreview(pickFloor(event, wing.id)) }}
          onPointerOut={() => setPreview(null)}
          onClick={event => { if (event.delta > 6) return; event.stopPropagation(); const next = pickFloor(event, wing.id); if (next) onFloor?.(next) }}>
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} side={THREE.DoubleSide} />
        </mesh>)}
        <FloorHighlight source={gltf.scene} floor={hover ?? floor} strength={hover && !same(hover, floor) ? 0.7 : 1} />
      </>}
    </group>
    <Controls turn={turn} />
  </>
}

// The chosen floor, tinted gold on the building's own surfaces: a second copy
// of the model in one flat material, clipped to the floor's height and the
// tower's outline. Drawn over the building at equal depth, so it follows the
// facade exactly.
function FloorHighlight({ source, floor, strength }) {
  const { invalidate } = useThree()
  const floorPlanes = useMemo(() => [new THREE.Plane(), new THREE.Plane()], [])
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffe2a8', transparent: true, depthWrite: false, depthFunc: THREE.LessEqualDepth,
    side: THREE.DoubleSide, toneMapped: false,
  }), [])
  const copy = useMemo(() => {
    const root = source.clone(true)
    root.traverse(object => { object.raycast = () => {}; if (object.isMesh) { object.material = material; object.renderOrder = 2 } })
    return root
  }, [source, material])

  useLayoutEffect(() => {
    if (floor) {
      const { tower, n } = floor
      floorPlanes[0].set(new THREE.Vector3(0, 1, 0), -(floorBase(n) + 0.05))
      floorPlanes[1].set(new THREE.Vector3(0, -1, 0), floorBase(n + 1) - 0.05)
      material.clippingPlanes = [...floorPlanes, ...outlinePlanes(towerById(tower).outline)]
      material.opacity = 0.8 * strength
    }
    copy.visible = Boolean(floor)
    invalidate()
  }, [floor?.tower, floor?.n, strength])

  useEffect(() => () => material.dispose(), [material])
  return <primitive object={copy} />
}

function Controls({ turn }) {
  const { camera, gl, invalidate, size } = useThree()
  const controls = useMemo(() => new OrbitControls(camera, gl.domElement), [camera, gl])

  useLayoutEffect(() => {
    Object.assign(controls, {
      enableDamping: true, dampingFactor: 0.08, enablePan: false, rotateSpeed: 0.55, zoomSpeed: 0.6,
      minPolarAngle: 0.5, maxPolarAngle: 1.5, minDistance: DISTANCE * 0.4, maxDistance: DISTANCE * 1.35,
    })
    controls.target.copy(TARGET)
    const onChange = () => invalidate()
    controls.addEventListener('change', onChange)
    return () => { controls.removeEventListener('change', onChange); controls.dispose() }
  }, [controls])

  // Frame the whole tower for the canvas's shape: narrow canvases step back.
  useLayoutEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    const distance = DISTANCE * Math.max(1, 0.95 / aspect)
    const offset = new THREE.Vector3().setFromSphericalCoords(distance, Math.PI / 2 - START.elevation, START.azimuth)
    camera.position.copy(TARGET).add(offset)
    controls.maxDistance = distance * 1.35
    controls.update()
    invalidate()
  }, [size.width, size.height])

  // Buttons and keys turn the view by an eighth.
  useEffect(() => {
    if (!turn?.count) return
    const proxy = { angle: 0 }
    let last = 0
    const tween = gsap.to(proxy, {
      angle: turn.direction * Math.PI / 4, duration: prefersReducedMotion() ? 0 : 0.9, ease: 'power2.inOut',
      onUpdate: () => {
        const offset = camera.position.clone().sub(controls.target).applyAxisAngle(UP, proxy.angle - last)
        last = proxy.angle
        camera.position.copy(controls.target).add(offset)
        controls.update()
        invalidate()
      },
    })
    return () => tween.kill()
  }, [turn?.count])

  useFrame(() => { if (controls.update()) invalidate() })
  return null
}

// Without WebGL the frame says so rather than breaking the page.
class WithoutWebGL extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed
      ? <p className="absolute inset-0 grid place-items-center px-6 text-center text-[0.7rem] uppercase tracking-[0.26em] text-gold-200/80">The 3D model needs WebGL</p>
      : this.props.children
  }
}
