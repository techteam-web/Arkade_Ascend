import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'
import { sceneStore } from '../scenes/sceneStore.js'

// A picture drawn in WebGL (DESIGN.md): it changes by rising, the new picture
// coming up through a liquid front (noise-edged, a thin gold seam riding it,
// both pictures warping as it passes), and under the pointer its surface
// ripples like water with a faint split of colour. With `drift`, a picture
// that fills the page breathes at rest: a slow push in and out, drifting a
// little, drawn only while it is on screen (not behind the menu, not under
// reduced motion). It fills its parent, like an <img> with object-fit: cover,
// around `focus` (an object-position such as "50% 40%"). The browser still
// picks the file (srcSet and sizes), and without WebGL 2 it is simply that <img>.
const vertex = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() { vUv = aPosition * 0.5 + 0.5; gl_Position = vec4(aPosition, 0.0, 1.0); }
`
const fragment = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uFrom, uTo;
uniform vec4 uFromFit, uToFit;     // cover scale (xy) and offset (zw) per picture
uniform float uProgress, uTime, uHover, uAspect, uZoom;
uniform vec2 uPointer, uPan;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.02 + 7.3; a *= 0.5; } return v; }
vec2 cover(vec2 uv, vec4 fit) { return uv * fit.xy + fit.zw; }
vec3 sampleSplit(sampler2D tex, vec2 uv, vec2 shift) {
  return vec3(texture(tex, uv + shift).r, texture(tex, uv).g, texture(tex, uv - shift).b);
}
void main() {
  vec2 uv = vUv;
  // the drift: a slow push in, sampled about the centre
  vec2 base = (uv - 0.5) / uZoom + 0.5 + uPan;
  // the pointer's ripple: rings spreading from under it, fading with distance
  vec2 d = (uv - uPointer) * vec2(uAspect, 1.0);
  float r = length(d);
  float ring = sin(r * 38.0 - uTime * 5.0) * exp(-r * 5.5) * uHover;
  vec2 ripple = normalize(d + 1e-5) * ring * 0.012 / vec2(uAspect, 1.0);
  vec2 split = ripple * 0.6 + vec2(0.0018, 0.0) * uHover * exp(-r * 4.0);
  // the rising front: low first, rippling, with noise in its edge
  float n = fbm(vec2(uv.x * uAspect * 2.4, uv.y * 2.0 + uTime * 0.25));
  // from the bottom up (uv.y is 0 at the bottom); m is 1 where the old picture still shows
  float front = uProgress * 1.75 - 0.35;
  float m = smoothstep(front - 0.12, front + 0.02, uv.y * 0.9 + n * 0.35);
  // both pictures bend as the front passes through them
  float bend = sin(uProgress * 3.14159);
  vec2 fromUv = cover(base + ripple + vec2(0.0, -bend * 0.05 * (1.0 - m)), uFromFit);
  vec2 toUv = cover(base + ripple + vec2(0.0, (1.0 - m) * 0.08 * bend), uToFit);
  vec3 from = sampleSplit(uFrom, fromUv, split);
  vec3 to = sampleSplit(uTo, toUv, split);
  vec3 col = mix(to, from, m);
  // a thin gold seam rides the front
  float seam = exp(-pow((m - 0.5) / 0.08, 2.0)) * bend;
  col += vec3(1.0, 0.82, 0.55) * seam * 0.55;
  outColor = vec4(col, 1.0);
}
`

// Cover-fit of a picture of `aspect` (w/h) in a box of `box` (w/h) around a focus point.
function fitFor(aspect, box, focus = '50% 50%') {
  const [fx, fy] = String(focus).split(/\s+/).map(value => (parseFloat(value) || 50) / 100)
  let sx = 1, sy = 1
  if (aspect > box) sx = box / aspect
  else sy = aspect / box
  // uv (0 at the bottom) to texture space (flipped on upload, so 0 is the top)
  return [sx, sy, (1 - sx) * fx, (1 - sy) * (1 - (fy ?? 0.5))]
}

function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false })
  if (!gl) return null
  const shader = (type, source) => {
    const s = gl.createShader(type)
    gl.shaderSource(s, source)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
    return s
  }
  let program
  try {
    program = gl.createProgram()
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex))
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
  } catch { return null }
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'aPosition')
  const uniform = name => gl.getUniformLocation(program, name)
  const u = {
    from: uniform('uFrom'), to: uniform('uTo'), fromFit: uniform('uFromFit'), toFit: uniform('uToFit'),
    progress: uniform('uProgress'), time: uniform('uTime'), hover: uniform('uHover'), aspect: uniform('uAspect'), pointer: uniform('uPointer'),
    zoom: uniform('uZoom'), pan: uniform('uPan'),
  }
  const textures = new Map()   // image -> texture
  const upload = image => {
    if (textures.has(image)) return textures.get(image)
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    textures.set(image, texture)
    return texture
  }
  const start = performance.now()
  return {
    draw({ from, to, fromFocus, toFocus, progress, hover, pointer, zoom = 1, pan = [0, 0] }) {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio)), height = Math.max(1, Math.round(canvas.clientHeight * ratio))
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
      gl.viewport(0, 0, width, height)
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
      const box = width / height
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, upload(from))
      gl.uniform1i(u.from, 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, upload(to))
      gl.uniform1i(u.to, 1)
      gl.uniform4fv(u.fromFit, fitFor(from.naturalWidth / from.naturalHeight, box, fromFocus))
      gl.uniform4fv(u.toFit, fitFor(to.naturalWidth / to.naturalHeight, box, toFocus))
      gl.uniform1f(u.progress, progress)
      gl.uniform1f(u.time, (performance.now() - start) / 1000)
      gl.uniform1f(u.hover, hover)
      gl.uniform1f(u.aspect, box)
      gl.uniform2f(u.pointer, pointer[0], pointer[1])
      gl.uniform1f(u.zoom, zoom)
      gl.uniform2f(u.pan, pan[0], pan[1])
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    // Keep only the textures of these images.
    keep(images) {
      textures.forEach((texture, image) => { if (!images.includes(image)) { gl.deleteTexture(texture); textures.delete(image) } })
    },
    dispose() {
      textures.forEach(texture => gl.deleteTexture(texture))
      textures.clear()
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    },
  }
}

// The picture the browser would show for this srcSet and sizes, decoded.
function loadPicture({ src, srcSet, sizes }) {
  const image = new Image()
  image.decoding = 'async'
  if (srcSet) { image.sizes = sizes || '100vw'; image.srcset = srcSet }
  image.src = src
  return image.decode().then(() => image)
}

export default function GLImage({ src, srcSet, sizes, alt = '', focus, className = '', ripple = true, drift = false }) {
  const box = useRef(null)
  const canvas = useRef(null)
  const renderer = useRef(null)
  const state = useRef({ from: null, to: null, fromFocus: focus, toFocus: focus, progress: 1, hover: 0, pointer: [0.5, 0.5], target: [0.5, 0.5], zoom: 1, pan: [0, 0], clock: 0, drifting: false })
  const [failed, setFailed] = useState(false)
  const drawing = useRef(0)    // reasons to keep drawing (a change, the pointer)

  const draw = useRef((time, deltaMs = 0) => {
    const s = state.current
    if (!renderer.current || !s.to) return
    if (s.drifting) {
      // nothing to see behind the menu: hold the drift where it is
      if (sceneStore.menuOpen) return
      s.clock += Math.min(deltaMs, 50) / 1000
      const breath = 0.5 - 0.5 * Math.cos(s.clock * Math.PI * 2 / 22)
      s.zoom = 1 + 0.045 * breath
      const margin = (1 - 1 / s.zoom) / 2
      s.pan = [margin * 0.8 * Math.sin(s.clock * Math.PI * 2 / 31), margin * 0.6 * Math.sin(s.clock * Math.PI * 2 / 37)]
    }
    s.pointer[0] += (s.target[0] - s.pointer[0]) * 0.12
    s.pointer[1] += (s.target[1] - s.pointer[1]) * 0.12
    renderer.current.draw({ ...s, from: s.from ?? s.to })
  }).current
  const hold = () => { if (drawing.current++ === 0) gsap.ticker.add(draw) }
  const release = () => { if (--drawing.current <= 0) { drawing.current = 0; gsap.ticker.remove(draw); draw() } }

  useLayoutEffect(() => {
    try { renderer.current = createRenderer(canvas.current) } catch { renderer.current = null }
    if (!renderer.current) setFailed(true)
    return () => { gsap.ticker.remove(draw); drawing.current = 0; renderer.current?.dispose(); renderer.current = null }
  }, [])

  // A new picture: load it as the browser would, then let it rise in.
  useEffect(() => {
    if (failed || !renderer.current) return
    let cancelled = false
    const s = state.current
    loadPicture({ src, srcSet, sizes }).then(image => {
      if (cancelled || !renderer.current) return
      const first = !s.to
      gsap.killTweensOf(s, 'progress')
      s.from = first ? image : s.to
      s.fromFocus = first ? focus : s.toFocus
      s.to = image
      s.toFocus = focus
      renderer.current.keep([s.from, s.to])
      if (first || prefersReducedMotion()) { s.progress = 1; draw(); return }
      s.progress = 0
      hold()
      gsap.to(s, { progress: 1, duration: 1.15, ease: 'curtain', onComplete: () => { s.from = s.to; s.fromFocus = s.toFocus; release() } })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [src, failed])

  // The drift runs while the picture is on screen and the tab is shown.
  useEffect(() => {
    if (!drift || failed || prefersReducedMotion()) return
    const s = state.current
    let visible = false, held = false
    const update = () => {
      const on = visible && document.visibilityState === 'visible'
      if (on && !held) { held = true; s.drifting = true; hold() }
      if (!on && held) { held = false; release() }
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update() })
    observer.observe(box.current)
    document.addEventListener('visibilitychange', update)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); if (held) release(); s.drifting = false }
  }, [drift, failed])

  // Redraw on resize.
  useEffect(() => {
    if (failed) return
    const observer = new ResizeObserver(() => draw())
    observer.observe(box.current)
    return () => observer.disconnect()
  }, [failed])

  // The ripple follows a mouse over the picture, and settles when it leaves.
  const onPointerMove = event => {
    if (!ripple || event.pointerType !== 'mouse' || prefersReducedMotion()) return
    const rect = box.current.getBoundingClientRect()
    state.current.target = [(event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height]
  }
  const onPointerEnter = event => {
    if (!ripple || event.pointerType !== 'mouse' || prefersReducedMotion() || failed) return
    onPointerMove(event)
    state.current.pointer = [...state.current.target]
    hold()
    gsap.to(state.current, { hover: 1, duration: 0.8, ease: 'power2.out', overwrite: 'auto' })
  }
  const onPointerLeave = event => {
    if (!ripple || event.pointerType !== 'mouse' || prefersReducedMotion() || failed) return
    gsap.to(state.current, { hover: 0, duration: 1, ease: 'power2.out', overwrite: 'auto', onComplete: release })
  }

  if (failed) return <img src={src} srcSet={srcSet} sizes={sizes} alt={alt} draggable="false" decoding="async"
    className={`absolute inset-0 size-full select-none object-cover ${className}`} style={{ objectPosition: focus }} />
  return <div ref={box} className={`absolute inset-0 ${className}`} onPointerMove={onPointerMove} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
    <canvas ref={canvas} role="img" aria-label={alt} className="absolute inset-0 size-full" />
  </div>
}
