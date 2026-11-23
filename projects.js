(function () {
  const track = document.getElementById("track");
  const dotsWrap = document.getElementById("dots");
  const prevBtn = document.querySelector(".nav--prev");
  const nextBtn = document.querySelector(".nav--next");
  const chips = document.querySelectorAll(".chip");
  const allCards = Array.from(track.querySelectorAll(".card"));

  let cards = allCards.slice();
  let current = 0;
  const pad = (n) => String(n).padStart(2, "0");

  function render() {
    const n = cards.length;
    allCards.forEach((card) => {
      const i = cards.indexOf(card);
      if (i === -1) {
        card.dataset.pos = "hidden";
        card.classList.remove("is-active");
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
      if (moved) { e.preventDefault(); return; }
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

  // Track horizontal swipe intent page-wide, but avoid animating every card
  // on every pointermove. Cards animate just once when the swipe ends.
  let startX = 0, startY = 0, dx = 0, dragging = false, moved = false;
  const interactive = "a, button, input, select, textarea";

  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest(interactive)) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
  }, { passive: true });

  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) moved = true;
  }, { passive: true });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    if (moved) {
      if (dx < -45) next();
      else if (dx > 45) prev();
      // Keep the click guard briefly, so a swipe doesn't activate a card.
      setTimeout(() => { moved = false; }, 80);
    }
  }
  window.addEventListener("pointerup", endDrag, { passive: true });
  window.addEventListener("pointercancel", endDrag, { passive: true });

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
