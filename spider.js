/* ===========================================================
   ALIF. — the little spider that lives on the headline web
   -----------------------------------------------------------
   Add ONE line to index.html, right after script.js:
     <script src="./spider.js?v=1"></script>
   Needs nothing else: it draws itself and brings its own style.
   It doesn't change the threads, tags, swinging or dock at all —
   it only reads where they are and crawls on them.

   What it does (picked at random, never the same move twice in a row):
     - wanders over the letters in short bursts, like real spiders do
     - sneaks BEHIND the letters, waits, then peeks back out
     - walks to a thread and climbs down it onto a tag
     - drops on its own silk line, bounces, dangles, climbs back up
     - walks along the top of a tag, cleans its legs, looks around
     - JUMPS from tag to tag with a safety line (like a jumping spider)
     - climbs halfway up a thread, thinks about it, slides back down
     - tap it and it gets scared and runs / jumps / zips away
   =========================================================== */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const stage = document.getElementById('headlineStage');
  const title = document.getElementById('heroTitle');
  if (!stage || !title) return;

  const SVGNS = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const headingOf = (dx, dy) => Math.atan2(dx, -dy); // 0 = facing up the screen
  const rot = (a, x, y) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

  /* ---------------- its own style ---------------- */
  const css = document.createElement('style');
  css.textContent = `
  .spdr, .spdr-shadow, .spdr-silk { position:absolute; left:0; top:0; overflow:visible; }
  .spdr { width:44px; height:44px; margin:-22px 0 0 -22px; z-index:6; cursor:pointer;
          filter: drop-shadow(0 0 .5px rgba(255,255,255,.75));
          transition: filter .35s ease; will-change: transform; -webkit-tap-highlight-color: transparent; }
  .spdr.is-behind { z-index:1; filter: brightness(.72) saturate(.8) drop-shadow(0 0 .5px rgba(255,255,255,.4)); }
  .spdr-shadow { width:44px; height:44px; margin:-22px 0 0 -22px; z-index:5; pointer-events:none;
          filter: brightness(0) blur(1.1px); opacity:.32; will-change: transform; }
  .spdr-shadow.is-behind { z-index:0; opacity:.18; }
  .spdr-silk { z-index:5; pointer-events:none; }
  .spdr-silk path { fill:none; stroke:rgba(255,255,255,.95); stroke-width:.7; stroke-linecap:round;
          filter: drop-shadow(0 0 .5px rgba(40,60,90,.7)); }
  `;
  document.head.appendChild(css);

  /* ---------------- the spider drawing ----------------
     Seen from above, facing up. Body is ~20 units long; legs are redrawn every frame. */
  const LEGS = [ // hip (right side; left side is mirrored) and resting foot
    { hip: [2.4, -6.2], foot: [9.5, -18] },
    { hip: [3.0, -4.4], foot: [15, -8.5] },
    { hip: [3.0, -2.6], foot: [14.5, 3] },
    { hip: [2.4, -0.9], foot: [10.5, 14] },
  ];
  const legs = [];
  [1, -1].forEach((side) => LEGS.forEach((l, i) => {
    const hip = [l.hip[0] * side, l.hip[1]], foot = [l.foot[0] * side, l.foot[1]];
    const d = Math.hypot(foot[0] - hip[0], foot[1] - hip[1]);
    // diagonal groups take turns stepping (how real spiders walk)
    const group = (i % 2 === 0) === (side === 1) ? 0 : 1;
    legs.push({ side, i, hip, foot, l1: d * 0.6, l2: d * 0.6, phase: group * Math.PI + i * 0.18, twitch: 0 });
  }));

  const svgBody = `
    <defs>
      <radialGradient id="spdrAbd" cx="38%" cy="30%" r="75%">
        <stop offset="0" stop-color="#6b4a3a"/><stop offset=".35" stop-color="#2a1a14"/><stop offset="1" stop-color="#070404"/>
      </radialGradient>
      <radialGradient id="spdrHead" cx="40%" cy="30%" r="80%">
        <stop offset="0" stop-color="#5a4034"/><stop offset=".45" stop-color="#22140f"/><stop offset="1" stop-color="#060303"/>
      </radialGradient>
      <linearGradient id="spdrLeg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#3b2a22"/><stop offset="1" stop-color="#0c0806"/>
      </linearGradient>
      <radialGradient id="spdrEye" cx="35%" cy="30%" r="70%">
        <stop offset="0" stop-color="#7a8a9a"/><stop offset=".5" stop-color="#0d0f14"/><stop offset="1" stop-color="#000"/>
      </radialGradient>
    </defs>
    <g class="spdr-all">
      <g class="spdr-legs"></g>
      <g class="spdr-palps"></g>
      <g class="spdr-abd">
        <ellipse cx="0" cy="6.2" rx="5.6" ry="7.2" fill="url(#spdrAbd)"/>
        <path d="M0 1.6 L1.6 4 L0 3.4 L-1.6 4 Z M0 5 L2.2 8 L0 7.2 L-2.2 8 Z M0 8.8 L1.7 11.2 L0 10.6 L-1.7 11.2 Z" fill="#c9a27e" opacity=".55"/>
        <circle cx="-1.6" cy="3.6" r=".5" fill="#e8d2b8" opacity=".55"/><circle cx="1.6" cy="3.6" r=".5" fill="#e8d2b8" opacity=".55"/>
        <ellipse cx="-2.1" cy="2.6" rx="1.9" ry="2.8" fill="#fff" opacity=".22" transform="rotate(-18 -2.1 2.6)"/>
        <ellipse cx="-1.6" cy="1.9" rx=".7" ry="1" fill="#fff" opacity=".7"/>
      </g>
      <ellipse cx="0" cy="-3.6" rx="3.9" ry="4.6" fill="url(#spdrHead)"/>
      <path d="M0 -7.4 L0 -1" stroke="#000" stroke-width=".35" opacity=".35"/>
      <ellipse cx="-1.4" cy="-5" rx="1" ry="1.4" fill="#fff" opacity=".28"/>
      <g class="spdr-eyes">
        <circle cx="-1.25" cy="-7.4" r="1.05" fill="url(#spdrEye)"/><circle cx="1.25" cy="-7.4" r="1.05" fill="url(#spdrEye)"/>
        <circle cx="-2.6" cy="-6.6" r=".55" fill="url(#spdrEye)"/><circle cx="2.6" cy="-6.6" r=".55" fill="url(#spdrEye)"/>
        <circle cx="-1.7" cy="-5.9" r=".42" fill="url(#spdrEye)"/><circle cx="1.7" cy="-5.9" r=".42" fill="url(#spdrEye)"/>
        <circle class="spdr-glint" cx="-1.55" cy="-7.75" r=".3" fill="#fff"/><circle class="spdr-glint" cx=".95" cy="-7.75" r=".3" fill="#fff"/>
      </g>
    </g>`;

  const el = document.createElementNS(SVGNS, 'svg');
  el.setAttribute('class', 'spdr');
  el.setAttribute('viewBox', '-22 -22 44 44');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'A little spider');
  el.innerHTML = `<circle r="16" fill="transparent"/>` + svgBody;
  const shadow = document.createElementNS(SVGNS, 'svg');
  shadow.setAttribute('class', 'spdr-shadow');
  shadow.setAttribute('viewBox', '-22 -22 44 44');
  shadow.setAttribute('aria-hidden', 'true');
  shadow.innerHTML = `<use href="#spdrAllRef"/>`;
  el.querySelector('.spdr-all').id = 'spdrAllRef';
  const silkSvg = document.createElementNS(SVGNS, 'svg');
  silkSvg.setAttribute('class', 'spdr-silk');
  silkSvg.setAttribute('aria-hidden', 'true');
  silkSvg.innerHTML = '<path/>';
  const silkPath = silkSvg.firstChild;
  stage.insertBefore(shadow, stage.firstChild);
  stage.insertBefore(el, stage.firstChild);
  stage.appendChild(silkSvg);

  const legG = el.querySelector('.spdr-legs');
  const palpG = el.querySelector('.spdr-palps');
  const abdG = el.querySelector('.spdr-abd');
  legG.innerHTML = legs.map(() =>
    `<g><path class="lg" fill="none" stroke="url(#spdrLeg)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path class="hl" fill="none" stroke="#c8a888" stroke-opacity=".35" stroke-width=".4" stroke-linecap="round"/>` +
    `<circle class="kn" r=".75" fill="#1a110c"/></g>`).join('');
  const legEls = [...legG.children].map((g) => ({ lg: g.children[0], hl: g.children[1], kn: g.children[2] }));

  /* ---------------- reading where the threads and tags are ---------------- */
  const hangers = [...stage.querySelectorAll('.hanger')].map((h) => ({
    h, swing: h.querySelector('.swing'), tag: h.querySelector('.role-tag'), pill: h.querySelector('.role-pill'),
    len: 100, pw: 120, ph: 36,
  }));
  let chars = [], titleBox = { l: 0, r: 0, t: 0, b: 0 };
  function measure() {
    const sr = stage.getBoundingClientRect();
    hangers.forEach((t) => {
      t.len = parseFloat(getComputedStyle(t.h).getPropertyValue('--len')) || 100;
      t.pw = t.pill.offsetWidth || 120;
      t.ph = t.pill.offsetHeight || 36;
    });
    chars = [...title.querySelectorAll('.ch')].map((c) => {
      const r = c.getBoundingClientRect();
      return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height * 0.52, w: r.width, h: r.height };
    }).filter((c) => c.w > 2);
    if (!chars.length) {
      const r = title.getBoundingClientRect();
      chars = [{ x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2, w: r.width, h: r.height }];
    }
    titleBox = {
      l: Math.min(...chars.map((c) => c.x - c.w / 2)), r: Math.max(...chars.map((c) => c.x + c.w / 2)),
      t: Math.min(...chars.map((c) => c.y - c.h / 2)), b: Math.max(...chars.map((c) => c.y + c.h / 2)),
    };
    silkSvg.setAttribute('width', Math.ceil(sr.width));
    silkSvg.setAttribute('height', Math.ceil(sr.height));
    silkSvg.setAttribute('viewBox', `0 0 ${Math.ceil(sr.width)} ${Math.ceil(sr.height)}`);
  }

  // live geometry of every thread + tag, in the headline's own coordinates (read once per frame)
  const geo = [];
  const num = (s) => parseFloat(s) || 0;
  function readGeo() {
    const sr = stage.getBoundingClientRect();
    hangers.forEach((t, i) => {
      const hr = t.h.getBoundingClientRect();
      const tr = (t.swing.style.translate || '0px 0px').split(/\s+/);
      const th = num(t.swing.style.rotate);
      const ang = th + num(t.tag.style.rotate);
      const A = [hr.left - sr.left + num(tr[0]), hr.top - sr.top + num(tr[1] || 0)];
      const d = rot(th, 0, t.len);
      const B = [A[0] + d[0], A[1] + d[1]];
      const top = (u) => { const p = rot(ang, u, 30); return [B[0] + p[0], B[1] + p[1]]; };
      const T = top(0);
      const l1 = t.len, l2 = Math.hypot(T[0] - B[0], T[1] - B[1]);
      geo[i] = { A, B, T, th, ang, top, l1, L: l1 + l2, half: Math.max(8, t.pw / 2 - t.ph * 0.45) };
    });
  }
  // a point on thread i, s pixels down from where it leaves the letters (thread, then the tent web, then the tag)
  function threadPoint(i, s) {
    const g = geo[i];
    if (s <= g.l1) { const k = s / g.l1; return { p: [lerp(g.A[0], g.B[0], k), lerp(g.A[1], g.B[1], k)], dir: [g.B[0] - g.A[0], g.B[1] - g.A[1]] }; }
    const k = clamp((s - g.l1) / (g.L - g.l1), 0, 1);
    return { p: [lerp(g.B[0], g.T[0], k), lerp(g.B[1], g.T[1], k)], dir: [g.T[0] - g.B[0], g.T[1] - g.B[1]] };
  }
  // standing on top of tag i, u pixels from its middle
  function tagPoint(i, u) {
    const g = geo[i];
    const p = g.top(clamp(u, -g.half, g.half));
    const n = rot(g.ang, 0, -3.2); // sit on the edge, not inside the tag
    return [p[0] + n[0], p[1] + n[1]];
  }

  /* ---------------- spider state ---------------- */
  const S = {
    x: 0, y: 0, h: Math.PI, hTarget: Math.PI, scale: 1, lift: 0,
    gait: 0, moving: 0, crouch: 0, tuck: 0, groom: 0, behind: false,
    loc: { kind: 'title' }, // title | thread | tag | air | silk
    silk: null,             // a line of its own silk to draw
    silkFade: 0,
  };
  const SIZE = () => clamp(chars.length ? chars[0].h / 52 : 0.75, 0.6, 1.05); // grows a bit with the headline

  /* ---------------- moves ---------------- */
  // every move is a small object with update(dt) -> true when finished
  let queue = [], step = null;

  function burst(o) { // spiders move in little bursts with tiny freezes
    o.bt = (o.bt || 0) - o._dt;
    if (o.bt <= 0) {
      o.running = !o.running || Math.random() < 0.35;
      o.bt = o.running ? rand(0.35, 1.3) : rand(0.08, 0.45);
    }
    return o.running ? 1 : 0;
  }

  const Steps = {
    walkTitle(to, speed, behind) {
      return {
        start() { S.loc = { kind: 'title' }; setBehind(behind); this.running = true; },
        update(dt) {
          this._dt = dt;
          const tgt = typeof to === 'function' ? to() : to;
          const dx = tgt[0] - S.x, dy = tgt[1] - S.y, d = Math.hypot(dx, dy);
          if (d < 1.2) { S.x = tgt[0]; S.y = tgt[1]; return true; }
          const v = speed * burst(this) * clamp(d / 14, 0.35, 1);
          const m = Math.min(d, v * dt);
          S.x += (dx / d) * m; S.y += (dy / d) * m;
          if (v > 0) S.hTarget = headingOf(dx, dy);
          move(m);
          return false;
        },
      };
    },
    thread(i, s0, s1, speed, behind) {
      return {
        start() { this.s = s0; S.loc = { kind: 'thread', i }; setBehind(behind); this.running = true; },
        update(dt) {
          this._dt = dt;
          const dirS = Math.sign(s1 - s0) || 1;
          const v = speed * (speed > 120 ? 1 : burst(this));
          const m = Math.min(Math.abs(s1 - this.s), v * dt);
          this.s += dirS * m;
          const { p, dir } = threadPoint(i, this.s);
          S.x = p[0]; S.y = p[1];
          S.hTarget = headingOf(dir[0] * dirS, dir[1] * dirS);
          move(m);
          return Math.abs(s1 - this.s) < 0.01;
        },
      };
    },
    tagWalk(i, u1, speed) {
      return {
        start() { this.u = S.loc.kind === 'tag' && S.loc.i === i ? S.loc.u : 0; S.loc = { kind: 'tag', i, u: this.u }; setBehind(false); this.running = true; },
        update(dt) {
          this._dt = dt;
          const g = geo[i];
          const goal = clamp(u1, -g.half, g.half);
          const dirU = Math.sign(goal - this.u) || 1;
          const m = Math.min(Math.abs(goal - this.u), speed * burst(this) * dt);
          this.u += dirU * m; S.loc.u = this.u;
          const p = tagPoint(i, this.u);
          S.x = p[0]; S.y = p[1];
          S.hTarget = g.ang + dirU * Math.PI / 2;
          move(m);
          return Math.abs(goal - this.u) < 0.01;
        },
      };
    },
    pause(dur, mode) { // mode: idle | groom | look
      return {
        start() { this.t = 0; this.nextLook = rand(0.3, 0.9); },
        update(dt) {
          this.t += dt;
          followLoc();
          if (mode === 'groom') S.groom = Math.min(1, S.groom + dt * 4);
          if (mode === 'look' && this.t > this.nextLook) { S.hTarget += rand(-1.1, 1.1); this.nextLook = this.t + rand(0.4, 1.1); }
          if (Math.random() < dt * 1.6) pick(legs).twitch = 1; // a leg taps now and then
          return this.t >= dur;
        },
        end() { S.groom = 0; },
      };
    },
    jump(i, u0, j, u1) {
      return {
        start() {
          this.t = 0; this.phase = 'crouch';
          S.loc = { kind: 'air' }; setBehind(false);
          const a = tagPoint(j, u1), b = tagPoint(i, u0);
          S.hTarget = headingOf(a[0] - b[0], a[1] - b[1]); // turn to face the landing spot
          this.flight = rand(0.42, 0.6);
          this.arc = rand(28, 55);
        },
        update(dt) {
          this.t += dt;
          const from = tagPoint(i, u0), to = tagPoint(j, u1);
          if (this.phase === 'crouch') {
            S.x = from[0]; S.y = from[1];
            S.crouch = Math.min(1, this.t / 0.28);
            if (this.t > 0.32) { this.phase = 'fly'; this.t = 0; S.silk = { anchor: () => tagPoint(i, u0) }; S.silkFade = 1; }
            return false;
          }
          if (this.phase === 'fly') {
            const k = Math.min(1, this.t / this.flight);
            const e = k;
            const h = 4 * k * (1 - k);
            const nx = lerp(from[0], to[0], e), ny = lerp(from[1], to[1], e) - this.arc * h;
            const vx = to[0] - from[0], vy = to[1] - from[1] - this.arc * 4 * (1 - 2 * k);
            S.hTarget = headingOf(vx, vy);
            S.x = nx; S.y = ny;
            S.lift = h; S.crouch = Math.max(0, S.crouch - dt * 8); S.tuck = Math.min(1, S.tuck + dt * 9);
            if (k >= 1) { this.phase = 'land'; this.t = 0; S.loc = { kind: 'tag', i: j, u: u1 }; S.lift = 0; }
            return false;
          }
          // land: squash, legs splay back out
          S.x = to[0]; S.y = to[1];
          S.tuck = Math.max(0, S.tuck - dt * 10);
          S.crouch = this.t < 0.08 ? 1 : Math.max(0, 1 - (this.t - 0.08) / 0.2);
          S.hTarget = geo[j].ang + (Math.random() < 0.02 ? Math.PI : 0) + Math.sign(u1 - u0 || 1) * Math.PI / 2;
          if (this.t > 0.3) { S.crouch = 0; S.silk = { anchor: S.silk.anchor, loose: true }; return true; }
          return false;
        },
      };
    },
    abseil(fromP, drop) { // let go on its own silk, bounce, dangle, climb back up
      return {
        start() {
          this.t = 0; this.y = 0; this.v = 60; this.phase = 'drop'; this.sway = 0; this.swV = rand(-0.6, 0.6);
          S.loc = { kind: 'silk' }; setBehind(false);
          S.silk = { anchor: () => fromP }; S.silkFade = 1;
          this.hang = rand(1.2, 2.8);
        },
        update(dt) {
          this.t += dt;
          if (this.phase === 'drop') {
            this.v += 900 * dt; // falls…
            if (this.y > drop * 0.75) this.v -= (this.y - drop * 0.75) * 60 * dt + this.v * 3.2 * dt; // …then the silk catches it
            this.y += this.v * dt;
            if (this.t > 1.4 && Math.abs(this.v) < 8) { this.phase = 'hang'; this.t = 0; }
          } else if (this.phase === 'hang') {
            this.y += (drop * 0.9 - this.y) * dt * 2;
            if (this.t > this.hang) { this.phase = 'up'; this.t = 0; }
          } else {
            const m = Math.min(this.y, rand(30, 55) * dt);
            this.y -= m; move(m);
          }
          // a little pendulum swing on the line
          this.swV += (-this.sway * 9 - this.swV * 0.6) * dt;
          this.sway += this.swV * dt;
          const p = rot(this.sway, 0, this.y);
          S.x = fromP[0] + p[0]; S.y = fromP[1] + p[1];
          // head points down while dropping/hanging, up while climbing
          S.hTarget = this.phase === 'up' ? this.sway : Math.PI + this.sway;
          if (this.phase === 'hang' && Math.random() < dt * 1.2) pick(legs).twitch = 1;
          if (this.phase === 'up' && this.y <= 0.5) { S.silk = null; S.loc = { kind: 'title' }; return true; }
          return false;
        },
      };
    },
  };

  /* ---------------- choosing what to do next ---------------- */
  const history = [];
  const titlePoint = (pad = 0) => {
    const c = pick(chars);
    return [c.x + rand(-c.w, c.w) * 0.35, c.y + rand(-c.h, c.h) * (0.25 - pad)];
  };
  const nearestTitlePoint = () => [clamp(S.x, titleBox.l + 6, titleBox.r - 6), clamp(S.y, titleBox.t + 8, titleBox.b - 8)];
  const tagsNear = (i) => geo.map((g, j) => ({ j, d: Math.hypot(g.T[0] - geo[i].T[0], g.T[1] - geo[i].T[1]) }))
    .filter((o) => o.j !== i && o.d < 240);

  function choose(options) {
    const recent = history.slice(-3);
    const last = history[history.length - 1];
    let total = 0;
    const pool = options.filter((o) => o.ok !== false && o.name !== last).map((o) => {
      const w = o.w * (recent.includes(o.name) ? 0.35 : 1);
      total += w; return { ...o, w };
    });
    let r = Math.random() * total;
    for (const o of pool) { r -= o.w; if (r <= 0) { history.push(o.name); if (history.length > 8) history.shift(); return o.go(); } }
    return pool.length ? pool[0].go() : [Steps.pause(1, 'idle')];
  }

  function plan() {
    const loc = S.loc;
    if (loc.kind === 'tag') {
      const i = loc.i, g = geo[i], near = tagsNear(i);
      return choose([
        { name: 'tagWalk', w: 3, go: () => [Steps.tagWalk(i, rand(-g.half, g.half), rand(28, 55)), Steps.pause(rand(0.4, 1.6), pick(['idle', 'look']))] },
        { name: 'groom', w: 2, go: () => [Steps.pause(rand(1.4, 2.6), 'groom'), Steps.pause(rand(0.3, 1), 'look')] },
        { name: 'jump', w: 4.5, ok: near.length > 0, go: () => {
            const j = pick(near).j;
            return [Steps.pause(rand(0.3, 0.9), 'look'), Steps.jump(i, loc.u, j, rand(-geo[j].half, geo[j].half) * 0.7), Steps.pause(rand(0.4, 1.2), 'idle')];
          } },
        { name: 'climbUp', w: 3, go: () => [
            Steps.tagWalk(i, 0, rand(35, 60)),
            Steps.thread(i, g.L, 0, rand(30, 55), Math.random() < 0.35),
            Steps.walkTitle(titlePoint(), rand(40, 70), Math.random() < 0.3),
          ] },
        { name: 'halfway', w: 1.5, go: () => {
            const s = g.L * rand(0.35, 0.65);
            const behind = Math.random() < 0.6;
            return [Steps.tagWalk(i, 0, rand(35, 60)), Steps.thread(i, g.L, s, rand(30, 50), behind),
              Steps.pause(rand(0.6, 1.6), 'look'), Steps.thread(i, s, g.L, rand(60, 110), behind), Steps.pause(rand(0.3, 1), 'idle')];
          } },
      ]);
    }
    // on the headline
    const n = geo.length;
    return choose([
      { name: 'wander', w: 3, go: () => [Steps.walkTitle(titlePoint(), rand(38, 75), false), Steps.pause(rand(0.3, 1.4), pick(['idle', 'look']))] },
      { name: 'peek', w: 2.2, go: () => {
          const p = titlePoint(), q = [p[0] + rand(-14, 14), p[1] + rand(-6, 6)];
          return [Steps.walkTitle(p, rand(35, 60), true), Steps.pause(rand(1, 2.2), 'idle'), Steps.walkTitle(q, rand(25, 45), false), Steps.pause(rand(0.5, 1.2), 'look')];
        } },
      { name: 'downThread', w: 4.5, ok: n > 0, go: () => {
          const i = Math.floor(Math.random() * n);
          const behind = Math.random() < 0.4;
          return [Steps.walkTitle(() => geo[i].A, rand(45, 75), Math.random() < 0.4), Steps.pause(rand(0.2, 0.7), 'look'),
            Steps.thread(i, 0, geo[i].L, rand(32, 60), behind), Steps.pause(rand(0.3, 1), 'idle')];
        } },
      { name: 'abseil', w: 2, go: () => {
          const c = pick(chars.filter((ch) => ch.y > titleBox.t + (titleBox.b - titleBox.t) * 0.55)) || pick(chars);
          const p = [c.x + rand(-c.w, c.w) * 0.3, c.y + c.h * 0.25];
          return [Steps.walkTitle(p, rand(40, 70), false), Steps.pause(rand(0.2, 0.6), 'look'), Steps.abseil(p, rand(45, 110)), Steps.pause(rand(0.3, 0.9), 'idle')];
        } },
      { name: 'rest', w: 1.2, go: () => [Steps.pause(rand(1.2, 2.5), pick(['groom', 'look']))] },
    ]);
  }

  // keeps the spider glued to whatever it is standing on while it isn't moving
  function followLoc() {
    const loc = S.loc;
    if (loc.kind === 'tag') { const p = tagPoint(loc.i, loc.u); S.x = p[0]; S.y = p[1]; }
  }
  function move(m) { S.moving = Math.min(1, S.moving + 0.25); S.gait += m / (6.5 * S.scale) * Math.PI; }
  function setBehind(b) {
    if (S.behind === !!b) return;
    S.behind = !!b;
    el.classList.toggle('is-behind', S.behind);
    shadow.classList.toggle('is-behind', S.behind);
  }

  /* ---------------- tap it: it gets a fright ---------------- */
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (step && step.scared) return;
    const loc = S.loc;
    if (step && step.end) step.end();
    S.groom = 0; S.crouch = 0; S.tuck = 0; S.lift = 0;
    if (S.loc.kind === 'air' || S.loc.kind === 'silk') { // let the current jump / drop finish
      return;
    }
    let seq;
    if (loc.kind === 'tag') {
      const near = tagsNear(loc.i);
      seq = near.length ? [Steps.jump(loc.i, loc.u, pick(near).j, 0), Steps.pause(0.8, 'look')]
        : [Steps.tagWalk(loc.i, 0, 150), Steps.thread(loc.i, geo[loc.i].L, 0, 170, false)];
    } else if (loc.kind === 'thread') {
      seq = [Steps.thread(loc.i, step && step.s != null ? step.s : 0, 0, 180, false), Steps.walkTitle(titlePoint(), 160, true), Steps.pause(1.6, 'idle')];
    } else {
      seq = [Steps.walkTitle(titlePoint(), 170, true), Steps.pause(rand(1.4, 2.4), 'idle'), Steps.walkTitle(titlePoint(), 60, false)];
    }
    seq[0].scared = true;
    queue = seq; step = null;
  });

  /* ---------------- drawing ---------------- */
  const f2 = (n) => Math.round(n * 100) / 100;
  function ik(hip, foot, l1, l2, outward) {
    const dx = foot[0] - hip[0], dy = foot[1] - hip[1];
    let d = Math.hypot(dx, dy) || 0.001;
    const dd = Math.min(d, l1 + l2 - 0.01);
    const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const ux = dx / d, uy = dy / d;
    const mx = hip[0] + ux * a, my = hip[1] + uy * a;
    let kx = mx - uy * h, ky = my + ux * h;
    if ((kx - mx) * outward < 0) { kx = mx + uy * h; ky = my - ux * h; }
    return [kx, ky];
  }

  function drawLegs(time, dt) {
    const stride = 2.8 * S.moving;
    legs.forEach((L, k) => {
      const p = S.gait + L.phase;
      const swing = Math.max(0, Math.cos(p)); // foot in the air
      let fx = L.foot[0], fy = L.foot[1] - Math.sin(p) * stride;
      fx += L.side * swing * 1.2 * S.moving;
      // grooming: front legs pulled in to the mouth and rubbed
      if (S.groom > 0 && L.i === 0) {
        const g = S.groom;
        fx = lerp(fx, L.side * (1.4 + Math.sin(time * 14 + L.side) * 0.8), g);
        fy = lerp(fy, -10.5 + Math.cos(time * 14 + L.side) * 0.9, g);
      }
      // a leg tapping
      if (L.twitch > 0) { L.twitch = Math.max(0, L.twitch - dt * 3); const w = Math.sin(L.twitch * Math.PI); fx += L.side * w * 1.2; fy -= w * 1.6; }
      // crouch (before a jump / landing) and tucked legs in the air
      const pull = S.tuck * 0.55 + S.crouch * 0.12;
      fx = lerp(fx, L.hip[0] * 1.6, pull); fy = lerp(fy, L.hip[1] + (L.i < 2 ? -4 : 3), pull);
      const knee = ik(L.hip, [fx, fy], L.l1, L.l2, L.side);
      const lift = 1 + swing * 0.12 * S.moving;
      const kx = knee[0] * lift, ky = knee[1];
      const e = legEls[k];
      const d = `M${f2(L.hip[0])} ${f2(L.hip[1])}L${f2(kx)} ${f2(ky)}L${f2(fx)} ${f2(fy)}`;
      e.lg.setAttribute('d', d);
      e.hl.setAttribute('d', `M${f2(L.hip[0] - 0.3)} ${f2(L.hip[1] - 0.3)}L${f2(kx - 0.3)} ${f2(ky - 0.3)}`);
      e.kn.setAttribute('cx', f2(kx)); e.kn.setAttribute('cy', f2(ky));
    });
    // little feelers by the mouth
    const pw = Math.sin(time * 6) * 0.6 * (0.4 + S.moving);
    palpG.innerHTML = `<path d="M-1 -7.6Q-2.6 -9.4 ${f2(-2.2 + pw)} -11M1 -7.6Q2.6 -9.4 ${f2(2.2 - pw)} -11" fill="none" stroke="#2a1a14" stroke-width="1.1" stroke-linecap="round"/>`;
  }

  function drawSilk() {
    if (!S.silk) { if (silkPath.__d !== 'M0 0') { silkPath.__d = 'M0 0'; silkPath.setAttribute('d', 'M0 0'); } return; }
    const a = S.silk.anchor();
    const bx = S.x, by = S.y;
    let d;
    if (S.silk.loose) { // after landing the safety line goes slack and fades
      const mx = (a[0] + bx) / 2, my = Math.max(a[1], by) + 14;
      d = `M${f2(a[0])} ${f2(a[1])}Q${f2(mx)} ${f2(my)} ${f2(bx)} ${f2(by)}`;
    } else d = `M${f2(a[0])} ${f2(a[1])}L${f2(bx)} ${f2(by)}`;
    silkPath.setAttribute('d', d);
    silkPath.style.opacity = S.silkFade.toFixed(2);
  }

  /* ---------------- main loop ---------------- */
  measure();
  readGeo();
  { const p = titlePoint(); S.x = p[0]; S.y = p[1]; }
  queue = [Steps.pause(0.8, 'look')];
  let lastT = performance.now();
  let measureQueued = false;
  window.addEventListener('resize', () => { if (!measureQueued) { measureQueued = true; requestAnimationFrame(() => { measureQueued = false; measure(); }); } });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  function frame(now) {
    const time = now / 1000;
    const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000));
    lastT = now;
    readGeo();
    S.scale = SIZE();

    if (!step) {
      if (!queue.length) queue = plan();
      step = queue.shift();
      if (step.start) step.start();
    }
    S.moving = Math.max(0, S.moving - dt * 4);
    if (step.update(dt)) { if (step.end) step.end(); step = null; }

    // safety line fades away after a jump
    if (S.silk && S.silk.loose) { S.silkFade -= dt * 0.7; if (S.silkFade <= 0) S.silk = null; }

    // turn smoothly (fast in the air)
    const turn = S.loc.kind === 'air' ? 16 : 9;
    S.h += angDiff(S.h, S.hTarget) * Math.min(1, dt * turn);

    drawLegs(time, dt);
    drawSilk();

    // body breathes, bobs while walking, gets closer to you mid-jump
    const breathe = 1 + Math.sin(time * 2.4) * 0.025;
    abdG.setAttribute('transform', `translate(0 ${f2(Math.sin(S.gait * 2) * 0.25 * S.moving)}) scale(${f2(breathe)} ${f2(breathe)})`);
    const sc = S.scale * (1 + S.lift * 0.4) * (1 - S.crouch * 0.07);
    const deg = (S.h * 180 / Math.PI).toFixed(2);
    el.style.transform = `translate(${f2(S.x)}px, ${f2(S.y)}px) rotate(${deg}deg) scale(${f2(sc)})`;
    // light comes from the top left, so the shadow falls down-right (further when it's in the air)
    const off = 1.6 + S.lift * 14 + (S.loc.kind === 'silk' ? 3 : 0);
    shadow.style.transform = `translate(${f2(S.x + off * 0.8)}px, ${f2(S.y + off)}px) rotate(${deg}deg) scale(${f2(S.scale * (1 + S.lift * 0.15))})`;
    shadow.style.opacity = S.behind ? '' : (0.32 - S.lift * 0.14).toFixed(2);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
