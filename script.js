/* ===========================================================
   ALIF. — Home: tags swinging on spider-web threads + dock
   (the silk itself is drawn in the "Spider-web silk" part below)
   =========================================================== */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------------- Hanging tags (pendulum physics) ---------------- */
  const field = document.getElementById('rolesField');
  const GRAVITY = 1500;
  const DAMPING = 1.1;
  const MAX_ANGLE = 1.25;

  const tags = field ? [...field.querySelectorAll('.hanger')].map((hanger, i) => {
    const css = getComputedStyle(hanger);
    return {
      hanger,
      swing: hanger.querySelector('.swing'),
      tag: hanger.querySelector('.role-tag'),
      pill: hanger.querySelector('.role-pill'),
      x: parseFloat(css.getPropertyValue('--x')) || i / 4,
      rest: (parseFloat(css.getPropertyValue('--tilt')) || 0) * Math.PI / 180,
      lean: (parseFloat(css.getPropertyValue('--lean')) || 0) * Math.PI / 180,
      len: 150,
      theta: [0.2, -0.16, 0.16, -0.2][i % 4] * (reduceMotion ? 0 : 1),
      omega: 0,
      alpha: 0,
      phi: 0,
      phiV: 0,
      drag: null,
      seed: i * 1.7 + 0.4,
    };
  }) : [];
  tags.forEach((t) => { t.theta += t.lean; t.phi = t.rest; });

  /* ---------------- Spider-web silk ---------------- */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const f1 = (n) => Math.round(n * 10) / 10;

  function rng(seed) {
    let a = Math.floor(seed * 9301 + 49297) >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function placeSvg(svg, x0, y0, w, h) {
    svg.setAttribute('viewBox', `${f1(x0)} ${f1(y0)} ${f1(w)} ${f1(h)}`);
    svg.setAttribute('width', f1(w));
    svg.setAttribute('height', f1(h));
    svg.style.left = f1(x0) + 'px';
    svg.style.top = f1(y0) + 'px';
  }

  const quad = (p0, c, p1, t) => [
    (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
    (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1],
  ];

  function cone(r, { dir, width, height, spokes, rings, flare, dewChance }) {
    let spokePaths = '', ringPaths = '', dew = '';
    const ends = [];
    const ctrls = [];
    for (let i = 0; i < spokes; i++) {
      const u = i / (spokes - 1);
      const x = (u - 0.5) * width + (r() - 0.5) * width * 0.08;
      const y = dir * (height - (dir < 0 ? r() * height * 0.18 : r() * 1.5) - Math.abs(u - 0.5) * height * 0.12);
      const c = [x * flare, y * (0.62 + r() * 0.1)];
      ends.push([x, y]);
      ctrls.push(c);
      spokePaths += `M0 0Q${f1(c[0])} ${f1(c[1])} ${f1(x)} ${f1(y)}`;
    }
    for (let k = 1; k <= rings; k++) {
      const base = Math.pow(k / (rings + 0.6), 1.15);
      for (let i = 0; i < spokes - 1; i++) {
        if (r() < 0.07) continue;
        const ta = Math.min(0.98, base + (r() - 0.5) * 0.05);
        const tb = Math.min(0.98, base + (r() - 0.5) * 0.05);
        const a = quad([0, 0], ctrls[i], ends[i], ta);
        const b = quad([0, 0], ctrls[i + 1], ends[i + 1], tb);
        const sag = Math.hypot(b[0] - a[0], b[1] - a[1]) * (0.16 + r() * 0.1);
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2 - dir * sag;
        ringPaths += `M${f1(a[0])} ${f1(a[1])}Q${f1(mx)} ${f1(my)} ${f1(b[0])} ${f1(b[1])}`;
        if (r() < dewChance) dew += `<circle class="dew" cx="${f1(a[0])}" cy="${f1(a[1])}" r="${f1(0.45 + r() * 0.5)}"/>`;
        if (r() < dewChance * 0.5) dew += `<circle class="dew" cx="${f1(mx)}" cy="${f1((a[1] + b[1]) / 2 - dir * sag * 0.5)}" r="${f1(0.4 + r() * 0.35)}"/>`;
      }
    }
    return { spokePaths, ringPaths, dew, ends };
  }

  function drawThread(svg, len, r) {
    let d = `M0 0L0 ${f1(len)}`;
    let loose = '';
    if (r() < 0.85) {
      const a = len * (0.08 + r() * 0.2);
      const b = len * (0.55 + r() * 0.35);
      const bow = (r() < 0.5 ? -1 : 1) * (2.5 + r() * 5);
      loose += `M0 ${f1(a)}Q${f1(bow)} ${f1((a + b) / 2)} 0 ${f1(b)}`;
    }
    if (len > 100 && r() < 0.7) {
      const a = len * (0.3 + r() * 0.2);
      const side = r() < 0.5 ? -1 : 1;
      loose += `M0 ${f1(a)}q${f1(side * 10)} ${f1(18)} ${f1(side * (16 + r() * 14))} ${f1(24 + r() * 20)}`;
    }
    let dew = '';
    for (let y = 3 + r() * 4; y < len - 3; y += 3.5 + r() * 6) {
      dew += `<circle class="dew" cx="${f1((r() - 0.5) * 0.4)}" cy="${f1(y)}" r="${f1(0.45 + r() * 0.55 + (r() < 0.08 ? 0.5 : 0))}"/>`;
    }
    placeSvg(svg, -40, -2, 80, len + 4);
    svg.innerHTML =
      `<path class="silk silk--main" d="${d}"/>` +
      (loose ? `<path class="silk silk--loose" d="${loose}"/>` : '') + dew;
  }

  function drawTagWeb(svg, pill, r) {
    const pillW = pill.offsetWidth || 120;
    const width = Math.min(pillW * 0.62, 46 + r() * 22);
    const height = 31;
    const w = cone(r, { dir: 1, width, height, spokes: 8, rings: 8, flare: 0.2, dewChance: 0.3 });
    let feet = '';
    w.ends.forEach(([x, y]) => { if (r() < 0.5) feet += `M${f1(x)} ${f1(y - 1)}l${f1((r() - 0.5) * 5)} 2`; });
    placeSvg(svg, -width / 2 - 10, -4, width + 20, height + 8);
    svg.innerHTML =
      `<path class="silk silk--spoke" d="${w.spokePaths}"/>` +
      `<path class="silk silk--ring" d="${w.ringPaths}${feet}"/>` + w.dew;
  }

  function drawSilk() {
    tags.forEach((t, i) => {
      const len = parseFloat(getComputedStyle(t.hanger).getPropertyValue('--len')) || 120;
      const thread = t.hanger.querySelector('.thread');
      const tagWeb = t.hanger.querySelector('.web--tag');
      if (thread) drawThread(thread, len, rng(i * 7 + 3));
      if (tagWeb) drawTagWeb(tagWeb, t.pill, rng(i * 7 + 5));
    });
  }
  drawSilk();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawSilk);

  function measure() {
    tags.forEach((t) => {
      const len = parseFloat(getComputedStyle(t.hanger).getPropertyValue('--len')) || 120;
      t.len = len + 30 + t.pill.offsetHeight / 2;
    });
  }
  measure();
  window.addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  let gust = { start: 6, dur: 1.8, power: 1.8 };
  function windField(x, seed, time) {
    if (reduceMotion) return 0;
    let w = 0.3 * Math.sin(time * 0.8 + seed) + 0.16 * Math.sin(time * 1.9 + seed * 1.3);
    const local = time - gust.start - x * 0.6;
    if (local > 0 && local < gust.dur) w += gust.power * Math.sin(Math.PI * local / gust.dur);
    return w;
  }
  const windAt = (t, time) => windField(t.x, t.seed, time);

  const pointerAngle = (d, e) => Math.atan2(-(e.clientX - d.px), e.clientY - d.py);

  tags.forEach((t) => {
    t.pill.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      t.pill.setPointerCapture(e.pointerId);
      t.pill.classList.add('is-grabbing');
      t.zBefore = t.hanger.style.zIndex;
      t.hanger.style.zIndex = 9;
      const hr = t.hanger.getBoundingClientRect();
      t.drag = {
        id: e.pointerId,
        px: hr.left, py: hr.top,
        stretch: 0,
        target: t.theta,
        sx: e.clientX, sy: e.clientY,
        moved: 0,
        time: performance.now(),
      };
      t.drag.offset = t.theta - pointerAngle(t.drag, e);
    });
    t.pill.addEventListener('pointermove', (e) => {
      if (!t.drag || t.drag.id !== e.pointerId) return;
      const d = t.drag;
      d.target = clamp(pointerAngle(d, e) + d.offset, -MAX_ANGLE, MAX_ANGLE);
      d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.sx, e.clientY - d.sy));
      d.stretch = Math.max(0, Math.hypot(e.clientX - d.px, e.clientY - d.py) - t.len);
    });
    const release = (e) => {
      if (!t.drag || t.drag.id !== e.pointerId) return;
      const tap = t.drag.moved < 6 && performance.now() - t.drag.time < 300;
      t.drag = null;
      t.pill.classList.remove('is-grabbing');
      t.hanger.style.zIndex = t.zBefore;
      if (tap) {
        t.omega += (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random() * 1);
        t.phiV += (Math.random() - 0.5) * 7;
      }
    };
    t.pill.addEventListener('pointerup', release);
    t.pill.addEventListener('pointercancel', release);
  });

  let last = null, brush = null;
  if (field) {
    field.addEventListener('pointermove', (e) => {
      const now = performance.now();
      if (last && now - last.t < 100 && !tags.some((t) => t.drag)) {
        const dt = Math.max(8, now - last.t) / 1000;
        brush = { x: e.clientX, y: e.clientY, vx: (e.clientX - last.x) / dt };
      }
      last = { x: e.clientX, y: e.clientY, t: now };
    }, { passive: true });
    field.addEventListener('pointerleave', () => { last = null; });
  }
  function applyBrush() {
    if (!brush) return;
    const b = brush; brush = null;
    tags.forEach((t) => {
      if (t.drag) return;
      const r = t.pill.getBoundingClientRect();
      if (b.x > r.left - 6 && b.x < r.right + 6 && b.y > r.top - 6 && b.y < r.bottom + 6) {
        t.omega = clamp(t.omega - b.vx * 0.0016, -5, 5);
      }
    });
  }

  function stepTag(t, dt, time) {
    const prev = t.omega;
    if (t.drag) {
      const a = 3000 * (t.drag.target - t.theta) - 110 * t.omega;
      t.omega += a * dt;
    } else {
      const a = -(GRAVITY / t.len) * Math.sin(t.theta - t.lean) - DAMPING * t.omega + windAt(t, time);
      t.omega += a * dt;
    }
    t.theta += t.omega * dt;
    if (t.theta > MAX_ANGLE) { t.theta = MAX_ANGLE; t.omega *= -0.3; }
    if (t.theta < -MAX_ANGLE) { t.theta = -MAX_ANGLE; t.omega *= -0.3; }
    t.alpha = clamp((t.omega - prev) / dt, -400, 400);

    const pa = -140 * (t.phi - t.rest) - 5 * t.phiV - t.alpha * 0.03;
    t.phiV += pa * dt;
    t.phi = clamp(t.phi + t.phiV * dt, t.rest - 0.6, t.rest + 0.6);
  }

  /* ---------------- Web spun around the headline ---------------- */
  const stage = document.getElementById('headlineStage');
  const title = document.getElementById('heroTitle');
  const HUB_K = 260, HUB_DAMP = 7;
  const APEX_K = 320, APEX_DAMP = 8.5;
  const APEX_PULL = 0.0042;
  const WIND_PUSH = 190;
  const HIGH_ANCHOR = [1];
  let em = 34, W = 0, H = 0;
  let nodes = [], webs = [], drapes = [];

  if (title && !title.dataset.split) {
    title.dataset.split = '1';
    const lines = title.innerHTML.split(/<br\s*\/?>/i).map((l) => l.replace(/<[^>]*>/g, '').trim());
    title.setAttribute('aria-label', lines.join(' '));
    title.innerHTML = lines.map((l) => [...l].map((c) => (c === ' ' ? ' ' : `<span class="ch" aria-hidden="true">${c}</span>`)).join('')).join('<br />');
  }

  function makeLayer(name) {
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', `title-web title-web--${name}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ['tw-shadow', 'tw-silk'].map((g) =>
      `<g class="${g}"><path class="silk silk--spoke"/><path class="silk silk--ring"/><path class="silk silk--main"/><path class="dew"/></g>`).join('');
    return { svg, groups: [...svg.querySelectorAll('g')].map((g) => [...g.querySelectorAll('path')]) };
  }
  const layers = stage && title ? { back: makeLayer('back'), front: makeLayer('front') } : null;
  if (layers) {
    stage.insertBefore(layers.back.svg, stage.firstChild);
    stage.appendChild(layers.front.svg);
  }

  function makeNode(x, y, k, c, wind, max) {
    const n = { rx: x, ry: y, x, y, vx: 0, vy: 0, k, c, wind, max, fx: 0, fy: 0, seed: nodes.length * 0.9 + 0.3 };
    nodes.push(n);
    return n;
  }

  function buildWeb() {
    if (!layers) return;
    nodes = []; webs = []; drapes = [];
    tags.forEach((t) => { t.apex = null; t.climb = null; t.swing.style.translate = ''; t.lastTr = ''; });

    const sr = stage.getBoundingClientRect();
    W = Math.max(1, Math.ceil(sr.width));
    H = Math.max(1, Math.ceil(sr.height));
    em = parseFloat(getComputedStyle(title).fontSize) || 34;
    Object.values(layers).forEach((l) => {
      l.svg.style.setProperty('--s', Math.sqrt(em / 34).toFixed(3));
      l.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      l.svg.setAttribute('width', W);
      l.svg.setAttribute('height', H);
    });

    const cs = getComputedStyle(title);
    em = parseFloat(cs.fontSize) || 34;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.font = `${cs.fontWeight} ${em}px ${cs.fontFamily}`;
    ctx.textBaseline = 'alphabetic';
    const mH = ctx.measureText('H');
    const asc = mH.fontBoundingBoxAscent || em * 0.97;
    const capH = mH.actualBoundingBoxAscent || em * 0.73;
    const chars = [];
    title.querySelectorAll('.ch').forEach((el) => {
      const r = el.getBoundingClientRect();
      const c = { ch: el.textContent, x: r.left - sr.left, w: r.width, base: r.top - sr.top + asc };
      ctx.fillText(c.ch, c.x, c.base);
      chars.push(c);
    });
    if (!chars.length) return;
    const lines = [];
    chars.forEach((c) => {
      let line = lines.find((l) => Math.abs(l.base - c.base) < em * 0.3);
      if (!line) lines.push(line = { base: c.base, chars: [] });
      line.chars.push(c);
    });
    lines.sort((a, b) => a.base - b.base);
    const px = ctx.getImageData(0, 0, W, H).data;
    const ink = (x, y) => {
      x = Math.round(x); y = Math.round(y);
      return x >= 0 && y >= 0 && x < W && y < H && px[(y * W + x) * 4 + 3] > 110;
    };
    const ray = (x, y, a, maxR) => {
      const dx = Math.cos(a), dy = Math.sin(a);
      for (let d = 1; d <= maxR; d++) if (ink(x + dx * d, y + dy * d)) return d;
      return 0;
    };
    const r = rng(11);
    const scale = em / 34;

    function spin(hx, hy, o) {
      const { rays, maxR, from = 0, span = Math.PI * 2, closed = true, rings, flare = [0.5, 0.5],
        sag = 0.2, dew = 0.3, spiral = 0, layer = 'front', minHits = 3,
        k = HUB_K, c = HUB_DAMP, wind = 1, max = em * 0.12 } = o;
      const spokes = [];
      for (let i = 0; i < rays; i++) {
        const a = from + span * (closed ? i / rays : i / (rays - 1)) + (r() - 0.5) * (span / rays) * 0.35;
        const d = ray(hx, hy, a, maxR);
        spokes.push(d ? { x: hx + Math.cos(a) * (d + 0.8), y: hy + Math.sin(a) * (d + 0.8) } : null);
      }
      if (spokes.filter(Boolean).length < minHits) return null;
      const segs = [];
      for (let ring = 1; ring <= rings; ring++) {
        const base = Math.pow(ring / (rings + 0.6), 1.15);
        for (let i = 0; i < rays; i++) {
          if (i + 1 >= rays && !closed) break;
          const j = (i + 1) % rays;
          if (!spokes[i] || !spokes[j] || r() < 0.07) continue;
          const ta = base + (spiral * i) / rays / rings + (r() - 0.5) * 0.05;
          const tb = base + (spiral * (i + 1)) / rays / rings + (r() - 0.5) * 0.05;
          if (ta > 0.97 || tb > 0.97) continue;
          segs.push({ i, j, ta, tb, sag: sag * (0.8 + r() * 0.5) });
        }
      }
      const dews = [];
      segs.forEach((sg) => { if (sg.ta > 0.3 && r() < dew) dews.push({ i: sg.i, t: sg.ta, rad: (0.45 + r() * 0.55) * scale }); });
      const web = { hub: makeNode(hx, hy, k, c, wind, max), spokes, segs, dews, flare, layer, grip: '' };
      webs.push(web);
      return web;
    }

    const top = lines[0].base - capH;
    const bottom = lines[lines.length - 1].base;
    const left = Math.min(...chars.map((c) => c.x));
    const right = Math.max(...chars.map((c) => c.x + c.w));

    const last = lines[lines.length - 1].chars;
    const o = last.find((c) => c.ch === 'O') || chars.find((c) => c.ch === 'O');
    let orb = null;
    if (o) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let y = o.base - capH - 3; y < o.base + 3; y++) for (let x = o.x - 2; x < o.x + o.w + 2; x++) {
        if (ink(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      }
      if (x1 > x0) {
        orb = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
        spin(orb.x, orb.y, { rays: 16, maxR: em, rings: 7, spiral: 1, sag: 0.08, dew: 0.18, minHits: 10, k: 200, c: 6, max: em * 0.07 });
      }
    }

    const topEdge = (x, base) => { for (let y = base - capH - 4; y < base; y++) if (ink(x, y)) return y; return null; };
    const botEdge = (x, base) => { for (let y = base + 3; y > base - capH; y--) if (ink(x, y)) return y; return null; };

    const anchors = [];
    if (lines.length > 1) {
      const upper = lines[lines.length - 2], lower = lines[lines.length - 1];
      tags.forEach((t, i) => {
        if (!HIGH_ANCHOR.includes(i)) return;
        const hr = t.hanger.getBoundingClientRect();
        const ax = hr.left - sr.left, ay = hr.top - sr.top;
        let best = null;
        for (let dx = -em * 0.4; dx <= em * 0.4; dx += 1) {
          const x = ax + dx;
          const yb = botEdge(x, upper.base), yt = topEdge(x, lower.base);
          const y0 = yb == null ? upper.base : yb, y1 = yt == null ? lower.base - capH : yt;
          const y = y1 - Math.min(2, (y1 - y0) / 2);
          if (y1 - y0 < 2 || ink(x, y)) continue;
          const score = Math.min(y1 - y0, em * 0.3) - Math.abs(dx) * 0.12;
          if (!best || score > best.score) best = { x, y, score };
        }
        if (!best) best = { x: ax, y: (upper.base + lower.base - capH) / 2 };
        const web = spin(best.x, best.y, {
          rays: 9, maxR: em * 1.1, from: -Math.PI / 2 - 1.05, span: 2.1, closed: false, rings: 8,
          flare: [0.12, 0.66], sag: 0.2, dew: 0.28, minHits: 3,
          k: APEX_K, c: APEX_DAMP, wind: 0.6, max: em * 0.2,
        });
        const hub = web ? web.hub : makeNode(best.x, best.y, APEX_K, APEX_DAMP, 0.6, em * 0.2);
        if (web) {
          anchors.push(best);
          web.spokes.forEach((e, k) => {
            if (!e) return;
            if (r() < 0.6) web.grip += `M${f1(e.x)} ${f1(e.y)}l${f1((r() - 0.5) * 6)} ${f1(-(1 + r() * 2.5))}`;
            const n = web.spokes[k + 1];
            if (n && r() < 0.5) web.grip += `M${f1(e.x)} ${f1(e.y)}Q${f1((e.x + n.x) / 2)} ${f1((e.y + n.y) / 2 + 2)} ${f1(n.x)} ${f1(n.y)}`;
          });
        }
        t.apex = makeNode(ax, ay, APEX_K * 0.8, APEX_DAMP, 0.5, em * 0.45);
        const len = Math.hypot(ax - best.x, ay - best.y);
        const dews = [];
        for (let d = 3 + r() * 3; d < len - 2; d += 3.5 + r() * 5) dews.push({ t: d / len, rad: (0.4 + r() * 0.5) * scale });
        t.climb = { hub, dews, twin: (r() < 0.5 ? -1 : 1) * (1.5 + r() * 2.5), twinA: 0.15 + r() * 0.2, twinB: 0.6 + r() * 0.3 };
      });
    }

    const R = em * 0.42, N = 16, step = Math.max(2, em * 0.07);
    const cands = [];
    for (let y = top + 2; y < bottom - em * 0.04; y += step) {
      for (let x = left; x < right; x += step) {
        if (ink(x, y)) continue;
        if (orb && Math.hypot(x - orb.x, y - orb.y) < em * 0.95) continue;
        if (anchors.some((a) => Math.hypot(x - a.x, y - a.y) < em * 0.8)) continue;
        let hits = 0, minD = 1e9;
        for (let i = 0; i < N; i++) {
          const d = ray(x, y, (i / N) * Math.PI * 2, R);
          if (d) { hits++; minD = Math.min(minD, d); }
        }
        if (hits < 5 || hits > 12 || minD < em * 0.08) continue;
        cands.push({ x, y, score: hits + r() * 5 });
      }
    }
    cands.sort((a, b) => b.score - a.score);
    const picked = [];
    const want = Math.max(6, Math.min(13, Math.round(chars.length * 0.36)));
    for (const cd of cands) {
      if (picked.length >= want) break;
      if (picked.some((p) => Math.hypot(p.x - cd.x, p.y - cd.y) < em * 0.95)) continue;
      if (spin(cd.x, cd.y, { rays: 13, maxR: R * 1.08, rings: 4 + Math.floor(r() * 3), sag: 0.3, dew: 0.16 })) picked.push(cd);
    }

    tags.forEach((t) => {
      if (t.climb) return;
      const hr = t.hanger.getBoundingClientRect();
      const ax = hr.left - sr.left, ay = hr.top - sr.top;
      const web = spin(ax, ay, {
        rays: 9, maxR: em * 2.4, from: -Math.PI / 2 - 1.0, span: 2.0, closed: false, rings: 11,
        flare: [0.12, 0.66], sag: 0.2, dew: 0.32, minHits: 2,
        k: APEX_K, c: APEX_DAMP, wind: 0.5, max: em * 0.4,
      });
      if (!web) { t.apex = makeNode(ax, ay, APEX_K, APEX_DAMP, 0.5, em * 0.4); return; }
      t.apex = web.hub;
      web.spokes.forEach((e, i) => {
        if (!e) return;
        if (r() < 0.6) web.grip += `M${f1(e.x)} ${f1(e.y)}l${f1((r() - 0.5) * 7)} ${f1(-(1 + r() * 3))}`;
        const n = web.spokes[i + 1];
        if (n && r() < 0.5) web.grip += `M${f1(e.x)} ${f1(e.y)}Q${f1((e.x + n.x) / 2)} ${f1((e.y + n.y) / 2 + 2.5)} ${f1(n.x)} ${f1(n.y)}`;
      });
    });

    const drapeCount = Math.min(5, (lines.length - 1) * 3);
    for (let n = 0, tries = 0; n < drapeCount && tries < 80; tries++) {
      const L = Math.floor(r() * (lines.length - 1));
      const lc = lines[L].chars;
      const c = lc[Math.floor(r() * lc.length)];
      const x0 = c.x + c.w * (0.2 + r() * 0.6);
      const y0 = topEdge(x0, lines[L].base);
      if (y0 == null) continue;
      const x1 = x0 + (r() - 0.5) * em * 1.4;
      const y1 = botEdge(x1, lines[L + 1].base);
      if (y1 == null) continue;
      const ax = x0, ay = y0 + 0.6, bx = x1, by = y1 - 0.6;
      const len = Math.hypot(bx - ax, by - ay);
      const nx = -(by - ay) / len, ny = (bx - ax) / len;
      const bow = len * (0.05 + r() * 0.08) * (r() < 0.5 ? -1 : 1);
      const ctrl = makeNode((ax + bx) / 2 + nx * bow, (ay + by) / 2 + ny * bow + len * 0.04, 110, 3.5, 1.5, em * 0.25);
      drapes.push({ ax, ay, bx, by, n: ctrl, layer: n % 3 === 2 ? 'back' : 'front', twin: r() < 0.6 ? (r() < 0.5 ? -1 : 1) * (1 + r() * 2) : 0 });
      n++;
    }
  }

  function stepWeb(dt, time) {
    tags.forEach((t) => {
      if (!t.apex) return;
      const tension = GRAVITY * Math.cos(t.theta) + t.omega * t.omega * t.len + (t.drag ? (t.drag.stretch || 0) * 40 : 0);
      t.apex.fx = APEX_K * APEX_PULL * (tension * -Math.sin(t.theta));
      t.apex.fy = APEX_K * APEX_PULL * (tension * Math.cos(t.theta) - GRAVITY);
      if (t.climb) { t.climb.hub.fx = t.apex.fx * 0.55; t.climb.hub.fy = t.apex.fy * 0.55; }
    });
    nodes.forEach((n) => {
      const w = windField(n.rx / W, n.seed, time) * WIND_PUSH * n.wind;
      const ax = -n.k * (n.x - n.rx) - n.c * n.vx + n.fx + w;
      const ay = -n.k * (n.y - n.ry) - n.c * n.vy + n.fy + w * 0.25;
      n.vx += ax * dt; n.vy += ay * dt;
      n.x += n.vx * dt; n.y += n.vy * dt;
      const dx = n.x - n.rx, dy = n.y - n.ry, d = Math.hypot(dx, dy);
      if (d > n.max) { n.x = n.rx + (dx / d) * n.max; n.y = n.ry + (dy / d) * n.max; n.vx *= 0.5; n.vy *= 0.5; }
    });
  }

  let poke = null, pokes = [];
  if (stage) {
    stage.addEventListener('pointermove', (e) => {
      const now = performance.now();
      if (poke && now - poke.t < 100) {
        const dt = Math.max(8, now - poke.t) / 1000;
        pokes.push({ x: e.clientX, y: e.clientY, vx: (e.clientX - poke.x) / dt, vy: (e.clientY - poke.y) / dt });
      }
      poke = { x: e.clientX, y: e.clientY, t: now };
    }, { passive: true });
    stage.addEventListener('pointerleave', () => { poke = null; });
  }
  function applyPokes() {
    if (!pokes.length) return;
    const sr = stage.getBoundingClientRect(), R = em * 0.9;
    pokes.forEach((p) => {
      const x = p.x - sr.left, y = p.y - sr.top;
      nodes.forEach((n) => {
        const d = Math.hypot(n.x - x, n.y - y);
        if (d > R) return;
        const f = (1 - d / R) * 0.08;
        n.vx = clamp(n.vx + p.vx * f, -260, 260);
        n.vy = clamp(n.vy + p.vy * f, -260, 260);
      });
    });
    pokes = [];
  }

  const dot = (x, y, rad) => `M${f1(x - rad)} ${f1(y)}a${f1(rad)} ${f1(rad)} 0 1 0 ${f1(rad * 2)} 0a${f1(rad)} ${f1(rad)} 0 1 0 ${f1(-rad * 2)} 0`;
  function paintWeb() {
    if (!layers) return;
    const out = { front: ['', '', '', ''], back: ['', '', '', ''] };
    webs.forEach((w) => {
      const o = out[w.layer], h = w.hub, hp = [h.x, h.y];
      const [fx, fy] = w.flare;
      const ctrl = w.spokes.map((e) => e && [h.x + (e.x - h.x) * fx, h.y + (e.y - h.y) * fy + Math.hypot(e.x - h.x, e.y - h.y) * 0.02]);
      w.spokes.forEach((e, i) => {
        if (e) o[0] += `M${f1(h.x)} ${f1(h.y)}Q${f1(ctrl[i][0])} ${f1(ctrl[i][1])} ${f1(e.x)} ${f1(e.y)}`;
      });
      w.segs.forEach((sg) => {
        const a = quad(hp, ctrl[sg.i], [w.spokes[sg.i].x, w.spokes[sg.i].y], sg.ta);
        const b = quad(hp, ctrl[sg.j], [w.spokes[sg.j].x, w.spokes[sg.j].y], sg.tb);
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const vx = h.x - mx, vy = h.y - my, vl = Math.hypot(vx, vy) || 1;
        const s = Math.hypot(b[0] - a[0], b[1] - a[1]) * sg.sag;
        o[1] += `M${f1(a[0])} ${f1(a[1])}Q${f1(mx + (vx / vl) * s)} ${f1(my + (vy / vl) * s)} ${f1(b[0])} ${f1(b[1])}`;
      });
      o[1] += w.grip;
      w.dews.forEach((d) => {
        const e = w.spokes[d.i];
        const p = quad(hp, ctrl[d.i], [e.x, e.y], d.t);
        o[3] += dot(p[0], p[1], d.rad);
      });
    });
    tags.forEach((t) => {
      if (!t.climb || !t.apex) return;
      const o = out.front, h = t.climb.hub, a = t.apex;
      o[2] += `M${f1(h.x)} ${f1(h.y)}L${f1(a.x)} ${f1(a.y)}`;
      const at = (k) => [h.x + (a.x - h.x) * k, h.y + (a.y - h.y) * k];
      const p0 = at(t.climb.twinA), p1 = at(t.climb.twinB), pm = at((t.climb.twinA + t.climb.twinB) / 2);
      o[1] += `M${f1(p0[0])} ${f1(p0[1])}Q${f1(pm[0] + t.climb.twin)} ${f1(pm[1])} ${f1(p1[0])} ${f1(p1[1])}`;
      t.climb.dews.forEach((d) => { const p = at(d.t); o[3] += dot(p[0], p[1], d.rad); });
    });
    drapes.forEach((d) => {
      const o = out[d.layer];
      o[2] += `M${f1(d.ax)} ${f1(d.ay)}Q${f1(d.n.x)} ${f1(d.n.y)} ${f1(d.bx)} ${f1(d.by)}`;
      if (d.twin) o[1] += `M${f1(d.ax)} ${f1(d.ay)}Q${f1(d.n.x + d.twin)} ${f1(d.n.y + Math.abs(d.twin))} ${f1(d.bx)} ${f1(d.by)}`;
    });
    Object.entries(layers).forEach(([name, l]) => {
      const o = out[name];
      l.groups.forEach((paths) => paths.forEach((p, i) => {
        const d = o[i] || 'M0 0';
        if (p.__d !== d) { p.__d = d; p.setAttribute('d', d); }
      }));
    });
  }

  function rebuild() { drawSilk(); measure(); buildWeb(); paintWeb(); }
  buildWeb();
  paintWeb();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
  let resizeQueued = false;
  window.addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; rebuild(); });
  });

  let lastT = performance.now();
  function frame(now) {
    const time = now / 1000;
    const dt = Math.min(0.033, Math.max(0.001, (now - lastT) / 1000));
    lastT = now;

    if (!reduceMotion && time > gust.start + gust.dur + 1.5) {
      gust = {
        start: time + 5 + Math.random() * 6,
        dur: 1.4 + Math.random() * 0.8,
        power: (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.3),
      };
    }
    applyBrush();
    applyPokes();

    const steps = 4, h = dt / steps;
    for (let s = 0; s < steps; s++) {
      tags.forEach((t) => stepTag(t, h, time));
      stepWeb(h, time);
    }

    tags.forEach((t) => {
      const sw = t.theta.toFixed(4) + 'rad', tg = (t.phi - t.theta * 0.15).toFixed(4) + 'rad';
      if (sw !== t.lastSw) { t.lastSw = sw; t.swing.style.rotate = sw; }
      if (tg !== t.lastTg) { t.lastTg = tg; t.tag.style.rotate = tg; }
      if (t.apex) {
        const tr = `${f1(t.apex.x - t.apex.rx)}px ${f1(t.apex.y - t.apex.ry)}px`;
        if (tr !== t.lastTr) { t.lastTr = tr; t.swing.style.translate = tr; }
      }
    });
    paintWeb();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------------- Dock press + drop sound ---------------- */
  const dock = document.querySelector('.glass-dock');
  if (!dock) return;
  let audioContext;
  let lastPointerTime = 0;

  function playDropSound() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioContext ||= new AC();
      if (audioContext.state === 'suspended') audioContext.resume();
      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.exponentialRampToValueAtTime(430, now + 0.11);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.09, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (_) {}
  }

  function animate(item) {
    item.classList.remove('is-pressed');
    void item.offsetWidth;
    item.classList.add('is-pressed');
    window.setTimeout(() => item.classList.remove('is-pressed'), 240);
  }

  dock.addEventListener('pointerdown', (e) => {
    const item = e.target.closest('.dock-item');
    if (!item || (e.pointerType === 'mouse' && e.button !== 0)) return;
    lastPointerTime = Date.now();
    animate(item);
    playDropSound();
  }, { passive: true });

  dock.addEventListener('click', (e) => {
    const item = e.target.closest('.dock-item');
    if (!item) return;
    if (Date.now() - lastPointerTime > 700) { animate(item); playDropSound(); }
  });
})();
