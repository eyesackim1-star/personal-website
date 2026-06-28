/* Interactive 3D structural models — SE 140A steel & SE 140B concrete.
   Geometry parametrized from the capstone reports. Three.js bundled locally. */
import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";

const mount = document.getElementById("model-canvas");
if (mount) init();

function init() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- palette (matches the site) ----
  const C = {
    paper: 0xf3f2ee,
    col:   0x3a4a63,   // steel columns / concrete columns
    beam:  0x7c899e,   // beams & girders
    slab:  0xcfcabd,   // floor slabs
    accent:0x1f3fd6,   // lateral system (BRBF / core wall)
    load:  0xe0532a,   // connections / highlights
    found: 0x8a8d96,   // foundation / retaining wall
  };

  // ---- renderer / scene / camera ----
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(C.paper, 1);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 1, 6000);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 60;
  controls.maxDistance = 900;
  controls.maxPolarAngle = Math.PI * 0.5; // don't go under the ground
  controls.autoRotate = !reduce;
  controls.autoRotateSpeed = 0.6;

  // ---- lights ----
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a958b, 1.05));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(1, 1.6, 0.8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-0.8, 0.4, -1);
  scene.add(fill);

  // ---- materials ----
  const mat = (hex, opacity = 1) =>
    new THREE.MeshStandardMaterial({
      color: hex, roughness: 0.72, metalness: 0.05,
      transparent: opacity < 1, opacity,
    });

  // ---- geometry helpers ----
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const UP = new THREE.Vector3(0, 1, 0);

  // a member spanning two points (for diagonal braces)
  function strut(group, material, p1, p2, t) {
    const a = new THREE.Vector3(...p1), b = new THREE.Vector3(...p2);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const m = new THREE.Mesh(box(t, len, t), material);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
    group.add(m);
  }
  // axis-aligned member centered at (x,y,z)
  function bar(group, material, x, y, z, w, h, d, edges = false) {
    const m = new THREE.Mesh(box(w, h, d), material);
    m.position.set(x, y, z);
    group.add(m);
    if (edges) {
      const e = new THREE.LineSegments(
        new THREE.EdgesGeometry(m.geometry),
        new THREE.LineBasicMaterial({ color: 0x15161a, transparent: true, opacity: 0.18 })
      );
      e.position.copy(m.position);
      group.add(e);
    }
    return m;
  }

  // a named, toggleable layer (a THREE.Group)
  function layer(parent, name) {
    const g = new THREE.Group();
    g.name = name;
    parent.add(g);
    return g;
  }

  // =================================================================
  //  STEEL BUILDING — SE 140A
  //  8 stories @ 15 ft; 6×4 bays @ 35 ft (7×5 grid); BRBF in E-W dir.
  // =================================================================
  function buildSteel() {
    const root = new THREE.Group();
    const BAY = 35, NX = 6, NZ = 4, H = 15, N = 8;
    const W = BAY * NX, D = BAY * NZ;
    const xs = Array.from({ length: NX + 1 }, (_, i) => i * BAY);
    const zs = Array.from({ length: NZ + 1 }, (_, j) => j * BAY);
    const lvl = (k) => k * H;                    // k = 0 ground .. 8 roof

    // grid: letters A–G (E-W, xs, 6 bays) × numbers 1–5 (N-S, zs, 4 bays)
    const frame = layer(root, "frame");
    const floors = layer(root, "floors");
    const brbf = layer(root, "brbf");
    const smf = layer(root, "smf");

    const mCol = mat(C.col), mBeam = mat(C.beam), mSlab = mat(C.slab, 0.5),
          mBr = mat(C.accent), mGus = mat(C.load), mSmf = mat(C.load), mMom = mat(0x15161a);
    const OH = 1; // 1 ft composite-slab overhang past exterior columns

    // gravity columns (full height) at every grid intersection
    for (const x of xs) for (const z of zs)
      bar(frame, mCol, x, lvl(N) / 2, z, 1.4, lvl(N), 1.4);

    // floor framing + slab each level (N-S girders on Lines A & G belong to the SMF)
    for (let k = 1; k <= N; k++) {
      const y = lvl(k);
      for (const z of zs) bar(frame, mBeam, W / 2, y, z, W, 1.3, 0.7);                    // E-W beams
      for (const x of xs)
        if (x !== xs[0] && x !== xs[NX]) bar(frame, mBeam, x, y, D / 2, 0.7, 1.3, D);     // interior N-S girders
      bar(floors, mSlab, W / 2, y + 0.9, D / 2, W + 2 * OH, 0.5, D + 2 * OH, true);       // slab (1 ft overhang)
    }

    // BRBF (E-W) — chevrons on Column Lines 1 & 5, in bays B-C and E-F, all stories
    const braceBays = [1, 4]; // B-C and E-F
    for (const z of [zs[0], zs[NZ]]) {
      for (let k = 0; k < N; k++) {
        const yb = lvl(k), yt = lvl(k + 1);
        for (const b of braceBays) {
          const x0 = xs[b], x1 = xs[b + 1], xm = (x0 + x1) / 2;
          strut(brbf, mBr, [x0, yb, z], [xm, yt, z], 1.1);
          strut(brbf, mBr, [x1, yb, z], [xm, yt, z], 1.1);
          for (const p of [[x0, yb, z], [x1, yb, z], [xm, yt, z]]) { // gusset nodes
            const n = new THREE.Mesh(new THREE.SphereGeometry(1.4, 14, 12), mGus);
            n.position.set(...p); brbf.add(n);
          }
        }
      }
    }

    // SMF (N-S) — special moment frames on Column Lines A & G, all 4 bays, full height
    for (const x of [xs[0], xs[NX]]) {
      for (let k = 1; k <= N; k++) {
        const y = lvl(k);
        bar(smf, mSmf, x, y, D / 2, 1.0, 1.6, D);            // moment-frame girder (all 4 bays)
        for (const z of zs) {                                // rigid (moment) connection markers
          const m = new THREE.Mesh(box(2, 2, 2), mMom);
          m.position.set(x, y, z); smf.add(m);
        }
      }
    }

    root.position.set(-W / 2, 0, -D / 2); // center in plan
    root.userData = { height: lvl(N), span: Math.max(W, D) };
    return root;
  }

  // =================================================================
  //  CONCRETE BUILDING — SE 140B
  //  8 stories (18 ft podium + 7 @ 12.5 ft). Plan grid A–F × 1–8:
  //  E-W bays 32/30/30/30/32 ft, N-S bays 7 @ 30 ft. Two-way RC slab (8")
  //  on 24×36 girders; 30×30 columns; central special RC core wall (28");
  //  cantilever retaining wall + combined footing at Grid F / 7–8.
  // =================================================================
  function buildConcrete() {
    const root = new THREE.Group();
    const xs = [0, 32, 62, 92, 122, 154];                 // grids A..F
    const zs = [0, 30, 60, 90, 120, 150, 180, 210];        // grids 1..8
    const W = xs[xs.length - 1], D = zs[zs.length - 1];
    // story elevations: ground 0, podium 18, then +12.5 (8 levels above grade)
    const ys = [0];
    for (let k = 1; k <= 8; k++) ys.push(ys[k - 1] + (k === 1 ? 18 : 12.5));
    const top = ys[8];

    const cols = layer(root, "columns");
    const floors = layer(root, "floors");   // girders + two-way slabs
    const core = layer(root, "core");
    const found = layer(root, "foundation");

    const mCol = mat(C.col), mBeam = mat(C.beam), mSlab = mat(C.slab, 0.5),
          mCore = mat(C.accent, 0.92), mFound = mat(C.found), mRw = mat(C.load);
    const CS = 2.5;          // 30 in column
    const GW = 2, GH = 3;    // 24×36 in girder
    const OH = 7;            // 7'-0" slab overhang past columns (all sides)
    const T = 2.33;          // 28 in core wall

    // grid index helpers: A=0..F=5 ; row 1=0..row 8=7
    const X = (g) => xs[g], Z = (r) => zs[r - 1];

    // special RC shear walls.  Inner core (rows 2-3 & 6-7) + perimeter walls.
    const WALLS = [
      { x: X(1), z0: Z(2), z1: Z(3), dir: "ns" }, // B23
      { x: X(1), z0: Z(6), z1: Z(7), dir: "ns" }, // B67
      { x: X(4), z0: Z(2), z1: Z(3), dir: "ns" }, // E23
      { x: X(4), z0: Z(6), z1: Z(7), dir: "ns" }, // E67
      { z: Z(2), x0: X(2), x1: X(3), dir: "ew" }, // 2CD
      { z: Z(3), x0: X(2), x1: X(3), dir: "ew" }, // 3CD
      { z: Z(6), x0: X(2), x1: X(3), dir: "ew" }, // 6CD
      { z: Z(7), x0: X(2), x1: X(3), dir: "ew" }, // 7CD
      // perimeter shear walls (orange) — Grids A & F corners + rows 1 & 8 center
      { x: X(0), z0: Z(1), z1: Z(2), dir: "ns" }, // A12
      { x: X(0), z0: Z(7), z1: Z(8), dir: "ns" }, // A78
      { x: X(5), z0: Z(1), z1: Z(2), dir: "ns" }, // F12
      { x: X(5), z0: Z(7), z1: Z(8), dir: "ns" }, // F78
      { z: Z(1), x0: X(2), x1: X(3), dir: "ew" }, // 1CD
      { z: Z(8), x0: X(2), x1: X(3), dir: "ew" }, // 8CD
    ];
    // grid points occupied by a wall end → skip the column there (i=col, j=row index)
    const skip = new Set([
      "1,1","1,2","1,5","1,6", // B23, B67
      "4,1","4,2","4,5","4,6", // E23, E67
      "2,1","3,1","2,2","3,2", // 2CD, 3CD
      "2,5","3,5","2,6","3,6", // 6CD, 7CD
      "0,0","0,1","0,6","0,7", // A12, A78
      "5,0","5,1","5,6","5,7", // F12, F78
      "2,0","3,0","2,7","3,7", // 1CD, 8CD
    ]);

    // columns at every grid intersection (skip those embedded in a wall)
    for (let i = 0; i < xs.length; i++) for (let j = 0; j < zs.length; j++)
      if (!skip.has(`${i},${j}`)) bar(cols, mCol, xs[i], top / 2, zs[j], CS, top, CS);

    // floor framing — two-way girders on every grid line + 8" slab w/ overhang, each level
    for (let k = 1; k <= 8; k++) {
      const y = ys[k];
      for (const z of zs) bar(floors, mBeam, W / 2, y - 1.4, z, W, GH, GW); // E-W girders
      for (const x of xs) bar(floors, mBeam, x, y - 1.4, D / 2, GW, GH, D); // N-S girders
      bar(floors, mSlab, W / 2, y + 0.3, D / 2, W + 2 * OH, 0.67, D + 2 * OH, true);
    }

    // central special RC core wall system — 28" walls, full height
    for (const w of WALLS) {
      if (w.dir === "ns")
        bar(core, mCore, w.x, top / 2, (w.z0 + w.z1) / 2, T, top, w.z1 - w.z0, true);
      else
        bar(core, mCore, (w.x0 + w.x1) / 2, top / 2, w.z, w.x1 - w.x0, top, T, true);
    }

    // foundation — mat + cantilever retaining wall & combined footing at Grid F / 7–8
    bar(found, mFound, W / 2, -2, D / 2, W + 2 * OH + 4, 3, D + 2 * OH + 4, true); // mat
    const fzm = (Z(7) + Z(8)) / 2, fl = Z(8) - Z(7);                 // grids 7–8
    bar(found, mRw, W + OH, 6, fzm, 1.5, 12, fl, true);             // 12 ft cantilever wall, Grid F edge
    bar(found, mRw, W + OH, -0.5, fzm, 9, 3, fl + 6, true);         // combined footing F7–F8

    root.position.set(-W / 2, 0, -D / 2);
    root.userData = { height: top, span: Math.max(W, D) };
    return root;
  }

  // ---- model registry ----
  const MODELS = {
    steel: {
      group: buildSteel(),
      title: "SE 140A — 8-Story Steel Structure",
      desc: "Gravity columns and composite floors with a dual seismic system: buckling-restrained braced frames (BRBF) resisting east–west, and special moment frames (SMF) resisting north–south.",
      stats: [
        ["Stories", "8 @ 15 ft (120 ft)"],
        ["Plan", "212 × 142 ft · grids A–G × 1–5 @ 35 ft"],
        ["Floors", "Composite slab on 6¼″ metal deck (1 ft OH)"],
        ["Lateral", "BRBF E–W (lines 1 & 5) + SMF N–S (lines A & G)"],
      ],
      layers: [
        ["frame", "Gravity frame"],
        ["floors", "Composite floors"],
        ["brbf", "BRBF (E–W)"],
        ["smf", "SMF (N–S)"],
      ],
    },
    concrete: {
      group: buildConcrete(),
      title: "SE 140B — 8-Story Concrete Structure",
      desc: "Two-way RC slabs on 24×36″ girders and 30″ columns, braced by a central special reinforced-concrete core wall, with a cantilever retaining wall and combined footing at the Grid F edge.",
      stats: [
        ["Stories", "8 · 18 ft podium + 7 @ 12.5 ft (105.5 ft)"],
        ["Plan", "154 × 210 ft · grid A–F × 1–8"],
        ["Floors", "Two-way 8″ slab on 24×36″ girders"],
        ["Columns", "30 × 30 in"],
        ["Lateral", "Special RC core wall (28″, N-S & E-W)"],
      ],
      layers: [
        ["columns", "Columns"],
        ["floors", "Floor framing"],
        ["core", "Core wall"],
        ["foundation", "Retaining wall & footing"],
      ],
    },
  };

  // ---- view state & framing ----
  let current = null;

  function frameModel(m) {
    const { height, span } = m.group.userData;
    const dist = span * 1.7;
    camera.position.set(dist * 0.85, height * 0.95 + span * 0.2, dist * 0.85);
    controls.target.set(0, height * 0.42, 0);
    controls.update();
  }

  function showModel(key) {
    if (current) scene.remove(current.group);
    current = MODELS[key];
    scene.add(current.group);
    frameModel(current);
    // readout
    document.getElementById("model-title").textContent = current.title;
    document.getElementById("model-desc").textContent = current.desc;
    const dl = document.getElementById("model-stats");
    dl.innerHTML = current.stats
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join("");
    // layer chips
    const box = document.getElementById("model-layers");
    box.innerHTML = "";
    for (const [name, label] of current.layers) {
      const b = document.createElement("button");
      b.className = "layer-chip on";
      b.textContent = label;
      b.dataset.layer = name;
      b.addEventListener("click", () => {
        const grp = current.group.getObjectByName(name);
        const on = !b.classList.contains("on");
        b.classList.toggle("on", on);
        grp.visible = on;
      });
      box.appendChild(b);
    }
    // model switch active state
    document.querySelectorAll(".model-switch button").forEach((s) =>
      s.classList.toggle("active", s.dataset.model === key)
    );
  }

  // ---- model switch buttons (toolbar + deep-links from project cards) ----
  document.querySelectorAll(".model-switch button, .to-model").forEach((b) =>
    b.addEventListener("click", () => showModel(b.dataset.model))
  );
  // deep-link from project cards (e.g. #models=concrete)
  window.addEventListener("hashchange", routeHash);
  function routeHash() {
    const m = location.hash.match(/models=(steel|concrete)/);
    if (m) showModel(m[1]);
  }

  // ---- sizing ----
  function resize() {
    const w = mount.clientWidth, h = mount.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(mount);

  // ---- render loop (only when on screen) ----
  let visible = false;
  new IntersectionObserver(
    (en) => en.forEach((e) => (visible = e.isIntersecting)),
    { threshold: 0.05 }
  ).observe(mount);

  // stop auto-rotate once the user grabs it
  controls.addEventListener("start", () => (controls.autoRotate = false));

  function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    controls.update();
    renderer.render(scene, camera);
  }

  // ---- go ----
  const initial = (location.hash.match(/models=(steel|concrete)/) || [])[1] || "steel";
  showModel(initial);
  resize();
  loop();
}
