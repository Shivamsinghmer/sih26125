"use client";

import * as React from "react";
import { useEffect, useRef } from "react";

/**
 * Cloud Sky — Originkit.
 *
 * The shader, its constants and the whole rendering approach are the original's,
 * unchanged: the comments inside FRAG_SRC explain choices that were arrived at
 * on a parameter grid and are not mine to second-guess.
 *
 * The React wrapper is changed, because this ships as a page *backdrop* rather
 * than as a Framer canvas element, and four of its assumptions do not survive
 * that move. Each change is marked BACKDROP where it appears:
 *
 *   1. minWidth 1200 / minHeight 800 would force a horizontal scrollbar on
 *      every phone. A backdrop takes the size of what it sits behind.
 *   2. The canvas listened for its own pointer events. Behind a UI it must not
 *      take any, or it eats clicks meant for the page — so it is
 *      pointer-events:none and the parallax reads from the window instead,
 *      which keeps the effect and costs nothing.
 *   3. prefers-reduced-motion got no answer. A permanently drifting sky is
 *      exactly what that setting exists to stop, so it renders one frame and
 *      holds it — the sky is still there, it just stops moving.
 *   4. Without WebGL it logged an error and painted nothing. It now reports
 *      that upward so the caller can put something static in its place.
 */

/**
 * BACKDROP: cost controls.
 *
 * This shader is not cheap — a 5x5 puff loop plus three fbm calls, each four
 * octaves, for every pixel, and cloudField runs three times per fragment
 * (far, near, and the near layer's shadow sample). At devicePixelRatio 2 on a
 * 1440p screen that is ~16M fragment evaluations a frame, which is what made
 * the page hang.
 *
 * Three levers, in order of how much they save:
 *
 *   DPR 1 rather than 2 — a straight 4x cut on a retina display. A sky has no
 *   fine detail to lose; there is no text or edge in it to alias.
 *
 *   RENDER_SCALE — draw smaller than the element and let the browser scale the
 *   canvas up. Clouds are low-frequency by nature, so 0.6 is invisible in the
 *   result and saves another ~64%.
 *
 *   FRAME_MS — the near layer drifts 0.055 cells/sec. Nothing in this image
 *   needs 60fps; at 30 the motion is identical to the eye and the GPU does half
 *   the work.
 *
 * Together: roughly a twelfth of the original per-second fragment cost.
 */
const MAX_DPR = 1;
const RENDER_SCALE = 0.6;
const FRAME_MS = 1000 / 30;

// Found on a parameter grid; the look depends on these, so they are named.
const PUFF_UP = 0.34; // ellipse radius above the puff centre
const PUFF_DOWN = 0.19; // ...and below it. The gap IS the flat cumulus base.
const ERODE = 0.7; // how hard the fbm eats into the blob edge
const SHADOW_STEP = 0.085; // how far above a pixel the self-shadow samples
const NEAR_CELL = 1.05; // cells across the short side, near layer
const FAR_CELL = 2.15; // ...and far layer
const FAR_MIX = 0.55; // aerial perspective: far cloud mixed toward the sky
const NEAR_DRIFT = 0.055; // cells/sec at Speed 50
const FAR_DRIFT = 0.026;
const CIRRUS_DRIFT = 0.014;
const PUFF_WMAX = 2.15;
const SHADE_BLEND = 12.0;

const VERT_SRC = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uNearX, uFarX, uCirrusX;
uniform float uCoverage, uSize, uSoftness, uShadow, uCirrus;
uniform vec3 uZenith, uHorizon, uCloud;
uniform vec4 uGlow;
uniform vec2 uSun;
uniform vec2 uParallax;

// No sin() in the hash: fract(sin(x) * k) quantizes hard once the argument gets
// large, and the cell ids run far off the origin as the sky drifts.
vec2 hash22(vec2 p){
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

float hash12(vec2 p){
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float vnoise(vec2 x){
  vec2 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++){
    s += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return s;
}

// One hashed puff cluster per cell, walked over the neighbourhood so a puff near
// an edge is still drawn by the cell next door. Most cells are empty -- that is
// what leaves real sky between the clouds.
// Returns (coverage, height within the puff). The second component is what shades
// the cloud: -1 at its base, +1 at its crown. Without it the only shading signal
// is "is there cloud above me", which is true almost everywhere inside a puff, so
// the whole body goes grey and only a one-pixel rim stays white.
//
// THE WINDOW is 5x5, not 3x3, with an exact reach test that skips a cell before
// it costs a hash. A 3x3 window only serves puffs up to 1.85 cells wide; past
// that the widest puffs are dropped and their ellipses end on a hard arc.
//
// THE HEIGHT is a soft-max blend over every puff, not the nearest puff's. Taking
// it from the winner makes it jump the instant two overlapping puffs swap which
// one is nearest, and shadeCloud turns that discontinuity into a hard crease
// straight across the cloud body.
//
// The soft-max is the ONLINE form, rescaling the running sums whenever a new
// best arrives, so the dominant weight is always exactly 1.0 and the sums stay
// in [1, 25]. The plain exp(K * val) form overflows outright on a mediump
// fragment path, and its smallest weights flush to zero exactly at the cloud
// edge where the height still has to be right.
vec2 blobs(vec2 uv, float seed){
  vec2 id = floor(uv), f = fract(uv);
  // Sentinel stays small: -1e9 is outside mediump's guaranteed range, and val
  // never falls below about -50 here.
  float best = -1e4;
  float wsum = 0.0, ysum = 0.0;
  float wMax = min(${PUFF_WMAX.toFixed(3)}, 0.72 * uSize);
  float reach = min(2.0, ceil(wMax + 0.85) - 1.0);
  for (int j = -2; j <= 2; j++){
    for (int i = -2; i <= 2; i++){
      vec2 o = vec2(float(i), float(j));
      if (max(abs(o.x), abs(o.y)) > reach) continue;
      vec2 h = hash22(id + o + seed);
      // Coverage decides how many cells hold a cloud at all.
      if (fract(h.x * 37.1) > uCoverage) continue;
      vec2 c = o + 0.15 + h * 0.7;
      float w = min(${PUFF_WMAX.toFixed(3)}, (0.30 + 0.42 * fract(h.y * 19.7)) * uSize);
      vec2 d = f - c;
      // Asymmetric about the centre: tall above, short below. That gap is the
      // flat base a cumulus has and a noise field never produces.
      float ry = (d.y > 0.0 ? ${PUFF_UP.toFixed(3)} : ${PUFF_DOWN.toFixed(3)}) * uSize * (0.8 + 0.5 * fract(h.y * 7.3));
      float e = length(vec2(d.x / max(w, 1e-3), d.y / max(ry, 1e-3)));
      float val = 1.0 - e;
      float yN = d.y / max(ry, 1e-3);
      if (val > best){
        float k = exp(${SHADE_BLEND.toFixed(1)} * (best - val));
        wsum = wsum * k + 1.0;
        ysum = ysum * k + yN;
        best = val;
      } else {
        float g = exp(${SHADE_BLEND.toFixed(1)} * (val - best));
        wsum += g;
        ysum += g * yN;
      }
    }
  }
  return vec2(best, ysum / max(wsum, 1e-4));
}

// Blobs decide WHERE, noise decides the OUTLINE.
vec2 cloudField(vec2 uv, float seed, float detailScale){
  vec2 b = blobs(uv, seed);
  // Two bands: the coarse one dents the silhouette into lobes, the fine one
  // frays it. One band alone gives either a wobbly outline or fuzz, never the
  // feathered edge a cumulus has.
  float n = fbm(uv * detailScale + seed * 3.1) * 0.72
          + fbm(uv * detailScale * 3.3 + seed * 7.7) * 0.28;
  return vec2(b.x - (1.0 - n) * ${ERODE.toFixed(3)}, b.y);
}

// A cumulus is lit from above: white crown, grey underside tinted toward the sky
// it sits in. dyNorm is the pixel's height within its own puff, so this is the
// puff's own vertical gradient rather than a flat tint.
vec3 shadeCloud(float dyNorm, vec3 sky){
  float t = smoothstep(-0.95, 0.25, dyNorm);
  vec3 base = mix(uCloud * 0.52, sky, 0.34);
  return mix(mix(uCloud, base, uShadow), uCloud, t);
}

void main(){
  vec2 frag = gl_FragCoord.xy / max(uRes.y, 1.0);
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(frag.x, frag.y); // y in [0,1], x in [0,aspect]

  // ---- sky ---------------------------------------------------------------
  vec3 sky = mix(uHorizon, uZenith, smoothstep(-0.15, 1.05, p.y));
  vec2 sunP = vec2(uSun.x * aspect, uSun.y);
  float sd = length(p - sunP);
  // One tight term only. A second broad one reads as a lens wash over the whole
  // sky rather than as a sun, and clips the blue to white halfway across.
  sky += uGlow.rgb * uGlow.a * exp(-sd * 3.4) * 0.30;

  vec3 col = sky;

  // ---- cirrus: a thin high veil, no blobs, pure stretched noise ----------
  if (uCirrus > 0.0) {
    vec2 cuv = vec2(p.x * 1.4 + uCirrusX, p.y * 5.5);
    float veil = fbm(cuv) * fbm(cuv * 2.3 + 9.0);
    veil = smoothstep(0.24, 0.55, veil) * smoothstep(0.15, 0.7, p.y);
    col = mix(col, uCloud, veil * uCirrus * 0.5);
  }

  // ---- far cumulus -------------------------------------------------------
  vec2 fuv = vec2(p.x + uFarX, p.y) * ${FAR_CELL.toFixed(3)} + uParallax * 0.4;
  vec2 fd = cloudField(fuv, 17.0, 11.0);
  float fa = clamp(fd.x * uSoftness, 0.0, 1.0);
  if (fa > 0.0) {
    vec3 lit = shadeCloud(fd.y, sky);
    // Aerial perspective is a mix toward the SKY, not a drop in alpha.
    col = mix(col, mix(lit, sky, ${FAR_MIX.toFixed(3)}), fa);
  }

  // ---- near cumulus ------------------------------------------------------
  vec2 nuv = vec2(p.x + uNearX, p.y) * ${NEAR_CELL.toFixed(3)} + uParallax;
  vec2 nd = cloudField(nuv, 3.0, 8.5);
  float na = clamp(nd.x * uSoftness, 0.0, 1.0);
  if (na > 0.0) {
    vec3 lit = shadeCloud(nd.y, sky);
    // A second sample one step UP is the inter-cloud shadow: a billow standing
    // over this one dims it beyond its own top-lit gradient.
    float above = clamp(cloudField(nuv + vec2(0.0, ${SHADOW_STEP.toFixed(3)}), 3.0, 8.5).x * uSoftness, 0.0, 1.0);
    lit *= 1.0 - 0.18 * uShadow * above;
    // The sun side of a billow picks up the glow.
    lit += uGlow.rgb * uGlow.a * 0.22 * exp(-length(p - sunP) * 1.6);
    col = mix(col, lit, na);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("CloudSky shader:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

type RGBA = [number, number, number, number];

function parseColor(input: string | undefined, fb: RGBA): RGBA {
  if (!input) return fb;
  const str = String(input).trim();
  if (str.charAt(0) === "#") {
    let hex = str.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex =
        hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]! +
        (hex.length === 4 ? hex[3]! + hex[3]! : "");
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255, a];
    }
    return fb;
  }
  const m = str.match(/[\d.]+/g);
  if (m && m.length >= 3) {
    return [
      Math.min(255, parseFloat(m[0]!)) / 255,
      Math.min(255, parseFloat(m[1]!)) / 255,
      Math.min(255, parseFloat(m[2]!)) / 255,
      m.length >= 4 ? Math.min(1, parseFloat(m[3]!)) : 1,
    ];
  }
  return fb;
}

function num(v: unknown, fb: number): number {
  return typeof v === "number" && isFinite(v) ? v : fb;
}

function clampN(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

type Clouds = { softness?: number; shadow?: number; cirrus?: number };
type Sun = { x?: number; y?: number; glow?: string };
type Pointer = { parallax?: number; wind?: number; damping?: number };

const CLOUD_DEFAULTS: Required<Clouds> = { softness: 100, shadow: 100, cirrus: 45 };
const SUN_DEFAULTS: Required<Sun> = { x: 78, y: 92, glow: "rgba(232, 243, 255, 0.9)" };
const POINTER_DEFAULTS: Required<Pointer> = { parallax: 100, wind: 100, damping: 20 };

export interface CloudSkyProps {
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  background?: string;
  baseColor?: string;
  accentColor?: string;
  density?: number;
  speed?: number;
  size?: number;
  clouds?: Clouds;
  sun?: Sun;
  pointer?: Pointer;
  /** BACKDROP: told when WebGL is missing, so a static fallback can take over. */
  onUnavailable?: () => void;
  /**
   * BACKDROP: draw once and stop.
   *
   * A page that is doing real work should not also be shading a full-screen
   * fragment shader every frame. The login derives a key with PBKDF2 and signs
   * a nonce, and with the sky animating behind it that page missed a 60-second
   * timeout outright under software rendering — measured, by removing the sky
   * and watching the same flow pass in 49s. Held still it costs one draw.
   */
  animate?: boolean;
}

function CloudSkyBase(props: CloudSkyProps) {
  const {
    style,
    background = "#0075FF",
    baseColor = "#B4D2F0",
    accentColor = "#FFFFFF",
    density = 100,
    speed = 64,
    size = 130,
    clouds,
    sun,
    pointer,
    width,
    height,
    onUnavailable,
    animate = true,
  } = props;

  // A group the caller never set arrives undefined; spread-merging over a typed
  // literal beats a hand-written ?? chain, where one missed key silently pins a
  // control forever.
  const clouds_ = { ...CLOUD_DEFAULTS, ...(clouds || {}) };
  const sun_ = { ...SUN_DEFAULTS, ...(sun || {}) };
  const pointer_ = { ...POINTER_DEFAULTS, ...(pointer || {}) };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  sizeRef.current = { w: num(width, 0), h: num(height, 0) };

  // Every live input is read from a ref inside the loop. Putting any of them in
  // the effect deps would rebuild the GL context on every colour tweak.
  const vRef = useRef<Record<string, number | string>>({});
  vRef.current = {
    zenith: background,
    horizon: baseColor,
    cloud: accentColor,
    glow: sun_.glow,
    coverage: clampN(num(density, 55), 0, 100) / 100,
    speed: clampN(num(speed, 50), 0, 100) / 50,
    size: clampN(num(size, 100), 20, 300) / 100,
    softness: 4.5 / Math.max(0.15, clampN(num(clouds_.softness, 100), 20, 300) / 100),
    shadow: clampN(num(clouds_.shadow, 100), 0, 200) / 100,
    cirrus: clampN(num(clouds_.cirrus, 45), 0, 100) / 100,
    sunX: clampN(num(sun_.x, 78), 0, 100) / 100,
    sunY: clampN(num(sun_.y, 92), 0, 100) / 100,
    parallax: clampN(num(pointer_.parallax, 100), 0, 300) / 100,
    wind: clampN(num(pointer_.wind, 100), 0, 300) / 100,
    damping: clampN(num(pointer_.damping, 20), 1, 100),
  };

  const ptrRef = useRef({ x: 0, y: 0, inside: false });
  const unavailableRef = useRef(onUnavailable);
  unavailableRef.current = onUnavailable;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false });
    if (!gl) {
      // BACKDROP: reported rather than only logged, so the caller can paint
      // something static instead of leaving a flat rectangle.
      console.error("CloudSky: WebGL unavailable");
      unavailableRef.current?.();
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) {
      unavailableRef.current?.();
      return;
    }
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("CloudSky link:", gl.getProgramInfoLog(prog));
      unavailableRef.current?.();
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const locs: Record<string, WebGLUniformLocation | null> = {};
    const u = (name: string) => {
      if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name);
      return locs[name]!;
    };

    // BACKDROP: a sky that drifts for ever is what this setting exists to stop.
    // One frame is still drawn, so the sky is present — it simply holds still.
    const still =
      !animate ||
      (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true);

    let raf = 0;
    let last = performance.now();
    let lastDraw = 0;
    // BACKDROP: a sky nobody is looking at costs the same as one they are.
    // Paused when the tab is hidden or the band has scrolled away; the canvas
    // keeps its last frame, so resuming is not a flash of empty sky.
    let visible = true;
    // Each layer keeps its OWN accumulator, wrapped on the CPU. One shared clock
    // scaled per layer would jump every time Speed changed, because the scale
    // multiplies the whole elapsed time, not just what comes next.
    let nearX = 0;
    let farX = 0;
    let cirrusX = 0;
    let leanX = 0;
    let leanY = 0;

    let drawnOnce = false;

    const render = (now: number) => {
      raf = requestAnimationFrame(render);

      if (!visible || document.hidden) {
        last = now;
        return;
      }
      // Held still: draw the first frame, then only when the element resizes.
      // Without this the loop kept re-shading an image that never changed.
      if (still && drawnOnce) {
        const dprS = Math.min(window.devicePixelRatio || 1, MAX_DPR) * RENDER_SCALE;
        const wantW = Math.max(1, Math.round((sizeRef.current.w || canvas.clientWidth || 1200) * dprS));
        const wantH = Math.max(1, Math.round((sizeRef.current.h || canvas.clientHeight || 800) * dprS));
        if (canvas.width === wantW && canvas.height === wantH) return;
      }
      // Frame cap. dt still accumulates real elapsed time, so capping the draw
      // rate slows the work without slowing the wind.
      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const v = vRef.current;
      const p = ptrRef.current;

      if (!still) {
        // Eased toward target; higher Damping settles faster.
        const k = 1 - Math.exp(-(v.damping as number) * 0.12 * dt);
        leanX += ((p.inside ? p.x : 0) - leanX) * k;
        leanY += ((p.inside ? p.y : 0) - leanY) * k;

        // The pointer's horizontal offset ADDS to the wind, so moving one way
        // speeds the drift and the other way reverses it.
        const gust = 1 + leanX * (v.wind as number);
        const rate = (v.speed as number) * gust;
        nearX = (nearX - NEAR_DRIFT * rate * dt) % 1000;
        farX = (farX - FAR_DRIFT * rate * dt) % 1000;
        cirrusX = (cirrusX - CIRRUS_DRIFT * rate * dt) % 1000;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR) * RENDER_SCALE;
      const cw = sizeRef.current.w || canvas.clientWidth || 1200;
      const ch = sizeRef.current.h || canvas.clientHeight || 800;
      const bw = Math.max(1, Math.round(cw * dpr));
      const bh = Math.max(1, Math.round(ch * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      gl.viewport(0, 0, bw, bh);

      const zen = parseColor(v.zenith as string, [0.369, 0.576, 0.824, 1]);
      const hor = parseColor(v.horizon as string, [0.706, 0.824, 0.941, 1]);
      const cld = parseColor(v.cloud as string, [1, 1, 1, 1]);
      const glow = parseColor(v.glow as string, [0.91, 0.953, 1, 0.9]);

      gl.uniform2f(u("uRes"), bw, bh);
      gl.uniform1f(u("uNearX"), nearX);
      gl.uniform1f(u("uFarX"), farX);
      gl.uniform1f(u("uCirrusX"), cirrusX);
      gl.uniform1f(u("uCoverage"), v.coverage as number);
      gl.uniform1f(u("uSize"), v.size as number);
      gl.uniform1f(u("uSoftness"), v.softness as number);
      gl.uniform1f(u("uShadow"), v.shadow as number);
      gl.uniform1f(u("uCirrus"), v.cirrus as number);
      gl.uniform2f(u("uSun"), v.sunX as number, v.sunY as number);
      gl.uniform2f(
        u("uParallax"),
        -leanX * (v.parallax as number) * 0.07,
        -leanY * (v.parallax as number) * 0.05,
      );
      gl.uniform3f(u("uZenith"), zen[0], zen[1], zen[2]);
      gl.uniform3f(u("uHorizon"), hor[0], hor[1], hor[2]);
      gl.uniform3f(u("uCloud"), cld[0], cld[1], cld[2]);
      gl.uniform4f(u("uGlow"), glow[0], glow[1], glow[2], glow[3]);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      drawnOnce = true;
    };

    // BACKDROP: read from the window, not the canvas. The canvas is
    // pointer-events:none so it never takes a click meant for the page, which
    // means it would never see a pointermove either.
    const track = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      ptrRef.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptrRef.current.y = 1 - ((e.clientY - r.top) / r.height) * 2;
      ptrRef.current.inside = true;
    };
    const onLeave = () => {
      ptrRef.current.inside = false;
    };

    if (!still) {
      window.addEventListener("pointermove", track, { passive: true });
      window.addEventListener("pointerleave", onLeave);
    }

    // Off-screen is the common case on a console: the band is at the top of a
    // page people scroll down. rootMargin keeps it awake just before it returns.
    const io =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              visible = entries.some((e) => e.isIntersecting);
            },
            { rootMargin: "200px" },
          );
    io?.observe(canvas);

    raf = requestAnimationFrame(render);

    // Never loseContext(): getContext returns the same context per canvas, so
    // StrictMode's mount -> cleanup -> mount would reuse a force-lost one.
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener("pointermove", track);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background,
        isolation: "isolate",
        // BACKDROP: the original pinned minWidth 1200 / minHeight 800, which
        // forces a horizontal scrollbar on every phone. A backdrop is the size
        // of the thing it sits behind.
        width: typeof width === "number" && width > 0 ? width : "100%",
        height: typeof height === "number" && height > 0 ? height : "100%",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}

const PRESET = {
  clouds: { cirrus: 100, shadow: 70, softness: 200 },
  sun: { x: 100, y: 100, glow: "#FFFFFF" },
  pointer: { wind: 300, damping: 50, parallax: 300 },
} as const;

export default function CloudSky(props: CloudSkyProps) {
  return <CloudSkyBase {...(PRESET as CloudSkyProps)} {...props} />;
}
