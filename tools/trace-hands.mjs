// Turns the reference line drawing (content/art/hands-reference.png) into
//   1. variable-width line artwork (filled outlines, via potrace), and
//   2. "pen order" reveal masks: centre-line strokes (from a skeleton of the
//      drawing) annotated with the time the pen reaches them, growing from the
//      wrists outward along the connected lines.
// Output: content/hands.json (consumed by build.mjs). Run: npm run trace
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import potrace from 'potrace';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'content/art/hands-reference.png');
const OUT = path.join(ROOT, 'content/hands.json');

const UP_FILL = 4;   // upscale for smooth outlines
const UP_SKEL = 2;   // upscale for the skeleton
const BG_R = 252, INK_R = 32; // red channel of paper / ink in the reference

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const ink = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) ink[i] = Math.max(0, Math.min(1, (BG_R - data[i * 3]) / (BG_R - INK_R)));

// --- split between the two hands: widest empty column run near the centre ---
const colInk = (x) => { let s = 0; for (let y = 0; y < H; y++) s += ink[y * W + x] > 0.25 ? 1 : 0; return s; };
let best = null, run = null;
for (let x = Math.floor(W * 0.4); x < Math.floor(W * 0.6); x++) {
  if (colInk(x) === 0) { run = run ? [run[0], x] : [x, x]; if (!best || run[1] - run[0] > best[1] - best[0]) best = [...run]; }
  else run = null;
}
if (!best) throw new Error('no empty column between the hands');
const SPLIT = (best[0] + best[1]) / 2;
const humanTipX = best[0] - 1, robotTipX = best[1] + 1;
console.log(`split at x=${SPLIT}, gap ${robotTipX - humanTipX}px of ${W}px (${(100 * (robotTipX - humanTipX) / W).toFixed(2)}%)`);

// grey image of one hand (black ink on white), upscaled
async function handImage(side, up) {
  const g = Buffer.alloc(W * H, 255);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const left = x < SPLIT;
    if ((side === 'human') === left) g[y * W + x] = Math.round(255 * (1 - ink[y * W + x]));
  }
  return sharp(g, { raw: { width: W, height: H, channels: 1 } }).resize(W * up, H * up, { kernel: 'lanczos3' });
}

// --- 1. outlines via potrace ---
async function outline(side) {
  const png = await (await handImage(side, UP_FILL)).png().toBuffer();
  // NB: potrace paths use fill-rule="evenodd" (holes are not reversed)
  const svg = await new Promise((res, rej) => potrace.trace(png, { threshold: 175, turdSize: 10, optTolerance: 0.3, alphaMax: 1.0 }, (e, s) => (e ? rej(e) : res(s))));
  const d = svg.match(/ d="([^"]+)"/)[1];
  // scale path numbers back to source pixels
  return d.replace(/-?\d+(\.\d+)?/g, (n) => (+n / UP_FILL).toFixed(2).replace(/\.?0+$/, ''));
}

// --- 2. skeleton (Zhang–Suen) ---
async function skeleton(side) {
  const { data: g, info: gi } = await (await handImage(side, UP_SKEL)).toColourspace('b-w').raw().toBuffer({ resolveWithObject: true });
  if (gi.channels !== 1) throw new Error(`expected 1 channel, got ${gi.channels}`);
  const w = gi.width, h = gi.height;
  const b = new Uint8Array(w * h);
  // more inclusive than the outline threshold, so every visible line is covered by some pen stroke
  for (let i = 0; i < w * h; i++) b[i] = g[i] < 205 ? 1 : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : b[y * w + x]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of [0, 1]) {
      const kill = [];
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        if (!b[y * w + x]) continue;
        const P = [at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1)];
        const B = P.reduce((a, c) => a + c, 0);
        if (B < 2 || B > 6) continue;
        let A = 0; for (let k = 0; k < 8; k++) if (!P[k] && P[(k + 1) % 8]) A++;
        if (A !== 1) continue;
        if (step === 0 ? (P[0] * P[2] * P[4] || P[2] * P[4] * P[6]) : (P[0] * P[2] * P[6] || P[0] * P[4] * P[6])) continue;
        kill.push(y * w + x);
      }
      if (kill.length) { changed = true; for (const i of kill) b[i] = 0; }
    }
  }
  return { b, w, h };
}

const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function penOrder(side, { b, w, h }) {
  const pix = [];
  for (let i = 0; i < w * h; i++) if (b[i]) pix.push(i);
  const nb = (i) => { const x = i % w, y = (i / w) | 0, r = []; for (const [dx, dy] of N8) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && b[Y * w + X]) r.push(Y * w + X); } return r; };
  const xs = pix.map((i) => i % w);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  // seeds: where the arm lines enter the picture. Every connected line that reaches
  // the outer 10% band starts at its outermost pixel (both forearm contours start together).
  const comp = new Int32Array(w * h).fill(-1);
  let nComp = 0;
  for (const s of pix) {
    if (comp[s] >= 0) continue;
    const st = [s]; comp[s] = nComp;
    while (st.length) { const i = st.pop(); for (const j of nb(i)) if (comp[j] < 0) { comp[j] = nComp; st.push(j); } }
    nComp++;
  }
  const band = (maxX - minX) * 0.1;
  const inBand = (i) => (side === 'human' ? i % w <= minX + band : i % w >= maxX - band);
  // line ends (degree 1) inside the band: the open ends of the forearm contours
  const ends = pix.filter((i) => inBand(i) && nb(i).length === 1);
  const outer = new Map();
  for (const i of pix) {
    if (!inBand(i)) continue;
    const c = comp[i], o = outer.get(c), x = i % w;
    if (o === undefined || (side === 'human' ? x < o % w : x > o % w)) outer.set(c, i);
  }
  const seedComps = new Set(ends.map((i) => comp[i]));
  const seeds = [...ends, ...[...outer.entries()].filter(([c]) => !seedComps.has(c)).map(([, i]) => i)];
  console.log(`${side}: ${seeds.length} seeds`);

  // Dijkstra over the skeleton, jumping to disconnected pieces (details) when the front gets near them
  const T = new Float64Array(w * h).fill(Infinity);
  const heap = [];
  const push = (i, t) => { if (t < T[i]) { T[i] = t; heap.push([t, i]); } };
  const run = () => {
    heap.sort((a, c) => a[0] - c[0]);
    while (heap.length) {
      const [t, i] = heap.shift();
      if (t > T[i]) continue;
      for (const j of nb(i)) {
        const d = (j % w !== i % w) && ((j / w | 0) !== (i / w | 0)) ? Math.SQRT2 : 1;
        if (t + d < T[j]) { T[j] = t + d; let k = heap.length; heap.push([t + d, j]); while (k > 0 && heap[k - 1][0] > heap[k][0]) { [heap[k - 1], heap[k]] = [heap[k], heap[k - 1]]; k--; } }
      }
    }
  };
  for (const s of seeds) push(s, 0);
  run();
  for (;;) {
    const left = pix.filter((i) => T[i] === Infinity);
    if (!left.length) break;
    const reached = pix.filter((i) => T[i] < Infinity);
    // nearest unreached pixel to the reached set
    let bestI = -1, bestT = Infinity;
    for (const u of left) {
      const ux = u % w, uy = (u / w) | 0;
      for (const r of reached) {
        const dx = ux - (r % w), dy = uy - ((r / w) | 0);
        const d = Math.hypot(dx, dy);
        const t = T[r] + d * 1.2 + 12; // small pause: details come just after the contour reaches them
        if (t < bestT) { bestT = t; bestI = u; }
      }
    }
    push(bestI, bestT);
    run();
  }

  // trace skeleton into polylines (node to node), then split each into runs of increasing time
  const deg = (i) => nb(i).length;
  const seen = new Set();
  const ekey = (a, c) => (a < c ? `${a},${c}` : `${c},${a}`);
  const polylines = [];
  const walk = (start, next) => {
    const line = [start, next]; seen.add(ekey(start, next));
    let prev = start, cur = next;
    while (deg(cur) === 2) {
      const n = nb(cur).find((k) => k !== prev && !seen.has(ekey(cur, k)));
      if (n === undefined) break;
      seen.add(ekey(cur, n)); line.push(n); prev = cur; cur = n;
    }
    return line;
  };
  for (const i of pix) if (deg(i) !== 2) for (const n of nb(i)) if (!seen.has(ekey(i, n))) polylines.push(walk(i, n));
  for (const i of pix) for (const n of nb(i)) if (!seen.has(ekey(i, n))) polylines.push(walk(i, n)); // pure loops

  const segs = [];
  for (const line of polylines) {
    // split into monotonic runs of T
    let runStart = 0;
    const emit = (a, c) => {
      let pts = line.slice(a, c + 1);
      if (pts.length < 2) return;
      if (T[pts[0]] > T[pts[pts.length - 1]]) pts = pts.reverse();
      segs.push(pts);
    };
    let dir = 0;
    for (let k = 1; k < line.length; k++) {
      const s = Math.sign(T[line[k]] - T[line[k - 1]]);
      if (s && dir && s !== dir) { emit(runStart, k - 1); runStart = k - 1; }
      if (s) dir = s;
    }
    emit(runStart, line.length - 1);
  }
  const maxT = Math.max(...pix.map((i) => T[i]));
  // Time warp: the index fingertip (the skeleton point nearest the gap) is reached at
  // TIP_AT on both hands, so the two index fingers finish together.
  const TIP_AT = 0.86;
  const tipX = (side === 'human' ? out.gap[0] : out.gap[1]) * UP_SKEL;
  const nearGapRow = pix.filter((i) => Math.abs((i % w) - tipX) < 6 * UP_SKEL);
  const tipPix = nearGapRow.reduce((a, c) => (Math.abs((c % w) - tipX) < Math.abs((a % w) - tipX) ? c : a));
  const tTip = T[tipPix] / maxT;
  const warp = (t) => (t <= tTip ? (t / tTip) * TIP_AT : TIP_AT + ((t - tTip) / (1 - tTip || 1)) * (1 - TIP_AT));
  console.log(`${side}: index tip reached at ${tTip.toFixed(2)} before warp`);
  const rdp = (pts, eps) => {
    if (pts.length < 3) return pts;
    const [a, c] = [pts[0], pts[pts.length - 1]];
    let idx = 0, dmax = 0;
    for (let k = 1; k < pts.length - 1; k++) {
      const p = pts[k];
      const num = Math.abs((c[1] - a[1]) * p[0] - (c[0] - a[0]) * p[1] + c[0] * a[1] - c[1] * a[0]);
      const den = Math.hypot(c[1] - a[1], c[0] - a[0]) || 1;
      if (num / den > dmax) { dmax = num / den; idx = k; }
    }
    return dmax > eps ? [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)] : [a, c];
  };
  return segs
    .map((pts) => {
      const xy = pts.map((i) => [(i % w + 0.5) / UP_SKEL, (((i / w) | 0) + 0.5) / UP_SKEL]);
      let len = 0; for (let k = 1; k < xy.length; k++) len += Math.hypot(xy[k][0] - xy[k - 1][0], xy[k][1] - xy[k - 1][1]);
      if (len < 1) return null; // junction crumbs: covered by neighbouring mask strokes
      const s = rdp(xy, 0.3);
      return {
        d: 'M' + s.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L'),
        t0: +warp(T[pts[0]] / maxT).toFixed(4),
        t1: +warp(T[pts[pts.length - 1]] / maxT).toFixed(4),
      };
    })
    .filter(Boolean)
    .sort((a, c) => a.t0 - c.t0);
}

const out = { width: W, height: H, split: SPLIT, gap: [humanTipX, robotTipX] };
for (const side of ['human', 'robot']) {
  const fill = await outline(side);
  const segs = penOrder(side, await skeleton(side));
  out[side] = { fill, segs };
  console.log(`${side}: outline ${fill.length} chars, ${segs.length} pen segments`);
}
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('wrote', path.relative(ROOT, OUT));
