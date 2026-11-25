(function () {
  const track = document.getElementById("track");
  const dotsWrap = document.getElementById("dots");
  const prevBtn = document.querySelector(".nav--prev");
  const nextBtn = document.querySelector(".nav--next");
  const chips = document.querySelectorAll(".chip");
  const allCards = Array.from(track.querySelectorAll(".card"));

  let cards = allCards.slice();
  let current = 0;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let dragging = false;
  let moved = false;
  let rafId = 0;
  let clickGuardTimer;
  let samples = [];
  let slots = null;
  let stepPx = 160;
  const pad = (n) => String(n).padStart(2, "0");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const interactive = "a, button, input, select, textarea";
  const INLINE = ["transform", "opacity", "z-index", "transition"];

  if (track.parentElement) track.parentElement.style.touchAction = "pan-y";

  function render() {
    const n = cards.length;
    allCards.forEach((card) => {
      const i = cards.indexOf(card);
      if (i === -1) {
        card.dataset.pos = "hidden";
        card.classList.remove("is-active");
        card.setAttribute("aria-hidden", "true");
        return;
      }
      let d = (i - current + n) % n;
      if (d > n / 2) d -= n;
      card.dataset.pos = Math.abs(d) <= 2 ? String(d) : "off";
      card.classList.toggle("is-active", d === 0);
      card.setAttribute("aria-hidden", d === 0 ? "false" : "true");
      const count = card.querySelector(".count");
      if (count) count.textContent = pad(i + 1) + " / " + pad(n);
    });
    dotsWrap.querySelectorAll(".dot").forEach((dot, i) => {
      dot.classList.toggle("is-active", i === current);
    });
    prevBtn.hidden = nextBtn.hidden = n <= 1;
  }

  function buildDots() {
    dotsWrap.innerHTML = "";
    cards.forEach((_, i) => {
      const button = document.createElement("button");
      button.className = "dot";
      button.setAttribute("aria-label", "Go to project " + (i + 1));
      button.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(button);
    });
  }

  function goTo(i) {
    const n = cards.length;
    if (!n) return;
    current = ((i % n) + n) % n;
    render();
  }
  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  prevBtn.addEventListener("click", prev);
  nextBtn.addEventListener("click", next);

  allCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      if (moved) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!card.classList.contains("is-active")) {
        event.preventDefault();
        const index = cards.indexOf(card);
        if (index !== -1) goTo(index);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") next();
    if (event.key === "ArrowLeft") prev();
  });

  /* ---------- Swipe: cards follow the finger 1:1 and glide between their resting spots ---------- */

  // Read the resting spot of every stack position straight from the stylesheet,
  // so the swipe always matches the design (also on other screen sizes).
  function readSlots() {
    const probe = document.createElement("article");
    probe.className = "card";
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;transition:none";
    track.appendChild(probe);
    const out = {};
    for (let k = -2; k <= 2; k++) {
      probe.dataset.pos = String(k);
      const cs = getComputedStyle(probe);
      const num = (name, fallback) => {
        const v = parseFloat(cs.getPropertyValue(name));
        return Number.isFinite(v) ? v : fallback;
      };
      out[k] = { x: num("--x", 0), y: num("--y", 0), r: num("--r", 0), s: num("--s", 1), o: 1, z: parseInt(cs.zIndex, 10) || 0 };
    }
    track.removeChild(probe);
    out[3] = { x: out[2].x * 1.12, y: out[2].y, r: 0, s: out[2].s * 0.86, o: 0, z: 0 };
    out[-3] = { x: out[-2].x * 1.12, y: out[-2].y, r: 0, s: out[-2].s * 0.86, o: 0, z: 0 };
    slots = out;
    const width = allCards[0] ? allCards[0].offsetWidth : 300;
    stepPx = Math.max(90, (width * Math.abs(out[1].x)) / 100);
  }

  function clearInline(card) {
    INLINE.forEach((prop) => card.style.removeProperty(prop));
  }

  // p = how many cards the stack is shifted by the finger (can be fractional).
  function applyDrag(p) {
    const n = cards.length;
    for (let c = 0; c < allCards.length; c++) {
      const card = allCards[c];
      const i = cards.indexOf(card);
      if (i === -1) continue;
      let d = (i - current + n) % n;
      if (d > n / 2) d -= n;
      let f;
      let wrapped = false;
      if (n === 2) {
        f = d === 0 ? p : d - Math.abs(p) * Math.sign(d);
      } else {
        f = d + p;
        if (f > n / 2) { f -= n; wrapped = true; }
        else if (f < -n / 2) { f += n; wrapped = true; }
      }
      if (Math.abs(f) >= 3) {
        clearInline(card);
        continue;
      }
      const a = Math.floor(f);
      const t = f - a;
      const A = slots[a];
      const B = slots[a + 1] || A;
      const mix = (key) => A[key] + (B[key] - A[key]) * t;
      let opacity = mix("o");
      // the card that swaps sides fades in instead of popping
      if (wrapped && n % 2 === 0 && Math.abs(d) === n / 2) opacity *= clamp(Math.abs(p) * 3, 0, 1);
      if (n < 6 && n % 2 === 1) opacity *= clamp((n / 2 - Math.abs(f)) * 4, 0, 1);
      const z = slots[clamp(Math.round(f), -3, 3)].z;
      const st = card.style;
      st.setProperty("transition", "none", "important");
      st.setProperty(
        "transform",
        "translateX(" + mix("x").toFixed(2) + "%) translateY(" + mix("y").toFixed(2) + "%) rotate(" + mix("r").toFixed(2) + "deg) scale(" + mix("s").toFixed(4) + ")",
        "important"
      );
      st.setProperty("opacity", opacity.toFixed(3), "important");
      st.setProperty("z-index", String(z), "important");
    }
  }

  function shiftFor(dx) {
    const n = cards.length;
    if (n <= 1) return clamp((dx / stepPx) * 0.2, -0.12, 0.12);
    const limit = Math.min(2, n - 1);
    return clamp(dx / stepPx, -limit, limit);
  }

  function frame() {
    rafId = 0;
    if (!dragging || !moved) return;
    applyDrag(shiftFor(lastX - startX));
  }

  document.addEventListener("pointerdown", (event) => {
    if ((event.pointerType === "mouse" && event.button !== 0) || event.target.closest(interactive)) return;
    if (!slots) readSlots();
    dragging = true;
    moved = false;
    clearTimeout(clickGuardTimer);
    startX = lastX = event.clientX;
    startY = lastY = event.clientY;
    samples = [{ t: event.timeStamp, x: event.clientX }];
  }, { passive: true });

  window.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    lastX = event.clientX;
    lastY = event.clientY;
    samples.push({ t: event.timeStamp, x: lastX });
    if (samples.length > 8) samples.shift();
    if (!moved) {
      const mx = lastX - startX;
      const my = lastY - startY;
      if (Math.abs(mx) > 5 && Math.abs(mx) >= Math.abs(my)) {
        moved = true;
        startX = lastX; // start from here so the cards don't jump
        track.classList.add("is-dragging");
      } else if (Math.abs(my) > 10) {
        dragging = false; // it's a page scroll, leave it alone
        return;
      } else {
        return;
      }
    }
    if (!rafId) rafId = requestAnimationFrame(frame);
  }, { passive: true });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (!moved) return;
    if (event && event.type === "pointerup" && typeof event.clientX === "number") lastX = event.clientX;
    const dx = lastX - startX;
    const n = cards.length;

    // speed of the last ~100ms, so a quick flick is enough
    let velocity = 0;
    const now = event && event.timeStamp ? event.timeStamp : (samples.length ? samples[samples.length - 1].t : 0);
    for (let k = 0; k < samples.length; k++) {
      const age = now - samples[k].t;
      if (age <= 120 && age > 8) {
        velocity = (lastX - samples[k].x) / age;
        break;
      }
    }

    let steps = 0;
    if (n > 1 && event && event.type !== "pointercancel") {
      const p = dx / stepPx;
      const threshold = Math.max(22, stepPx * 0.16);
      if (Math.abs(p) >= 1.5) steps = Math.sign(p) * Math.min(2, n - 1);
      else if (Math.abs(dx) > threshold) steps = Math.sign(dx);
      else if (Math.abs(velocity) > 0.3 && Math.abs(dx) > 8 && Math.sign(velocity) === Math.sign(dx)) steps = Math.sign(dx);
    }

    track.classList.remove("is-dragging");
    allCards.forEach(clearInline);
    if (steps) goTo(current - steps);
    clickGuardTimer = setTimeout(() => { moved = false; }, 180);
  }
  window.addEventListener("pointerup", endDrag, { passive: true });
  window.addEventListener("pointercancel", endDrag, { passive: true });
  window.addEventListener("blur", endDrag);
  window.addEventListener("resize", () => { slots = null; });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((item) => item.classList.remove("is-active"));
      chip.classList.add("is-active");
      const filter = chip.dataset.filter;
      cards = allCards.filter((card) => filter === "all" || card.dataset.category === filter);
      current = 0;
      buildDots();
      render();
    });
  });

  buildDots();
  render();
})();
