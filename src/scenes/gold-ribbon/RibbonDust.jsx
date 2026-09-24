import { useMemo, useLayoutEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ribbonPars } from './shaders.js'

// Dust samples the same surface at emission time, without changing the silk.
// A private shader clock lets each seed detach, drift and fade independently.
const particleRibbonPars = ribbonPars.replace(/\buTime\b/g, 'dustSampleTime')
  .replace('uniform float dustSampleTime,', 'float dustSampleTime;\n  uniform float uTime,')
export default function RibbonDust({ uniforms }) {
  const { gl } = useThree()
  const geometry = useMemo(() => {
    const count = 3600
    const seeds = new Float32Array(count * 3)
    const random = (i, salt) => {
      const n = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
      return n - Math.floor(n)
    }
    for (let i = 0; i < count; i++) {
      seeds[i * 3] = random(i, 1)
      seeds[i * 3 + 1] = random(i, 2)
      seeds[i * 3 + 2] = random(i, 3)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(seeds, 3))
    return result
  }, [])
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uPixelRatio: { value: gl.getPixelRatio() } },
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      ${particleRibbonPars}
      uniform float uPixelRatio;
      varying float vDustAlpha;
      varying float vDustWarmth;
      void main() {
        float u = 0.002 + position.x * 0.996;
        float edge = step(0.5, position.y);
        float spread = fract(position.y * 2.0);
        float seed = fract(position.x * 71.73 + position.y * 19.31);
        float lifetime = 1.1 + seed * 1.8;
        float age = mod(uTime + seed * lifetime, lifetime);
        float life = age / lifetime;
        float release = smoothstep(0.06, 0.3, life);
        // First appear on the live selvedge, then detach from that surface.
        dustSampleTime = uTime - age * release;
        vec3 anchor = ribbonPoint(u, edge);
        vec3 inside = ribbonPoint(u, mix(0.02, 0.98, edge));
        vec3 outward = normalize(anchor - inside);
        float phase = position.z * 6.283185307;
        float flutter = sin(uTime * 0.8 + phase);
        // A dense fringe close to the edge, tapering into sparse floating dust.
        float distanceFromEdge = 0.002 + pow(spread, 2.8) * 0.5 * life * release;
        vec3 p = anchor + outward * distanceFromEdge * (1.0 + flutter * 0.12);
        p.z += sin(phase * 3.0 + uTime) * distanceFromEdge * 0.25;
        float travel = age * release * (0.18 + seed * 0.38);
        vec3 velocity = vec3(0.28 + seed * 0.45, (spread - 0.4) * 0.5, sin(phase * 2.3) * 0.35);
        p += (outward * 0.35 + velocity) * travel;
        p.y -= age * age * 0.025 * release;
        p += vec3(sin(age * 1.3 + phase), cos(age * 0.9 + phase), sin(age + phase * 2.0)) * travel * 0.07;
        vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = clamp((1.4 + position.z * 3.0) * uPixelRatio * 15.0 / -viewPosition.z, 1.5, 9.0);
        vDustAlpha = mix(0.8, 0.12, spread) * (0.75 + flutter * 0.25);
        vDustAlpha *= smoothstep(0.0, 0.035, life) * (1.0 - smoothstep(0.6, 1.0, life));
        vDustWarmth = position.z;
        // Occasional travelling reflections, not racing dots: a short, slow
        // journey around each seeded location, with a long soft fade/rest.
        if (position.z > 0.998) {
          dustSampleTime = uTime;
          float cycle = fract(seed + uTime * (0.07 + seed * 0.025));
          float glide = smoothstep(0.0, 0.8, cycle);
          float run = clamp(position.x + (glide - 0.5) * 0.065, 0.01, 0.99);
          float lane = 0.3 + spread * 0.4;
          float runU = 0.003 + run * 0.994;
          vec3 surface = ribbonPoint(runU, lane);
          vec3 along = ribbonPoint(runU + 0.001, lane) - surface;
          vec3 across = ribbonPoint(runU, lane + 0.001) - surface;
          vec3 surfaceNormal = normalize(cross(along, across));
          float facing = (normalMatrix * surfaceNormal).z >= 0.0 ? 1.0 : -1.0;
          surface += surfaceNormal * facing * 0.012;
          viewPosition = modelViewMatrix * vec4(surface, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = clamp((2.4 + seed * 1.2) * uPixelRatio * 15.0 / -viewPosition.z, 1.5, 7.0);
          vDustAlpha = 0.65 * smoothstep(0.0, 0.25, cycle) * (1.0 - smoothstep(0.5, 0.82, cycle));
          vDustWarmth = 0.9;
        }
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vDustAlpha;
      varying float vDustWarmth;
      void main() {
        float radius = length(gl_PointCoord - 0.5) * 2.0;
        if (radius >= 1.0) discard;
        float alpha = (1.0 - smoothstep(0.1, 1.0, radius)) * vDustAlpha;
        vec3 gold = mix(vec3(0.55, 0.27, 0.07), vec3(1.0, 0.78, 0.40), vDustWarmth);
        gl_FragColor = vec4(gold, alpha);
      }
    `,
  }), [uniforms, gl])
  useFrame(() => { material.uniforms.uPixelRatio.value = gl.getPixelRatio() })
  useLayoutEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

