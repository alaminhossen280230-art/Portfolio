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
    
                           }here
function stepTag(t, dt, time) {
    const prev = t.omega;
    if (t.drag) {
      // follow the finger closely (a stiff, well-damped spring: no rubbery delay)
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

    // the pill lags behind the thread (double-pendulum feel), then settles to its crooked rest
    const pa = -140 * (t.phi - t.rest) - 5 * t.phiV - t.alpha * 0.03;
    t.phiV += pa * dt;
    t.phi = clamp(t.phi + t.phiV * dt, t.rest - 0.6, t.rest + 0.6);
  }


  /* ---------------- Web spun around the headline ----------------
     The headline is painted once onto a hidden canvas so the script knows exactly
     where the letters' ink is. Silk is then spun from real letter edges:
       - an orb web inside the O of LOOK
       - little cobwebs tucked into corners and gaps between letters and lines
       - loose strands draped over (and behind) the letters
       - a funnel web under the last line that holds each tag's thread
       - except the 2nd tag: its thread climbs past the last line and hangs
         from a little cobweb in the gap between the last two lines
     Every web hangs from a springy hub, so the breeze, your finger and the
     swinging tags all stretch and wobble the silk. Front silk sits over the
     letters with a soft shadow, back silk tucks behind them for depth. */
  const stage = document.getElementById('headlineStage');
  const title = document.getElementById('heroTitle');
  const HUB_K = 260, HUB_DAMP = 7;              // little webs: springiness / settling
  const APEX_K = 320, APEX_DAMP = 8.5;          // funnel tip over each tag
  const APEX_PULL = 0.0042;                     // how much a swinging tag tugs its funnel
  const WIND_PUSH = 190;                        // how much the breeze moves the silk
  const HIGH_ANCHOR = [1];                      // which tags (0 = first) hang from a cobweb between the lines
  let em = 34, W = 0, H = 0;
  let nodes = [], webs = [], drapes = [];

  // wrap every letter so we can find it
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

    // paint the headline onto a hidden canvas to know where the ink is
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

    /* a web = spokes from a hub out to letter edges, with sagging rings between them */
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
          if (!spokes[i] || !spokes[j] || r() < 0.07) continue; // a broken strand here and there
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

    // 1) orb web in the O of LOOK
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
