// Artwork for the header mark (drawing data only — animation lives in assets/js/main.js).
//
// Layers, bottom to top:
//   hands  : traced line artwork (variable-width fills from content/hands.json), each revealed
//            through a mask of centre-line strokes ordered by when the pen reaches them
//   drops  : the resting cluster of Klein-blue drops; on touch they gather, fuse, and flow
//            out to become the lines (positions are animated in assets/js/main.js)
//
// Coordinates: viewBox 0 0 520 300. The traced drawing (481×252) sits at ART_X, ART_Y.
import fs from 'node:fs';
import path from 'node:path';

export const VIEW = { w: 520, h: 300 };
const ART_X = 19.5, ART_Y = 24;
const ROBOT_NUDGE = 3; // widens the fingertip gap from ~1.5% to ~2% of the drawing width

function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// closed smooth path through points (Catmull-Rom → cubic Bézier)
function smooth(pts) {
  const f = (n) => n.toFixed(2);
  const N = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

// a slightly irregular round drop
function blob(cx, cy, r, rand, wob = 0.09, n = 9) {
  const ph = [rand() * 6.28, rand() * 6.28];
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const rr = r * (1 + wob * Math.sin(2 * t + ph[0]) + wob * 0.6 * Math.sin(3 * t + ph[1]) + (rand() - 0.5) * wob * 0.6);
    pts.push([cx + rr * Math.cos(t), cy + rr * Math.sin(t) * 0.94]);
  }
  return smooth(pts);
}

// resting cluster: ~13 drops of different sizes packed into a loose round mass
export function cluster(cx, cy, seed = 11) {
  const rand = rng(seed);
  const drops = [];
  const N = 13;
  for (let i = 0; i < N; i++) {
    const a = rand() * 6.28, d = Math.sqrt(rand()) * 24;
    drops.push({ x: cx + d * Math.cos(a), y: cy + d * Math.sin(a), r: 6 + rand() * 5.2 });
  }
  // relax: push overlaps apart (keeping a thin gap), pull gently to the centre
  for (let it = 0; it < 400; it++) {
    for (const p of drops) { p.x += (cx - p.x) * 0.02; p.y += (cy - p.y) * 0.02; }
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const a = drops[i], b = drops[j];
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 0.01;
      const want = a.r + b.r + 1.8;
      if (dist < want) { const k = (want - dist) / 2 / dist; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
    }
  }
  return drops.map((p, i) => ({ ...p, d: blob(p.x, p.y, p.r, rand), delay: (i * 0.37) % 3 }));
}


export function markSVG(root) {
  const hands = JSON.parse(fs.readFileSync(path.join(root, 'content/hands.json'), 'utf8'));
  const C = [ART_X + hands.split, ART_Y + 128]; // the gap between the fingertips
  // the resting cluster sits right of the gap; on touch the drops flow left into the drawing
  const CLUSTER_X = 0.8; // fraction of the mark width (keep in sync with .mark-hit / .hint in style.css)
  const drops = cluster(VIEW.w * CLUSTER_X, C[1]);
  const masks = (side) => hands[side].segs.map((s) =>
    `<path pathLength="1" data-t0="${s.t0}" data-t1="${s.t1}" d="${s.d}"/>`).join('');
  const art = (side, dx) => `
      <g class="${side}" transform="translate(${ART_X + dx} ${ART_Y})">
        <mask id="m-${side}" maskUnits="userSpaceOnUse" x="-20" y="-20" width="${hands.width + 40}" height="${hands.height + 40}">
          <g class="reveal-mask">${masks(side)}</g>
        </mask>
        <path class="art art-drawn" mask="url(#m-${side})" fill-rule="evenodd" d="${hands[side].fill}"/>
        <path class="art art-settle" fill-rule="evenodd" d="${hands[side].fill}"/>
      </g>`;
  return `<svg class="mark-svg" viewBox="0 0 ${VIEW.w} ${VIEW.h}" aria-hidden="true" focusable="false"
      data-art-x="${ART_X}" data-art-y="${ART_Y}" data-robot-nudge="${ROBOT_NUDGE}">
    <defs>
      <!-- resting drops: hand-drawn wobble only (keeps soft, anti-aliased edges) -->
      <filter id="liquid" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="672" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <!-- moving drops: same wobble + "goo" so touching drops fuse like liquid -->
      <filter id="liquid-goo" filterUnits="userSpaceOnUse" x="-20" y="-20" width="${VIEW.w + 40}" height="${VIEW.h + 40}" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="672" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="w"/>
        <feGaussianBlur in="w" stdDeviation="3.2" result="b"/>
        <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -6"/>
      </filter>
      <!-- the forearms fade out at the edges instead of being cut off -->
      <linearGradient id="edge-fade-g" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.07" stop-color="#fff"/>
        <stop offset="0.93" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <mask id="edge-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${VIEW.w}" height="${VIEW.h}">
        <rect x="${ART_X}" y="0" width="${hands.width + ROBOT_NUDGE}" height="${VIEW.h}" fill="url(#edge-fade-g)"/>
      </mask>
    </defs>
    <g class="hands" mask="url(#edge-fade)">${art('human', 0)}${art('robot', ROBOT_NUDGE)}
    </g>
    <g class="drops" filter="url(#liquid)">${drops.map((p) =>
      `<path class="drop" style="--d:${p.delay.toFixed(2)}s" data-x="${p.x.toFixed(2)}" data-y="${p.y.toFixed(2)}" data-r="${p.r.toFixed(2)}" d="${p.d}"/>`).join('')}</g>
  </svg>`;
}

export const markCenter = (root) => {
  const hands = JSON.parse(fs.readFileSync(path.join(root, 'content/hands.json'), 'utf8'));
  return [ART_X + hands.split, ART_Y + 128];
};
