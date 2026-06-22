/* Cursor-reactive structural lattice behind the hero. */
(function () {
  const cv = document.getElementById("lattice");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = cv.closest(".hero") || cv.parentElement;

  let nodes = [], cols = 0, rows = 0, W = 0, H = 0, dpr = 1;
  const STEP = 66, R = 130, PUSH = 26;
  const mouse = { x: -9999, y: -9999, active: false };
  let raf = null, settleUntil = 0;

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / STEP) + 2;
    rows = Math.ceil(H / STEP) + 2;
    nodes = [];
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const rx = i * STEP - STEP, ry = j * STEP - STEP;
        nodes.push({ rx, ry, x: rx, y: ry, vx: 0, vy: 0, i, j });
      }
  }

  function idx(i, j) { return j * cols + i; }

  function step() {
    for (const n of nodes) {
      // spring to rest
      const ax = (n.rx - n.x) * 0.06 - n.vx * 0.18;
      const ay = (n.ry - n.y) * 0.06 - n.vy * 0.18;
      n.vx += ax; n.vy += ay;
      // cursor repel
      if (mouse.active) {
        const dx = n.x - mouse.x, dy = n.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / R) * PUSH;
          n.vx += (dx / d) * f * 0.12;
          n.vy += (dy / d) * f * 0.12;
        }
      }
      n.x += n.vx; n.y += n.vy;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(21,22,26,0.07)";
    ctx.beginPath();
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const n = nodes[idx(i, j)];
        if (i < cols - 1) { const r = nodes[idx(i + 1, j)]; ctx.moveTo(n.x, n.y); ctx.lineTo(r.x, r.y); }
        if (j < rows - 1) { const b = nodes[idx(i, j + 1)]; ctx.moveTo(n.x, n.y); ctx.lineTo(b.x, b.y); }
      }
    ctx.stroke();
    // nodes
    ctx.fillStyle = "rgba(31,63,214,0.18)";
    for (const n of nodes) {
      const disp = Math.abs(n.x - n.rx) + Math.abs(n.y - n.ry);
      if (disp > 0.6) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.6 + Math.min(disp * 0.05, 2), 0, 6.283);
        ctx.fill();
      }
    }
  }

  function loop(ts) {
    step(); draw();
    const moving = nodes.some((n) => Math.abs(n.vx) + Math.abs(n.vy) > 0.05);
    if (mouse.active || moving || ts < settleUntil) raf = requestAnimationFrame(loop);
    else raf = null;
  }
  function kick() { if (!raf && !reduce) raf = requestAnimationFrame(loop); }

  if (reduce) { build(); draw(); return; }

  build(); draw();
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
    settleUntil = performance.now() + 1200; kick();
  });
  hero.addEventListener("pointerleave", () => { mouse.active = false; settleUntil = performance.now() + 1500; kick(); });
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { build(); draw(); }, 150); });
})();
