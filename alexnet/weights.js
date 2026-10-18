/* 6c: weight space in 3D. Every point is one possible set of three weights. Each training example is a flat wall through the origin;
   the weights that get every example right fill a cone where all the right-hand sides overlap. Needs Three.js. */
(function () {
  "use strict";
  const AX = window.AX, T = window.THREE, $ = AX && AX.$, h = AX && AX.h, fig = $ && $("axWeights");
  if (!fig || !T) return;
  const INK = 0x0a0a0a, GREEN = 0x0f5a44, RED = 0xc0392b;
  const X = [
    { v: new T.Vector3(1, 0.35, 0.25), want: 1, col: 0x3a55d6, name: "Input A" },
    { v: new T.Vector3(-0.35, 1, 0.45), want: 0, col: 0xe08a1a, name: "Input B" },
    { v: new T.Vector3(0.2, -0.4, 1), want: 1, col: 0x8a3ab9, name: "Input C" }
  ];
  const right = (p, x) => (p.dot(x.v) > 0) === (x.want === 1);
  let w = new T.Vector3(-0.8, -0.2, 0.7), steps = 0;

  const cv = h("canvas", { "aria-label": "A 3D weight space. The green cone is the set of weights that get every example right." });
  const sl = [0, 1, 2].map((i) => h("input", { type: "range", min: -1.2, max: 1.2, step: 0.01, value: [w.x, w.y, w.z][i], "aria-label": "Weight " + (i + 1), oninput: () => { w.set(+sl[0].value, +sl[1].value, +sl[2].value); sync(); } }));
  const rows = X.map(() => h("p.wsr"));
  const say = h("p.ax-say.lead", { "aria-live": "polite" });
  const stepB = h("button.ax-btn", { type: "button", onclick: step }, "Fix one mistake");
  const randB = h("button.ax-btn.ghost", { type: "button", onclick: () => { w.set((Math.random() * 2 - 1) * 1.1, (Math.random() * 2 - 1) * 1.1, (Math.random() * 2 - 1) * 1.1); steps = 0; sync(); } }, "Random weights");
  const coneB = h("button.ax-chip", { type: "button", "aria-pressed": "true", onclick: () => { showCone = !showCone; coneB.setAttribute("aria-pressed", String(showCone)); coneG.visible = showCone; } }, "Show the cone");
  fig.append(h("div.ws",
    h("div.ws-stage", cv, h("div.ws-key", h("span.k.g", "good weights"), h("span.k.r", "bad weights"), h("span.k.c", "cone of feasible solutions"), h("span.k.d", "drag to turn"))),
    h("div.ws-side",
      h("p.ax-label", "The weights (a point in this space)"),
      ...["w₁", "w₂", "w₃"].map((n, i) => h("label.ax-slide", h("span", n), sl[i])),
      h("p.ax-label.gap", "How each example scores"), ...rows, say,
      h("div.ax-row", stepB, randB, coneB))));
  fig.append(h("figcaption.ax-cap", h("b", "Try it. "), "Each coloured wall belongs to one training example. An input whose correct answer is 1 wants weights on its positive side; one whose answer is 0 wants the other side. Where all three right-hand sides overlap is a cone with its tip at the origin, drawn in green: any weights inside it get every example right. Press Fix one mistake and the arrow steps toward the cone (add the input if the answer should have been 1, subtract it if 0). Real networks do this in millions of dimensions; three is the closest picture we can draw."));

  const R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const S = new T.Scene(), cam = new T.PerspectiveCamera(38, 1, 0.1, 50);
  S.add(new T.AmbientLight(0xffffff, 1));
  const grp = new T.Group(); S.add(grp);
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((a) => grp.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-a[0], -a[1], -a[2]).multiplyScalar(1.6), new T.Vector3(a[0], a[1], a[2]).multiplyScalar(1.6)]), new T.LineBasicMaterial({ color: 0x9aa7a1, transparent: true, opacity: 0.55 }))));
  grp.add(new T.Mesh(new T.SphereGeometry(0.05, 16, 16), new T.MeshBasicMaterial({ color: INK })));
  X.forEach((x) => {
    const n = x.v.clone().normalize(), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), n);
    const pl = new T.Mesh(new T.CircleGeometry(1.55, 48), new T.MeshBasicMaterial({ color: x.col, transparent: true, opacity: 0.07, side: T.DoubleSide, depthWrite: false })); pl.quaternion.copy(q); grp.add(pl);
    const ring = new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({ length: 65 }, (_, i) => new T.Vector3(Math.cos(i / 64 * 6.2832) * 1.55, Math.sin(i / 64 * 6.2832) * 1.55, 0))), new T.LineBasicMaterial({ color: x.col })); ring.quaternion.copy(q); grp.add(ring);
    grp.add(new T.ArrowHelper(n, new T.Vector3(), 1.3, x.col, 0.2, 0.12));
  });
  // the cone: every direction that is right for all examples, as a patch on a sphere plus rays from the origin to its rim
  const LON = 96, LAT = 48, RAD = 1.55, dir = (i, j) => { const th = i / LON * 6.2832, ph = j / LAT * Math.PI; return new T.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)); };
  const ok = (i, j) => { const d = dir((i + LON) % LON, j); return X.every((x) => right(d, x)); };
  const tri = [], rim = [];
  for (let i = 0; i < LON; i++) for (let j = 0; j < LAT; j++) {
    if (!(ok(i, j) && ok(i + 1, j) && ok(i, j + 1) && ok(i + 1, j + 1))) continue;
    const a = dir(i, j).multiplyScalar(RAD), b = dir(i + 1, j).multiplyScalar(RAD), c = dir(i, j + 1).multiplyScalar(RAD), d = dir(i + 1, j + 1).multiplyScalar(RAD);
    tri.push(a, b, c, b, d, c);
    if (!(ok(i - 1, j) && ok(i + 2, j) && ok(i, j - 1) && ok(i, j + 2))) rim.push(a);
  }
  const coneG = new T.Group(); grp.add(coneG);
  const cg = new T.BufferGeometry().setFromPoints(tri); coneG.add(new T.Mesh(cg, new T.MeshBasicMaterial({ color: 0x0f8a5f, transparent: true, opacity: 0.34, side: T.DoubleSide, depthWrite: false })));
  const rays = []; rim.forEach((p, i) => { if (i % 4 === 0) rays.push(new T.Vector3(), p); });
  coneG.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(rays), new T.LineBasicMaterial({ color: 0x0f8a5f, transparent: true, opacity: 0.55 })));
  // rim outline: connect rim points by angle around the cone axis
  if (rim.length > 2) { const ax = rim.reduce((s, p) => s.add(p), new T.Vector3()).normalize(), u = new T.Vector3(0, 1, 0).cross(ax).normalize(), v = ax.clone().cross(u); const srt = rim.slice().sort((p, q) => Math.atan2(p.dot(v), p.dot(u)) - Math.atan2(q.dot(v), q.dot(u))); coneG.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(srt), new T.LineBasicMaterial({ color: 0x0f5a44 }))); }
  let showCone = true;
  // candidate weights as dots
  const N = 700, pos = new Float32Array(N * 3), col = new Float32Array(N * 3); let sd = 5; const rnd = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
  for (let i = 0; i < N; i++) { let p; do { p = new T.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1); } while (p.length() > 1); p.multiplyScalar(1.3); const g = X.every((x) => right(p, x)), c = new T.Color(g ? 0x0f8a5f : 0xc4cec9); pos.set([p.x, p.y, p.z], i * 3); col.set([c.r, c.g, c.b], i * 3); }
  const pg = new T.BufferGeometry(); pg.setAttribute("position", new T.BufferAttribute(pos, 3)); pg.setAttribute("color", new T.BufferAttribute(col, 3));
  grp.add(new T.Points(pg, new T.PointsMaterial({ size: 0.04, vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false })));
  const arrow = new T.ArrowHelper(new T.Vector3(1, 0, 0), new T.Vector3(), 1, GREEN, 0.22, 0.14); grp.add(arrow);
  const tip = new T.Mesh(new T.SphereGeometry(0.075, 16, 16), new T.MeshBasicMaterial({ color: GREEN })); grp.add(tip);

  let yaw = 0.7, pitch = 0.32, dist = 4.8, drag = false, lx = 0, ly = 0, spin = true, vis = false, W = 0;
  function layout() { const r = cv.getBoundingClientRect(); W = r.width; R.setSize(r.width, r.height, false); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); }
  function place() { cam.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist); cam.lookAt(0, 0, 0); }
  function sync() {
    const len = Math.max(0.001, w.length()), good = X.map((x) => right(w, x)), all = good.every(Boolean), c = all ? GREEN : RED, nw = good.filter((v) => !v).length;
    arrow.setDirection(w.clone().normalize()); arrow.setLength(Math.max(0.3, Math.min(1.6, len)), 0.22, 0.14); arrow.setColor(c); tip.position.copy(w); tip.material.color.setHex(c);
    X.forEach((x, i) => { const s = w.dot(x.v); rows[i].innerHTML = "<i style='background:#" + x.col.toString(16).padStart(6, "0") + "'></i><span>" + x.name + " (answer " + x.want + ")</span><b>" + (s >= 0 ? "+" : "−") + Math.abs(s).toFixed(2) + "</b><em class='" + (good[i] ? "y" : "n") + "'>" + (good[i] ? "right" : "wrong") + "</em>"; });
    say.innerHTML = all ? "<b>Inside the cone.</b> Every example is right." + (steps ? " It took " + steps + " step" + (steps > 1 ? "s" : "") + "." : "") : "<b>" + nw + " of 3 wrong.</b> The arrow is outside the cone.";
    stepB.disabled = all; sl[0].value = w.x; sl[1].value = w.y; sl[2].value = w.z;
  }
  function step() { const i = X.findIndex((x) => !right(w, x)); if (i < 0) return; w.addScaledVector(X[i].v, (X[i].want ? 1 : -1) * 0.7); w.clampLength(0, 1.55); steps++; sync(); }
  cv.addEventListener("pointerdown", (e) => { drag = true; spin = false; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", (e) => { if (!drag) return; yaw -= (e.clientX - lx) * 0.008; pitch = Math.max(-1.2, Math.min(1.2, pitch + (e.clientY - ly) * 0.008)); lx = e.clientX; ly = e.clientY; });
  cv.addEventListener("pointerup", () => { drag = false; });
  new IntersectionObserver((es) => { vis = es[0].isIntersecting; }).observe(fig);
  addEventListener("resize", layout);
  layout(); sync();
  (function loop() { requestAnimationFrame(loop); if (!vis) return; if (!W) layout(); if (spin && !AX.reduceMotion) yaw += 0.003; place(); R.render(S, cam); })();
})();
