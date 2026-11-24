/* ALIF. — Lightweight draggable hanging tags + dock interactions */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const field = document.getElementById('rolesField');
  const tags = field ? [...field.querySelectorAll('.hanger')].map((hanger, i) => {
    const css = getComputedStyle(hanger);
    return {
      hanger,
      swing: hanger.querySelector('.swing'),
      tag: hanger.querySelector('.role-tag'),
      pill: hanger.querySelector('.role-pill'),
      x: parseFloat(css.getPropertyValue('--x')) || i / 4,
      lean: (parseFloat(css.getPropertyValue('--lean')) || 0) * Math.PI / 180,
      rest: (parseFloat(css.getPropertyValue('--tilt')) || 0) * Math.PI / 180,
      len: 150,
      theta: (reduceMotion ? 0 : [0.2, -0.16, 0.16, -0.2][i % 4]),
      omega: 0,
      phi: 0,
      phiV: 0,
      drag: null,
      pivotX: 0,
      pivotY: 0,
    };
  }) : [];
  const MAX_ANGLE = 1.25;
  const GRAVITY = 1500;
  const DAMPING = 1.1;

  tags.forEach((t) => {
    t.theta += t.lean;
    t.phi = t.rest;
  });

  function measure() {
    tags.forEach((t) => {
      const css = getComputedStyle(t.hanger);
      t.len = (parseFloat(css.getPropertyValue('--len')) || 120) + 30 + t.pill.offsetHeight / 2;
      const fieldRect = field.getBoundingClientRect();
      t.pivotX = fieldRect.left + fieldRect.width * t.x;
      t.pivotY = fieldRect.top + 20;
    });
  }
  measure();
  window.addEventListener('resize', measure, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(measure);

  // Draw simple silk details once; avoid replacing SVG contents during animation.
  const NS = 'http://www.w3.org/2000/svg';
  function path(svg, cls, d) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('class', `silk ${cls}`);
    p.setAttribute('d', d);
    svg.appendChild(p);
  }
  tags.forEach((t) => {
    const thread = t.hanger.querySelector('.thread');
    const web = t.hanger.querySelector('.web--tag');
    const len = parseFloat(getComputedStyle(t.hanger).getPropertyValue('--len')) || 120;
    if (thread && !thread.childElementCount) {
      thread.setAttribute('viewBox', '-40 -2 80 ' + (len + 4));
      thread.setAttribute('width', '80');
      thread.setAttribute('height', len + 4);
      thread.style.left = '-40px';
      thread.style.top = '-2px';
      path(thread, 'silk--main', `M0 0L0 ${len}`);
      path(thread, 'silk--loose', `M0 ${len * 0.18}Q-5 ${len * 0.38} 0 ${len * 0.65}`);
    }
    if (web && !web.childElementCount) {
      web.setAttribute('viewBox', '-34 -4 68 39');
      web.setAttribute('width', '68');
      web.setAttribute('height', '39');
      web.style.left = '-34px';
      web.style.top = '-4px';
      for (let i = 0; i <= 6; i++) {
        const x = -30 + i * 10;
        path(web, 'silk--spoke', `M0 0 Q${x * 0.25} 17 ${x} 31`);
      }
      for (let y = 8; y <= 28; y += 7) {
        const w = y * 0.9;
        path(web, 'silk--ring', `M${-w} ${y} Q0 ${y + 4} ${w} ${y}`);
      }
    }
  });

  function pointerAngle(t, e) {
    return Math.atan2(-(e.clientX - t.pivotX), e.clientY - t.pivotY);
  }

  tags.forEach((t) => {
    t.pill.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // Cache the pivot on pointerdown only. No layout reads occur during pointermove.
      const r = t.hanger.getBoundingClientRect();
      t.pivotX = r.left;
      t.pivotY = r.top;
      t.pill.setPointerCapture(e.pointerId);
      t.pill.classList.add('is-grabbing');
      t.zBefore = t.hanger.style.zIndex;
      t.hanger.style.zIndex = '9';
      t.drag = {
        id: e.pointerId,
        offset: t.theta - pointerAngle(t, e),
        target: t.theta,
        startX: e.clientX,
        startY: e.clientY,
        moved: 0,
        time: performance.now(),
      };
    });
    t.pill.addEventListener('pointermove', (e) => {
      const d = t.drag;
      if (!d || d.id !== e.pointerId) return;
      d.target = clamp(pointerAngle(t, e) + d.offset, -MAX_ANGLE, MAX_ANGLE);
      d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.startX, e.clientY - d.startY));
    });
    const endDrag = (e) => {
      const d = t.drag;
      if (!d || d.id !== e.pointerId) return;
      const tap = d.moved < 6 && performance.now() - d.time < 300;
      t.drag = null;
      t.pill.classList.remove('is-grabbing');
      t.hanger.style.zIndex = t.zBefore;
      if (tap) {
        t.omega += (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random());
        t.phiV += (Math.random() - 0.5) * 7;
      }
    };
    t.pill.addEventListener('pointerup', endDrag);
    t.pill.addEventListener('pointercancel', endDrag);
  });

  // Light brush interaction for mouse/finger movement across an undragged tag.
  let previousPointer = null;
  field?.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (previousPointer && now - previousPointer.time < 100) {
      const vx = (e.clientX - previousPointer.x) / Math.max(0.008, (now - previousPointer.time) / 1000);
      tags.forEach((t) => {
        if (t.drag) return;
        const r = t.pill.getBoundingClientRect();
        if (e.clientX >= r.left - 6 && e.clientX <= r.right + 6 && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6) {
          t.omega = clamp(t.omega - vx * 0.0016, -5, 5);
        }
      });
    }
    previousPointer = { x: e.clientX, y: e.clientY, time: now };
  }, { passive: true });
  field?.addEventListener('pointerleave', () => { previousPointer = null; });

  let lastTime = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;
    const time = now / 1000;
    tags.forEach((t) => {
      const oldOmega = t.omega;
      if (t.drag) {
        t.omega += (380 * (t.drag.target - t.theta) - 36 * t.omega) * dt;
      } else {
        const breeze = reduceMotion ? 0 : 0.3 * Math.sin(time * 0.8 + t.x * 6) + 0.16 * Math.sin(time * 1.9 + t.x * 8);
        t.omega += (-(GRAVITY / t.len) * Math.sin(t.theta - t.lean) - DAMPING * t.omega + breeze) * dt;
      }
      t.theta = clamp(t.theta + t.omega * dt, -MAX_ANGLE, MAX_ANGLE);
      if (Math.abs(t.theta) >= MAX_ANGLE) t.omega *= -0.3;
      const alpha = (t.omega - oldOmega) / dt;
      t.phiV += (-140 * (t.phi - t.rest) - 5 * t.phiV - alpha * 0.03) * dt;
      t.phi = clamp(t.phi + t.phiV * dt, t.rest - 0.6, t.rest + 0.6);
      t.swing.style.rotate = `${t.theta}rad`;
      t.tag.style.rotate = `${t.phi - t.theta * 0.15}rad`;
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

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
      osc.connect(gain); gain.connect(audioContext.destination);
      osc.start(now); osc.stop(now + 0.15);
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
    lastPointerTime = Date.now(); animate(item); playDropSound();
  }, { passive: true });
  dock.addEventListener('click', (e) => {
    const item = e.target.closest('.dock-item');
    if (item && Date.now() - lastPointerTime > 700) { animate(item); playDropSound(); }
  });
})();
