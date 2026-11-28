/* =====================================================================
   SOCIAL CLAW MACHINE
   ---------------------------------------------------------------------
   EDIT YOUR LINKS HERE. For each one you can change:
     handle - the name shown on the receipt
     url    - where the OPEN PASS button goes
     note   - the small line under the handle
   ===================================================================== */
const SOCIALS = [
  { id: "facebook",  handle: "Alamin Hossen Alif", url: "https://www.facebook.com/alamin.hossen.alif.534110?mibextid=ZbWKwL", note: "Posts & Updates" },
  { id: "youtube",   handle: "@wxive",       url: "https://youtube.com/@wxive?si=mFjfGYdyW3DfSaV8", note: "Latest Videos & Edits" },
  { id: "instagram", handle: "@ilove.toastedbread", url: "https://www.instagram.com/ilove.toastedbread?hvrq=ODQ5bXNlNThpd2tj", note: "Daily Design Bits" },
  { id: "x",         handle: "@atoastbread", url: "https://x.com/atoastbread",                    note: "Thoughts & Quick Posts" },
  { id: "github",    handle: "@alaminhossen280230-art", url: "https://github.com/alaminhossen280230-art", note: "Code & Repos" },
  { id: "linkedin",  handle: "Alif",         url: "https://www.linkedin.com/",                    note: "Work & Experience" },
];
/* ===================== nothing below needs editing ==================== */

(() => {
  const LOOK = {
    facebook:  { c: "#2b86f5", c2: "#0b47a8", x: 16, y: 85, z: 3, r: -8,
      icon: '<svg viewBox="0 0 24 24"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21z"/></svg>' },
    youtube:   { c: "#f03a3a", c2: "#8f0f14", x: 28, y: 65, z: 2, r: 6,
      icon: '<svg viewBox="0 0 24 24"><path d="M8.5 5.5v13l11-6.5z"/></svg>' },
    instagram: { c: "#e23f8f", c2: "#6a1e9c", x: 51, y: 66, z: 2, r: 14,
      icon: '<svg viewBox="0 0 24 24"><rect class="ln" x="4" y="4" width="16" height="16" rx="5"/><circle class="ln" cx="12" cy="12" r="3.7"/><circle cx="16.7" cy="7.3" r="1.2"/></svg>' },
    x:         { c: "#2a2a2e", c2: "#000000", x: 69, y: 67, z: 2, r: -10,
      icon: '<svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" transform="translate(2.4 2.4) scale(.8)"/></svg>' },
    github:    { c: "#3a3a40", c2: "#0b0b0e", x: 41, y: 86, z: 3, r: 4,
      icon: '<svg viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>' },
    linkedin:  { c: "#2f6fd0", c2: "#0d2f73", x: 65, y: 86, z: 3, r: -5,
      icon: '<svg viewBox="0 0 24 24"><text x="12" y="17.5" text-anchor="middle">in</text></svg>' },
  };
  // plain balls that just fill the pile
  const FILLERS = [
    { c: "#f4c63a", c2: "#a87406", x: 40, y: 56 },
    { c: "#35b7a6", c2: "#0d5e58", x: 61, y: 55 },
    { c: "#f4c63a", c2: "#a87406", x: 15, y: 63 },
  ];

  const $ = (id) => document.getElementById(id);
  const machine = $("machine"), dome = $("dome"), pile = $("pile"), carriage = $("carriage"), cable = $("cable"),
        head = $("head"), stick = $("stick"), grab = $("grab"), receipt = $("receipt"), 
        streak = $("streak"), pop = $("pop");

  const AIM_MIN = 0.16, AIM_MAX = 0.72, CHUTE_X = 0.89, REST_LEN = 0.07, HEAD_W = 0.33;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  const easeIn = (p) => p * p;
  const easeOut = (p) => 1 - (1 - p) * (1 - p);

  let W = 0, H = 0, busy = false;
  const claw = { x: 0.45, len: REST_LEN, ang: 0 };

  /* ---------- build the pile ---------- */
  const mkCapsule = (d) => {
    const el = document.createElement("div");
    el.className = "capsule";
    el.style.cssText = `--c:${d.c};--c2:${d.c2};--r:${d.r || 0}deg;left:${d.x}%;top:${d.y}%;z-index:${d.z || 1}`;
    if (d.icon) el.innerHTML = d.icon;
    pile.appendChild(el);
    return el;
  };
  FILLERS.forEach(mkCapsule);
  const capsules = SOCIALS.filter((s) => LOOK[s.id]).map((s) => {
    const look = LOOK[s.id];
    return { ...s, ...look, el: mkCapsule(look) };
  });

  /* ---------- claw drawing ---------- */
  function measure() {
    W = dome.clientWidth; H = dome.clientHeight;
    dome.style.setProperty("--head-w", HEAD_W * W + "px");
    render();
  }
  function render() {
    carriage.style.transform = `translateX(${claw.x * W}px) rotate(${claw.ang}deg)`;
    cable.style.transform = `scaleY(${claw.len})`;
    head.style.transform = `translateY(${claw.len * H}px)`;
    stick.setAttribute("aria-valuenow", Math.round(((claw.x - AIM_MIN) / (AIM_MAX - AIM_MIN)) * 100));
  }
  function tween(ms, fn, ease = easeInOut) {
    return new Promise((res) => {
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / ms);
        fn(ease(p), p);
        render();
        p < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
  }
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  /* ---------- aiming: joystick, dragging on the glass, arrow keys ---------- */
  let tilt = 0, aimRaf = 0, lastT = 0;
  function aimLoop(now) {
    const dt = Math.min(40, now - lastT); lastT = now;
    if (!busy && tilt) { claw.x = clamp(claw.x + tilt * dt * 0.00075, AIM_MIN, AIM_MAX); claw.ang = -tilt * 4; render(); }
    aimRaf = tilt ? requestAnimationFrame(aimLoop) : 0;
    if (!tilt && !busy) { claw.ang = 0; render(); }
  }
  function setTilt(t) {
    tilt = clamp(t, -1, 1);
    stick.style.setProperty("--tilt", tilt * 24 + "deg");
    if (tilt && !aimRaf) { lastT = performance.now(); aimRaf = requestAnimationFrame(aimLoop); }
  }
  let stickStart = null;
  stick.addEventListener("pointerdown", (e) => {
    stick.setPointerCapture(e.pointerId); stick.classList.add("is-held");
    const r = stick.getBoundingClientRect();
    stickStart = r.left + r.width / 2;
    setTilt((e.clientX - stickStart) / 34);
  });
  stick.addEventListener("pointermove", (e) => { if (stickStart !== null) setTilt((e.clientX - stickStart) / 34); });
  const stickEnd = () => { stickStart = null; stick.classList.remove("is-held"); setTilt(0); };
  stick.addEventListener("pointerup", stickEnd);
  stick.addEventListener("pointercancel", stickEnd);
  stick.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); setTilt(e.key === "ArrowLeft" ? -1 : 1); }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(); }
  });
  stick.addEventListener("keyup", () => setTilt(0));

  let domeDrag = false;
  const aimAt = (e) => {
    if (busy) return;
    const r = dome.getBoundingClientRect();
    claw.x = clamp((e.clientX - r.left) / r.width, AIM_MIN, AIM_MAX); render();
  };
  dome.addEventListener("pointerdown", (e) => { domeDrag = true; dome.setPointerCapture(e.pointerId); aimAt(e); });
  dome.addEventListener("pointermove", (e) => { if (domeDrag) aimAt(e); });
  dome.addEventListener("pointerup", () => { domeDrag = false; });
  dome.addEventListener("pointercancel", () => { domeDrag = false; });

  /* ---------- the grab ---------- */
  function pick() {
    let best = capsules[0], score = Infinity;
    for (const c of capsules) {
      const s = Math.abs(c.x / 100 - claw.x) + (c.z === 3 ? 0.02 : 0);
      if (s < score) { score = s; best = c; }
    }
    return best;
  }

  async function play() {
    if (busy) return;
    busy = true; setTilt(0);
    machine.classList.add("is-busy");
    if (receipt.classList.contains("is-out")) { receipt.classList.remove("is-out"); machine.classList.remove("has-pass"); await wait(320); }

    const cap = pick(), el = cap.el;
    const headH = HEAD_W * W * 1.05;
    const grabLen = cap.y / 100 - (headH * 0.595) / H;
    const x0 = claw.x, tx = cap.x / 100;

    // line up and go down
    head.classList.add("is-open");
    await tween(160, (e) => { claw.x = x0 + (tx - x0) * e; claw.ang = 0; });
    await tween(480, (e) => { claw.len = REST_LEN + (grabLen - REST_LEN) * e; });
    head.classList.remove("is-open");
    await wait(190);

    // 1. swaying ascent
    el.classList.add("is-held"); head.appendChild(el);
    await tween(620, (e, p) => {
      claw.len = grabLen + (REST_LEN + 0.03 - grabLen) * e;
      claw.ang = 9 * Math.sin(p * Math.PI * 3) * (1 - p);
    });
    // slide over to the chute
    await tween(520, (e, p) => {
      claw.x = tx + (CHUTE_X - tx) * e;
      claw.ang = -7 * Math.sin(p * Math.PI) + 4 * Math.sin(p * Math.PI * 3) * (1 - p);
    });

    // 2. open, 3. chute drop + pop
    head.classList.add("is-open");
    const a = el.getBoundingClientRect(), d = dome.getBoundingClientRect();
    const cx = a.left + a.width / 2 - d.left, cy = a.top + a.height / 2 - d.top;
    el.classList.remove("is-held"); dome.appendChild(el);
    el.style.left = (cx / d.width) * 100 + "%"; el.style.top = (cy / d.height) * 100 + "%"; el.style.zIndex = 7;
    streak.style.setProperty("--streak", cap.c); restart(streak, "is-on");
    tween(450, (e) => { claw.x = CHUTE_X + (0.45 - CHUTE_X) * e; claw.len = REST_LEN + 0.03 - 0.03 * e; claw.ang = 0; });
    await el.animate(
      [{ transform: "translateY(0) scale(1)" }, { transform: `translateY(${H - cy + a.height}px) scale(.92)` }],
      { duration: 420, easing: "cubic-bezier(.55,0,.9,.45)" }
    ).finished;
    el.classList.add("is-gone");
    restart(pop, "is-on");

    // 4. ring glow + receipt
    restart(grab, "is-glow");
    $("rIcon").innerHTML = cap.icon; $("rIcon").style.setProperty("--c", cap.c);
    $("rHandle").textContent = cap.handle; $("rNote").textContent = cap.note; $("rOpen").href = cap.url;
    receipt.classList.add("is-out"); machine.classList.add("has-pass");
    await wait(650);

    // 5. capsule comes back, ready to play again
    pile.appendChild(el);
    el.style.left = cap.x + "%"; el.style.top = cap.y + "%"; el.style.zIndex = cap.z;
    el.classList.remove("is-gone");
    const from = -((cap.y / 100) * H + a.height);
    el.animate(
      [{ transform: `translateY(${from}px)`, easing: "cubic-bezier(.5,0,.9,.5)" },
       { transform: "translateY(0)", offset: 0.6, easing: "ease-out" },
       { transform: "translateY(-9%)", offset: 0.78, easing: "ease-in" },
       { transform: "translateY(0)" }],
      { duration: 620 }
    );
    setTimeout(() => {
      pile.querySelectorAll(".capsule").forEach((c, i) => {
        if (c !== el) c.animate([{ transform: "none" }, { transform: `translate(${i % 2 ? 2 : -2}px, 3px) rotate(${i % 2 ? 3 : -3}deg)` }, { transform: "none" }], { duration: 300, easing: "ease-out" });
      });
    }, 360);
    await wait(640);

    machine.classList.remove("is-busy");
    busy = false;
  }

  // gentle idle sway of the claw while nobody is touching it
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const idle = (now) => {
      if (!busy && !tilt && !domeDrag) { claw.ang = 1.8 * Math.sin(now / 850); render(); }
      requestAnimationFrame(idle);
    };
    requestAnimationFrame(idle);
  }

  grab.addEventListener("click", play);
  window.addEventListener("resize", measure);
  measure();
})();
