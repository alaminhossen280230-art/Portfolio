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
  let pendingX = 0;
  let pendingY = 0;
  let dragging = false;
  let moved = false;
  let rafId = 0;
  let clickGuardTimer;
  const pad = (n) => String(n).padStart(2, "0");
  const interactive = "a, button, input, select, textarea";

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

  // Coalesce pointer events to one visual update per frame for smoother mobile swipes.
  document.addEventListener("pointerdown", (event) => {
    if ((event.pointerType === "mouse" && event.button !== 0) || event.target.closest(interactive)) return;
    dragging = true;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    dx = 0;
    pendingX = event.clientX;
    pendingY = event.clientY;
  }, { passive: true });

  window.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    pendingX = event.clientX;
    pendingY = event.clientY;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (!dragging) return;
        const moveX = pendingX - startX;
        const moveY = pendingY - startY;
        if (!moved && Math.abs(moveX) > 7 && Math.abs(moveX) > Math.abs(moveY)) {
          moved = true;
          track.classList.add("is-dragging");
        }
        if (!moved) return;
        dx = moveX;
        const resisted = Math.max(-90, Math.min(90, dx * 0.32));
        allCards.forEach((card) => {
          if (card.dataset.pos !== "off" && card.dataset.pos !== "hidden") {
            card.style.setProperty("--drag", resisted + "px");
          }
        });
      });
    }
  }, { passive: true });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    track.classList.remove("is-dragging");
    allCards.forEach((card) => card.style.removeProperty("--drag"));
    if (!moved) return;
    if (dx < -42) next();
    else if (dx > 42) prev();
    clearTimeout(clickGuardTimer);
    clickGuardTimer = setTimeout(() => { moved = false; }, 180);
  }
  window.addEventListener("pointerup", endDrag, { passive: true });
  window.addEventListener("pointercancel", endDrag, { passive: true });
  window.addEventListener("blur", endDrag);

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
