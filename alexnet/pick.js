/* 8c: where a finished vector lands on an axis, and how the nearest ones decide the answer.
   The points are generated for illustration (seeded), not AlexNet's real features. */
(function () {
  "use strict";
  const AX = window.AX, $ = AX.$, h = AX.h;
  const fig = $("axPick"); if (!fig) return;
  const CL = [
    { n: "Elephant", c: "#0f5a44", cx: 0.26, cy: 0.34, s: 0.075 },
    { n: "Car", c: "#d97a1c", cx: 0.74, cy: 0.3, s: 0.07 },
    { n: "Flower", c: "#c2417e", cx: 0.7, cy: 0.74, s: 0.065 },
    { n: "Dog", c: "#3a6fd1", cx: 0.24, cy: 0.74, s: 0.07 },
    { n: "Teapot", c: "#7a6a2c", cx: 0.5, cy: 0.52, s: 0.05 }
  ];
  let sd = 11; const rnd = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(6.2832 * rnd());
  const pts = []; CL.forEach((c, k) => { for (let i = 0; i < 26; i++) pts.push({ k, x: c.cx + gauss() * c.s, y: c.cy + gauss() * c.s * 1.1 }); });
  let q = { x: 0.3, y: 0.4 }, K = 5, drag = false, t0 = performance.now();

  const cv = h("canvas", { "aria-label": "A map of image vectors. Drag the white point to a new place and see which neighbours it picks." });
  const kSl = h("input", { type: "range", min: 1, max: 9, step: 2, value: K, "aria-label": "How many neighbours vote", oninput: (e) => { K = +e.target.value; draw(); } });
  const kVal = h("b", String(K));
  const presets = [["An elephant photo", { x: 0.28, y: 0.36 }], ["A car photo", { x: 0.74, y: 0.3 }], ["Between two groups", { x: 0.72, y: 0.52 }]]
    .map(([l, p]) => h("button.ax-chip", { type: "button", onclick: () => { glide(p); } }, l));
  const verdict = h("p.pk-verdict", { "aria-live": "polite" }), votes = h("div.pk-votes"), vec = h("div.pk-vec");
  fig.append(h("div.pk",
    h("div.pk-stage", cv, h("span.pk-ax.x", "feature A  →"), h("span.pk-ax.y", "feature B  →")),
    h("div.pk-side",
      h("p.ax-label", "The new image’s vector"), vec,
      h("p.ax-label.gap", "Its nearest neighbours vote"), votes, verdict,
      h("label.ax-slide", h("span", "Neighbours that vote"), kVal, kSl),
      h("p.ax-label.gap", "Move the point to:"), h("div.ax-chips", presets))));
  fig.append(h("figcaption.ax-cap", h("b", "Try it. "), "Drag the white point anywhere. The closest points get a vote, and the biggest group wins. Near the middle of a cluster the answer is easy; between two clusters it is a close call. The real vector has 4,096 numbers and cannot be drawn, so this shows two of them, with made-up points to illustrate. The paper itself used this nearest-neighbour idea to show similar images, and a final softmax layer to name the class."));

  const ctx = cv.getContext("2d");
  const size = () => { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); ctx.setTransform(d, 0, 0, d, 0, 0); return [r.width, r.height]; };
  let W = 0, H = 0;
  const near = () => pts.map((p) => ({ p, d: Math.hypot(p.x - q.x, p.y - q.y) })).sort((a, b) => a.d - b.d).slice(0, K);
  function draw() {
    if (!W) [W, H] = size();
    const t = (performance.now() - t0) / 1000, X = (v) => 36 + v * (W - 52), Y = (v) => 16 + v * (H - 52);
    ctx.clearRect(0, 0, W, H);
    // paper, soft grid, axes
    ctx.fillStyle = "#f6f8f7"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(15,90,68,.09)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(X(i / 10), 16); ctx.lineTo(X(i / 10), H - 36); ctx.stroke(); ctx.beginPath(); ctx.moveTo(36, Y(i / 10)); ctx.lineTo(W - 16, Y(i / 10)); ctx.stroke(); }
    ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(36, 16); ctx.lineTo(36, H - 36); ctx.lineTo(W - 16, H - 36); ctx.stroke();
    // class clouds
    CL.forEach((c) => { const g = ctx.createRadialGradient(X(c.cx), Y(c.cy), 0, X(c.cx), Y(c.cy), c.s * (W - 52) * 3.1); g.addColorStop(0, c.c + "30"); g.addColorStop(1, c.c + "00"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X(c.cx), Y(c.cy), c.s * (W - 52) * 3.1, 0, 6.2832); ctx.fill();
      ctx.fillStyle = c.c; ctx.font = "700 13px 'Libre Franklin', sans-serif"; ctx.textAlign = "center"; ctx.fillText(c.n, X(c.cx), Y(c.cy) - c.s * (H - 52) * 3.4); });
    const nb = near(), set = new Set(nb.map((n) => n.p)), reach = nb[nb.length - 1].d;
    // reach ring
    ctx.setLineDash([5, 6]); ctx.lineDashOffset = -t * 14; ctx.strokeStyle = "rgba(10,10,10,.55)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(X(q.x), Y(q.y), reach * (W - 52), reach * (H - 52), 0, 0, 6.2832); ctx.stroke();
    // lines to neighbours
    nb.forEach((n) => { ctx.strokeStyle = CL[n.p.k].c; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X(q.x), Y(q.y)); ctx.lineTo(X(n.p.x), Y(n.p.y)); ctx.stroke(); });
    ctx.setLineDash([]);
    // points
    pts.forEach((p) => { const on = set.has(p); ctx.fillStyle = CL[p.k].c; ctx.globalAlpha = on ? 1 : 0.55; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), on ? 5.4 : 3.6, 0, 6.2832); ctx.fill(); if (on) { ctx.globalAlpha = 1; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.6; ctx.stroke(); } });
    ctx.globalAlpha = 1;
    // the query, with a pulse
    const pr = 11 + 5 * Math.sin(t * 3); ctx.fillStyle = "rgba(10,10,10,.12)"; ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), pr + 6, 0, 6.2832); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), 9, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#0a0a0a"; ctx.font = "700 12px 'Libre Franklin', sans-serif"; ctx.textAlign = "left"; ctx.fillText("new image", X(q.x) + 16, Y(q.y) + 4);
    // text side
    const tally = CL.map((c, k) => nb.filter((n) => n.p.k === k).length), best = tally.indexOf(Math.max(...tally)), sorted = tally.slice().sort((a, b) => b - a);
    votes.innerHTML = ""; CL.map((c, k) => [c, k]).filter(([c, k]) => tally[k] > 0).sort((a, b) => tally[b[1]] - tally[a[1]]).forEach(([c, k]) => votes.append(h("div.pk-vote", h("span", c.n), h("i", { style: "width:" + (tally[k] / K * 100) + "%;background:" + c.c }), h("em", tally[k] + " of " + K))));
    const tie = sorted[0] === sorted[1];
    verdict.innerHTML = tie ? "<b>Too close to call.</b> The neighbours split between groups. A real system would say it is unsure." : "It says <b style='color:" + CL[best].c + "'>" + CL[best].n + "</b>" + (tally[best] === K ? ", and every neighbour agrees." : ", by " + tally[best] + " votes to " + (K - tally[best]) + ".");
    vec.innerHTML = ""; const nums = [q.x, q.y, 1 - q.x * 0.6, q.y * 0.8 + 0.1, 0.5 + 0.4 * Math.sin(q.x * 9), 0.5 + 0.4 * Math.cos(q.y * 9)];
    vec.append(h("div.pk-cells", nums.map((v) => h("i", { style: "background:rgba(15,90,68," + (0.12 + v * 0.88).toFixed(2) + ")" }))), h("p.pk-note", "[ " + nums.slice(0, 2).map((v) => v.toFixed(2)).join(", ") + ", … 4,094 more ]  →  plotted at (" + q.x.toFixed(2) + ", " + q.y.toFixed(2) + ")"));
    kVal.textContent = String(K);
  }
  function at(e) { const r = cv.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (e.clientX - r.left - 36) / (r.width - 52))), y: Math.min(1, Math.max(0, (e.clientY - r.top - 16) / (r.height - 52))) }; }
  cv.addEventListener("pointerdown", (e) => { drag = true; cv.setPointerCapture(e.pointerId); q = at(e); draw(); });
  cv.addEventListener("pointermove", (e) => { if (drag) { q = at(e); draw(); } });
  cv.addEventListener("pointerup", () => { drag = false; });
  cv.addEventListener("keydown", (e) => { const d = { ArrowLeft: [-0.03, 0], ArrowRight: [0.03, 0], ArrowUp: [0, -0.03], ArrowDown: [0, 0.03] }[e.key]; if (d) { e.preventDefault(); q = { x: Math.min(1, Math.max(0, q.x + d[0])), y: Math.min(1, Math.max(0, q.y + d[1])) }; draw(); } });
  cv.tabIndex = 0;
  let gl = 0; function glide(p) { cancelAnimationFrame(gl); const a = { ...q }, s = performance.now(); (function f(n) { const k = AX.reduceMotion ? 1 : Math.min(1, (n - s) / 700), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; q = { x: a.x + (p.x - a.x) * e, y: a.y + (p.y - a.y) * e }; draw(); if (k < 1) gl = requestAnimationFrame(f); })(s); }
  addEventListener("resize", () => { W = 0; draw(); });
  let vis = false; new IntersectionObserver((es) => { vis = es[0].isIntersecting; }).observe(fig);
  if (!AX.reduceMotion) (function loop() { if (vis && !drag) draw(); requestAnimationFrame(loop); })();
  draw();
})();
