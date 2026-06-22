/* Interactive simply-supported beam — live shear, moment & deflection. */
(function () {
  const svg = document.getElementById("beam");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";

  // ---- model params ----
  const P = 12, L = 24;          // kips, feet
  let a = 9;                      // load position (ft from A)
  const aMin = 1, aMax = L - 1;

  // ---- geometry (viewBox 880 x 540) ----
  const x0 = 90, x1 = 800, span = x1 - x0;
  const yBeam = 110, ySh = 272, yMo = 410;
  const sScale = 5.2;             // px per kip (shear)
  const mScale = 1.32;            // px per kip-ft (moment)
  const ft2px = (ft) => x0 + (ft / L) * span;

  const el = (t, at) => { const n = document.createElementNS(NS, t); for (const k in at) n.setAttribute(k, at[k]); return n; };
  const layer = (id) => { const g = el("g", { id }); svg.appendChild(g); return g; };

  const defs = el("defs", {});
  defs.innerHTML =
    '<marker id="bah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">' +
      '<path d="M0 0 L10 5 L0 10 z" class="b-load-fill"/></marker>';
  svg.appendChild(defs);

  const gStatic = layer("b-static");
  const gDyn = layer("b-dyn");

  // ---- static axes / labels ----
  (function staticLayer() {
    // section labels
    const lab = (x, y, t, cls) => { const e = el("text", { x, y, class: "b-axis " + (cls || "") }); e.textContent = t; gStatic.appendChild(e); };
    lab(x0, 32, "LOAD & DEFLECTION");
    lab(x0, ySh - 70, "SHEAR  V (k)");
    lab(x0, yMo - 40, "MOMENT  M (k·ft)");
    // shear & moment baselines
    gStatic.appendChild(el("line", { x1: x0, y1: ySh, x2: x1, y2: ySh, class: "b-base" }));
    gStatic.appendChild(el("line", { x1: x0, y1: yMo, x2: x1, y2: yMo, class: "b-base" }));
    // beam supports (pin + roller)
    gStatic.appendChild(el("path", { d: `M${x0 - 11} ${yBeam + 18} L${x0} ${yBeam} L${x0 + 11} ${yBeam + 18} Z`, class: "b-supp" }));
    gStatic.appendChild(el("path", { d: `M${x1 - 11} ${yBeam + 15} L${x1} ${yBeam} L${x1 + 11} ${yBeam + 15} Z`, class: "b-supp" }));
    gStatic.appendChild(el("circle", { cx: x1, cy: yBeam + 20, r: 4, class: "b-supp" }));
    [x0, x1].forEach((x) => gStatic.appendChild(el("line", { x1: x - 16, y1: yBeam + (x === x0 ? 18 : 24), x2: x + 16, y2: yBeam + (x === x0 ? 18 : 24), class: "b-ground" })));
    // undeformed beam (dashed)
    gStatic.appendChild(el("line", { x1: x0, y1: yBeam, x2: x1, y2: yBeam, class: "b-ghost" }));
  })();

  const clear = (g) => { while (g.firstChild) g.removeChild(g.firstChild); };

  // elastic curve (EI = 1), returns array of {x,y} normalized later
  function deflection(samples) {
    const b = L - a, EI = 1, pts = [];
    for (let i = 0; i <= samples; i++) {
      const x = (i / samples) * L;
      let y;
      if (x <= a) y = (P * b * x) * (L * L - b * b - x * x) / (6 * L * EI);
      else y = (P * b) / (6 * L * EI) * ((L / b) * Math.pow(x - a, 3) + (L * L - b * b) * x - x * x * x);
      pts.push({ x, y });
    }
    const max = Math.max(...pts.map((p) => Math.abs(p.y))) || 1;
    return pts.map((p) => ({ x: ft2px(p.x), y: yBeam + (p.y / max) * 34 }));
  }

  function draw() {
    clear(gDyn);
    const b = L - a;
    const RA = P * b / L, RB = P * a / L, Mmax = P * a * b / L;
    const fx = ft2px(a);

    // deflected beam
    const d = deflection(60);
    let path = `M${d[0].x} ${d[0].y}`;
    for (let i = 1; i < d.length; i++) path += ` L${d[i].x} ${d[i].y}`;
    gDyn.appendChild(el("path", { d: path, class: "b-beam" }));

    // load arrow + handle
    gDyn.appendChild(el("line", { x1: fx, y1: yBeam - 56, x2: fx, y2: yBeam - 4, class: "b-load", "marker-end": "url(#bah)" }));
    const pl = el("text", { x: fx, y: yBeam - 64, class: "b-load-lab" }); pl.textContent = "P = 12 k"; gDyn.appendChild(pl);
    gDyn.appendChild(el("circle", { cx: fx, cy: yBeam - 30, r: 16, class: "b-handle" }));

    // ---- shear diagram (step) ----
    const shPts = `${x0},${ySh} ${x0},${ySh - RA * sScale} ${fx},${ySh - RA * sScale} ${fx},${ySh + RB * sScale} ${x1},${ySh + RB * sScale} ${x1},${ySh}`;
    gDyn.appendChild(el("polygon", { points: shPts, class: "b-fill-sh" }));
    gDyn.appendChild(el("polyline", { points: `${x0},${ySh - RA * sScale} ${fx},${ySh - RA * sScale} ${fx},${ySh + RB * sScale} ${x1},${ySh + RB * sScale}`, class: "b-line" }));
    const shLab = (x, y, t, anchor) => { const e = el("text", { x, y, class: "b-val", "text-anchor": anchor || "middle" }); e.textContent = t; gDyn.appendChild(e); };
    shLab((x0 + fx) / 2, ySh - RA * sScale - 6, "+" + RA.toFixed(1));
    shLab((fx + x1) / 2, ySh + RB * sScale + 14, "−" + RB.toFixed(1));

    // ---- moment diagram (triangle, plotted on tension side / downward) ----
    gDyn.appendChild(el("polygon", { points: `${x0},${yMo} ${fx},${yMo + Mmax * mScale} ${x1},${yMo}`, class: "b-fill-mo" }));
    gDyn.appendChild(el("polyline", { points: `${x0},${yMo} ${fx},${yMo + Mmax * mScale} ${x1},${yMo}`, class: "b-line-mo" }));
    shLab(fx, yMo + Mmax * mScale + 16, "M=" + Mmax.toFixed(1));

    // vertical guide at load
    gDyn.appendChild(el("line", { x1: fx, y1: yBeam + 26, x2: fx, y2: yMo + Mmax * mScale, class: "b-guide" }));

    // readout
    set("b-a", a.toFixed(1) + " ft");
    set("b-ra", RA.toFixed(1) + " k");
    set("b-rb", RB.toFixed(1) + " k");
    set("b-mmax", Mmax.toFixed(1) + " k·ft");
  }
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };

  // ---- drag interaction ----
  let dragging = false;
  const ptToFt = (clientX) => {
    const r = svg.getBoundingClientRect();
    const vx = ((clientX - r.left) / r.width) * 880;
    return Math.max(aMin, Math.min(aMax, ((vx - x0) / span) * L));
  };
  const start = (e) => { dragging = true; a = ptToFt(e.clientX); draw(); svg.setPointerCapture?.(e.pointerId); e.preventDefault(); };
  const move = (e) => { if (!dragging) return; a = ptToFt(e.clientX); draw(); };
  const end = () => { dragging = false; };
  svg.addEventListener("pointerdown", start);
  svg.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  svg.style.touchAction = "none";
  svg.style.cursor = "ew-resize";

  draw();
})();
