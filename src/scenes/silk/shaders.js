// GLSL for the flowing silk veil (brochure page 2) and the still backdrop
// gradient. All colours arrive as linear THREE.Color uniforms.

const noiseChunk = /* glsl */ `
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
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
    p.z += uPointerAmt * 0.6 * exp(-d * d / 5.0);
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

// Plain satin: soft Ward highlights along the fibres, no glitter or speckle.
export const silkFragment = /* glsl */ `
  uniform vec3 uShadow, uMid, uHigh, uLightDir;
  uniform float uOpacity, uSheer;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vTangentV;
  varying vec3 vViewPos;
  varying float vEdge;

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

    vec3 col = mix(uShadow, uMid, pow(diffuse, 1.25));
    col = mix(col, uHigh, clamp(sheen * 0.62 + fres * 0.18, 0.0, 1.0));
    col += uMid * pow(max(-ndl, 0.0), 2.0) * 0.3;     // light through the cloth
    col *= gl_FrontFacing ? 1.0 : 0.76;                // the reverse face sits darker

    // A quiet selvedge along each edge.
    float selvedge = smoothstep(0.86, 0.975, vEdge) * (1.0 - smoothstep(0.975, 1.0, vEdge));
    col += uHigh * selvedge * (0.12 + sheen * 0.2);

    // Sheer where it faces you, denser where it folds away.
    float alpha = mix(uSheer, 1.0, fres) * uOpacity;
    alpha *= 1.0 - smoothstep(0.93, 1.0, vEdge);
    alpha *= smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));
    gl_FragColor = vec4(min(col, vec3(1.0)), alpha);
    #include <colorspace_fragment>
  }
`

export const backdropVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
`

// A still gradient with one soft pool of light and a gentle vignette.
export const backdropFragment = /* glsl */ `
  uniform vec3 uTop, uBottom, uGlow;
  uniform vec2 uGlowPos;
  uniform float uGlowStrength, uVignette, uAspect;
  varying vec2 vUv;
  ${noiseChunk}
  void main() {
    vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));
    vec2 d = (vUv - uGlowPos) * vec2(uAspect, 1.0);
    col = mix(col, uGlow, uGlowStrength * exp(-dot(d, d) * 1.6));
    vec2 c = (vUv - 0.5) * vec2(min(uAspect, 2.2), 1.0);
    col *= 1.0 - uVignette * smoothstep(0.45, 1.25, length(c));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
    gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;   // dither away banding
  }
`
