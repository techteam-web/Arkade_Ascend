// The orbit's compositing, from the Orbit project's shaders, trimmed and
// re-lit for the presentation.
//  - Image uv p: 0..1 over the render, y up; tc(p) flips it for bitmaps.
//  - Depth: black near, white far. Alpha: white where the scene is.
//  - The renders are premultiplied over black, so a background goes in as
//    rgb + sky * (1 - alpha); with no sky the canvas itself is transparent
//    there and the page shows through.
//  - Light is a weight w: 0 day, 0.5 evening (graded from both), 1 night.
//  - A change of light sweeps through the scene's depth, nearest first, the
//    sky following from the horizon up: one soft front, no cells or flashes.
//  - Floors light in the brochure's gold, on their own wing only.

export const MAX_LEVELS = 48

export const orbitVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const orbitFragment = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uDepth;
  uniform sampler2D uAlpha;
  uniform vec2 uCover;        // the share of the render across the view (cover fit, zoom)
  uniform vec2 uShift;        // offset of the render's centre, in render uv
  uniform float uT;           // light change progress, 1 = settled
  uniform float uFromW;
  uniform float uToW;
  uniform vec2 uParallax;
  uniform float uParallaxAmt;
  uniform float uSky;         // 1: a sky behind the matte; 0: transparent there
  uniform sampler2D uWorldA;
  uniform sampler2D uWorldB;
  uniform vec2 uWorldStep;
  uniform vec2 uWorldTexel;
  uniform float uWorldOn;
  uniform vec4 uTower;
  uniform float uFloorMin;
  uniform float uFloorSel;    // floor number + 1, 0 = none
  uniform float uFloorHover;
  uniform float uWingSel;
  uniform float uWingHover;
  uniform vec2 uWingMid;
  uniform vec2 uWingDir;
  uniform float uHasWings;
  uniform sampler2D uWingMap;
  uniform vec4 uWingMapRect;
  uniform float uHasWingMap;
  #define MAX_LEVELS ${MAX_LEVELS}
  uniform float uLevels[MAX_LEVELS];
  uniform float uLevelCount;

  varying vec2 vUv;

  #define PI 3.14159265
  #define BAND 0.3
  const vec3 GOLD = vec3(0.91, 0.80, 0.62);

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  vec2 tc(vec2 p) { return vec2(p.x, 1.0 - p.y); }
  float depthAt(vec2 p) { return texture2D(uDepth, tc(p)).r; }
  float alphaAt(vec2 p) { return texture2D(uAlpha, tc(p)).r; }
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  vec3 plate(vec2 p, float w) {
    if (w <= 0.0) return texture2D(uDay, tc(p)).rgb;
    if (w >= 1.0) return texture2D(uNight, tc(p)).rgb;
    vec3 day = texture2D(uDay, tc(p)).rgb;
    vec3 night = texture2D(uNight, tc(p)).rgb;
    // dusk: the day render dimmed and warmed, the night render's windows coming through
    float dusk = smoothstep(0.15, 0.5, w) * (1.0 - smoothstep(0.6, 1.0, w));
    vec3 warm = day * mix(vec3(1.0), vec3(1.06, 0.80, 0.62), dusk) * (1.0 - 0.45 * smoothstep(0.1, 1.0, w));
    // the night render's lit windows come through softly as evening falls
    float lit = smoothstep(0.3, 0.8, w);
    vec3 lights = night * smoothstep(0.35, 0.8, luma(night)) * lit * (1.0 - w * w) * 0.8;
    return mix(warm, night, w * w) + lights;
  }

  // Warm daylight, a copper dusk, a plum night: the brochure's palette.
  vec3 sky(vec2 p, float w) {
    float h = smoothstep(0.42, 1.0, p.y);
    vec3 day = mix(vec3(0.93, 0.85, 0.74), vec3(0.45, 0.60, 0.80), h);
    vec3 dusk = mix(vec3(0.93, 0.62, 0.40), vec3(0.27, 0.18, 0.26), h);
    vec3 night = mix(vec3(0.17, 0.11, 0.15), vec3(0.04, 0.025, 0.035), h);
    vec3 c = w < 0.5 ? mix(day, dusk, smoothstep(0.15, 0.5, w)) : mix(dusk, night, w * 2.0 - 1.0);
    return c * uSky;
  }

  vec3 shade(vec2 p, float w) {
    return plate(p, w) + sky(p, w) * (1.0 - alphaAt(p));
  }

  // ── Floors, from the world positions ──────────────────────────────────
  vec3 worldAtTc(vec2 t) {
    vec3 a = floor(texture2D(uWorldA, t).rgb * 255.0 + 0.5);
    vec3 b = floor(texture2D(uWorldB, t).rgb * 255.0 + 0.5);
    return vec3((a.r * 256.0 + a.g - 32768.0) * uWorldStep.x, (a.b * 256.0 + b.r - 32768.0) * uWorldStep.x, (b.g * 256.0 + b.b) * uWorldStep.y);
  }
  vec3 worldAt(vec2 p) { return worldAtTc(tc(p)); }
  // bilinear across one surface only, so floor lines do not stair-step
  vec3 worldSmooth(vec2 p, out float cover) {
    vec2 res = 1.0 / uWorldTexel;
    vec2 t = tc(p) * res - 0.5;
    vec2 i0 = floor(t);
    vec2 f = t - i0;
    vec3 s00 = worldAtTc((i0 + vec2(0.5, 0.5)) / res);
    vec3 s10 = worldAtTc((i0 + vec2(1.5, 0.5)) / res);
    vec3 s01 = worldAtTc((i0 + vec2(0.5, 1.5)) / res);
    vec3 s11 = worldAtTc((i0 + vec2(1.5, 1.5)) / res);
    vec4 w = vec4((1.0 - f.x) * (1.0 - f.y), f.x * (1.0 - f.y), (1.0 - f.x) * f.y, f.x * f.y);
    vec4 inScene = step(0.005, vec4(s00.z, s10.z, s01.z, s11.z));
    cover = dot(w, inScene);
    vec3 ref = worldAt(p);
    if (ref.z < 0.005) return ref;
    vec4 near = step(vec4(distance(s00, ref), distance(s10, ref), distance(s01, ref), distance(s11, ref)), vec4(1.5));
    vec4 ws = w * inScene * near;
    float sum = dot(ws, vec4(1.0));
    return sum > 1e-4 ? (s00 * ws.x + s10 * ws.y + s01 * ws.z + s11 * ws.w) / sum : ref;
  }
  float levelZ(float i) { return uLevels[int(clamp(i, 0.0, float(MAX_LEVELS - 1)))]; }
  float towerAt(vec3 w) {
    return (w.x >= uTower.x && w.x <= uTower.y && w.y >= uTower.z && w.y <= uTower.w && w.z >= uFloorMin) ? 1.0 : 0.0;
  }
  float floorBand(float id, float z, float zw) {
    float lo = levelZ(id - 1.0);
    float hi = id < uLevelCount ? levelZ(id) : 1e4;
    return clamp((z - lo) / zw + 0.5, 0.0, 1.0) * clamp((hi - z) / zw + 0.5, 0.0, 1.0);
  }
  float floorEdge(float id, float z, float zw) {
    float lo = levelZ(id - 1.0);
    float hi = id < uLevelCount ? levelZ(id) : 1e4;
    float inside = step(lo - zw * 2.0, z) * step(z, hi + zw * 2.0);
    return (1.0 - smoothstep(0.6, 1.6, min(abs(z - lo), abs(hi - z)) / zw)) * inside;
  }
  vec3 worldLayer(vec3 col, vec2 p) {
    float cover;
    vec3 wp = worldSmooth(p, cover);
    float hM = wp.z;
    float scene = step(0.005, hM) * smoothstep(0.25, 0.75, cover);
    float zw = max(fwidth(hM), 0.01);
    float crisp = 1.0 - smoothstep(0.8, 2.5, zw);
    float tower = towerAt(wp) * scene;
    float inB;
    if (uHasWingMap > 0.5) {
      vec2 m = (wp.xy - uWingMapRect.xy) / uWingMapRect.zw;
      inB = smoothstep(0.3, 0.7, texture2D(uWingMap, vec2(m.x, 1.0 - m.y)).r);
    } else {
      float side = dot(wp.xy - uWingMid, uWingDir);
      float sideW = max(fwidth(side), 0.01);
      inB = smoothstep(-sideW, sideW, side);
    }
    float selWing = uHasWings > 0.5 ? mix(1.0 - inB, inB, uWingSel) : 1.0;
    float hovWing = uHasWings > 0.5 ? mix(1.0 - inB, inB, uWingHover) : 1.0;
    float soft = max(zw, 0.3);
    float sel = uFloorSel > 0.5 ? floorBand(uFloorSel, hM, soft) * tower * selWing : 0.0;
    bool same = uFloorHover == uFloorSel && uWingHover == uWingSel;
    float hov = uFloorHover > 0.5 && !same ? floorBand(uFloorHover, hM, soft) * tower * hovWing : 0.0;
    float selEdge = uFloorSel > 0.5 ? floorEdge(uFloorSel, hM, zw) * tower * crisp * selWing : 0.0;
    float hovEdge = hov > 0.0 ? floorEdge(uFloorHover, hM, zw) * tower * crisp * hovWing : 0.0;
    vec3 c = mix(col, GOLD * max(luma(col) * 1.4, 0.6), sel * 0.62 + hov * 0.3);
    c += GOLD * (selEdge * 0.7 + hovEdge * 0.3);
    return mix(col, c, uWorldOn);
  }

  void main() {
    vec2 p = (vUv - 0.5) * uCover + 0.5 + uShift;
    // 2.5D parallax: near pixels slide a little against far ones, pivoting on
    // the tower's depth; the shift is capped so edges never smear
    p += uParallax * clamp(0.42 - depthAt(p), -0.22, 0.22) * uParallaxAmt;
    float inside = step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0);
    float d = depthAt(p);
    float a = alphaAt(p) * inside;

    vec3 col;
    if (uT >= 1.0) {
      col = shade(p, uToW);
    } else {
      // the new light arrives through the depth, a little organic, never a hard contour
      float e = uT * uT * (3.0 - 2.0 * uT);
      float front = mix(-BAND, 1.3 + BAND, e);
      float dn = d + (valueNoise(p * vec2(7.0, 4.0)) - 0.5) * 0.05;
      dn += (1.0 - alphaAt(p)) * (p.y - 0.5) * 0.5;   // the sky sweeps up from the horizon
      float k = smoothstep(0.0, 1.0, (front - dn) / BAND);
      col = mix(shade(p, uFromW), shade(p, uToW), k);
      col *= 1.0 + 0.05 * (1.0 - abs(k * 2.0 - 1.0)); // the light, just lifting where it lands
    }
    if (uWorldOn > 0.001) col = worldLayer(col, p);

    if (uSky > 0.5) {
      col = mix(sky(p, uToW), col, inside);
      col *= 1.0 - 0.2 * pow(length(vUv - 0.5) * 1.35, 2.0);
      gl_FragColor = vec4(col, 1.0);
    } else {
      gl_FragColor = vec4(col * inside, a);           // premultiplied, over the page
    }
  }
`
