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
  let dx = 0;
  let dragging = false;
  let moved = false;
  let clickGuardTimer;
  const pad = (n) => String(n).padStart(2, "0");
  const interactive = "button, input, select, textarea";

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
      const b = document.createElement("button");
      b.className = "dot";
      b.setAttribute("aria-label", "Go to project " + (i + 1));
      b.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(b);
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
    card.addEventListener("click", (e) => {
      if (moved) { e.preventDefault(); e.stopPropagation(); return; }
      if (!card.classList.contains("is-active")) {
        e.preventDefault();
        const index = cards.indexOf(card);
        if (index !== -1) goTo(index);
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });

  // Allow horizontal swipes anywhere on the page (including over the cards),
  // and make the stack follow the pointer immediately instead of waiting for release.
  document.addEventListener("pointerdown", (e) => {
    if ((e.pointerType === "mouse" && e.button !== 0) || e.target.closest(interactive)) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    track.classList.add("is-dragging");
  }, { passive: true });

  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const moveX = e.clientX - startX;
    const moveY = e.clientY - startY;
    if (!moved && Math.abs(moveX) > 7 && Math.abs(moveX) > Math.abs(moveY)) moved = true;
    if (!moved) return;
    dx = moveX;
    const resisted = Math.max(-110, Math.min(110, dx * 0.38));
    allCards.forEach((card) => card.style.setProperty("--drag", resisted + "px"));
  }, { passive: true });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("is-dragging");
    allCards.forEach((card) => card.style.setProperty("--drag", "0px"));
    if (moved) {
      if (dx < -42) next();
      else if (dx > 42) prev();
      clearTimeout(clickGuardTimer);
      clickGuardTimer = setTimeout(() => { moved = false; }, 120);
    }
  }
  window.addEventListener("pointerup", endDrag, { passive: true });
  window.addEventListener("pointercancel", endDrag, { passive: true });
  window.addEventListener("blur", endDrag);

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      const f = chip.dataset.filter;
      cards = allCards.filter((c) => f === "all" || c.dataset.category === f);
      current = 0;
      buildDots();
      render();
    });
  });

  buildDots();
  render();
})();
