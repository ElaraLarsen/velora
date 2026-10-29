// Real-time metal surfaces behind each Handwave step (adapted from prototype/liquid.ts).
// The shader matches the approved prototype except one line that moves the champagne sheet
// (mode 5) right on wide screens; modes 0 and 6 are unused in the app.
// Each material has its own surface structure, not one shape in different colours:
//   0 Sapphire Chrome     automotive body panel: a long convex panel with a crease and a dark cavity
//   1 Obsidian Titanium   lathe-turned dial: machined terraces with circular-brushed reflections
//   2 Burgundy Lacquer    lacquered slab: deep colour under a clear coat, one window reflection
//   3 Liquid Silver       polished chrome bars: round profiles sweeping through a wrapped studio
//   4 Emerald Petrol      emerald chrome sphere: green mirror reflections, deep shadowed rim
//   5 Champagne Metal     brushed champagne sheet: soft vertical satin reflections
//   6 Circle (violet)     stacked chrome plates with vertical light bands
// Every surface is shaded from a height field with a rounded bevel, lit by a procedural studio.
// WebGL1, one fragment shader, no textures, no libraries.

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_ptr;      // smoothed pointer, -1..1
uniform float u_intro;   // 0..1 opening reveal
uniform float u_sweep;   // 0..1 position of the light sweep that marks a page change
uniform float u_sweepAmt;
uniform float u_layout;  // 0 = opening (large, right of the headline), 1 = page header (top right)
uniform float u_fade;    // fades as the page scrolls
uniform float u_reveal;  // 0..1, material change: the surface dims out and back in
uniform float u_energy;  // movement amplitude (subtle vs cinematic)
uniform float u_mode;
uniform vec3 u_tint, u_base, u_envTop, u_envBottom, u_key, u_rim, u_bgA, u_bgB;
uniform float u_metal, u_rough, u_coat;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float sabs(float x, float k) { return sqrt(x * x + k); } // smooth abs: a sharp but anti-aliased crease
float sdRoundRect(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
bool is(float m) { return abs(u_mode - m) < 0.5; }
float sdHex(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}

// Outline of each surface (signed distance, negative inside) and its bevel width.
float shape(vec2 q, out float w) {
  if (is(0.0)) { w = 0.20; return sdRoundRect(rot(-0.22) * q, vec2(1.35, 0.72), 0.62); }
  if (is(1.0)) { w = 0.10; return length(q) - 1.0; }
  if (is(2.0)) { w = 0.16; return sdRoundRect(rot(0.16) * q, vec2(0.62, 1.02), 0.24); }
  if (is(3.0)) {
    // Four polished chrome bars. The bevel equals each bar's half-height, so the profile is fully round.
    w = 0.16;
    float d = sdRoundRect(q - vec2(0.45, 0.57), vec2(1.00, 0.16), 0.16);
    d = min(d, sdRoundRect(q - vec2(0.75, 0.19), vec2(1.05, 0.16), 0.16));
    d = min(d, sdRoundRect(q - vec2(0.95, -0.19), vec2(0.95, 0.16), 0.16));
    d = min(d, sdRoundRect(q - vec2(0.85, -0.57), vec2(0.85, 0.16), 0.16));
    return d;
  }
  if (is(4.0)) { w = 0.86; return length(q - vec2(0.3, -0.05)) - 0.86; } // sphere: bevel = radius
  if (is(5.0)) { w = 0.12; return sdRoundRect(q, vec2(1.18, 0.80), 0.36); }
  w = 0.05; return sdRoundRect(q - vec2(0.55, 0.0), vec2(0.95, 0.92), 0.06);
}

// Surface relief inside the outline.
float relief(vec2 q, float t) {
  if (is(0.0)) {
    vec2 p = rot(-0.22) * q;
    float h = 0.34 * (1.0 - 0.22 * p.x * p.x - 0.95 * p.y * p.y);
    h -= 0.10 * sabs(p.y - 0.16 * p.x - 0.06, 0.0005);                  // body crease
    h -= 0.30 * exp(-dot(p - vec2(0.75, -0.42), p - vec2(0.75, -0.42)) * 5.0); // dark cavity
    return h;
  }
  if (is(1.0)) {
    float r = length(q);
    float h = 0.05 * (1.0 - r * r);
    h += 0.05 * smoothstep(0.64, 0.61, r) + 0.045 * smoothstep(0.36, 0.33, r) + 0.04 * smoothstep(0.15, 0.12, r);
    return h;
  }
  if (is(2.0)) {
    vec2 p = rot(0.16) * q / vec2(0.75, 1.15);
    return 0.07 * (1.0 - dot(p, p));
  }
  if (is(3.0)) return 0.0;                          // the round bar profile comes from the bevel
  if (is(4.0)) return 0.0;                          // the sphere profile comes from the bevel
  if (is(5.0)) return 0.16 * (1.0 - 0.45 * q.x * q.x) + 0.03 * sin(q.x * 2.4 + 0.6); // gently curved sheet
  // Circle: three stacked plates, each gently curved along x, with dark grooves between them.
  float py = (q.y + 0.92) / 1.84 * 3.0;
  float idx = floor(py), fy = fract(py);
  float h = 0.035 * sin(q.x * 3.2 + idx * 1.9) + 0.02 * sin(q.x * 7.0 - idx);
  h -= 0.05 * (1.0 - smoothstep(0.0, 0.05, fy) * smoothstep(1.0, 0.95, fy));
  return h;
}

float height(vec2 q, float t, out float sd) {
  float w;
  sd = shape(q, w);
  float e = clamp(-sd / w, 0.0, 1.0);
  float bevel = w * sqrt(1.0 - (1.0 - e) * (1.0 - e)); // rounded edge
  return bevel + relief(q, t) * e;
}

float box(vec2 p, vec2 s, float e) {
  return smoothstep(s.x + e, s.x - e, abs(p.x)) * smoothstep(s.y + e, s.y - e, abs(p.y));
}

// The studio each surface reflects. Sapphire gets long horizontal strip lights (car studio);
// the others share a key softbox and hotspots. Roughness softens every edge.
vec3 env(vec2 r, float rough, float t) {
  float e = 0.015 + rough * 0.35;
  float spread = 1.0 + rough * 6.0;
  vec3 c = mix(u_envBottom, u_envTop, smoothstep(-0.9, 0.9, r.y));
  c *= mix(1.0, 0.25 + 0.75 * smoothstep(-0.1, 0.5, r.y) + 0.6 * smoothstep(-0.2, -0.7, r.y), 1.0 - rough);
  vec2 kc = vec2(0.35 + u_ptr.x * 0.3 + 0.08 * sin(t * 0.15), 0.45 + u_ptr.y * 0.15);
  if (is(0.0)) {
    c += u_key * box(r - vec2(0.0, 0.62 + u_ptr.y * 0.1), vec2(1.4, 0.035), e) * 3.0;
    c += u_key * box(r - vec2(0.2 + 0.1 * sin(t * 0.12), 0.28), vec2(1.2, 0.02), e) * 2.2;
    c += u_rim * box(r - vec2(-0.1, -0.35), vec2(1.4, 0.03), e) * 1.4;
  } else {
    vec2 kd = r - kc;
    c += u_key * box(kd, vec2(0.24, 0.13), e) * (1.4 + 2.0 * exp(-dot(kd, kd) * 18.0 / spread));
    c += mix(u_key, u_rim, 0.5) * box(r - vec2(-0.62 + u_ptr.x * 0.2, 0.2), vec2(0.04, 0.42), e) * 1.6;
  }
  vec2 h1 = r - vec2(0.12 + u_ptr.x * 0.2, 0.78);
  c += u_key * 2.6 * exp(-dot(h1, h1) * 60.0 / spread);
  c += u_tint * 0.3 * smoothstep(-0.1, -0.8, r.y);
  c += u_key * 2.4 * u_sweepAmt * exp(-pow((r.x + r.y * 0.4 - mix(-1.8, 1.8, u_sweep)) * 3.0, 2.0));
  return c;
}

// Chrome bars reflect a studio wrapped around them: phi is the reflection's elevation
// (-2 floor .. 0 horizon .. 2 ceiling), so a round bar sweeps through bright and dark bands.
vec3 chromeBands(float phi, float rough, float t) {
  float e = 0.03 + rough * 0.4;
  vec3 c = mix(u_envBottom, u_envTop, smoothstep(-1.6, 1.4, phi));
  c += u_key * smoothstep(0.9, 1.4, phi) * 1.4;                                            // bright ceiling
  c += u_key * box(vec2(0.0, phi - 0.30 - 0.06 * sin(t * 0.22) * u_energy), vec2(1.0, 0.20), e) * 2.6;  // key band
  c += u_key * box(vec2(0.0, phi - 0.74 - 0.05 * sin(t * 0.17 + 1.0) * u_energy), vec2(1.0, 0.05), e) * 2.2;
  c *= 1.0 - 0.9 * box(vec2(0.0, phi + 0.10), vec2(1.0, 0.045), e);                        // thin dark horizon
  c += u_key * box(vec2(0.0, phi + 0.30), vec2(1.0, 0.12), e) * 1.4;                       // lower softbox
  c += u_rim * box(vec2(0.0, phi + 0.70), vec2(1.0, 0.06), e) * 1.3;                       // floor reflection
  c *= 1.0 - 0.7 * smoothstep(-1.1, -1.6, phi);                                            // dark floor
  c += u_key * 2.4 * u_sweepAmt * exp(-pow((phi - mix(-2.0, 2.0, u_sweep)) * 3.0, 2.0));
  return c;
}

void main() {
  float aspect = u_res.x / u_res.y;
  float portrait = step(aspect, 1.0);
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time;

  vec2 heroC = vec2(mix(0.43 * aspect, 0.08, portrait), mix(-0.17, -0.28, portrait));
  vec2 pageC = vec2(mix(0.36 * aspect, 0.25, portrait), mix(0.20, 0.42, portrait));
  vec2 center = mix(heroC, pageC, u_layout);
  // App only: on wide screens the champagne sheet sits a little farther right, clear of the Prove intro.
  if (is(5.0)) center.x += 0.13 * u_layout * (1.0 - portrait);
  float zoom = mix(mix(2.1, 2.9, portrait), mix(2.7, 5.4, portrait), u_layout);
  vec2 q = (uv - center) * zoom;
  q += u_ptr * 0.03; // slight parallax

  float sd;
  float h = height(q, t, sd);
  float eps = zoom * 1.5 / u_res.y;
  float sdx, sdy;
  float hx = height(q + vec2(eps, 0.0), t, sdx) - height(q - vec2(eps, 0.0), t, sdx);
  float hy = height(q + vec2(0.0, eps), t, sdy) - height(q - vec2(0.0, eps), t, sdy);
  vec3 n = normalize(vec3(-hx / (2.0 * eps), -hy / (2.0 * eps), 1.0));
  vec2 r = 2.0 * n.z * n.xy;            // reflection of a straight-on view, projected
  float ndv = n.z;
  float F = pow(1.0 - ndv, 5.0);

  vec3 col;
  if (is(1.0)) {
    // Circular brushing: two light wedges sweep round the dial; fine turned rings; steps reflect the studio.
    float ang = atan(q.y, q.x);
    float la = 0.6 + u_ptr.x * 0.6 + t * 0.05 * u_energy;
    float aniso = pow(abs(cos(ang - la)), 10.0);
    float rings = 0.94 + 0.06 * sin(length(q) * 95.0);
    col = u_tint * (0.12 + 1.5 * aniso) * rings + u_key * 0.5 * pow(aniso, 6.0);
    col += env(r, u_rough, t) * u_tint * smoothstep(0.02, 0.2, length(n.xy)) * 1.2;
  } else if (is(6.0)) {
    // Violet chrome plates: vertical light bands drift slowly across each plate.
    float py = (q.y + 0.92) / 1.84 * 3.0;
    float idx = floor(py), fy = fract(py);
    float x = (q.x - 0.55) + r.x * 0.35 + 0.18 * sin(t * 0.12 + idx * 1.3) * u_energy;
    float b = 0.0;
    b += exp(-pow((x - 0.15 - 0.25 * sin(idx * 2.3)) * 6.0, 2.0)) * 1.1;
    b += exp(-pow((x + 0.75 + 0.15 * cos(idx * 1.7)) * 9.0, 2.0)) * 0.7;
    b += exp(-pow((x - 0.95 + 0.2 * sin(idx)) * 7.0, 2.0)) * 0.8;
    b += exp(-pow((x + 0.25 + 0.1 * sin(idx * 3.1)) * 18.0, 2.0)) * 0.5;
    float hue = 0.5 + 0.5 * sin(x * 1.6 + idx * 1.1 + 0.6);
    vec3 body = mix(u_rim, u_tint, hue);                       // violet <-> magenta
    col = u_base * 0.7 + body * (0.32 + 1.15 * b) + u_key * pow(b, 2.0) * 1.3; // rose-white peaks
    col *= mix(0.45, 1.0, smoothstep(0.0, 0.06, fy) * smoothstep(1.0, 0.94, fy)); // grooves
    col += u_key * 0.35 * smoothstep(0.93, 0.985, fy);         // top edge of each plate
  } else if (is(3.0)) {
    // Polished silver: full reflection of the wrapped studio, white at grazing angles.
    vec3 R3 = vec3(2.0 * n.z * n.x, 2.0 * n.z * n.y, 2.0 * n.z * n.z - 1.0);
    float phi = atan(R3.y, R3.z) / 1.5708;
    col = chromeBands(phi, u_rough, t) * mix(u_tint, vec3(1.0), F);
    col += u_key * 0.35 * pow(max(0.0, 1.0 - abs(R3.x) * 1.4), 6.0) * smoothstep(0.2, 0.5, phi); // soft hot spot
  } else if (is(4.0)) {
    // Emerald chrome sphere: a full mirror reflection of the studio, tinted green. Where the
    // reflection turns away from the viewer (the rim), it sees the dark studio behind: deep edges.
    vec3 R3 = vec3(2.0 * n.z * n.x, 2.0 * n.z * n.y, 2.0 * n.z * n.z - 1.0);
    vec3 E = env(R3.xy, u_rough, t);
    E = mix(u_envBottom * 0.35, E, smoothstep(-0.55, 0.15, R3.z));
    col = 2.3 * E * mix(u_tint, vec3(1.0), F * 0.35) * mix(0.35, 1.0, smoothstep(0.0, 0.45, ndv));
    col += env(R3.xy, 0.01, t) * (0.03 + 0.5 * F) * u_coat * smoothstep(-0.3, 0.3, R3.z);
  } else if (is(5.0)) {
    // Champagne satin metal: brushed across, so reflections stretch into soft vertical bands.
    float x = r.x * 1.6 + q.x * 0.22 + 0.25 * sin(t * 0.12) * u_energy + u_ptr.x * 0.15;
    float band = exp(-pow((x - 0.15) * 3.2, 2.0)) * 1.2 + exp(-pow((x + 0.7) * 5.0, 2.0)) * 0.6 + exp(-pow((x - 0.95) * 4.0, 2.0)) * 0.5;
    float lift = 0.55 + 0.45 * smoothstep(-0.9, 0.7, r.y + q.y * 0.3);
    vec3 satin = mix(u_base * 1.6, u_tint, 0.55 * lift) * (0.45 + 0.55 * lift);
    col = satin + u_tint * band * 0.9 + u_key * pow(band, 3.0) * 0.6;
    col *= 0.92 + 0.08 * hash(vec2(floor(q.x * 260.0), floor(q.y * 3.0))); // fine brushing
  } else {
    vec3 E = env(r, u_rough, t);
    vec3 metalC = E * mix(u_tint, vec3(1.0), F * 0.6);
    vec3 L = normalize(vec3(u_ptr * 0.6 + vec2(0.45, 0.7), 0.8));
    float dif = max(dot(n, L), 0.0) * 0.85 + 0.25 * (0.5 + 0.5 * n.y);
    vec3 baseC = u_base * dif * 1.5 + u_rim * pow(1.0 - ndv, 3.0) * 0.18;
    col = mix(baseC, metalC, u_metal);
    if (is(2.0)) {
      // One window reflection glides slowly across the lacquer.
      float wx = r.x * 2.2 + q.x * 0.35 - 0.4 * sin(t * 0.1) * u_energy;
      col += u_key * 0.55 * smoothstep(0.18, 0.05, abs(wx - 0.2)) * smoothstep(-0.6, 0.4, q.y + r.y);
    }
    col += env(r, 0.012, t) * (0.04 + 0.96 * F) * u_coat;
  }

  vec3 bg = mix(u_bgA, u_bgB, smoothstep(-0.9, 0.9, uv.y + uv.x * 0.35));
  bg += u_tint * 0.08 * exp(-dot(uv - center, uv - center) * mix(2.5, 6.0, u_layout));
  float shadowD;
  shape((uv - center) * zoom + vec2(-0.06, 0.12), shadowD);
  bg *= 1.0 - 0.55 * smoothstep(0.35, -0.05, shadowD) * u_reveal;

  col = 1.0 - exp(-col * 1.3);
  bg = 1.0 - exp(-bg * 1.3);
  float pix = zoom * 1.2 / u_res.y;
  float alpha = clamp(0.5 - sd / pix, 0.0, 1.0);
  float show = smoothstep(0.0, 0.7, u_intro) * u_fade * u_reveal;
  show *= mix(1.0, smoothstep(-0.08, 0.22, uv.y), u_layout * (1.0 - portrait)); // page headers: the metal stays above the content
  col = mix(bg, col, alpha * show);
  col *= 1.0 - 0.28 * dot(uv * 0.75, uv * 0.75);
  col += (hash(gl_FragCoord.xy + fract(t * 7.0) * 91.0) - 0.5) * 0.016;
  gl_FragColor = vec4(col, 1.0);
}
`;

const VEC_KEYS = ["tint", "base", "envTop", "envBottom", "key", "rim", "bgA", "bgB"] as const;
const NUM_KEYS = ["metal", "rough", "coat"] as const;
type VecKey = (typeof VEC_KEYS)[number];
type NumKey = (typeof NUM_KEYS)[number];
/** A material: studio colours, metalness/roughness/coat, and its surface structure (`mode`). */
export type Material = Record<VecKey, string> & Record<NumKey, number> & { mode: number };

export interface LiquidState {
  intro: number;
  energy: number;
  live: boolean;
  pointer: boolean;
  /** 0 = opening composition, 1 = page-header composition (animated). */
  layout: number;
  /** 0..1, how visible the surface is (fades as a page scrolls). */
  fade: number;
}

export interface Liquid {
  state: LiquidState;
  setMaterial(m: Material, instant?: boolean): void;
  /** A single sheet of light across the surface: used on page changes. */
  sweep(): void;
  replayIntro(): void;
  destroy(): void;
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
  return sh;
}

const rgb = (hex: string) => hexToRgb(hex).map((v) => v / 255);

/** Returns null when WebGL is unavailable; the caller shows the CSS fallback. */
export function startLiquid(canvas: HTMLCanvasElement, reducedMotion: boolean): Liquid | null {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return null;

  let prog: WebGLProgram;
  try {
    prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
  } catch (e) {
    console.warn("[liquid] shader failed, using fallback", e);
    return null;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const U = {
    res: u("u_res"), time: u("u_time"), ptr: u("u_ptr"), intro: u("u_intro"), sweep: u("u_sweep"), sweepAmt: u("u_sweepAmt"),
    layout: u("u_layout"), fade: u("u_fade"), reveal: u("u_reveal"), energy: u("u_energy"), mode: u("u_mode"),
  };
  const UV = Object.fromEntries(VEC_KEYS.map((k) => [k, u(`u_${k}`)])) as Record<VecKey, WebGLUniformLocation | null>;
  const UN = Object.fromEntries(NUM_KEYS.map((k) => [k, u(`u_${k}`)])) as Record<NumKey, WebGLUniformLocation | null>;

  const state: LiquidState = { intro: reducedMotion ? 1 : 0, energy: 1, live: !reducedMotion, pointer: true, layout: 0, fade: 1 };
  const curV = Object.fromEntries(VEC_KEYS.map((k) => [k, [0, 0, 0]])) as Record<VecKey, number[]>;
  const tgtV = Object.fromEntries(VEC_KEYS.map((k) => [k, [0, 0, 0]])) as Record<VecKey, number[]>;
  const curN = { metal: 1, rough: 0.05, coat: 0 } as Record<NumKey, number>;
  const tgtN = { ...curN };
  // A change of surface structure can't be blended, so the surface dims out, swaps and returns.
  let mode = 0, tgtMode = 0, reveal = 1, revealTgt = 1;
  let layoutNow = 0, fadeNow = 1;
  let quality = 0.75; // fraction of CSS pixels rendered; adjusted automatically
  let introStart = performance.now();
  let sweepStart = -1e9;
  let time = 6;
  let last = performance.now();
  const ptr = { x: 0.15, y: 0.1, tx: 0.15, ty: 0.1 };
  let raf = 0;
  let visible = true;
  const frameTimes: number[] = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr * quality));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr * quality));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl!.viewport(0, 0, w, h);
    }
  }

  function sweepPos(now: number) {
    const s = (now - sweepStart) / 1400;
    return s >= 0 && s <= 1 ? s : -1;
  }

  function draw(now: number) {
    resize();
    const sp = sweepPos(now);
    gl!.uniform2f(U.res, canvas.width, canvas.height);
    gl!.uniform1f(U.time, time);
    gl!.uniform2f(U.ptr, ptr.x, ptr.y);
    gl!.uniform1f(U.intro, state.intro);
    gl!.uniform1f(U.sweep, sp < 0 ? 0 : sp);
    gl!.uniform1f(U.sweepAmt, sp < 0 ? 0 : Math.sin(sp * Math.PI));
    gl!.uniform1f(U.layout, layoutNow);
    gl!.uniform1f(U.fade, fadeNow);
    gl!.uniform1f(U.reveal, reveal);
    gl!.uniform1f(U.energy, state.energy);
    gl!.uniform1f(U.mode, mode);
    for (const k of VEC_KEYS) gl!.uniform3f(UV[k], curV[k][0]!, curV[k][1]!, curV[k][2]!);
    for (const k of NUM_KEYS) gl!.uniform1f(UN[k], curN[k]);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function settling(now: number) {
    if (mode !== tgtMode || Math.abs(reveal - revealTgt) > 0.002) return true;
    if (Math.abs(layoutNow - state.layout) > 0.002 || Math.abs(fadeNow - state.fade) > 0.002) return true;
    if (state.intro < 1 || sweepPos(now) >= 0) return true;
    if (Math.abs(ptr.tx - ptr.x) > 0.001 || Math.abs(ptr.ty - ptr.y) > 0.001) return true;
    if (NUM_KEYS.some((k) => Math.abs(curN[k] - tgtN[k]) > 0.002)) return true;
    return VEC_KEYS.some((k) => curV[k].some((v, i) => Math.abs(v - tgtV[k][i]!) > 0.002));
  }

  function frame(now: number) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.live) time += dt * (0.6 + 0.4 * state.energy);
    if (state.intro < 1) state.intro = Math.min(1, (now - introStart) / 2400);
    const kp = 1 - Math.exp(-dt * 4);
    ptr.x += (ptr.tx - ptr.x) * kp;
    ptr.y += (ptr.ty - ptr.y) * kp;
    const km = 1 - Math.exp(-dt * 3.2); // colour cross-fade, ~0.9 s
    for (const k of VEC_KEYS) for (let i = 0; i < 3; i++) curV[k][i]! += (tgtV[k][i]! - curV[k][i]!) * km;
    for (const k of NUM_KEYS) curN[k] += (tgtN[k] - curN[k]) * km;
    if (mode !== tgtMode) {
      reveal += (0 - reveal) * (1 - Math.exp(-dt * 12));
      if (reveal < 0.03) {
        mode = tgtMode;
        revealTgt = 1;
      }
    } else reveal += (revealTgt - reveal) * (1 - Math.exp(-dt * 3.2));
    layoutNow += (state.layout - layoutNow) * (1 - Math.exp(-dt * 3.5));
    fadeNow += (state.fade - fadeNow) * (1 - Math.exp(-dt * 8));
    draw(now);

    frameTimes.push(dt);
    if (frameTimes.length > 40) {
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      frameTimes.length = 0;
      if (avg > 0.024 && quality > 0.45) quality -= 0.08;
      else if (avg < 0.014 && quality < 0.75) quality += 0.04;
    }
    if (visible && (state.live || settling(now)) && fadeNow + state.fade > 0.01) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!raf && visible) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function onPointer(e: PointerEvent) {
    if (!state.pointer || e.pointerType === "touch") return;
    ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
    ptr.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    kick();
  }
  function onVisibility() {
    visible = document.visibilityState === "visible";
    kick();
  }
  const ro = new ResizeObserver(() => kick());
  ro.observe(canvas);
  window.addEventListener("pointermove", onPointer, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);

  const proxy = new Proxy(state, {
    set(target, key, value) {
      (target as unknown as Record<string, unknown>)[key as string] = value;
      if (key === "pointer" && !value) {
        ptr.tx = 0.15;
        ptr.ty = 0.1;
      }
      kick();
      return true;
    },
  });

  return {
    state: proxy,
    setMaterial(m, instant) {
      for (const k of VEC_KEYS) {
        tgtV[k] = rgb(m[k]);
        if (instant) curV[k] = [...tgtV[k]];
      }
      for (const k of NUM_KEYS) {
        tgtN[k] = m[k];
        if (instant) curN[k] = m[k];
      }
      tgtMode = m.mode;
      if (instant) {
        mode = m.mode;
        reveal = revealTgt = 1;
      }
      kick();
    },
    sweep() {
      if (reducedMotion || !state.live) return;
      sweepStart = performance.now();
      kick();
    },
    replayIntro() {
      state.intro = 0;
      introStart = performance.now();
      kick();
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    },
  };
}
