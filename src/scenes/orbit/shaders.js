// The orbit's compositing, from the Orbit project's shaders, trimmed and
// re-lit for the presentation.
//  - Image uv p: 0..1 over the render, y up; tc(p) flips it for bitmaps.
//  - Depth: black near, white far. Alpha: white where the scene is.
//  - The renders are premultiplied over black, so a background goes in as
//    rgb + sky * (1 - alpha); with no sky the canvas itself is transparent
//    there and the page shows through.
//  - Light is a weight w: 0 day, 0.5 evening (graded from both), 1 night.
//  - A change of light is a time-lapse: every pixel passes through the light
//    in between (day, a copper dusk, night) on its own schedule. Styles
//    (TUNING.transitionStyle):
//    - 3d: the frame becomes a relief of the city for the change (reliefVertex,
//      reliefFragment): its world positions as a mesh, seen by a camera that
//      eases in, rises and swings round the tower and back, so near blocks
//      pass in front of far ones. A low sun rakes the faces turned to it;
//      the shadow rises by true height, the ground first and the crown last
//      (the other way at dawn); each home's windows switch on its own once
//      the shadow has passed its floor. Without the world data, time-lapse.
//    - flow (current): the new light pours from the tower: a satin band runs
//      down it from the crown, floor by floor, then at its foot the light
//      spreads over the ground in a ring (a circle round the tower on the
//      ground plane, an ellipse in perspective), a satin ribbon riding the
//      front with its threads flowing outward in rings. The ring runs on the
//      ground plane to a line in the middle distance, then each column rises
//      on from where the ring crossed it, so its arc lifts through the far
//      city into the sky in the same motion. The
//      sky turns from the crown outward. Flat: the view never moves.
//    - silk: the new light comes in as a wave across the view, its
//      edge rippling like cloth, a satin ribbon in the brochure's gold riding
//      the front (its sheen in fine threads, a soft fold of shade behind it)
//      and a thinner one just ahead; the image bends a touch under the
//      ribbon, as through moving silk, and the windows come on just behind
//      it. Flat: the view never moves or scales.
//    - animus: the relief breaks into square shards; a scan runs up the
//      tower and out across the city, and each shard it reaches lifts, turns
//      and shrinks as a cool white hologram with lit edges, takes the new
//      light in flight and lands (Assassin's Creed's Animus, by request).
//    - time-lapse: going darker, the zenith dims first and the shadow climbs
//      the city and the tower from the ground, the crown and horizon holding
//      the last warm light, then the windows come on floor by floor; going
//      lighter, the horizon brightens first and the light comes down from the
//      crown, the windows going out ahead of it.
//    - radial: the tower turns first, floor by floor, its windows following;
//      then a ring, traced by a fine gold line, runs out across the ground
//      (each frame's camera maps a pixel back to its distance from the tower,
//      so the ring lies on the city in perspective), and last the sky turns
//      outward from the crown.
//  - Floors light in the brochure's gold, on their own wing only: the floor
//    filled in gold with its facade reading through and ruled top and bottom,
//    the rest of the scene dimmed so it stands out; each fades in (uSelIn,
//    uHovIn) when it changes.

export const MAX_LEVELS = 48

export const orbitVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

// Shared by the flat compositor and the relief: the passes, the light and
// its timing.
const SHARED = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uAlpha;
  uniform vec2 uCover;        // the share of the render across the view (cover fit, zoom)
  uniform vec2 uShift;        // offset of the render's centre, in render uv
  uniform float uT;           // light change progress, 1 = settled
  uniform float uFromW;
  uniform float uToW;
  uniform float uSky;         // 1: a sky behind the matte; 0: transparent there
  uniform float uAnimus;      // 1: the animus style

  #define PI 3.14159265
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
  float alphaAt(vec2 p) { return texture2D(uAlpha, tc(p)).r; }
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  // How much of the night render's lit windows a light shows.
  float litAmount(float w) {
    float lit = smoothstep(0.3, 0.8, w);
    return w * w * 0.85 + lit * (1.0 - w * w) * 0.8;
  }

  // The render at light w, its windows at strength l (litAmount(w) when settled).
  vec3 plate(vec2 p, float w, float l) {
    if (w <= 0.0 && l <= 0.0) return texture2D(uDay, tc(p)).rgb;
    vec3 night = texture2D(uNight, tc(p)).rgb;
    vec3 windows = night * smoothstep(0.35, 0.8, luma(night));
    if (w >= 1.0) return night - windows * (0.85 - l);
    vec3 day = texture2D(uDay, tc(p)).rgb;
    // dusk: the day render dimmed and warmed, the night render coming through
    float dusk = smoothstep(0.15, 0.5, w) * (1.0 - smoothstep(0.6, 1.0, w));
    vec3 warm = day * mix(vec3(1.0), vec3(1.06, 0.80, 0.62), dusk) * (1.0 - 0.45 * smoothstep(0.1, 1.0, w));
    return mix(warm, night - windows * 0.85, w * w) + windows * l;
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

  // A pixel's own progress through the change: it starts at delay and turns
  // over span of the whole, eased in and out.
  float turnAt(float t, float delay, float span) {
    float k = clamp((t - delay) / span, 0.0, 1.0);
    return k * k * (3.0 - 2.0 * k);
  }

  // When the sky turns: going darker, from the zenith down; going lighter,
  // from the horizon up.
  float skyDelay(vec2 q, float darker) {
    float up = smoothstep(0.42, 1.0, q.y);
    return 0.55 * mix(up, 1.0 - up, darker);
  }

  // Animus: the sky washes towards a pale void while the scene desynchronises.
  vec3 animusVoid(vec3 c) {
    float k = uAnimus * (uT < 1.0 ? pow(sin(uT * PI), 2.0) : 0.0) * 0.55;
    return mix(c, vec3(0.80, 0.85, 0.90) * uSky, k);
  }

  // The view's vignette, drawing in a little while the light turns.
  vec3 finish(vec3 col, vec2 view) {
    float turning = uT < 1.0 ? sin(uT * PI) : 0.0;
    return col * (1.0 - (0.2 + 0.14 * turning) * pow(length(view - 0.5) * 1.35, 2.0));
  }
`

export const orbitFragment = /* glsl */ `
  ${SHARED}
  uniform sampler2D uDepth;
  uniform vec2 uParallax;
  uniform float uParallaxAmt;
  uniform float uRadial;      // 1: the radial style, 0: the time-lapse
  uniform float uSkyOnly;     // 1: the relief draws the scene; this pass draws the sky behind it
  uniform float uSilk;        // 1: the silk style
  uniform float uFlow;        // 1: the flow style
  uniform mat3 uGround;       // image uv -> ground plane (metres from the tower), for this frame
  uniform float uHasGround;
  uniform vec2 uTowerBase;    // the tower's foot and crown in image uv
  uniform vec2 uTowerTop;
  uniform vec4 uTowerRect;    // its outline's bounds: u0, u1, v0, v1
  uniform sampler2D uWorldA;
  uniform sampler2D uWorldB;
  uniform vec2 uWorldStep;
  uniform vec2 uWorldTexel;
  uniform float uWorldOn;
  uniform vec4 uTower;
  uniform float uFloorMin;
  uniform float uFloorSel;    // floor number + 1, 0 = none
  uniform float uFloorHover;
  uniform float uSelIn;       // 0..1: the chosen floor's highlight fading in
  uniform float uHovIn;       // 0..1: the pointed floor's
  uniform float uFocus;       // 0..1: the rest of the scene stepping back
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

  float depthAt(vec2 p) { return texture2D(uDepth, tc(p)).r; }
  vec3 shade(vec2 p, float w) {
    return plate(p, w, litAmount(w)) + sky(p, w) * (1.0 - alphaAt(p));
  }

  // How far out from the tower a point lies, 0 at its foot to 1 at the far
  // city: on the ground plane, eased so the ring crosses the screen evenly.
  float reach(vec2 p) {
    if (uHasGround > 0.5) {
      vec3 g = uGround * vec3(p, 1.0);
      if (g.z <= 0.0) return 1.0;       // above the horizon
      return clamp(log(1.0 + length(g.xy / g.z) / 40.0) / 2.92, 0.0, 1.0);
    }
    return clamp(length((p - uTowerBase) * vec2(1.78, 1.0)) / 1.1, 0.0, 1.0);
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
    return (1.0 - smoothstep(0.9, 2.4, min(abs(z - lo), abs(hi - z)) / zw)) * inside;
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
    float selK = sel * uSelIn;
    float hovK = hov * uHovIn;
    // while a floor is chosen or pointed at, everything else steps back
    vec3 c = col * mix(1.0, 0.58, uFocus * (1.0 - max(selK, hovK)));
    // the floor in the brochure's gold (#cea572), its windows and slabs
    // still reading through; the brighter gold is kept for its edges
    vec3 lit = vec3(0.81, 0.62, 0.38) * (0.5 + luma(col) * 1.3);
    c = mix(c, lit, selK * 0.85 + hovK * 0.55);
    // ruled along its slab and ceiling
    c += GOLD * (selEdge * uSelIn * 1.1 + hovEdge * uHovIn * 0.75);
    return mix(col, c, uWorldOn);
  }

  // The silk wave: the scene and sky at p partway through the change, and
  // the light the sky has there (for the edge of the view).
  vec3 silkTurn(vec2 p, out float wSky) {
    float darker = step(uFromW, uToW);
    float t = uT * uT * (3.0 - 2.0 * uT);
    // across the view (left to right going darker, back going lighter), rising a little
    float along = mix(1.0 - p.x, p.x, darker) + (p.y - 0.5) * 0.28;
    // the edge ripples like cloth
    float ripple = 0.055 * sin(p.y * 5.5 + uT * 5.0) + 0.03 * sin(p.y * 11.0 - uT * 7.0 + 1.7) + 0.02 * sin(p.y * 19.0 + uT * 3.0 + 4.1);
    float x = mix(-0.45, 1.75, t) - along - ripple;    // > 0 once the wave has passed
    // the ribbon at the front, a thinner one just ahead, a fold of shade behind
    float ribbon = exp(-pow((x - 0.03) / 0.035, 2.0));
    float ahead = exp(-pow((x + 0.09 + 0.015 * sin(p.y * 9.0 + uT * 6.0)) / 0.016, 2.0));
    float fold = exp(-pow((x - 0.12) / 0.05, 2.0));
    // the image bends a touch under the ribbon
    vec2 dirV = vec2(mix(-1.0, 1.0, darker), 0.28);
    vec2 pp = p + normalize(dirV) * 0.005 * ribbon * sin(p.y * 38.0 + uT * 9.0);
    float k = smoothstep(-0.02, 0.22, x);
    float w = mix(uFromW, uToW, k);
    wSky = w;
    // the windows come on just behind the wave, each patch in its own moment (off at its front, going lighter)
    float jitter = valueNoise(pp * vec2(150.0, 110.0)) * 0.7 + valueNoise(pp * vec2(26.0, 34.0)) * 0.3;
    float litK = darker > 0.5 ? smoothstep(0.1 + jitter * 0.3, 0.18 + jitter * 0.3, x) : smoothstep(-0.04 + jitter * 0.06, 0.02 + jitter * 0.06, x);
    float l = mix(litAmount(uFromW), litAmount(uToW), litK);
    float a = alphaAt(pp);
    vec3 col = plate(pp, w, l) + sky(p, w) * (1.0 - a);
    // satin, as the silk veil's: a gold sheen in fine threads along the ribbon
    vec3 satin = vec3(0.94, 0.82, 0.63);
    float threads = 0.72 + 0.28 * sin((p.y - along * 0.3) * 160.0 + ripple * 40.0);
    float swing = abs(uToW - uFromW) * 2.0;
    col *= 1.0 - 0.22 * fold * min(swing, 1.0);
    col = mix(col, col * 0.55 + satin * (0.3 + 0.55 * luma(col)), ribbon * 0.5 * threads * min(swing, 1.0));
    col += satin * ahead * 0.14 * min(swing, 1.0);
    return col;
  }

  // The flow: down the tower, then out over the ground in curved streams.
  vec3 flowTurn(vec2 p, out float wSky) {
    float darker = step(uFromW, uToW);
    float swing = min(abs(uToW - uFromW) * 2.0, 1.0);
    // the tower: within its outline, from its foot up (not the ground in
    // front of it), and at its depth (not the blocks before or behind it);
    // feathered, so it never shows as a box
    float across = smoothstep(uTowerRect.x - 0.01, uTowerRect.x + 0.01, p.x) * (1.0 - smoothstep(uTowerRect.y - 0.01, uTowerRect.y + 0.01, p.x));
    float above = smoothstep(uTowerBase.y - 0.005, uTowerBase.y + 0.035, p.y) * (1.0 - smoothstep(uTowerRect.w - 0.01, uTowerRect.w + 0.01, p.y));
    float tower = across * above * (1.0 - smoothstep(0.025, 0.06, abs(depthAt(p) - depthAt(mix(uTowerBase, uTowerTop, 0.45)))));
    float height = clamp((p.y - uTowerBase.y) / max(uTowerTop.y - uTowerBase.y, 1e-3), 0.0, 1.0);
    // The ring travels the ground plane from the tower's foot (a circle round
    // the tower, an ellipse in perspective). Its distance runs out towards
    // the horizon, so from a line in the middle distance it carries straight
    // on up instead: each column rises from where the ring crossed that line
    // (the middle leading, so the ring's arc lifts like a dome), quickening
    // through the far city and the sky, and leaves the top as the change ends.
    float horizon = uHasGround > 0.5 && abs(uGround[1][2]) > 1e-6
      ? -(uGround[0][2] * p.x + uGround[2][2]) / uGround[1][2] : 0.7;
    float line = horizon - 0.23;
    float top = 0.5 + uCover.y * 0.5 + uShift.y;
    float dLine = 0.2 + 0.5 * reach(vec2(p.x, line));
    float dUp = dLine + (0.8 - dLine) * clamp((p.y - line) / max(top - line, 0.05), 0.0, 1.0);
    float grain = valueNoise(p * vec2(9.0, 6.0)) - 0.5;
    float dGround = mix(0.2 + 0.5 * reach(p), dUp, smoothstep(line - 0.04, line + 0.04, p.y)) + grain * 0.012;
    // down the tower from the crown, reaching its foot as the ring comes out
    // from under the podium in this column, so tower and ground meet seamlessly
    float dFoot = 0.2 + 0.5 * reach(vec2(p.x, uTowerRect.z));
    float d = mix(dGround, 0.03 + (dFoot - 0.03) * (1.0 - height), tower);
    float span = mix(0.14, 0.1, tower);
    float k = turnAt(uT, d, span);
    float w = mix(uFromW, uToW, k);
    wSky = w;
    float x = uT - d - span * 0.5;                 // > 0 once the flow has passed
    float ribbon = exp(-pow(x / mix(0.025, 0.02, tower), 2.0));
    float fold = exp(-pow((x - 0.04) / 0.03, 2.0));
    // the image ripples a touch under the ribbon
    vec2 pp = p + vec2(0.0, 0.004) * ribbon * sin(p.x * 40.0 + uT * 9.0);
    // the windows come on just behind the flow (off at its front, going lighter)
    float jitter = valueNoise(pp * vec2(150.0, 110.0)) * 0.7 + valueNoise(pp * vec2(26.0, 34.0)) * 0.3;
    float litK = darker > 0.5 ? smoothstep(0.02 + jitter * 0.05, 0.045 + jitter * 0.05, x) : smoothstep(-0.03 + jitter * 0.03, jitter * 0.03, x);
    float l = mix(litAmount(uFromW), litAmount(uToW), litK);
    float a = alphaAt(pp);
    vec3 col = plate(pp, w, l) + sky(p, w) * (1.0 - a);
    // satin, as the silk veil's, one ribbon over land and sky alike, its
    // threads running with the flow: down the tower like its floors, outward
    // in rings everywhere else
    vec3 satin = vec3(0.94, 0.82, 0.63);
    float threads = 0.72 + 0.28 * sin(mix((dGround - 0.2) * 140.0 - uT * 16.0, height * 90.0 + uT * 14.0, tower));
    col *= 1.0 - 0.18 * fold * swing;
    col = mix(col, col * 0.55 + satin * (0.3 + 0.55 * luma(col)), ribbon * 0.45 * threads * swing);
    return col;
  }

  void main() {
    vec2 p = (vUv - 0.5) * uCover + 0.5 + uShift;
    if (uSkyOnly > 0.5) {
      float w = mix(uFromW, uToW, turnAt(uT, skyDelay(p, step(uFromW, uToW)), 0.25));
      gl_FragColor = vec4(finish(animusVoid(sky(p, w)), vUv), 1.0);
      return;
    }
    // 2.5D parallax: near pixels slide a little against far ones, pivoting on
    // the tower's depth; the shift is capped so edges never smear
    p += uParallax * clamp(0.42 - depthAt(p), -0.22, 0.22) * uParallaxAmt;
    float inside = step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0);
    float a = alphaAt(p) * inside;

    vec3 col;
    float wSky = uToW;
    if (uT >= 1.0) {
      col = shade(p, uToW);
    } else if (uFlow > 0.5) {
      col = flowTurn(p, wSky);
    } else if (uSilk > 0.5) {
      col = silkTurn(p, wSky);
    } else {
      float darker = step(uFromW, uToW);
      float swing = abs(uToW - uFromW);
      float grain = valueNoise(p * vec2(9.0, 6.0)) - 0.5;
      float jitter = valueNoise(p * vec2(150.0, 110.0)) * 0.7 + valueNoise(p * vec2(26.0, 34.0)) * 0.3;
      // when each pixel turns (dScene, dSky), over what share of the change
      // (span), and when its windows switch (dLit)
      float dScene, dSky, dLit, span, tower;
      if (uRadial > 0.5) {
        // the tower: inside its outline and at its depth, so nearer blocks are not
        float inRect = step(uTowerRect.x, p.x) * step(p.x, uTowerRect.y) * step(uTowerRect.z, p.y) * step(p.y, uTowerRect.w);
        tower = inRect * (1.0 - smoothstep(0.025, 0.06, abs(depthAt(p) - depthAt(mix(uTowerBase, uTowerTop, 0.45)))));
        float height = clamp((p.y - uTowerBase.y) / max(uTowerTop.y - uTowerBase.y, 1e-3), 0.0, 1.0);
        // the tower first, floor by floor; then the ring out across the city
        float dTower = 0.02 + 0.2 * mix(1.0 - height, height, darker);
        float dCity = 0.2 + 0.55 * reach(p) + grain * 0.03;
        dScene = mix(dCity, dTower, tower);
        // the sky last, outward from the crown
        dSky = 0.4 + 0.35 * clamp(length((p - uTowerTop) * vec2(1.78, 1.0)) / 1.3, 0.0, 1.0);
        span = 0.22;
        // windows on just after the light passes, off just ahead of it
        dLit = darker > 0.5 ? dScene + 0.05 + jitter * 0.1 : dScene - 0.05 + jitter * 0.08;
      } else {
        // how high a point stands on screen, ground to crown
        float rise = smoothstep(0.0, 0.76, p.y);
        tower = 0.0;
        // the shadow climbs at dusk, the light comes down at dawn
        dScene = 0.1 + 0.6 * mix(1.0 - rise, rise, darker) + grain * 0.06;
        dSky = skyDelay(p, darker);
        span = 0.25;
        // windows on floor by floor after the shadow, off ahead of the daylight
        dLit = darker > 0.5 ? 0.28 + 0.56 * rise + jitter * 0.16 : dScene - 0.06 + jitter * 0.14;
      }
      float kS = turnAt(uT, dScene, span);
      float wS = mix(uFromW, uToW, kS);
      wSky = mix(uFromW, uToW, turnAt(uT, dSky, 0.25));
      float l = mix(litAmount(uFromW), litAmount(uToW), turnAt(uT, clamp(dLit, 0.0, 0.88), mix(0.12, 0.1, uRadial)));
      vec3 scene = plate(p, wS, l);
      // the light leaves a moment of warmth where it turns
      scene *= mix(vec3(1.0), vec3(1.14, 0.97, 0.80), 4.0 * kS * (1.0 - kS) * 0.45 * swing);
      // radial: a fine gold line at its front, a band climbing the tower, a ring on the city
      if (uRadial > 0.5) {
        float edge = 1.0 - smoothstep(0.0, mix(0.026, 0.012, tower), abs(uT - dScene - span * 0.5));
        scene += GOLD * edge * 0.24 * swing * alphaAt(p);
      }
      col = scene + sky(p, wSky) * (1.0 - alphaAt(p));
    }
    if (uWorldOn > 0.001) col = worldLayer(col, p);

    if (uSky > 0.5) {
      col = mix(sky(p, wSky), col, inside);
      gl_FragColor = vec4(finish(col, vUv), 1.0);
    } else {
      gl_FragColor = vec4(col * inside, a);           // premultiplied, over the page
    }
  }
`

// ── The relief, for the 3D light change ─────────────────────────────────
// `position` is a point of the city in world metres (the sky's points lie
// far out along their rays). uCamMoved is the moved camera's 3 x 4
// projection (as a 4 x 4, last row 0 0 0 1) to image uv; the view then
// crops it as the flat pass does. Depth is the projective depth w, which is
// 1 at the tower and grows with distance.
export const reliefVertex = /* glsl */ `
  #define PI 3.14159265
  uniform mat4 uCamMoved;
  uniform vec2 uCover;
  uniform vec2 uShift;
  uniform vec3 uCamPos;
  uniform float uT;
  uniform float uAnimus;
  uniform float uTopZ;
  attribute float aFar;
  attribute vec4 aShard;      // the shard's centre (world metres) and a random 0..1
  attribute vec4 aCell;       // this vertex within its shard, and the shard's size, in grid cells
  varying vec3 vX;
  varying float vFar;
  varying vec4 vCell;
  varying float vPh;          // animus: 0 as the scan reaches the shard, 1 once it has landed
  varying float vAct;         // animus: how far the shard is in flight

  vec3 turnAbout(vec3 v, vec3 k, float a) {
    return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1.0 - cos(a));
  }

  void main() {
    vX = position;
    vFar = aFar;
    vCell = aCell;
    vec3 at = position;
    vPh = 2.0;
    vAct = 0.0;
    if (uAnimus > 0.5 && uT < 1.0 && aFar < 0.5) {
      // the scan climbs the tower, then runs out across the city
      float fromTower = length(aShard.xy);
      float reachN = fromTower < 60.0 ? 0.2 * clamp(aShard.z / uTopZ, 0.0, 1.0)
        : 0.2 + 0.8 * clamp(log(1.0 + (fromTower - 60.0) / 40.0) / 2.83, 0.0, 1.0);
      float front = uT * 1.7 - 0.25;   // past the far city by the end, every shard landed
      float s = aShard.w;
      vPh = (front - reachN - s * 0.08) / 0.22;
      vAct = sin(clamp(vPh, 0.0, 1.0) * PI);
      // in flight the shard lifts towards the camera, turns and shrinks, then lands
      vec3 d = position - aShard.xyz;
      vec3 axis = normalize(vec3(s - 0.5, fract(s * 7.31) - 0.5, 0.6));
      d = turnAbout(d, axis, vAct * (s - 0.5) * 1.4) * (1.0 - 0.3 * vAct);
      vec3 toCam = normalize(uCamPos - aShard.xyz);
      at = aShard.xyz + d + vec3(0.0, 0.0, vAct * (4.0 + 14.0 * s)) + toCam * vAct * (6.0 + 12.0 * fract(s * 3.7));
    }
    vec4 r = uCamMoved * vec4(at, 1.0);
    vec2 view = (r.xy / r.z - 0.5 - uShift) / uCover + 0.5;
    gl_Position = vec4((view * 2.0 - 1.0) * r.z, (r.z / 16.0 * 2.0 - 1.0) * r.z, r.z);
  }
`

// Each fragment is a point of the city; the frame's own camera (uCamNow)
// finds where the render shows it. With the camera at rest that is the
// fragment's own pixel, so the relief then matches the flat render exactly.
export const reliefFragment = /* glsl */ `
  ${SHARED}
  uniform mat4 uCamNow;
  uniform vec3 uCamPos;       // the frame's camera, in world metres
  uniform vec2 uSunDir;       // the sun's compass direction (x east, y north)
  uniform float uTopZ;        // the crown's height
  uniform float uFloorH;
  uniform float uLevel0;
  uniform vec2 uBuffer;       // the drawing buffer, in pixels
  varying vec3 vX;
  varying float vFar;
  varying vec4 vCell;
  varying float vPh;
  varying float vAct;

  void main() {
    vec4 r = uCamNow * vec4(vX, 1.0);
    vec2 src = r.xy / r.z;
    vec2 view = gl_FragCoord.xy / uBuffer;
    vec2 q = (view - 0.5) * uCover + 0.5 + uShift;   // the sky is painted by screen
    float darker = step(uFromW, uToW);
    float swing = abs(uToW - uFromW);
    float a = alphaAt(src);
    // animus: pure sky is left to the pass behind (identical while still), so
    // a shard on the skyline flies without a patch of sky
    if (uAnimus > 0.5 && a < 0.02) discard;
    float near = 1.0 - vFar;

    // The shadow rises by true height at dusk, the ground first and the
    // crown last, the side away from the sun a little ahead; at dawn the
    // light comes down from the crown, the side towards the sun first.
    float hz = pow(clamp(vX.z / uTopZ, 0.0, 1.0), 0.6);
    float reachM = length(vX.xy);
    float toSun = dot(vX.xy / max(reachM, 1.0), uSunDir) * smoothstep(0.0, 250.0, reachM);
    float grain = valueNoise(src * vec2(9.0, 6.0)) - 0.5;
    float order = mix(1.0 - hz, hz, darker) * 0.72 + (0.5 + 0.5 * toSun * (darker * 2.0 - 1.0)) * 0.28;
    float dScene = 0.05 + 0.6 * order + grain * 0.03;
    float kS = turnAt(uT, dScene, 0.26);

    // Each home's windows switch on their own once the shadow has passed
    // its floor (off ahead of the light at dawn): floors by height, homes
    // by 3.6 m bays along the facade.
    float level = floor((vX.z - uLevel0) / uFloorH);
    float home = hash12(floor(vX.xy / 3.6) + vec2(level * 17.0, level * 3.0));
    float dLit = darker > 0.5 ? dScene + 0.04 + home * 0.22 : dScene - 0.04 - home * 0.2;
    float lit = turnAt(uT, clamp(dLit, 0.0, 0.93), 0.05);
    if (uAnimus > 0.5) {
      // the shard takes the new light in flight; its homes light once it lands
      // (and go out as it lifts, going lighter)
      kS = smoothstep(0.3, 0.7, vPh);
      lit = darker > 0.5 ? smoothstep(0.9 + home * 0.4, 1.0 + home * 0.4, vPh) : smoothstep(0.05 + home * 0.2, 0.15 + home * 0.2, vPh);
    }
    float wS = mix(uFromW, uToW, kS);
    float l = mix(litAmount(uFromW), litAmount(uToW), lit);

    vec3 scene = plate(src, wS, l);
    if (uAnimus > 0.5 && vAct > 0.01) {
      // the image splits a little in flight
      vec2 o = vec2(0.0025 * vAct, 0.0);
      scene = vec3(plate(src + o, wS, l).r, scene.g, plate(src - o, wS, l).b);
    }
    // a moment of warmth where the light turns
    scene *= mix(vec3(1.0), vec3(1.14, 0.97, 0.80), 4.0 * kS * (1.0 - kS) * 0.45 * swing);

    // The low sun rakes across the faces turned to it, setting (or rising)
    // as the change runs; the faces turned away fall into a cool shade.
    vec3 n = normalize(cross(dFdx(vX), dFdy(vX)));
    n *= dot(n, uCamPos - vX) < 0.0 ? -1.0 : 1.0;
    float el = mix(0.32, -0.06, darker > 0.5 ? uT : 1.0 - uT);
    vec3 sun = normalize(vec3(uSunDir * cos(el), sin(el)));
    float lambert = max(dot(n, sun), 0.0) * smoothstep(-0.06, 0.1, el);
    float rake = sin(uT * PI) * swing * near * a;
    scene *= mix(vec3(1.0), vec3(0.8, 0.82, 0.92) + vec3(0.7, 0.4, 0.16) * lambert * 1.5, rake * 0.75);

    if (uAnimus > 0.5) {
      // in flight: a cool white hologram of itself, its edges drawn in light;
      // a thin scan of light at the front
      float e = min(min(vCell.x, vCell.z - vCell.x), min(vCell.y, vCell.w - vCell.y));
      float edge = 1.0 - smoothstep(0.0, fwidth(e) * 1.6 + 0.001, e);
      vec3 ice = vec3(0.80, 0.91, 1.0);
      scene = mix(scene, ice * (0.3 + luma(scene) * 1.2), vAct * 0.78 * a);
      scene += ice * (edge * vAct * 0.85 + (1.0 - smoothstep(0.0, 0.14, abs(vPh))) * 0.5) * near * a;
    }

    float wSky = mix(uFromW, uToW, turnAt(uT, skyDelay(q, darker), 0.25));
    vec3 col = scene + animusVoid(sky(q, wSky)) * (1.0 - a);
    gl_FragColor = vec4(finish(col, view), 1.0);
  }
`
