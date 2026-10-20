// The Lift's liquid (DESIGN.md): a full-screen WebGL layer that floods the
// screen with molten satin, a plum lining a breath ahead of the gold, each
// with a rippling, domed front, flowing highlights and a bright meniscus; it
// drains away the same way it came. Plain WebGL (no three.js), drawn only
// while it moves.
//
// createLiquid(canvas) -> { set(state), dispose(), ok }
//   state: { lining: [tail, head], satin: [tail, head], direction, wobble }
//   head and tail run along the direction of travel: 0 is where it enters
//   (the bottom when rising), 1 the far edge. The layer fills from tail to
//   head, its edges rippling more while it moves (wobble 0 to 1).
const vertex = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() { vUv = aPosition * 0.5 + 0.5; gl_Position = vec4(aPosition, 0.0, 1.0); }
`

const fragment = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform float uTime, uAspect, uDirection, uWobble;
uniform vec2 uLining, uSatin;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.02 + 7.3; a *= 0.5; } return v; }

// How far along the travel this pixel is, with the front's ripple and dome.
float travel(vec2 uv) { return uDirection > 0.0 ? uv.y : 1.0 - uv.y; }
float edge(vec2 uv, float seed) {
  float x = uv.x * uAspect;
  float ripple = (fbm(vec2(x * 1.6 + seed, uTime * 0.55 + seed)) - 0.5) * 0.16 + sin(x * 3.1 + uTime * 2.2 + seed) * 0.018;
  float dome = (1.0 - pow(abs(uv.x * 2.0 - 1.0), 2.0)) * 0.09;
  return (ripple + dome) * uWobble;
}

// The surface of the liquid: a flowing height field, lit like satin metal.
vec3 shade(vec2 uv, vec3 deep, vec3 base, vec3 high, float shine, float seed) {
  vec2 p = vec2(uv.x * uAspect, uv.y) * 1.5;
  vec2 flow = vec2(uTime * 0.05, -uTime * 0.11 * uDirection);
  float h = fbm(p + flow + fbm(p * 1.3 - flow + seed) * 0.9);
  float hx = fbm(p + vec2(0.01, 0.0) + flow + fbm(p * 1.3 - flow + seed) * 0.9);
  float hy = fbm(p + vec2(0.0, 0.01) + flow + fbm(p * 1.3 - flow + seed) * 0.9);
  vec3 n = normalize(vec3((h - hx) * 28.0, (h - hy) * 28.0, 1.0));
  vec3 l = normalize(vec3(-0.45, 0.6, 0.65));
  float diffuse = smoothstep(0.15, 0.95, clamp(dot(n, l) * 0.5 + 0.5, 0.0, 1.0));
  vec3 r = reflect(-l, n);
  float spec = pow(max(r.z, 0.0), 26.0);
  // long satin streaks along the flow
  float streak = smoothstep(0.62, 1.0, sin((uv.x * uAspect * 0.8 + h * 2.4 + uv.y * 0.6) * 9.0 + uTime * 0.6) * 0.5 + 0.5);
  vec3 col = mix(deep, base, diffuse);
  col = mix(col, high, clamp(spec * shine + streak * 0.22 * shine, 0.0, 1.0));
  return col;
}

void main() {
  vec2 uv = vUv;
  float t = travel(uv);
  // the plum lining, then the gold satin over it
  float le = edge(uv, 3.7), se = edge(uv, 1.1);
  float liningIn = smoothstep(uLining.x - 0.004, uLining.x + 0.004, t - le * 0.6) * (1.0 - smoothstep(uLining.y - 0.004, uLining.y + 0.004, t - le));
  float satinIn = smoothstep(uSatin.x - 0.004, uSatin.x + 0.004, t - se * 0.6) * (1.0 - smoothstep(uSatin.y - 0.004, uSatin.y + 0.004, t - se));
  vec3 lining = shade(uv, vec3(0.05, 0.028, 0.034), vec3(0.2, 0.12, 0.14), vec3(0.6, 0.42, 0.4), 0.4, 5.0);
  vec3 satin = shade(uv, vec3(0.2, 0.11, 0.05), vec3(0.66, 0.47, 0.27), vec3(1.0, 0.94, 0.8), 1.25, 1.0);
  // a bright meniscus along the gold's leading front
  float front = uSatin.y - (t - se);
  satin += vec3(1.0, 0.9, 0.7) * exp(-pow(front / 0.006, 2.0)) * 0.7 * uWobble;
  // and a soft shadow the gold casts on the lining just behind its front
  lining *= 1.0 - 0.35 * exp(-max(front + 0.02, 0.0) * 18.0) * step(0.0, -front) * uWobble;
  vec3 col = mix(lining, satin, satinIn);
  float alpha = max(liningIn, satinIn);
  outColor = vec4(col * alpha, alpha);
}
`

export function createLiquid(canvas) {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false })
  if (!gl) return { ok: false, set() {}, dispose() {} }
  const compile = (type, source) => {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader))
    return shader
  }
  let program
  try {
    program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
  } catch {
    return { ok: false, set() {}, dispose() {} }
  }
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const location = gl.getAttribLocation(program, 'aPosition')
  const u = name => gl.getUniformLocation(program, name)
  const uniforms = { time: u('uTime'), aspect: u('uAspect'), direction: u('uDirection'), wobble: u('uWobble'), lining: u('uLining'), satin: u('uSatin') }
  const start = performance.now()

  const size = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
    const width = Math.round(canvas.clientWidth * ratio), height = Math.round(canvas.clientHeight * ratio)
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
    return [width, height]
  }

  return {
    ok: true,
    set({ lining, satin, direction = 1, wobble = 1 }) {
      const [width, height] = size()
      gl.viewport(0, 0, width, height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(location)
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)
      gl.uniform1f(uniforms.time, (performance.now() - start) / 1000)
      gl.uniform1f(uniforms.aspect, width / Math.max(1, height))
      gl.uniform1f(uniforms.direction, direction)
      gl.uniform1f(uniforms.wobble, wobble)
      gl.uniform2f(uniforms.lining, lining[0], lining[1])
      gl.uniform2f(uniforms.satin, satin[0], satin[1])
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    // The context is kept: the same canvas is set up again on a remount.
    dispose() {
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    },
  }
}
