/* ALIF. — Manual-only hanging tags + dock interactions */
(() => {
  const field = document.getElementById('rolesField');
  const tags = field ? [...field.querySelectorAll('.hanger')].map((hanger) => {
    const css = getComputedStyle(hanger);
    const pill = hanger.querySelector('.role-pill');
    const swing = hanger.querySelector('.swing');
    const tag = hanger.querySelector('.role-tag');
    const len = parseFloat(css.getPropertyValue('--len')) || 120;
    const lean = (parseFloat(css.getPropertyValue('--lean')) || 0) * Math.PI / 180;
    const rest = (parseFloat(css.getPropertyValue('--tilt')) || 0) * Math.PI / 180;
    const initialAngle = lean + (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0);

    swing.style.rotate = `${initialAngle}rad`;
    tag.style.rotate = `${rest}rad`;

    // Keep decorative silk static; do not rebuild SVG or its DOM during dragging.
    const thread = hanger.querySelector('.thread');
    if (thread && !thread.childElementCount) {
      thread.setAttribute('viewBox', `-40 -2 80 ${len + 4}`);
      thread.setAttribute('width', '80');
      thread.setAttribute('height', len + 4);
      thread.style.left = '-40px';
      thread.style.top = '-2px';
      thread.innerHTML = `<path class="silk silk--main" d="M0 0L0 ${len}"/><path class="silk silk--loose" d="M0 ${len * 0.18}Q-5 ${len * 0.4} 0 ${len * 0.65}"/>`;
    }
    const web = hanger.querySelector('.web--tag');
    if (web && !web.childElementCount) {
      web.setAttribute('viewBox', '-34 -4 68 39');
      web.setAttribute('width', '68');
      web.setAttribute('height', '39');
      web.style.left = '-34px';
      web.style.top = '-4px';
      let silk = '';
      for (let i = 0; i <= 6; i++) {
        const x = -30 + i * 10;
        silk += `<path class="silk silk--spoke" d="M0 0Q${x * 0.25} 17 ${x} 31"/>`;
      }
      for (let y = 8; y <= 28; y += 7) {
        const width = y * 0.9;
        silk += `<path class="silk silk--ring" d="M${-width} ${y}Q0 ${y + 4} ${width} ${y}"/>`;
      }
      web.innerHTML = silk;
    }

    return { hanger, pill, swing, angle: initialAngle, drag: null, raf: 0, pendingAngle: initialAngle };
  }) : [];

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const maxAngle = 1.25;

  tags.forEach((t) => {
    t.pill.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      const rect = t.hanger.getBoundingClientRect();
      const pointerAngle = Math.atan2(-(e.clientX - rect.left), e.clientY - rect.top);
      t.drag = { id: e.pointerId, pivotX: rect.left, pivotY: rect.top, startPointerAngle: pointerAngle, startAngle: t.angle };
      t.zBefore = t.hanger.style.zIndex;
      t.hanger.style.zIndex = '9';
      t.pill.classList.add('is-grabbing');
      t.pill.setPointerCapture(e.pointerId);
    });

    t.pill.addEventListener('pointermove', (e) => {
      const drag = t.drag;
      if (!drag || drag.id !== e.pointerId) return;
      // Only schedule a visual update when the user moves the pointer; no global animation loop.
      const pointerAngle = Math.atan2(-(e.clientX - drag.pivotX), e.clientY - drag.pivotY);
      t.pendingAngle = clamp(drag.startAngle + pointerAngle - drag.startPointerAngle, -maxAngle, maxAngle);
      if (t.raf) return;
      t.raf = requestAnimationFrame(() => {
        t.raf = 0;
        if (!t.drag) return;
        t.angle = t.pendingAngle;
        t.swing.style.rotate = `${t.angle}rad`;
      });
    });

    const release = (e) => {
      if (!t.drag || t.drag.id !== e.pointerId) return;
      t.drag = null;
      if (t.raf) { cancelAnimationFrame(t.raf); t.raf = 0; }
      t.angle = t.pendingAngle;
      t.swing.style.rotate = `${t.angle}rad`;
      t.pill.classList.remove('is-grabbing');
      t.hanger.style.zIndex = t.zBefore;
    };
    t.pill.addEventListener('pointerup', release);
    t.pill.addEventListener('pointercancel', release);
    t.pill.addEventListener('lostpointercapture', release);
  });

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
    lastPointerTime = Date.now();
    animate(item);
    playDropSound();
  }, { passive: true });
  dock.addEventListener('click', (e) => {
    const item = e.target.closest('.dock-item');
    if (item && Date.now() - lastPointerTime > 700) { animate(item); playDropSound(); }
  });
})();
