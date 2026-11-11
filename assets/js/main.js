/* Theme toggle + header mark animation. No dependencies. */
(() => {
  const root = document.documentElement;

  /* ---------------- theme ---------------- */
  const toggle = document.querySelector('.theme-toggle');
  const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
  const current = () => root.dataset.theme || (systemDark() ? 'dark' : 'light');
  const label = () => {
    if (!toggle) return;
    const next = current() === 'dark' ? 'light' : 'dark';
    toggle.setAttribute('aria-label', `Switch to ${next} mode`);
    toggle.title = `Switch to ${next} mode`;
  };
  label();
  toggle?.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    label();
  });

  /* ---------------- mark ---------------- */
  // One progress value p ∈ [0,1] drives everything:
  //   gather  0.00–0.24  the drops drift together and fuse into one liquid mass
  //   flow    0.18–0.95  drops leave the mass one by one along loose curves, each landing on the
  //                      drawing exactly when the pen reaches that spot, and dissolving into the line
  //   draw    0.22–1.00  the hands are revealed in pen order (wrist → contour → index → fingers → details)
  //   settle  ~0.9–1.00  slow final approach; the gap between the index fingers stays open
  const mark = document.querySelector('.mark');
  if (!mark) return;
  const hit = mark.querySelector('.mark-hit');
  const svg = mark.querySelector('.mark-svg');
  const dropsG = svg.querySelector('.drops');
  const ART = [+svg.dataset.artX, +svg.dataset.artY], NUDGE = +svg.dataset.robotNudge;

  const clamp = (x) => Math.max(0, Math.min(1, x));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const out = (t) => 1 - Math.pow(1 - t, 3);
  // drawing pace: a gentle ramp in, then a long deceleration into the final approach
  function drawCurve(t) {
    const ramp = 0.12;
    if (t <= 0) return 0;
    if (t < ramp) return 0.5 * (t / ramp) * (t / ramp) * ramp * 0.6;
    const k = (t - ramp) / (1 - ramp);
    const start = 0.5 * ramp * 0.6;
    return start + (1 - start) * (1 - Math.pow(1 - k, 3.2));
  }

  const sides = ['human', 'robot'].map((name, i) => {
    const g = svg.querySelector(`.${name}`);
    return {
      // the robot starts a beat later and finishes a beat later: never perfectly in sync
      window: i === 0 ? [0.22, 0.97] : [0.27, 1.0],
      dx: ART[0] + (i ? NUDGE : 0), dy: ART[1],
      segs: [...g.querySelectorAll('.reveal-mask path')].map((el) => ({ el, t0: +el.dataset.t0, t1: +el.dataset.t1, last: -1 })),
      settle: g.querySelector('.art-settle'),
    };
  });
  // p at which a side's pen reaches drawing-time tau
  const whenPen = (side, tau) => {
    let lo = side.window[0], hi = side.window[1];
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; drawCurve(seg(m, side.window[0], side.window[1])) < tau ? (lo = m) : (hi = m); }
    return hi;
  };
  // point on the drawing (viewBox coords) where the pen is at drawing-time tau
  const penPoint = (side, tau) => {
    const g = side.segs.find((s) => s.t0 <= tau && tau <= s.t1) || side.segs.reduce((a, s) => (Math.abs(s.t0 - tau) < Math.abs(a.t0 - tau) ? s : a));
    const L = g.el.getTotalLength();
    const f = g.t1 > g.t0 ? clamp((tau - g.t0) / (g.t1 - g.t0)) : 0;
    const pt = g.el.getPointAtLength(f * L);
    return [pt.x + side.dx, pt.y + side.dy];
  };

  const els = [...dropsG.querySelectorAll('.drop')];
  const C = els.reduce((a, e) => [a[0] + +e.dataset.x / els.length, a[1] + +e.dataset.y / els.length], [0, 0]);
  // each drop is assigned a moment on one hand's drawing; larger drops go first (to the wrists)
  const order = els.map((el, i) => ({ el, i, r: +el.dataset.r })).sort((a, b) => b.r - a.r);
  const per = [[], []];
  order.forEach((d, k) => per[k % 2].push(d));
  const drops = [];
  per.forEach((list, si) => list.forEach((d, k) => {
    const side = sides[si];
    const tau = (k / list.length) * 0.82; // spread along the drawing, landing before the fingertips finish
    const x = +d.el.dataset.x, y = +d.el.dataset.y;
    const land = whenPen(side, tau);
    const target = penPoint(side, Math.max(0.004, tau));
    // loose, short curve: bow sideways, alternating direction, plus a little lift
    const bend = (k % 2 ? 1 : -1) * (24 + 10 * (k % 3));
    drops.push({ el: d.el, x, y, r: d.r, target, land, leave: Math.max(0.2, land - 0.24), bend });
  }));

  function bez(a, c, b, t) { const u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; }

  function render(p) {
    // gather: drift toward the centre and fuse (goo filter only while moving, so the resting edges stay soft)
    dropsG.setAttribute('filter', p > 0.001 ? 'url(#liquid-goo)' : 'url(#liquid)');
    const gather = inOut(seg(p, 0, 0.24));
    for (const d of drops) {
      const hx = d.x + (C[0] - d.x) * 0.72 * gather, hy = d.y + (C[1] - d.y) * 0.72 * gather;
      let x = hx, y = hy, s = 1 + 0.12 * gather;
      const f = seg(p, d.leave, d.land);
      if (f > 0) {
        const e = inOut(f);
        const mx = (hx + d.target[0]) / 2, my = (hy + d.target[1]) / 2;
        const dx = d.target[0] - hx, dy = d.target[1] - hy, L = Math.hypot(dx, dy) || 1;
        const ctrl = [mx - (dy / L) * d.bend, my + (dx / L) * d.bend - 14];
        [x, y] = bez([hx, hy], ctrl, d.target, e);
        s *= 1 - 0.78 * Math.pow(f, 1.4); // stretches thin as it travels
      }
      const gone = seg(p, d.land - 0.015, d.land + 0.03); // absorbed into the line
      d.el.style.transform = `translate(${(x - d.x).toFixed(2)}px, ${(y - d.y).toFixed(2)}px) scale(${(s * (1 - gone)).toFixed(3)})`;
      d.el.style.opacity = (1 - gone).toFixed(3);
    }

    // pen-order reveal of the line art
    for (const side of sides) {
      const q = drawCurve(seg(p, side.window[0], side.window[1]));
      for (const g of side.segs) {
        const k = g.t1 > g.t0 ? clamp((q - g.t0) / (g.t1 - g.t0)) : q >= g.t0 ? 1 : 0;
        if (k !== g.last) { g.el.style.strokeDashoffset = (1 - k).toFixed(4); g.last = k; }
      }
      // any hairline the pen strokes missed settles in quietly at the very end
      side.settle.style.opacity = seg(q, 0.9, 1).toFixed(3);
    }
  }

  /* ---- state: open while hovered, focused, or tapped open ---- */
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let hovering = false, focused = false, pinned = false;
  let p = 0, target = 0, last = 0, raf = 0;
  const IN = 3400, OUT = 2000; // ms for a full sweep in / out

  function frame(now) {
    const dt = last ? Math.min(48, now - last) : 16;
    last = now;
    p = target > p ? Math.min(target, p + dt / IN) : Math.max(target, p - dt / OUT);
    render(p);
    if (p !== target) { raf = requestAnimationFrame(frame); return; }
    raf = 0; last = 0;
    mark.classList.remove('is-moving');
  }
  function sync() {
    const t = hovering || focused || pinned ? 1 : 0;
    mark.classList.toggle('is-open', t === 1);
    hit.setAttribute('aria-pressed', String(t === 1));
    if (t === target) return;
    target = t;
    if (reduce.matches) {
      // no spiral, no line drawing: a short fade between the resting drops and the finished drawing
      svg.style.opacity = '0';
      setTimeout(() => { p = target; render(p); svg.style.opacity = '1'; }, 120);
      return;
    }
    mark.classList.add('is-moving');
    if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  }

  render(0);
  // hover opens from the drops, and stays open while the pointer is anywhere over the drawing
  hit.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') { hovering = true; sync(); } });
  mark.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') { hovering = false; sync(); } });
  // touch: an explicit tap opens / closes
  hit.addEventListener('click', (e) => { if (e.pointerType === 'touch') { pinned = !pinned; sync(); } });
  // keyboard
  hit.addEventListener('focus', () => { focused = true; sync(); });
  hit.addEventListener('blur', () => { focused = false; pinned = false; sync(); });
  hit.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const open = hovering || focused || pinned;
      pinned = !open; focused = !open && focused; // Enter toggles; focus alone no longer holds it open after closing
      sync();
    }
    if (e.key === 'Escape') { pinned = false; focused = false; sync(); }
  });

  // for screenshots / debugging: __mark(0.6) jumps to a frame
  window.__mark = (v) => { target = p = clamp(v); render(p); };
})();
