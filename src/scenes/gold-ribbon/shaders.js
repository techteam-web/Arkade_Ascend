const TAU = 6.283185307

/* ---------- shared ribbon geometry, used by BOTH the visible
     material and the depth material that casts the shadow ---------- */
export const ribbonPars = /* glsl */ `
  uniform float uTime, uLength, uWidth, uAmp, uFreq;
  uniform float uTransitionEnergy;
  uniform float uWrap, uWrapPhase, uWrapOffset;
  uniform vec4 uOrbit;
  uniform mat4 uOrbitToLocal;
  uniform float uTwist, uTwistFreq, uSpeed;
  uniform vec3  uPointer;      // cursor, in world space on the z=0 plane
  uniform float uPointerAmt;   // eased 0..1 presence
  uniform float uPointerR;     // falloff radius
  uniform float uZCentre;      // centre of this ribbon's depth slab
  uniform float uZHalf;        // half-thickness of that slab

  varying float vEdge;
  varying float vTwistT;
  varying float vDepth;
  varying vec3  vTan;          // along-length direction, for anisotropy
  varying vec2  vSilkUV;


  void ribbonFrame(float u, out vec3 centre, out vec3 tangent, out vec3 across) {
    float t = uTime * uSpeed;

    float x = (u - 0.5) * uLength;
    float y = uAmp * sin(u * TAU * uFreq + t)
            + uAmp * 0.35 * sin(u * TAU * uFreq * 2.17 - t * 0.7);
    float z = uAmp * 0.55 * cos(u * TAU * uFreq * 0.75 + t * 0.55);
    centre = vec3(x, y, z);

    // cursor bulge — lifts the sheet toward the camera near the pointer.
    // Applied to the CENTRELINE inside this function so the finite-
    // difference normals below pick it up automatically.
    float d = length(centre.xy - uPointer.xy);
    float bulge = uPointerAmt * exp(-(d * d) / (2.0 * uPointerR * uPointerR));
    centre.z += bulge * 1.05;

    float e = 0.0015;
    float x2 = (u + e - 0.5) * uLength;
    float y2 = uAmp * sin((u + e) * TAU * uFreq + t)
             + uAmp * 0.35 * sin((u + e) * TAU * uFreq * 2.17 - t * 0.7);
    float z2 = uAmp * 0.55 * cos((u + e) * TAU * uFreq * 0.75 + t * 0.55);
    vec3 c2 = vec3(x2, y2, z2);
    float d2 = length(c2.xy - uPointer.xy);
    c2.z += uPointerAmt * exp(-(d2 * d2) / (2.0 * uPointerR * uPointerR)) * 1.05;

    tangent = normalize(c2 - centre);

    vec3 up   = vec3(0.0, 0.0, 1.0);
    vec3 side = normalize(cross(tangent, up));
    vec3 nrm  = normalize(cross(side, tangent));

    // the pointer also adds a little local twist, so the sheet turns
    // to face you rather than only swelling
    float a = uTwist * sin(u * TAU * uTwistFreq + t * 0.8)
            + bulge * 0.9;
    across = side * cos(a) + nrm * sin(a);
  }

  vec3 ribbonPoint(float u, float v) {
    vec3 c, tg, ac;
    ribbonFrame(u, c, tg, ac);
    vec3 p = c + ac * (v - 0.5) * uWidth;

    // DEPTH SLAB — the collision fix.
    //
    // The two ribbons cross in screen space on purpose; what looked wrong
    // was them interpenetrating where they met. The twist is the reason:
    // when the band rolls edge-on its cross-section points along Z, so it
    // sweeps +/- width/2 in DEPTH, easily enough to punch through the
    // other ribbon. Confining each to its own disjoint slab of Z makes the
    // intersection impossible by construction, whatever they do in X/Y.
    //
    // Soft-bounded with an algebraic sigmoid, not clamped: a hard clamp
    // would flatten the roll into a crease. s/sqrt(1+s^2) is smooth,
    // asymptotic to +/-1, and works on GLSL ES 1.00 (tanh does not).
    float s = (p.z - uZCentre) / uZHalf;
    p.z = uZCentre + uZHalf * (s * inversesqrt(1.0 + s * s));
    // A travelling helical arc surrounds the actual screen-space tower pair.
    // Camera-space depth crosses the artwork plane (-15) on each half turn.
    // Both silk normals and attached dust sample this same displaced surface.
    float angle = (u - 0.5) * 6.4 + uWrapPhase * 3.45 + uWrapOffset;
    vec3 orbit = vec3(uOrbit.x + cos(angle) * uOrbit.z,
      uOrbit.y + (u - 0.5) * uOrbit.w * 1.35 + sin(angle) * 0.3,
      -15.0 + sin(angle) * 2.2);
    vec3 fold = vec3(cos(angle) * 0.22, 0.38, sin(angle) * 0.45);
    orbit += fold * (v - 0.5) * uWidth;
    orbit.z += sin(v * 6.283185307 + u * 8.0 + uTime * 0.1) * 0.12;
    vec3 localOrbit = (uOrbitToLocal * vec4(orbit, 1.0)).xyz;
    p = mix(p, localOrbit, uWrap);
    return p;
  }
`.replace(/\bTAU\b/g, '6.283185307')

export const ribbonDisplace = /* glsl */ `
  float u = uv.x, v = uv.y;
  transformed = ribbonPoint(u, v);
`

export const ribbonDisplaceWithNormals = /* glsl */ `
  float u = uv.x, v = uv.y;
  float e = 0.002;

  vec3 p  = ribbonPoint(u, v);
  vec3 pu = ribbonPoint(min(u + e, 1.0), v);
  vec3 pv = ribbonPoint(u, min(v + e, 1.0));

  vEdge   = abs(v - 0.5) * 2.0;
  vSilkUV = uv;
  vTwistT = abs(sin(u * 6.283185307 * uTwistFreq + uTime * uSpeed * 0.8));
  vDepth  = p.z;

  transformed = p;
  vec3 n = normalize(cross(normalize(pu - p), normalize(pv - p)));
  objectNormal = n;
  vNormal = normalize(normalMatrix * n);
  vTan = normalize(normalMatrix * normalize(pu - p));
`

export const fragHelpers = /* glsl */ `
  varying float vEdge;
  varying float vTwistT;
  varying float vDepth;
  varying vec3  vTan;
  varying vec2  vSilkUV;
  uniform vec3  uLightDir;
  uniform vec3  uBgColor;

  float hash21(vec2 p){
    p = fract(p * vec2(233.34, 851.73));
    p += dot(p, p + 23.45);
    return fract(p.x * p.y);
  }

  // shadowed bronze -> mid gold -> hot highlight
  vec3 goldRamp(float t){
    // Linear-light bronze palette: dark folds, copper-gold body, warm crest.
    vec3 lo  = vec3(0.025, 0.009, 0.004);
    vec3 mid = vec3(0.300, 0.135, 0.052);
    vec3 hi  = vec3(0.820, 0.510, 0.250);
    return t < 0.5
      ? mix(lo,  mid, smoothstep(0.0, 0.5, t))
      : mix(mid, hi,  smoothstep(0.5, 1.0, t));
  }

  // Kajiya-Kay anisotropic specular: the highlight is a BAND along the
  // tangent, not a dot around the normal. This is what silk does.
  float silkSpec(vec3 T, vec3 L, vec3 V, float exponent){
    float TdotL = dot(T, L);
    float TdotV = dot(T, V);
    float s = sqrt(max(1.0 - TdotL * TdotL, 0.0))
            * sqrt(max(1.0 - TdotV * TdotV, 0.0))
            - TdotL * TdotV;
    return pow(max(s, 0.0), exponent);
  }
`

export const fragBody = /* glsl */ `
  vec3 T = normalize(vTan);
  vec3 N = normalize(vNormal);

  vec3 V = normalize(vViewPosition);
  vec3 L = normalize((viewMatrix * vec4(uLightDir, 0.0)).xyz);

  // translucency — silk is lit THROUGH as well as on
  float back  = pow(max(dot(-N, L), 0.0), 2.0);
  float front = max(dot(N, L), 0.0);
  float through = back * 0.62 + front * 0.42;

  // two anisotropic lobes: a broad soft one and a tight hot one.
  // The tight lobe is what reads as the bright crease at the fold.
  float specBroad = silkSpec(T, L, V, 24.0) * 0.24;
  float specHot   = silkSpec(T, L, V, 140.0) * 0.38;

  float lum = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float t = clamp(lum * 0.10 + through * 0.90 + specBroad * 0.50, 0.0, 1.0);

  vec3 col = goldRamp(pow(t, 1.12));
  // Fine lengthwise silk grain stays on the fabric as the ribbon moves.
  float weave = hash21(floor(vSilkUV * vec2(1500.0, 420.0)));
  float fibres = sin(vSilkUV.y * 1800.0 + sin(vSilkUV.x * 65.0) * 2.0);
  col *= 0.89 + weave * 0.17 + fibres * 0.045;
  col += vec3(1.0, 0.69, 0.36) * specHot;

  // gold dust, clustered along the fold and scintillating with view angle
  vec2  cell    = floor(vSilkUV * vec2(2400.0, 600.0));
  float grain   = hash21(cell);
  float flicker = hash21(cell + 17.3);
  float sparkle = smoothstep(0.985, 1.0, grain)
                * pow(vTwistT, 2.5)
                * smoothstep(0.22, 0.70, t)
                * (0.5 + 0.5 * flicker) * 0.35;
  col += vec3(1.0, 0.65, 0.30) * sparkle;

  // Thin edges bleed into the background instead of ending on a hard cut.
  // Kept tight: against a DARK ground a wide blend reads as a dirty dark
  // halo tracing the silhouette rather than as a soft edge.
  float edgeFade = 1.0 - smoothstep(0.93, 1.0, vEdge);
  col = mix(uBgColor, col, edgeFade);

  // aerial perspective: far parts sink toward the background colour
  float far = smoothstep(2.0, 12.0, abs(vDepth));
  col = mix(col, uBgColor, far * 0.34);

  gl_FragColor.rgb = col;
  gl_FragColor.a = 1.0;
`

