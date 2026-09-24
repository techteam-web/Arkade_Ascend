import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { sceneStore } from '../sceneStore.js'

// Illustrative twin-tower massing, not the approved elevation. It lives in the
// shared canvas and fits itself into the Tower page's DOM anchor, so layout
// stays in CSS. Floors rise into place one by one as the page opens.
const FLOORS = sceneStore.tower.floors
const FLOOR_H = 0.19
const W = 1.3
const D = 1.0
const PODIUM_H = 0.5
const CROWN_H = 0.62
const TOTAL_H = PODIUM_H + FLOORS * FLOOR_H + CROWN_H
const TOWERS = [{ x: -0.86, z: 0.3 }, { x: 0.86, z: -0.32 }]
const RISE = 7                       // floors in flight at once

const glassVertex = /* glsl */ `
  attribute float aFloor;
  attribute float aTower;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  varying vec2 vUv;
  varying float vFloor;
  varying float vTower;
  varying float vSide;
  void main() {
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vec4 mv = viewMatrix * world;
    vViewPos = mv.xyz;
    vNormalV = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vUv = uv;
    vFloor = aFloor;
    vTower = aTower;
    vSide = abs(normal.x) > 0.5 ? 1.0 : 0.0;
    gl_Position = projectionMatrix * mv;
  }
`
const glassFragment = /* glsl */ `
  uniform float uNight, uHighlight, uHover, uTime, uFade;
  uniform vec3 uGlassDay, uGlassNight, uWarm, uGold;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  varying vec2 vUv;
  varying float vFloor;
  varying float vTower;
  varying float vSide;
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  void main() {
    vec3 N = normalize(vNormalV);
    vec3 V = normalize(-vViewPos);
    float fres = pow(1.0 - abs(dot(N, V)), 2.4);
    float columns = mix(9.0, 7.0, vSide);
    float cu = vUv.x * columns;
    // Mullions antialiased by screen-space width, so the facade does not
    // shimmer as the towers turn.
    float edge = max(fwidth(cu) * 1.1, 0.045);
    float pane = smoothstep(0.0, edge, fract(cu)) * smoothstep(1.0, 1.0 - edge, fract(cu));
    float id = hash(vec2(floor(cu) + vTower * 37.0 + vSide * 11.0, vFloor * 7.13));
    // Smoked bronze glass; a sparse scatter of warm windows after dusk.
    vec3 glass = mix(uGlassDay, uGlassNight, uNight);
    vec3 col = glass * (0.55 + 0.45 * fres) + uGold * fres * 0.22;
    col += uGold * 0.06 * vUv.y;
    float share = 0.22 * uNight;
    float lit = step(1.0 - share, id);
    // Warm windows stay below the bloom threshold; only the chosen level glows.
    col = mix(col, uWarm * (0.45 + 0.4 * fract(id * 13.0)), lit * pane);
    float hovered = 1.0 - smoothstep(0.0, 0.55, abs(vFloor - uHover));
    col = mix(col, uGold * 1.1, hovered * pane * 0.75);
    float selected = 1.0 - smoothstep(0.0, 0.55, abs(vFloor - uHighlight));
    col = mix(col, uGold * 2.0, selected * pane * 0.9);
    col = mix(uGold * 0.42, col, pane);                 // bronze mullions
    gl_FragColor = vec4(col, uFade);
  }
`
const plinthFragment = /* glsl */ `
  uniform vec3 uGold;
  uniform float uReveal, uTime;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float ring = exp(-pow((r - 0.86) * 26.0, 2.0)) + 0.55 * exp(-pow((r - 0.64) * 60.0, 2.0));
    float sweep = 0.6 + 0.4 * sin(atan(vUv.y - 0.5, vUv.x - 0.5) * 2.0 - uTime * 0.6);
    float pool = exp(-r * r * 3.0) * 0.18;
    float a = (ring * sweep * 1.3 + pool) * uReveal;
    gl_FragColor = vec4(uGold * (1.0 + ring * 0.8), a);
  }
`

const ease = t => 1 - Math.pow(1 - t, 3)

export default function TowerModel() {
  const { camera, gl, size } = useThree()
  const root = useRef()
  const spin = useRef()
  const glassMesh = useRef()
  const slabMesh = useRef()
  const finMesh = useRef()
  const crownMesh = useRef()
  const state = useRef({ build: 0, fade: 0, yaw: -0.5, time: 0, hover: -1 })
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const helper = useMemo(() => ({ matrix: new THREE.Matrix4(), position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: new THREE.Vector3(), point: new THREE.Vector3() }), [])
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const envMap = useWarmEnvironment()

  const glassMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: glassVertex, fragmentShader: glassFragment,
    uniforms: {
      uNight: { value: 1 }, uHighlight: { value: -10 }, uHover: { value: -10 }, uTime: { value: 0 }, uFade: { value: 1 },
      uGlassDay: { value: new THREE.Color('#4d434a') }, uGlassNight: { value: new THREE.Color('#140e11') },
      uWarm: { value: new THREE.Color('#ffc77a') }, uGold: { value: new THREE.Color('#e8b872') },
    },
  }), [])
  const bronze = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a27a4c', metalness: 0.85, roughness: 0.34, envMap, envMapIntensity: 0.85 }), [envMap])
  const lantern = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd79a', toneMapped: false }), [])
  const lanternColor = useMemo(() => new THREE.Color('#ffd79a'), [])
  const plinthMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: plinthFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uGold: { value: new THREE.Color('#d9a864') }, uReveal: { value: 0 }, uTime: { value: 0 } },
  }), [])

  // Materials that fade with the model (the plinth fades through its uniform).
  const materials = useMemo(() => [glassMaterial, bronze, lantern], [glassMaterial, bronze, lantern])
  const glassCount = FLOORS * TOWERS.length + 1   // + podium
  const slabCount = (FLOORS + 1) * TOWERS.length + 1
  const finsPerTower = 14
  const finCount = finsPerTower * TOWERS.length

  // Per-instance floor and tower ids for the window shader.
  const glassGeometry = useMemo(() => {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const floorIds = new Float32Array(glassCount)
    const towerIds = new Float32Array(glassCount)
    TOWERS.forEach((_, t) => { for (let f = 0; f < FLOORS; f++) { floorIds[t * FLOORS + f] = f; towerIds[t * FLOORS + f] = t } })
    floorIds[glassCount - 1] = -3
    geometry.setAttribute('aFloor', new THREE.InstancedBufferAttribute(floorIds, 1))
    geometry.setAttribute('aTower', new THREE.InstancedBufferAttribute(towerIds, 1))
    return geometry
  }, [glassCount])

  useLayoutEffect(() => () => {
    box.dispose(); glassGeometry.dispose(); glassMaterial.dispose(); bronze.dispose(); lantern.dispose(); plinthMaterial.dispose()
  }, [box, glassGeometry, glassMaterial, bronze, lantern, plinthMaterial])

  const place = (mesh, index, x, y, z, sx, sy, sz) => {
    helper.position.set(x, y, z)
    helper.scale.set(Math.max(sx, 1e-4), Math.max(sy, 1e-4), Math.max(sz, 1e-4))
    helper.matrix.compose(helper.position, helper.quaternion, helper.scale)
    mesh.setMatrixAt(index, helper.matrix)
  }

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const tower = sceneStore.tower
    const s = state.current
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    // Two separate motions, so they never compete: `build` raises the floors
    // once when the Tower page arrives; `fade` hides and restores the finished
    // model while the menu is open or the page is leaving.
    if (!tower.visible) s.build = 0
    else s.build = reduced ? 1 : Math.min(1, s.build + dt / 2.6)
    const fadeTarget = tower.visible && !sceneStore.menuOpen && !sceneStore.leaving ? 1 : 0
    if (!tower.visible || reduced) s.fade = fadeTarget
    else s.fade += (fadeTarget > s.fade ? 1 : -1) * Math.min(Math.abs(fadeTarget - s.fade), dt / (fadeTarget ? 0.6 : 0.4))
    root.current.visible = s.build > 0.001 && s.fade > 0.001
    if (!root.current.visible) { tower.callout = null; return }
    const fading = s.fade < 0.999
    materials.forEach(material => {
      if (material.transparent !== fading) { material.transparent = fading; material.needsUpdate = true }
      material.opacity = s.fade
    })
    glassMaterial.uniforms.uFade.value = s.fade
    s.time += dt

    // Fit into the DOM anchor: centre x, base on its bottom edge, height to fit.
    const anchor = tower.anchor?.getBoundingClientRect()
    const canvasBox = gl.domElement.getBoundingClientRect()
    const viewH = 2 * 12 * Math.tan(THREE.MathUtils.degToRad(17.5))
    const viewW = viewH * (size.width / size.height)
    if (anchor && anchor.width && canvasBox.width) {
      const cx = ((anchor.left + anchor.width / 2 - canvasBox.left) / canvasBox.width - 0.5) * viewW
      const base = (0.5 - (anchor.bottom - canvasBox.top) / canvasBox.height) * viewH
      const fitH = (anchor.height / canvasBox.height) * viewH
      const fitW = (anchor.width / canvasBox.width) * viewW
      // Leave headroom for perspective and the plinth ring below.
      const scale = Math.min((fitH * 0.8) / TOTAL_H, fitW / 5)
      root.current.position.set(cx, base + fitH * 0.07, 0)
      root.current.scale.setScalar(scale)
    }

    if (!tower.dragging && !reduced) tower.yaw += dt * 0.07
    s.yaw += (tower.yaw - s.yaw) * (1 - Math.exp(-dt * (tower.dragging ? 10 : 3)))
    spin.current.rotation.y = s.yaw
    lantern.color.copy(lanternColor).multiplyScalar(1.4)
    glassMaterial.uniforms.uHighlight.value = tower.floor < 0 ? -10 : tower.floor
    glassMaterial.uniforms.uHover.value = s.hover < 0 || s.hover === tower.floor ? -10 : s.hover
    glassMaterial.uniforms.uTime.value = s.time
    plinthMaterial.uniforms.uReveal.value = ease(Math.min(1, s.build * 1.6)) * s.fade
    plinthMaterial.uniforms.uTime.value = s.time

    // Floors rise into place, several in flight at once.
    const t = s.build * (FLOORS + RISE + 4)
    const podium = ease(THREE.MathUtils.clamp(t / 3, 0, 1))
    place(glassMesh.current, glassCount - 1, 0, PODIUM_H * podium / 2, 0, 3.7, PODIUM_H * podium * 0.9, 2.1)
    place(slabMesh.current, slabCount - 1, 0, PODIUM_H * podium, 0, 3.85 * podium, 0.05, 2.25 * podium)
    TOWERS.forEach(({ x, z }, ti) => {
      let built = 0
      for (let f = 0; f < FLOORS; f++) {
        const p = ease(THREE.MathUtils.clamp((t - 3 - f) / RISE, 0, 1))
        const y = PODIUM_H + f * FLOOR_H - Math.pow(1 - p, 2) * 0.9
        const k = 0.72 + 0.28 * p
        place(glassMesh.current, ti * FLOORS + f, x, y + FLOOR_H * 0.5, z, W * 0.95 * k * (p > 0 ? 1 : 0), FLOOR_H * 0.8 * p, D * 0.95 * k * (p > 0 ? 1 : 0))
        place(slabMesh.current, ti * (FLOORS + 1) + f, x, y + FLOOR_H, z, W * 1.05 * k * (p > 0 ? 1 : 0), 0.026 * p, D * 1.05 * k * (p > 0 ? 1 : 0))
        if (p > 0.98) built = f + 1
      }
      const crown = ease(THREE.MathUtils.clamp((t - 3 - FLOORS) / RISE, 0, 1))
      const roofY = PODIUM_H + FLOORS * FLOOR_H
      // A glowing lantern crown under a thin bronze cap.
      place(slabMesh.current, ti * (FLOORS + 1) + FLOORS, x, roofY + CROWN_H * 0.92 * crown, z, W * 0.74 * crown, 0.05 * crown, D * 0.66 * crown)
      place(crownMesh.current, ti, x, roofY + CROWN_H * 0.45 * crown, z, W * 0.6 * crown, CROWN_H * 0.9 * crown, D * 0.52 * crown)
      // Bronze fins run the height already built.
      const finH = built * FLOOR_H
      for (let i = 0; i < finsPerTower; i++) {
        const front = i < 10
        const along = front ? (i % 5) / 4 - 0.5 : (i % 2) - 0.5
        const side = front ? (i < 5 ? 1 : -1) : (i < 12 ? 1 : -1)
        const fx = front ? x + along * W * 0.98 : x + side * W * 0.53
        const fz = front ? z + side * D * 0.53 : z + along * D * 0.9
        place(finMesh.current, ti * finsPerTower + i, fx, PODIUM_H + finH / 2, fz, front ? 0.03 : 0.07, finH, front ? 0.07 : 0.03)
      }
    })
    glassMesh.current.instanceMatrix.needsUpdate = true
    slabMesh.current.instanceMatrix.needsUpdate = true
    finMesh.current.instanceMatrix.needsUpdate = true
    crownMesh.current.instanceMatrix.needsUpdate = true

    // Hover and tap picking: which floor lies under the pointer.
    const floorAt = point => {
      raycaster.setFromCamera({ x: ((point.x - canvasBox.left) / canvasBox.width) * 2 - 1, y: -((point.y - canvasBox.top) / canvasBox.height) * 2 + 1 }, camera)
      root.current.updateMatrixWorld(true)
      glassMesh.current.computeBoundingSphere()
      const hit = raycaster.intersectObject(glassMesh.current, false)[0]
      return hit && hit.instanceId < FLOORS * TOWERS.length ? hit.instanceId % FLOORS : -1
    }
    if (tower.pointer?.dirty) {
      tower.pointer.dirty = false
      const floor = s.build > 0.95 ? floorAt(tower.pointer) : -1
      if (floor !== s.hover) { s.hover = floor; tower.onHover?.(floor) }
    } else if (!tower.pointer && s.hover !== -1) {
      s.hover = -1
      tower.onHover?.(-1)
    }
    if (tower.pick) {
      const floor = floorAt(tower.pick)
      tower.pick = null
      if (floor >= 0) tower.onPick?.(floor)
    }

    // Screen positions beside the selected level (outside each tower), for
    // the page's DOM callout. The page chooses the side with more room.
    const shown = s.hover >= 0 ? s.hover : tower.floor
    if (shown >= 0) {
      const y = PODIUM_H + (shown + 0.5) * FLOOR_H
      const project = x => {
        helper.point.set(x, y, 0)
        spin.current.localToWorld(helper.point)
        helper.point.project(camera)
        return { x: canvasBox.left + (helper.point.x * 0.5 + 0.5) * canvasBox.width, y: canvasBox.top + (-helper.point.y * 0.5 + 0.5) * canvasBox.height }
      }
      const a = project(-1.75), b = project(1.75)
      tower.callout = a.x < b.x ? { left: a, right: b } : { left: b, right: a }
    } else tower.callout = null
  })

  return <group ref={root} visible={false}>
    <ambientLight intensity={0.25} color="#ffe2bd" />
    <directionalLight position={[-4, 6, 6]} intensity={1.6} color="#ffe0b0" />
    <directionalLight position={[5, 2, -4]} intensity={0.9} color="#b07a45" />
    <mesh rotation-x={-Math.PI / 2} position-y={0.005} material={plinthMaterial} renderOrder={1}>
      <planeGeometry args={[7, 7]} />
    </mesh>
    <group ref={spin}>
      <instancedMesh ref={glassMesh} args={[glassGeometry, glassMaterial, glassCount]} frustumCulled={false} />
      <instancedMesh ref={slabMesh} args={[box, bronze, slabCount]} frustumCulled={false} />
      <instancedMesh ref={finMesh} args={[box, bronze, finCount]} frustumCulled={false} />
      <instancedMesh ref={crownMesh} args={[box, lantern, TOWERS.length]} frustumCulled={false} />
    </group>
  </group>
}

// A warm gradient environment so the bronze slabs catch a champagne sky.
function useWarmEnvironment() {
  const { gl } = useThree()
  const env = useMemo(() => {
    const size = 64
    const data = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) {
      const t = y / (size - 1)
      const r = THREE.MathUtils.lerp(250, 40, t), g = THREE.MathUtils.lerp(226, 26, t), b = THREE.MathUtils.lerp(186, 22, t)
      for (let x = 0; x < size; x++) data.set([r, g, b, 255], (y * size + x) * 4)
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.needsUpdate = true
    const pmrem = new THREE.PMREMGenerator(gl)
    const result = pmrem.fromEquirectangular(texture).texture
    texture.dispose()
    pmrem.dispose()
    return result
  }, [gl])
  useLayoutEffect(() => () => env.dispose(), [env])
  return env
}
