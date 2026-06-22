/* Interactive lateral-load / LFRS structural model — dependency-free SVG. */
(function () {
  const svg = document.getElementById("frame");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- geometry (SVG user units) ----
  const baseY = 512, roofY = 96;
  const N = 4;                              // stories
  const h = (baseY - roofY) / N;            // story height
  const cols = [188, 300, 412];            // 3 columns / 2 bays
  const wallBay = [cols[1], cols[2]];       // shear wall occupies right bay
  const floorY = (i) => baseY - i * h;      // i: 0 base .. N roof
  const storyFt = 13, Hin = N * storyFt * 12;

  // ---- systems ----
  const SYS = {
    moment: { k: 1.0, name: "Moment frame (SMF)", note: "rigid beam–column joints" },
    braced: { k: 2.4, name: "Braced frame (CBF)", note: "diagonals carry shear" },
    wall:   { k: 1.7, name: "Shear wall (RC)", note: "cantilever flexure" },
  };

  const params = new URLSearchParams(location.search);
  const state = { system: SYS[params.get("sys")] ? params.get("sys") : "moment", intensity: 0.5 };
  const MAXA = 74; // roof sway (units) at intensity 1, moment frame

  // ---- svg helpers ----
  const el = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };
  const layer = (id) => { const g = el("g", { id }); svg.appendChild(g); return g; };

  // defs: arrow markers + hatch
  const defs = el("defs", {});
  defs.innerHTML =
    '<marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 z" class="m-load-fill"/></marker>' +
    '<marker id="ahb" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 z" class="m-load-fill"/></marker>' +
    '<pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<line x1="0" y1="0" x2="0" y2="7" class="m-hatch"/></pattern>';
  svg.appendChild(defs);

  const gGround = layer("m-ground");
  const gGhost  = layer("m-ghost");
  const gStruct = layer("m-struct");
  const gForce  = layer("m-force");
  const gAnno   = layer("m-anno");

  // ---- static ground + ghost (undeformed) ----
  (function staticLayer() {
    // foundation hatch band
    gGround.appendChild(el("rect", { x: 70, y: baseY, width: 460, height: 34, fill: "url(#hatch)" }));
    gGround.appendChild(el("line", { x1: 70, y1: baseY, x2: 530, y2: baseY, class: "m-ground-line" }));
    // fixity supports at column bases
    cols.forEach((x) => {
      gGround.appendChild(el("path", { d: `M${x - 13} ${baseY + 16} L${x} ${baseY} L${x + 13} ${baseY + 16} Z`, class: "m-support" }));
    });
    // undeformed dashed outline
    cols.forEach((x) => gGhost.appendChild(el("line", { x1: x, y1: baseY, x2: x, y2: roofY, class: "m-ghost-line" })));
    gGhost.appendChild(el("line", { x1: cols[0], y1: roofY, x2: cols[2], y2: roofY, class: "m-ghost-line" }));
  })();

  // ---- displacement profile ----
  function profile(A) {
    const u = [];
    for (let i = 0; i <= N; i++) {
      const r = i / N;
      let s;
      if (state.system === "wall") s = (r * r) * (3 - r) / 2;   // flexural cantilever
      else s = r;                                                // shear-type (frames)
      u.push(A * s);
    }
    return u;
  }

  // cubic path for a moment-frame column segment (double curvature)
  function colPath(x, i, u) {
    const xb = x + u[i], yb = floorY(i), xt = x + u[i + 1], yt = floorY(i + 1);
    if (state.system === "moment")
      return `M${xb} ${yb} C ${xb} ${yb - h * 0.5}, ${xt} ${yt + h * 0.5}, ${xt} ${yt}`;
    return `M${xb} ${yb} L${xt} ${yt}`;
  }

  function clear(g) { while (g.firstChild) g.removeChild(g.firstChild); }

  // ---- main draw ----
  function draw(A) {
    const u = profile(A);
    clear(gStruct); clear(gForce); clear(gAnno);

    // shear wall (right bay) — draw behind frame
    if (state.system === "wall") {
      let lpts = "", rpts = "";
      for (let i = 0; i <= N; i++) { lpts += `${wallBay[0] + u[i]},${floorY(i)} `; }
      for (let i = N; i >= 0; i--) { rpts += `${wallBay[1] + u[i]},${floorY(i)} `; }
      gStruct.appendChild(el("polygon", { points: lpts + rpts, class: "m-wall" }));
    }

    // columns
    cols.forEach((x, ci) => {
      // in wall mode the right bay columns are the wall boundary (still drawn as members)
      for (let i = 0; i < N; i++)
        gStruct.appendChild(el("path", { d: colPath(x, i, u), class: "m-col" }));
    });

    // beams / diaphragms
    for (let i = 1; i <= N; i++) {
      gStruct.appendChild(el("line", {
        x1: cols[0] + u[i], y1: floorY(i), x2: cols[2] + u[i], y2: floorY(i), class: "m-diaph",
      }));
    }

    // braces (chevron) for braced frame
    if (state.system === "braced") {
      for (let i = 0; i < N; i++) {
        [[cols[0], cols[1]], [cols[1], cols[2]]].forEach(([a, b]) => {
          const mid = (a + b) / 2;
          gStruct.appendChild(el("line", { x1: a + u[i], y1: floorY(i), x2: mid + u[i + 1], y2: floorY(i + 1), class: "m-brace" }));
          gStruct.appendChild(el("line", { x1: b + u[i], y1: floorY(i), x2: mid + u[i + 1], y2: floorY(i + 1), class: "m-brace" }));
        });
      }
    }

    // moment-connection joints (dots) for moment frame
    if (state.system === "moment") {
      for (let i = 1; i <= N; i++) [cols[0], cols[2]].forEach((x) =>
        gStruct.appendChild(el("circle", { cx: x + u[i], cy: floorY(i), r: 4.5, class: "m-joint" })));
    }

    // nodes
    for (let i = 0; i <= N; i++) cols.forEach((x) =>
      gStruct.appendChild(el("circle", { cx: x + u[i], cy: floorY(i), r: 2.6, class: "m-node" })));

    // ---- seismic story forces (ELF, inverted triangle) ----
    let sumW = 0; for (let i = 1; i <= N; i++) sumW += i;
    for (let i = 1; i <= N; i++) {
      const L = 26 + 64 * (i / N) * state.intensity;          // arrow length ∝ Fx
      const y = floorY(i), xh = cols[0] + u[i] - 6, xt = xh - L;
      gForce.appendChild(el("line", { x1: xt, y1: y, x2: xh, y2: y, class: "m-load", "marker-end": "url(#ah)" }));
    }
    // base shear
    const Lv = 40 + 90 * state.intensity;
    gForce.appendChild(el("line", { x1: cols[0] - 12 - Lv, y1: baseY, x2: cols[0] - 12, y2: baseY, class: "m-load m-load-base", "marker-end": "url(#ahb)" }));

    // ---- annotations ----
    const anno = (x, y, text, lx, ly, cls) => {
      if (lx != null) gAnno.appendChild(el("line", { x1: lx, y1: ly, x2: x, y2: y, class: "m-lead" }));
      const t = el("text", { x, y, class: "m-anno " + (cls || "") });
      t.textContent = text;
      gAnno.appendChild(t);
    };
    // story forces label
    anno(58, roofY - 26, "Seismic story forces", null);
    anno(58, roofY - 14, "ASCE 7 · ELF", null, null, "m-anno-sub");
    // base shear
    anno(cols[0] - 16 - Lv, baseY + 26, "Base shear, V", null);
    // diaphragm (point to 3rd floor beam)
    const dY = floorY(3);
    anno(452, dY - 6, "Rigid diaphragm", cols[2] + u[3] + 4, dY);
    // LFRS label
    const sy = floorY(2);
    anno(452, sy + 10, SYS[state.system].name, (state.system === "wall" ? wallBay[1] : cols[2]) + u[2] + 6, sy);
    anno(452, sy + 22, SYS[state.system].note, null, null, "m-anno-sub");
    // foundation
    anno(300, baseY + 64, "Fixed base · spread footings", null, null, "m-anno-sub m-anno-mid");
    // roof drift dimension
    const xr0 = cols[2], xr1 = cols[2] + u[N], yd = roofY - 30;
    if (u[N] > 4) {
      gAnno.appendChild(el("line", { x1: xr0, y1: yd, x2: xr1, y2: yd, class: "m-dim", "marker-start": "url(#ah)", "marker-end": "url(#ah)" }));
      gAnno.appendChild(el("line", { x1: xr0, y1: yd - 5, x2: xr0, y2: yd + 5, class: "m-dim-tick" }));
      gAnno.appendChild(el("line", { x1: xr1, y1: yd - 5, x2: xr1, y2: yd + 5, class: "m-dim-tick" }));
      anno((xr0 + xr1) / 2, yd - 8, "Δ drift", null, null, "m-anno-mid");
    }
  }

  // ---- readouts ----
  const rV = document.getElementById("ro-shear");
  const rD = document.getElementById("ro-drift");
  const rR = document.getElementById("ro-ratio");
  function updateReadout() {
    const k = SYS[state.system].k;
    const A = (MAXA * state.intensity) / k;
    const driftIn = A * 0.17;
    const ratio = (driftIn / Hin) * 100;
    const V = Math.round(150 + 560 * state.intensity);
    if (rV) rV.textContent = V + " k";
    if (rD) rD.textContent = driftIn.toFixed(1) + " in";
    if (rR) {
      rR.textContent = ratio.toFixed(2) + " %";
      rR.classList.toggle("over", ratio > 2.0); // ASCE 7 allowable ≈ 2%
    }
  }

  // ---- animation ----
  let raf = null, t0 = null, shakeStart = -1e9;
  const steadyA = () => (MAXA * state.intensity) / SYS[state.system].k;

  function frame(ts) {
    if (t0 == null) t0 = ts;
    const t = (ts - t0) / 1000;
    const idle = Math.sin(t * 1.1) * 2.4 * state.intensity;     // subtle breathing
    let quake = 0;
    const td = (ts - shakeStart) / 1000;
    if (td < 4.2) {
      quake = steadyA() * 1.15 * Math.sin(2 * Math.PI * 1.6 * td) * Math.exp(-td / 1.1);
    }
    draw(steadyA() + idle + quake);
    raf = requestAnimationFrame(frame);
  }

  function startLoop() { if (!raf && !reduce) raf = requestAnimationFrame(frame); }

  // ---- controls ----
  document.querySelectorAll("[data-sys]").forEach((b) => {
    b.addEventListener("click", () => {
      state.system = b.dataset.sys;
      document.querySelectorAll("[data-sys]").forEach((x) => x.classList.toggle("active", x === b));
      updateReadout();
      if (reduce) draw(steadyA());
    });
  });
  const slider = document.getElementById("m-intensity");
  if (slider) slider.addEventListener("input", () => {
    state.intensity = slider.value / 100;
    updateReadout();
    if (reduce) draw(steadyA());
  });
  const shakeBtn = document.getElementById("m-shake");
  if (shakeBtn) shakeBtn.addEventListener("click", () => {
    if (reduce) return;
    shakeStart = performance.now();
    shakeBtn.classList.add("firing");
    setTimeout(() => shakeBtn.classList.remove("firing"), 4200);
  });

  // init
  document.querySelectorAll("[data-sys]").forEach((x) => x.classList.toggle("active", x.dataset.sys === state.system));
  updateReadout();
  draw(steadyA());
  startLoop();
})();
