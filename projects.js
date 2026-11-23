(function () {
  const track = document.getElementById("track");
  const dotsWrap = document.getElementById("dots");
  const prevBtn = document.querySelector(".nav--prev");
  const nextBtn = document.querySelector(".nav--next");
  const chips = document.querySelectorAll(".chip");
  const allCards = Array.from(track.querySelectorAll(".card"));

  let cards = allCards.slice(); // cards in the current filter
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
      let d = (i - current + n) % n;      // distance from the front card (loops)
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

  // tap a side card to bring it to the front
  allCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      if (moved) { e.preventDefault(); return; }
      if (!card.classList.contains("is-active")) {
        e.preventDefault();
        goTo(cards.indexOf(card));
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });

  // ---------- swipe / drag ----------
  let startX = 0, startY = 0, dx = 0, dragging = false, moved = false;

  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true; moved = false;
    startX = e.clientX; startY = e.clientY; dx = 0;
  });

  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
      moved = true;
      track.classList.add("is-dragging");
    }
    if (moved) track.style.setProperty("--drag", dx * 0.6 + "px");
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("is-dragging");
    track.style.setProperty("--drag", "0px");
    if (moved) {
      if (dx < -50) next();
      else if (dx > 50) prev();
      setTimeout(() => (moved = false), 0);
    }
  }
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  // ---------- filters ----------
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
