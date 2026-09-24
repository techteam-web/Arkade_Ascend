import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { MARK_PATHS } from '../../components/Brand.jsx'
import { sceneStore } from '../sceneStore.js'
import { fitToAnchor } from '../anchor.js'

// The Arkade mark in polished gold: the brochure's vector paths, extruded and
// bevelled, turning slowly inside two thin armillary rings and a glitter halo.
// Shown on the menu; it fits itself into the menu's DOM anchor.

const haloVertex = /* glsl */ `
  uniform float uTime, uPixelRatio;
  attribute vec3 aSeed;
  varying float vAlpha;
  void main() {
    float angle = aSeed.x * 6.2831853 + uTime * (0.08 + aSeed.z * 0.1);
    float radius = 0.84 + (aSeed.y - 0.5) * 0.2;
    vec3 p = vec3(cos(angle) * radius, sin(angle * 2.0 + aSeed.y * 6.0) * 0.06, sin(angle) * radius * 0.42);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.5 + aSeed.z * 3.5) * uPixelRatio * (12.0 / -mv.z);
    vAlpha = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (1.2 + aSeed.z * 3.0) + aSeed.x * 50.0));
  }
`
const haloFragment = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float core = exp(-r * r * 5.0);
    gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * (1.0 + core), core * vAlpha * uOpacity);
  }
`

function buildMark() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${MARK_PATHS.map(([transform, d]) => `<path transform="${transform}" d="${d}"/>`).join('')}</svg>`
  const data = new SVGLoader().parse(svg)
  const parts = []
  data.paths.forEach(path => SVGLoader.createShapes(path).forEach(shape => {
    parts.push(new THREE.ExtrudeGeometry(shape, { depth: 5, bevelEnabled: true, bevelThickness: 1.1, bevelSize: 0.55, bevelSegments: 5, curveSegments: 28 }))
  }))
  const geometry = mergeGeometries(parts)
  parts.forEach(part => part.dispose())
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  const size = box.getSize(new THREE.Vector3())
  geometry.translate(-(box.min.x + size.x / 2), -(box.min.y + size.y / 2), -(box.min.z + size.z / 2))
  // SVG space is y-down: turn it upright and fit to one unit tall.
  geometry.rotateX(Math.PI)
  geometry.scale(1 / size.y, 1 / size.y, 1 / size.y)
  geometry.computeVertexNormals()
  return geometry
}

export default function ArkadeEmblem({ quality }) {
  const { gl, camera, size, viewport } = useThree()
  const root = useRef()
  const mark = useRef()
  const rings = useRef()
  const state = useRef({ reveal: 0, turn: 0, time: 0 })
  const geometry = useMemo(buildMark, [])
  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.035).texture
    pmrem.dispose()
    return texture
  }, [gl])
  const gold = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#e0b279', metalness: 1, roughness: 0.2, clearcoat: 0.55, clearcoatRoughness: 0.18,
    envMap: env, envMapIntensity: 1.05, transparent: true,
  }), [env])
  const ringMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#e9c48d').multiplyScalar(1.3), transparent: true, toneMapped: false }), [])
  const halo = useMemo(() => {
    const count = quality === 'high' ? 420 : 200
    const seeds = new Float32Array(count * 3)
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random()
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3))
    const m = new THREE.ShaderMaterial({
      vertexShader: haloVertex, fragmentShader: haloFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uOpacity: { value: 0 } },
    })
    return { geometry: g, material: m }
  }, [quality])
  useLayoutEffect(() => () => {
    geometry.dispose(); env.dispose(); gold.dispose(); ringMaterial.dispose(); halo.geometry.dispose(); halo.material.dispose()
  }, [geometry, env, gold, ringMaterial, halo])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const emblem = sceneStore.emblem
    const s = state.current
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    // Shown only while the menu is open and its anchor is laid out (desktop).
    const fit = emblem.visible ? fitToAnchor(emblem.anchor, gl, camera, size) : null
    const target = fit ? 1 : 0
    s.reveal += (target - s.reveal) * (reduced ? 1 : 1 - Math.exp(-dt * (target ? 1.6 : 4)))
    root.current.visible = s.reveal > 0.002
    if (!root.current.visible) return
    s.time += reduced ? 0 : dt
    if (fit) {
      root.current.position.set(fit.x, fit.y, 0)
      root.current.scale.setScalar(Math.min(fit.height, fit.width) * 0.52 * (0.82 + s.reveal * 0.18))
    }
    // A slow sway, plus a half turn requested whenever the visitor moves to
    // another section in the menu.
    s.turn += (emblem.turn - s.turn) * (1 - Math.exp(-dt * 2.2))
    mark.current.rotation.y = Math.sin(s.time * 0.45) * 0.42 + s.turn + (1 - s.reveal) * 1.6
    mark.current.rotation.x = Math.sin(s.time * 0.3) * 0.08
    mark.current.position.y = Math.sin(s.time * 0.8) * 0.03
    rings.current.rotation.set(1.2 + Math.sin(s.time * 0.2) * 0.05, s.time * 0.12, 0.22)
    rings.current.children[1].rotation.y = s.time * 0.25
    // Transparent only while fading, so the settled mark renders solid.
    const fading = s.reveal < 0.985
    if (gold.transparent !== fading) { gold.transparent = fading; gold.needsUpdate = true }
    gold.opacity = fading ? s.reveal : 1
    ringMaterial.opacity = 0.55 * s.reveal
    halo.material.uniforms.uTime.value = s.time
    halo.material.uniforms.uOpacity.value = s.reveal
    halo.material.uniforms.uPixelRatio.value = viewport.dpr
  })

  return <group ref={root} visible={false}>
    <mesh ref={mark} geometry={geometry} material={gold} />
    <group ref={rings}>
      <mesh material={ringMaterial}><torusGeometry args={[0.8, 0.003, 8, 160]} /></mesh>
      <mesh material={ringMaterial} rotation-x={0.5}><torusGeometry args={[0.9, 0.0022, 8, 160]} /></mesh>
      <points geometry={halo.geometry} material={halo.material} frustumCulled={false} />
    </group>
  </group>
}
