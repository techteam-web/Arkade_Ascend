// GLSL for the flowing silk veil (brochure page 2), the backdrop gradient and
// the glitter dust. All colours arrive as linear THREE.Color uniforms; the
// composer converts to sRGB once at the end.

const noiseChunk = /* glsl */ `
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
`

// The silk surface: a travelling S-curve centreline, a slow roll about the
// length (showing face, edge and reverse in turn), breathing width, and soft
// billows across the cloth. Evaluated three times per vertex for normals.
export const silkSurface = /* glsl */ `
  uniform float uTime, uLength, uWidth, uAmp, uFreq, uTwist, uTwistFreq, uPhase, uBillow;
  uniform vec3 uPointer;
  uniform float uPointerAmt;

  vec3 silkCentre(float u) {
    float t = uTime;
    float k = 6.2831853 * uFreq;
    float x = (u - 0.5) * uLength;
    float y = uAmp * sin(u * k + t * 0.33 + uPhase)
            + uAmp * 0.3 * sin(u * k * 2.1 - t * 0.26 + uPhase * 1.7);
    float z = uAmp * 0.65 * cos(u * k * 0.8 + t * 0.21 + uPhase);
    return vec3(x, y, z);
  }

  vec3 silkPoint(float u, float v) {
    vec3 c = silkCentre(u);
    vec3 T = normalize(silkCentre(u + 0.001) - c);
    vec3 side = normalize(cross(T, vec3(0.0, 0.0, 1.0)));
    vec3 lift = normalize(cross(side, T));
    float roll = uTwist * sin(u * 6.2831853 * uTwistFreq + uTime * 0.17 + uPhase) + 0.35;
    vec3 across = side * cos(roll) + lift * sin(roll);
    float width = uWidth * (0.8 + 0.2 * sin(u * 8.0 + uTime * 0.19 + uPhase));
    vec3 p = c + across * (v - 0.5) * width;
    vec3 face = normalize(cross(T, across));
    p += face * uBillow * sin(v * 4.7 + u * 13.0 - uTime * 0.55 + uPhase) * (0.35 + 0.65 * v);
    float d = length(p.xy - uPointer.xy);
    p.z += uPointerAmt * 0.85 * exp(-d * d / 5.0);
    return p;
  }
`

export const silkVertex = /* glsl */ `
  ${silkSurface}
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vTangentV;
  varying vec3 vViewPos;
  varying float vEdge;

  void main() {
    float u = uv.x, v = uv.y;
    vec3 p = silkPoint(u, v);
    vec3 pu = silkPoint(u + 0.0015, v);
    vec3 pv = silkPoint(u, v + 0.01);
    vec3 T = normalize(pu - p);
    vec3 N = normalize(cross(T, normalize(pv - p)));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vViewPos = mv.xyz;
    vNormalV = normalize(normalMatrix * N);
    vTangentV = normalize(normalMatrix * T);
    vUv = uv;
    vEdge = abs(v - 0.5) * 2.0;
    gl_Position = projectionMatrix * mv;
  }
`

export const silkFragment = /* glsl */ `
  uniform vec3 uShadow, uMid, uHigh, uLightDir;
  uniform float uOpacity, uGlitter, uTime, uSeed, uSheer;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vTangentV;
  varying vec3 vViewPos;
  varying float vEdge;
  ${noiseChunk}

  void main() {
    vec3 V = normalize(-vViewPos);
    vec3 N = normalize(vNormalV);
    if (dot(N, V) < 0.0) N = -N;
    vec3 L = normalize(uLightDir);
    vec3 T = normalize(vTangentV);

    float ndl = dot(N, L);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float diffuse = smoothstep(-0.35, 1.0, ndl);
    float fres = pow(1.0 - ndv, 3.0);

    // Ward anisotropic highlight: long along the fibres, tight across the
    // cloth, so light lies in soft streaks down each fold as on satin.
    vec3 H = normalize(L + V);
    vec3 B = normalize(cross(N, T));
    float nh = max(dot(N, H), 0.0);
    float th = dot(T, H) / 0.55;
    float bh = dot(B, H) / 0.13;
    float sheen = exp(-2.0 * (th * th + bh * bh) / (1.0 + nh));
    float hot = exp(-2.0 * (th * th * 4.0 + bh * bh * 9.0) / (1.0 + nh));

    vec3 col = mix(uShadow, uMid, pow(diffuse, 1.25));
    col = mix(col, uHigh, clamp(sheen * 0.75 + fres * 0.22, 0.0, 1.0));
    col += uHigh * hot * 0.9;
    col += uMid * pow(max(-ndl, 0.0), 2.0) * 0.35;    // light through the cloth
    col *= gl_FrontFacing ? 1.0 : 0.74;                // the reverse face sits darker

    // Page 2's sandy pearl speckle.
    float speck = hash(floor(vUv * vec2(2600.0, 520.0)) + uSeed);
    col *= 0.93 + speck * 0.14;

    // Glitter: sparse glints gathered into slowly drifting clouds, densest
    // in the shaded side of each fold as in the brochure.
    float g = hash(floor(vUv * vec2(1700.0, 330.0)) + uSeed * 3.1);
    float drift = vnoise(vUv * vec2(6.0, 2.0) + vec2(-uTime * 0.035, uSeed));
    float cluster = smoothstep(0.55, 0.92, drift) * mix(1.0, 0.45, diffuse);
    float twinkle = 0.5 + 0.5 * sin(uTime * (1.3 + g * 4.5) + g * 60.0);
    float glint = step(1.0 - 0.028 * cluster, g) * twinkle * twinkle;
    col += mix(uHigh, vec3(1.0, 0.96, 0.88), 0.55) * glint * uGlitter * (1.8 + sheen * 3.0);

    // Luminous selvedge, as on the brochure's edges.
    float selvedge = smoothstep(0.86, 0.975, vEdge) * (1.0 - smoothstep(0.975, 1.0, vEdge));
    col += uHigh * selvedge * (0.25 + sheen * 0.5);

    // Sheer where it faces you, denser where it folds away.
    float alpha = mix(uSheer, 1.0, fres) * uOpacity;
    alpha = max(alpha, glint * uOpacity * uGlitter);
    alpha *= 1.0 - smoothstep(0.93, 1.0, vEdge);
    alpha *= smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));
    gl_FragColor = vec4(col, alpha);
  }
`

export const backdropVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
`

export const backdropFragment = /* glsl */ `
  uniform vec3 uTop, uBottom, uGlow, uMistColor;
  uniform vec2 uGlowPos;
  uniform float uGlowStrength, uVignette, uAspect, uMist, uTime;
  varying vec2 vUv;
  ${noiseChunk}
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return v;
  }
  void main() {
    vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));
    vec2 d = (vUv - uGlowPos) * vec2(uAspect, 1.0);
    col = mix(col, uGlow, uGlowStrength * exp(-dot(d, d) * 1.6));
    // Golden mist: domain-warped noise drifting slowly, like smoke in light.
    if (uMist > 0.001) {
      vec2 p = vec2(vUv.x * uAspect, vUv.y) * 1.6;
      float t = uTime * 0.035;
      vec2 q = vec2(fbm(p + vec2(t, -t * 0.6)), fbm(p + vec2(4.2 - t * 0.8, 1.7 + t)));
      float m = fbm(p + q * 2.2 + vec2(-t * 0.5, t * 0.3));
      float veil = smoothstep(0.42, 0.88, m);
      float vein = smoothstep(0.035, 0.0, abs(m - 0.62)) * 0.55;
      col = mix(col, uMistColor, uMist * (veil * 0.42 + vein));
    }
    vec2 c = (vUv - 0.5) * vec2(min(uAspect, 2.2), 1.0);
    col *= 1.0 - uVignette * smoothstep(0.45, 1.25, length(c));
    col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;   // dither away banding
    gl_FragColor = vec4(col, 1.0);
  }
`

// Glitter motes travelling with the silk: a band that follows the veil's
// wave, each mote drifting, fading and twinkling on its own clock.
export const dustVertex = /* glsl */ `
  uniform float uTime, uSpan, uAmp, uFreq, uPixelRatio, uSize;
  attribute vec4 aSeed;
  varying float vAlpha;
  varying float vHot;
  void main() {
    float speed = 0.12 + aSeed.z * 0.35;
    float u = fract(aSeed.x + uTime * speed / uSpan);
    float x = (u - 0.5) * uSpan;
    float k = 6.2831853 * uFreq;
    float band = uAmp * sin(u * k + uTime * 0.33) + uAmp * 0.3 * sin(u * k * 2.1 - uTime * 0.26);
    float spread = (aSeed.y - 0.5);
    float y = band + spread * (1.2 + abs(spread) * 5.0) + sin(uTime * 0.4 + aSeed.w * 20.0) * 0.12;
    float z = (aSeed.w - 0.5) * 5.0 + cos(uTime * 0.3 + aSeed.x * 30.0) * 0.2;
    vec4 mv = modelViewMatrix * vec4(x, y, z, 1.0);
    gl_Position = projectionMatrix * mv;
    float big = step(0.985, aSeed.z);
    gl_PointSize = (mix(1.2, 3.4, aSeed.w) + big * 7.0) * uSize * uPixelRatio * (12.0 / -mv.z);
    float twinkle = 0.45 + 0.55 * sin(uTime * (0.8 + aSeed.z * 3.0) + aSeed.x * 90.0);
    float ends = smoothstep(0.0, 0.1, u) * (1.0 - smoothstep(0.9, 1.0, u));
    vAlpha = twinkle * ends * mix(0.95, 0.25, abs(spread) * 2.0) * (big > 0.5 ? 0.35 : 1.0);
    vHot = aSeed.z;
  }
`

export const dustFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAmount;
  varying float vAlpha;
  varying float vHot;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float core = exp(-r * r * 5.0);
    vec3 col = mix(uColor, vec3(1.0, 0.95, 0.85), core * 0.6) * (1.0 + vHot * 1.4);
    gl_FragColor = vec4(col, core * vAlpha * uAmount);
  }
`

// Gold threads: a surface woven from fine strands. Each strand follows the
// same slow waves; where neighbouring strands bunch together (the folds),
// light gathers and glows.
const threadWave = /* glsl */ `
  uniform float uTime, uWidth, uHeight, uDepth, uAmp, uLines;
  float threadY(float u, float l) {
    float envelope = 0.45 + 0.55 * sin(l * 3.14159);
    float w = uAmp * (0.62 * sin(u * 5.2 + uTime * 0.32 + l * 2.6) + 0.38 * sin(u * 2.1 - uTime * 0.21 + l * 5.3));
    w += 0.85 * sin(l * 2.7 + u * 2.6 + uTime * 0.14);
    return (l - 0.5) * uHeight + w * envelope;
  }
  vec3 threadPoint(float u, float l) {
    return vec3((u - 0.5) * uWidth, threadY(u, l), cos(u * 3.1 + l * 2.2 + uTime * 0.18) * uDepth);
  }
`

export const threadVertex = /* glsl */ `
  ${threadWave}
  attribute float aLine;
  attribute float aU;
  varying float vAlpha;
  varying float vGlow;
  void main() {
    vec3 p = threadPoint(aU, aLine);
    float dl = 1.0 / uLines;
    float gap = abs(threadY(aU, aLine + dl) - p.y) / (uHeight * dl);
    vGlow = clamp(1.0 / (gap + 0.12) - 0.75, 0.0, 3.2);
    vAlpha = smoothstep(0.0, 0.14, aU) * (1.0 - smoothstep(0.86, 1.0, aU)) * sin(aLine * 3.14159);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

export const threadFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity, uHot;
  varying float vAlpha;
  varying float vGlow;
  void main() {
    vec3 col = uColor * (0.45 + vGlow * 0.6 * uHot);
    gl_FragColor = vec4(col, vAlpha * uOpacity * (0.22 + vGlow * 0.42));
  }
`

// Beads of light travelling along the strands.
export const beadVertex = /* glsl */ `
  ${threadWave}
  uniform float uPixelRatio;
  attribute vec3 aSeed;
  varying float vAlpha;
  void main() {
    float line = floor(aSeed.x * uLines) / uLines;
    float u = fract(aSeed.y + uTime * (0.012 + aSeed.z * 0.03));
    vec4 mv = modelViewMatrix * vec4(threadPoint(u, line), 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.0 + aSeed.z * 3.5) * uPixelRatio * (12.0 / -mv.z);
    vAlpha = smoothstep(0.0, 0.1, u) * (1.0 - smoothstep(0.9, 1.0, u)) * (0.5 + 0.5 * sin(uTime * (1.0 + aSeed.z * 3.0) + aSeed.x * 40.0));
  }
`

export const beadFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float core = exp(-r * r * 6.0);
    gl_FragColor = vec4(mix(uColor, vec3(1.0, 0.96, 0.88), core) * 1.8, core * vAlpha * uOpacity);
  }
`
