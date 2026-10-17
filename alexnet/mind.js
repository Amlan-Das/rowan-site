/* Parts 6, 8 and 9: a kernel that learns, the paper's update rule, the elephants and an embedding map, and the compute calculator. */
(function () {
  "use strict";
  const AX = window.AX, $ = AX.$, h = AX.h, minus = AX.minus, fmt = AX.fmt;
  const cap = (fig, bold, text) => fig.append(h("figcaption.ax-cap", h("b", bold + " "), text));
  const sci = (n) => { const e = Math.floor(Math.log10(n)), m = n / Math.pow(10, e); return m.toFixed(1) + " × 10<sup>" + e + "</sup>"; };
  const dur = (s) => (s < 90 ? s.toFixed(0) + " seconds" : s < 5400 ? (s / 60).toFixed(0) + " minutes" : s < 172800 ? (s / 3600).toFixed(1) + " hours" : s < 86400 * 400 ? (s / 86400).toFixed(1) + " days" : (s / 86400 / 365).toFixed(0) + " years");

  // ======================================================================
  // 6a. A tiny network learns its own edge detectors
  // ======================================================================
  (function learn() {
    const fig = $("axLearn"); if (!fig) return;
    const S = 9, O = S - 2, LR = 0.04;
    let r = AX.rng(1), K, kb, w, b, steps = 0, run = false, hist = [], lastLoss = 0.7, ema = 0.7, lastErr = 0, lastDelta = 0, seed = 1;
    const sample = () => {
      const v = r() < 0.5, c = 1 + Math.floor(r() * (S - 2)), amp = 0.7 + 0.3 * r(), x = new Float32Array(S * S);
      for (let i = 0; i < S; i++) x[v ? i * S + c : c * S + i] = amp;
      for (let i = 0; i < x.length; i++) x[i] += 0.12 * AX.gauss(r);
      return { x, y: v ? 1 : 0 };
    };
    const forward = (x) => {
      const m = [0, 0], at = [[0, 0], [0, 0]], c = [0, 0];
      for (let k = 0; k < 2; k++) { let best = -1e9, bi = 0, bj = 0, bc = 0; for (let i = 0; i < O; i++) for (let j = 0; j < O; j++) { let s = kb[k]; for (let u = 0; u < 3; u++) for (let v = 0; v < 3; v++) s += K[k][u * 3 + v] * x[(i + u) * S + j + v]; const rl = Math.max(0, s); if (rl > best) { best = rl; bi = i; bj = j; bc = s; } } m[k] = best; at[k] = [bi, bj]; c[k] = bc; }
      const z = w[0] * m[0] + w[1] * m[1] + b;
      return { m, at, c, z, p: 1 / (1 + Math.exp(-z)) };
    };
    const reset = () => {
      seed++; r = AX.rng(Math.floor(Math.random() * 1e9) + seed);
      K = [0, 1].map(() => Array.from({ length: 9 }, () => 0.05 + 0.25 * AX.gauss(r))); kb = [0.1, 0.1]; w = [1, -1]; b = 0; steps = 0; hist = []; ema = 0.7; lastErr = 0; lastDelta = 0;
      test = Array.from({ length: 200 }, sample); record(); render();
    };
    let test = [];
    const accuracy = () => test.reduce((n, t) => n + ((forward(t.x).z > 0 ? 1 : 0) === t.y ? 1 : 0), 0) / test.length;
    const record = () => hist.push([steps, accuracy(), ema]);
    const train = (n) => {
      for (let i = 0; i < n; i++) {
        const { x, y } = sample(), f = forward(x), dz = f.p - y;
        ema = ema * 0.98 + 0.02 * -(y ? Math.log(f.p + 1e-9) : Math.log(1 - f.p + 1e-9)); lastErr = dz; let d = 0;
        for (let k = 0; k < 2; k++) {
          const dm = dz * w[k];
          if (f.c[k] > 0) { const [bi, bj] = f.at[k]; for (let u = 0; u < 3; u++) for (let v = 0; v < 3; v++) { const g = dm * x[(bi + u) * S + bj + v]; K[k][u * 3 + v] -= LR * g; d += Math.abs(LR * g); } kb[k] -= LR * dm; }
        }
        w[0] -= LR * dz * f.m[0]; w[1] -= LR * dz * f.m[1]; b -= LR * dz; steps++; lastDelta = d;
        if (steps % 25 === 0) record();
      }
    };
    // controls and parts
    const ex = h("div.ax-exs"), kdiv = h("div.ax-ks"), resp = h("div.ax-resp"), chart = h("canvas", { width: 520, height: 210, "aria-label": "Accuracy and loss while training" }), read = h("div.ax-readout"), say = h("p.ax-say", { "aria-live": "polite" });
    const btn = (t, f, c) => h("button.ax-btn" + (c ? "." + c : ""), { type: "button", onclick: f }, t);
    const runBtn = btn("Train", toggle), step1 = btn("One step", () => { stop(); train(1); render(); }, "ghost"), step100 = btn("100 steps", () => { stop(); train(100); render(); }, "ghost"), rst = btn("Start again with new random kernels", () => { stop(); reset(); }, "ghost");
    fig.append(h("div.ax-lab.learn",
      h("div", h("p.ax-label", "What it is shown ", h("span", "(9 × 9 pictures with noise)")), ex, h("p.ax-note", "A vertical line is the answer \u201cyes\u201d, a horizontal line is \u201cno\u201d. These are examples; every training step uses a fresh random picture like them."), h("p.ax-label.gap", "The two 3 × 3 kernels it is learning"), kdiv, resp),
      h("div", h("p.ax-label", "Accuracy on 200 pictures it has not trained on"), chart, read, h("div.ax-row", runBtn, step1, step100, rst), say)));
    cap(fig, "Try it.", "Press Train. Both kernels start as random noise and the network is never told what an edge is. Within a few hundred steps each kernel usually turns into an oriented line detector. It does not always work: some starts settle for a worse answer (around 93%), which is why real networks are trained more than once.");
    function tickLoop() { if (!run) return; train(12); render(); if (steps >= 2600) { stop(); return; } requestAnimationFrame(tickLoop); }
    function toggle() { if (run) stop(); else { run = true; runBtn.textContent = "Pause"; if (AX.reduceMotion) { train(2600 - steps); render(); stop(); return; } requestAnimationFrame(tickLoop); } }
    function stop() { run = false; runBtn.textContent = steps >= 2600 ? "Train more" : "Train"; if (steps >= 2600) { runBtn.textContent = "Train"; } }
    const canon = (vertical) => { const x = new Float32Array(S * S); for (let i = 0; i < S; i++) x[vertical ? i * S + 4 : 4 * S + i] = 0.9; return x; };
    function render() {
      ex.innerHTML = ""; const sr = AX.rng(5 + (steps > 2 ? 0 : 0)), snap = [true, false, true, false, true, false];
      snap.forEach((v, i) => { const x = canon(v), c = h("canvas", { width: S, height: S }); const q = AX.rng(40 + i); for (let k = 0; k < x.length; k++) x[k] += 0.12 * AX.gauss(q); AX.drawGrid(c, x, S, S, (val) => "rgb(" + Math.round(255 - AX.clamp(val, 0, 1) * 235) + "," + Math.round(255 - AX.clamp(val, 0, 1) * 233) + "," + Math.round(255 - AX.clamp(val, 0, 1) * 235) + ")"); ex.append(h("figure", c, h("figcaption", v ? "yes" : "no"))); });
      void sr;
      kdiv.innerHTML = ""; K.forEach((k, ki) => { const c = h("canvas", { width: 3, height: 3 }); let m = 0.3; k.forEach((v) => (m = Math.max(m, Math.abs(v)))); AX.drawGrid(c, k, 3, 3, (v) => AX.tint(v, m)); kdiv.append(h("figure", c, h("figcaption", "Kernel " + "AB"[ki]))); });
      const fv = forward(canon(true)), fh = forward(canon(false));
      resp.innerHTML = "<p class='ax-label gap'>How strongly each kernel fires</p><table class='ax-mini'><tr><th></th><th>Kernel A</th><th>Kernel B</th></tr><tr><th>vertical line</th><td>" + minus(fv.m[0].toFixed(1)) + "</td><td>" + minus(fv.m[1].toFixed(1)) + "</td></tr><tr><th>horizontal line</th><td>" + minus(fh.m[0].toFixed(1)) + "</td><td>" + minus(fh.m[1].toFixed(1)) + "</td></tr></table>";
      // chart
      const ctx = chart.getContext("2d"), W = chart.width, H = chart.height, mx = Math.max(600, steps), px = (s) => 38 + s / mx * (W - 52), py = (v) => H - 26 - v * (H - 44);
      ctx.clearRect(0, 0, W, H); ctx.strokeStyle = "#ddd7ca"; ctx.fillStyle = "#6e695d"; ctx.font = "12px sans-serif"; ctx.lineWidth = 1;
      [0, 0.5, 1].forEach((v) => { ctx.beginPath(); ctx.moveTo(38, py(v)); ctx.lineTo(W - 10, py(v)); ctx.stroke(); ctx.fillText(Math.round(v * 100) + "%", 2, py(v) + 4); }); ctx.fillText("steps: " + fmt(steps), 38, H - 6);
      ctx.strokeStyle = "#0f5a44"; ctx.lineWidth = 2.4; ctx.beginPath(); hist.forEach(([s, a], i) => (i ? ctx.lineTo(px(s), py(a)) : ctx.moveTo(px(s), py(a)))); ctx.stroke();
      ctx.strokeStyle = "#b3261e"; ctx.lineWidth = 1.6; ctx.beginPath(); hist.forEach(([s, , l], i) => { const v = Math.min(1, l / 0.8); i ? ctx.lineTo(px(s), py(v)) : ctx.moveTo(px(s), py(v)); }); ctx.stroke();
      ctx.fillStyle = "#0f5a44"; ctx.fillText("accuracy", W - 130, 14); ctx.fillStyle = "#b3261e"; ctx.fillText("loss (scaled)", W - 70, 14);
      const acc = hist.length ? hist[hist.length - 1][1] : 0;
      read.innerHTML = "<dl><div><dt>Steps</dt><dd>" + fmt(steps) + "</dd></div><div><dt>Accuracy</dt><dd>" + Math.round(acc * 100) + "%</dd></div><div><dt>Loss</dt><dd>" + ema.toFixed(2) + "</dd></div><div><dt>Last error p − y</dt><dd>" + minus(lastErr.toFixed(2)) + "</dd></div></dl>";
      say.innerHTML = steps === 0 ? "Right now the kernels are random, so it is guessing: about 50%." : acc > 0.97 ? "It has learned. Look at the kernels: one is now a line detector, and the table shows which line it likes. That is what the first layer of a big network does too, only with 96 kernels and colour." : "Learning. Each step nudges every weight by its slope: <code>w &larr; w &minus; &epsilon; &middot; &part;L/&part;w</code>, found by passing the error p &minus; y backwards.";
    }
    reset();
  })();

  // ======================================================================
  // 6b. The paper's update rule on a valley
  // ======================================================================
  (function update() {
    const fig = $("axUpdate"); if (!fig) return;
    const A = 0.5, B = 8, X0 = [-2.6, 1.0];
    let eps = 0.05, mom = 0.9, wd = 0.0005, noise = 0, pos = X0.slice(), vel = [0, 0], path = [X0.slice()], it = 0, run = false, last = null;
    const cv = h("canvas", { width: 560, height: 300, "aria-label": "Contour plot of a loss valley with the path of the weights" }), read = h("p.ax-say.mono", { "aria-live": "polite" });
    const sl = (label, min, max, step, get, set, fmtv) => { const out = h("b"), inp = h("input", { type: "range", min, max, step, value: get(), "aria-label": label, oninput: (e) => { set(+e.target.value); out.textContent = fmtv(get()); reset(false); } }); out.textContent = fmtv(get()); return h("label.ax-slide", h("span", label), out, inp); };
    const sLR = sl("Learning rate ε", 0.005, 0.25, 0.005, () => eps, (v) => (eps = v), (v) => v.toFixed(3));
    const sMo = sl("Momentum", 0, 0.98, 0.01, () => mom, (v) => (mom = v), (v) => v.toFixed(2));
    const sWD = sl("Weight decay", 0, 0.05, 0.0005, () => wd, (v) => (wd = v), (v) => v.toFixed(4));
    const sNz = sl("Noise in the slope (like small batches)", 0, 2, 0.1, () => noise, (v) => (noise = v), (v) => v.toFixed(1));
    const runB = h("button.ax-btn", { type: "button", onclick: () => { run = !run; runB.textContent = run ? "Pause" : "Run"; if (run) loop(); } }, "Run");
    const stepB = h("button.ax-btn.ghost", { type: "button", onclick: () => { run = false; runB.textContent = "Run"; stepOnce(); draw(); } }, "One step");
    const divB = h("button.ax-btn.ghost", { type: "button", onclick: () => { eps /= 10; sLR.querySelector("input").value = eps; sLR.querySelector("b").textContent = eps.toFixed(3); } }, "Divide ε by 10");
    const rstB = h("button.ax-btn.ghost", { type: "button", onclick: () => reset(true) }, "Start again");
    fig.append(h("div.ax-lab.upd",
      h("div", h("p.ax-label", "The paper's rule"), h("p.ax-eq.sm", "v ← 0.9·v − 0.0005·ε·w − ε·(∂L/∂w)", h("br"), "w ← w + v"), sLR, sMo, sWD, sNz, h("div.ax-row", runB, stepB, divB, rstB)),
      h("div", h("p.ax-label", "A weight (w₁, w₂) rolling down a valley ", h("span", "(click to move the start)")), h("div.ax-cv.free.wide", cv), read)));
    cap(fig, "Try it.", "With momentum 0 the weight zigzags across the narrow valley. With 0.9 it builds speed along the valley floor, and too large a learning rate makes it overshoot. The paper's schedule divided ε by 10 whenever progress stalled: press the button near the end. The paper's weight decay of 0.0005 barely shows here; push it up to see the pull towards zero.");
    const grad = (p) => [A * p[0] + wd * 0, B * p[1]];
    function stepOnce() {
      const g = [A * pos[0], B * pos[1]], gn = [g[0] + noise * AX.gauss(Math.random), g[1] + noise * AX.gauss(Math.random)];
      const v0 = vel.slice(); vel = [mom * vel[0] - wd * eps * pos[0] - eps * gn[0], mom * vel[1] - wd * eps * pos[1] - eps * gn[1]]; pos = [pos[0] + vel[0], pos[1] + vel[1]]; path.push(pos.slice()); it++;
      last = { v0, g: gn };
    }
    function reset(startOver) { if (startOver) { pos = X0.slice(); } else pos = path[0].slice(); vel = [0, 0]; path = [pos.slice()]; it = 0; last = null; draw(); }
    const L = (p) => 0.5 * (A * p[0] * p[0] + B * p[1] * p[1]);
    function draw() {
      const ctx = cv.getContext("2d"), W = cv.width, H = cv.height, sx = W / 7, sy = H / 3.4; const px = (x) => W / 2 + x * sx, py = (y) => H / 2 - y * sy;
      ctx.clearRect(0, 0, W, H); ctx.lineWidth = 1; ctx.strokeStyle = "#ddd7ca";
      [0.1, 0.4, 1, 2, 3.5, 5.5].forEach((l) => { ctx.beginPath(); for (let i = 0; i <= 120; i++) { const t = i / 120 * Math.PI * 2, x = Math.sqrt(2 * l / A) * Math.cos(t), y = Math.sqrt(2 * l / B) * Math.sin(t); i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y)); } ctx.closePath(); ctx.stroke(); });
      ctx.strokeStyle = "#bdb6a6"; ctx.beginPath(); ctx.moveTo(0, py(0)); ctx.lineTo(W, py(0)); ctx.moveTo(px(0), 0); ctx.lineTo(px(0), H); ctx.stroke();
      ctx.strokeStyle = "#0f5a44"; ctx.lineWidth = 2; ctx.beginPath(); path.forEach((p, i) => (i ? ctx.lineTo(px(p[0]), py(p[1])) : ctx.moveTo(px(p[0]), py(p[1])))); ctx.stroke();
      ctx.fillStyle = "#0f5a44"; path.forEach((p, i) => { if (i % 3 === 0 || i === path.length - 1) { ctx.beginPath(); ctx.arc(px(p[0]), py(p[1]), 2.6, 0, 7); ctx.fill(); } });
      ctx.fillStyle = "#b3261e"; ctx.beginPath(); ctx.arc(px(pos[0]), py(pos[1]), 5.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#121614"; ctx.font = "600 12px sans-serif"; ctx.fillText("start", px(path[0][0]) + 8, py(path[0][1]) - 8); ctx.fillStyle = "#6e695d"; ctx.fillText("lowest loss", px(0) + 8, py(0) + 16);
      read.innerHTML = last ? "step " + it + ": w = (" + minus(pos[0].toFixed(2)) + ", " + minus(pos[1].toFixed(2)) + "), loss " + L(pos).toFixed(3) + "<br>slope used (" + minus(last.g[0].toFixed(2)) + ", " + minus(last.g[1].toFixed(2)) + "), new velocity (" + minus(vel[0].toFixed(3)) + ", " + minus(vel[1].toFixed(3)) + ")" : "Press Run or One step. Loss " + L(pos).toFixed(2) + " at the start.";
    }
    function loop() { if (!run) return; stepOnce(); if (it > 600 || (Math.abs(pos[0]) + Math.abs(pos[1]) < 0.01 && noise === 0)) { run = false; runB.textContent = "Run"; draw(); return; } draw(); if (AX.reduceMotion) { for (let i = 0; i < 200 && run; i++) stepOnce(); draw(); run = false; runB.textContent = "Run"; return; } setTimeout(() => requestAnimationFrame(loop), 40); }
    cv.addEventListener("pointerdown", (e) => { const r = cv.getBoundingClientRect(), W = cv.width, H = cv.height, x = ((e.clientX - r.left) / r.width * W - W / 2) / (W / 7), y = -(((e.clientY - r.top) / r.height * H) - H / 2) / (H / 3.4); run = false; runB.textContent = "Run"; pos = [AX.clamp(x, -3.2, 3.2), AX.clamp(y, -1.55, 1.55)]; vel = [0, 0]; path = [pos.slice()]; it = 0; last = null; draw(); });
    void grad; draw();
  })();

  // ======================================================================
  // 8a. Elephants in pixel space
  // ======================================================================
  (function elephants() {
    const fig = $("axElephants"); if (!fig) return;
    const P = [["elephant-bathing", "Sitting in a river", true], ["elephant-river", "Standing in a river", true], ["elephant-away", "Walking away on the savanna", true], ["elephant-savanna", "On the savanna", true], ["elephant-calf", "Mother and calf drinking", true], ["elephant-tusker", "Tusker in the forest", true], ["savanna-trees", "Savanna, no elephant", false], ["savanna-plain", "Upland plain, no elephant", false]];
    let q = 2, vecs = null;
    const gridT = h("div.ax-thumbs"), list = h("div.ax-near"), say = h("p.ax-say.lead", { "aria-live": "polite" });
    P.forEach(([f, l], i) => gridT.append(h("button.ax-thumb.photo.lg", { type: "button", "data-i": i, "aria-label": l, title: l, onclick: () => { q = i; render(); } }, h("img", { src: "alexnet/img/" + f + ".jpg", alt: "" }), h("span", P[i][2] ? "elephant" : "no elephant"))));
    fig.append(h("div.ax-lab.eleph", h("div", h("p.ax-label", "1. Pick a query photo"), gridT, h("p.ax-note", "Six elephants in different poses and settings, and two empty landscapes. I chose a mix, as the paper's figure does, and ran no other filter.")), h("div", h("p.ax-label", "2. What is closest in raw pixels?"), list, say)),
      h("div.ax-split", h("div", h("p.ax-label", "Pixel space"), h("p.ax-note", "Each photo is shrunk to 32 × 32 pixels, giving a list of 3,072 numbers. Distance is the straight-line (Euclidean) distance between two such lists. Photos with similar colours and layouts end up close, whatever is in them.")), h("div", h("p.ax-label", "AlexNet's embedding space"), h("p.ax-note", "In the paper, the 4,096 numbers from the last hidden layer are compared the same way, and for an elephant query the nearest training images are elephants in a variety of poses. I can't run AlexNet in a web page, so that half is the paper's finding, not something computed here."))));
    cap(fig, "Try it.", "Pick different queries. In pixel space the closest photo is often one with a similar background, not the same animal, and an empty landscape can be closer to an elephant than another elephant is. That gap is what a learned embedding closes.");
    Promise.all(P.map(([f]) => AX.loadImage("alexnet/img/" + f + ".jpg"))).then((ims) => {
      vecs = ims.map((im) => { const c = document.createElement("canvas"); c.width = c.height = 32; const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(im, 0, 0, 32, 32); const d = ctx.getImageData(0, 0, 32, 32).data, v = new Float32Array(3072); for (let i = 0; i < 1024; i++) { v[i * 3] = d[i * 4] / 255; v[i * 3 + 1] = d[i * 4 + 1] / 255; v[i * 3 + 2] = d[i * 4 + 2] / 255; } return v; });
      render();
    });
    function render() {
      gridT.querySelectorAll(".ax-thumb").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.i === q)));
      if (!vecs) return;
      const dist = P.map((_, i) => (i === q ? null : Math.sqrt(vecs[i].reduce((s, v, k) => s + (v - vecs[q][k]) ** 2, 0))));
      const order = dist.map((d, i) => ({ d, i })).filter((o) => o.d != null).sort((a, b) => a.d - b.d), mx = order[order.length - 1].d;
      list.innerHTML = ""; order.forEach((o, rank) => list.append(h("div.ax-nrow" + (rank === 0 ? ".first" : "") + (P[o.i][2] ? "" : ".no"), h("img", { src: "alexnet/img/" + P[o.i][0] + ".jpg", alt: "" }), h("div", h("p", P[o.i][1], h("small", P[o.i][2] ? " elephant" : " no elephant")), h("span.t", h("i", { style: "width:" + o.d / mx * 100 + "%" }))), h("b", o.d.toFixed(1)))));
      const first = order[0], farEle = order.filter((o) => P[o.i][2] && !P[first.i][2] === false).length;
      void farEle;
      const empties = order.filter((o) => !P[o.i][2]), eles = order.filter((o) => P[o.i][2]);
      const closerEmpty = P[q][2] ? eles.filter((e) => empties.some((m) => m.d < e.d)).length : 0;
      say.innerHTML = P[q][2]
        ? (P[first.i][2] ? "Nearest in pixels: <b>" + P[first.i][1].toLowerCase() + "</b>, an elephant, but look at the distances." : "Nearest in pixels: <b>" + P[first.i][1].toLowerCase() + "</b>. That is not an elephant.") + (closerEmpty ? " <b>" + closerEmpty + " of the " + eles.length + "</b> other elephants are farther away than an empty landscape." : " Here every empty landscape is farther than every other elephant, mostly because they share a river.")
        : "This photo has no elephant, so it is near other landscapes. Pick an elephant to see the problem.";
    }
  })();

  // ======================================================================
  // 8b. A small embedding map from the last page's learned templates
  // ======================================================================
  (function map() {
    const fig = $("axMap"); if (!fig) return;
    const A0 = 3, B0 = 8;
    let ax = A0, ay = B0, selIdx = -1, dx = 0, data = null;
    const cv = h("canvas", { width: 640, height: 420, "aria-label": "Scatter plot: sixty digits placed by their scores along two learned templates" });
    const mk = (id, def) => h("select.ax-select", { id, "aria-label": id === "axA" ? "Horizontal axis template" : "Vertical axis template", onchange: (e) => { (id === "axA" ? (ax = +e.target.value) : (ay = +e.target.value)); draw(); } }, [...Array(10).keys()].map((d) => h("option", { value: d, selected: d === def }, "the " + d + " template")));
    const sa = mk("axA", A0), sb = mk("axB", B0), shiftIn = h("input", { type: "range", min: -6, max: 6, value: 0, "aria-label": "Slide the selected digit sideways", oninput: (e) => { dx = +e.target.value; shiftV.textContent = dx; draw(); } }), shiftV = h("b", "0");
    const info = h("div.ax-mapinfo"), sel = h("canvas", { width: 28, height: 28 });
    fig.append(h("div.ax-lab.mapl",
      h("div", h("div.ax-row.top", h("label.ax-pick", "Horizontal axis ", sa), h("label.ax-pick", "Vertical axis ", sb)), h("div.ax-cv.free.wide", cv), h("p.ax-note", "Each dot is one of 60 handwritten digits. Its position is how far it lies along the two chosen directions: its dot products with those two templates. Click a dot.")),
      h("div", h("p.ax-label", "Selected digit"), h("div.ax-selrow", h("div.ax-thumb.big", sel), info), h("label.ax-slide", h("span", "Slide this digit sideways"), shiftV, shiftIn), h("p.ax-note", "In a good embedding, a digit that moves a little should stay near where it was. Here it does not: a one-layer template model has no way to ignore position. AlexNet's later layers are what fix that."))));
    cap(fig, "Try it.", "Choose the 3 and 8 templates and the 3s and 8s separate into two groups. Choose two others and different digits separate. Click a dot to see which digits are nearest to it in the full 10-number space and in raw pixels.");
    const bin = (a) => { const o = new Float32Array(784); for (let i = 0; i < 784; i++) o[i] = a[i] > 0.5 ? 1 : 0; return o; };
    const scoresOf = (W, x) => { const s = new Array(10).fill(0); for (let c = 0; c < 10; c++) { let t = 0; for (let p = 0; p < 784; p++) if (x[p]) t += W[c * 784 + p]; s[c] = t; } return s; };
    const shiftX = (x, d) => { const o = new Float32Array(784); for (let y = 0; y < 28; y++) for (let xx = 0; xx < 28; xx++) { const sx = xx - d; if (sx >= 0 && sx < 28) o[y * 28 + xx] = x[y * 28 + sx]; } return o; };
    Promise.all([AX.samples, AX.templates]).then(([s, t]) => {
      const X = s.imgs.map(bin); data = { X, labels: s.labels, S: X.map((x) => scoresOf(t.W, x)), W: t.W, imgs: s.imgs }; draw();
    }).catch(() => { fig.hidden = true; });
    const px = (v, lo, hi, a, b) => a + (v - lo) / (hi - lo) * (b - a);
    function nearest(from, F) { const d = F.map((f, i) => ({ i, d: Math.sqrt(f.reduce((s, v, k) => s + (v - from[k]) ** 2, 0)) })); return d.filter((o) => o.i !== selIdx).sort((a, b) => a.d - b.d).slice(0, 3); }
    function draw() {
      if (!data) return; const ctx = cv.getContext("2d"), W = cv.width, H = cv.height, m = 44;
      const xs = data.S.map((s) => s[ax]), ys = data.S.map((s) => s[ay]);
      let sc = selIdx >= 0 ? scoresOf(data.W, shiftX(data.X[selIdx], dx)) : null; const all = sc ? xs.concat(sc[ax]) : xs, allY = sc ? ys.concat(sc[ay]) : ys;
      const lox = Math.min(...all, 0) - 20, hix = Math.max(...all, 0) + 20, loy = Math.min(...allY, 0) - 20, hiy = Math.max(...allY, 0) + 20;
      const X = (v) => px(v, lox, hix, m, W - 12), Y = (v) => px(v, loy, hiy, H - m, 40);
      ctx.clearRect(0, 0, W, H); ctx.strokeStyle = "#bdb6a6"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(m, Y(0)); ctx.lineTo(W - 12, Y(0)); ctx.moveTo(X(0), 36); ctx.lineTo(X(0), H - m); ctx.stroke();
      ctx.fillStyle = "#6e695d"; ctx.font = "600 12.5px sans-serif"; ctx.fillText("score along the " + ax + " template →", W / 2 - 60, H - 12); ctx.save(); ctx.translate(14, H / 2 + 60); ctx.rotate(-Math.PI / 2); ctx.fillText("score along the " + ay + " template →", 0, 0); ctx.restore();
      data.S.forEach((s, i) => { const l = data.labels[i], c = l === ax ? "#0f5a44" : l === ay ? "#2b5fb3" : "#9aa5a0", big = l === ax || l === ay; ctx.globalAlpha = big ? 1 : 0.7; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(s[ax]), Y(s[ay]), i === selIdx ? 8 : big ? 5.5 : 4, 0, 7); ctx.fill(); if (big || i === selIdx) { ctx.fillStyle = "#fff"; ctx.font = "700 9px sans-serif"; ctx.textAlign = "center"; ctx.fillText(l, X(s[ax]), Y(s[ay]) + 3); ctx.textAlign = "left"; } });
      ctx.globalAlpha = 1;
      if (selIdx >= 0) { const s0 = data.S[selIdx]; if (dx) { ctx.strokeStyle = "#b3261e"; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(X(s0[ax]), Y(s0[ay])); ctx.lineTo(X(sc[ax]), Y(sc[ay])); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = "#fff"; ctx.strokeStyle = "#b3261e"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(X(sc[ax]), Y(sc[ay]), 8, 0, 7); ctx.fill(); ctx.stroke(); } }
      ctx.fillStyle = "#0f5a44"; ctx.fillRect(m + 4, 12, 10, 10); ctx.fillStyle = "#121614"; ctx.font = "600 12px sans-serif"; ctx.fillText("true " + ax + "s", m + 18, 21); ctx.fillStyle = "#2b5fb3"; ctx.fillRect(m + 80, 12, 10, 10); ctx.fillStyle = "#121614"; ctx.fillText("true " + ay + "s", m + 94, 21); ctx.fillStyle = "#9aa5a0"; ctx.fillRect(m + 156, 12, 10, 10); ctx.fillStyle = "#121614"; ctx.fillText("other digits", m + 170, 21);
      cv._geo = { X, Y };
      // selection panel
      if (selIdx >= 0) {
        const sctx = sel.getContext("2d"), im = sctx.createImageData(28, 28), xx = shiftX(data.imgs[selIdx], dx); for (let i = 0; i < 784; i++) { im.data[i * 4] = 18; im.data[i * 4 + 1] = 22; im.data[i * 4 + 2] = 20; im.data[i * 4 + 3] = xx[i] * 255; } sctx.putImageData(im, 0, 0);
        const near = nearest(data.S[selIdx], data.S), nearP = nearest(Array.from(data.X[selIdx]), data.X.map((x) => Array.from(x)));
        const row = (list, lab) => "<div><p class='ax-label'>" + lab + "</p><div class='ax-nn'>" + list.map((o) => "<span class='" + (data.labels[o.i] === data.labels[selIdx] ? "ok" : "no") + "'>" + data.labels[o.i] + "</span>").join("") + "</div></div>";
        info.innerHTML = "<p class='ax-say'>A handwritten <b>" + data.labels[selIdx] + "</b>. Its 10 scores: " + data.S[selIdx].map((v) => minus(Math.round(v))).join(", ") + ".</p>" + row(near, "3 nearest digits, in the 10 scores") + row(nearP, "3 nearest digits, in raw pixels") + "<p class='ax-note'>Green means the same digit. Only 60 samples, so read it as an illustration.</p>";
      } else { sel.getContext("2d").clearRect(0, 0, 28, 28); info.innerHTML = "<p class='ax-say'>Click a dot to inspect a digit.</p>"; }
    }
    cv.addEventListener("pointerdown", (e) => {
      if (!data || !cv._geo) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * cv.width, y = (e.clientY - r.top) / r.height * cv.height; let best = -1, bd = 14;
      data.S.forEach((s, i) => { const d = Math.hypot(cv._geo.X(s[ax]) - x, cv._geo.Y(s[ay]) - y); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) { selIdx = best; dx = 0; shiftIn.value = 0; shiftV.textContent = "0"; draw(); }
    });
    draw();
  })();

  // ======================================================================
  // 9. Compute calculator
  // ======================================================================
  (function compute() {
    const fig = $("axCompute"); if (!fig) return;
    const T = AX.totals(true), A = AX.ALEX, Ln = AX.LENET;
    const HW = [["A 1998 desktop (rough)", 0.5], ["One GTX 580", A.gflopsPerGPU], ["Two GTX 580s, as in the paper", 2 * A.gflopsPerGPU]];
    let hw = 2, gf = HW[2][1], eff = 30;
    const rows = [["Weights", Ln.params, T.params], ["Multiplications for one image", Ln.macs, T.macs], ["Training images", Ln.images, A.images], ["Passes over the data", Ln.epochs, A.epochs]];
    const ops = (macs, imgs, ep) => macs * 2 * 3 * imgs * ep;
    const opL = ops(Ln.macs, Ln.images, Ln.epochs), opA = ops(T.macs, A.images, A.epochs);
    rows.push(["Total operations to train", opL, opA]);
    const table = h("div.ax-cmp"), hwChips = h("div.ax-chips", HW.map(([l, g], i) => h("button.ax-chip", { type: "button", "data-i": i, onclick: () => { hw = i; gf = g; gS.value = Math.log10(gf); render(); } }, l)));
    const gS = h("input", { type: "range", min: -1, max: 4, step: 0.01, value: Math.log10(gf), "aria-label": "Computer speed", oninput: (e) => { gf = Math.pow(10, +e.target.value); hw = -1; render(); } });
    const eS = h("input", { type: "range", min: 5, max: 100, step: 1, value: eff, "aria-label": "Efficiency", oninput: (e) => { eff = +e.target.value; render(); } });
    const out = h("div.ax-timeout", { "aria-live": "polite" }), gl = h("b"), el = h("b");
    fig.append(h("div.ax-lab.comp",
      h("div", h("p.ax-label", "How much bigger was AlexNet than LeNet-5 ", h("span", "(1998, the best-known earlier convolutional network)")), table, h("p.ax-note", "AlexNet figures come from the paper's architecture. LeNet-5 figures are my arithmetic from its published layout. “Operations” counts a multiply and an add separately, and assumes training costs about 3× a forward pass (forward, backward, and weight update), a common rule of thumb.")),
      h("div", h("p.ax-label", "How long would training take?"), hwChips, h("label.ax-slide", h("span", "Computer speed (billions of operations per second)"), gl, gS), h("label.ax-slide", h("span", "How much of its peak speed the software really reaches"), el, eS), out)));
    cap(fig, "Try it.", "Choose two GTX 580s at about 30% of peak and the arithmetic lands on the five to six days the paper reports. Switch to the 1998 desktop and the same training takes about a century. Nothing in the algorithm changed; the hardware did. A GTX 580's peak is its shader clock (1.544 GHz) × 512 cores × 2 operations per cycle.");
    function render() {
      hwChips.querySelectorAll(".ax-chip").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.i === hw)));
      gl.textContent = gf >= 100 ? fmt(gf) + " GFLOPS" : gf.toFixed(gf < 1 ? 2 : 1) + " GFLOPS"; el.textContent = eff + "%";
      const lm = Math.log10, top = lm(rows[4][2]);
      table.innerHTML = "<div class='h'><span></span><span>LeNet-5 (1998)</span><span>AlexNet (2012)</span><span>Ratio</span></div>" + rows.map(([n, a, b]) => "<div class='r'><span class='n'>" + n + "</span><span class='bar'><i style='width:" + Math.max(2, lm(a) / top * 100) + "%'></i><b>" + (a >= 1e9 ? sci(a) : fmt(a)) + "</b></span><span class='bar a'><i style='width:" + Math.max(2, lm(b) / top * 100) + "%'></i><b>" + (b >= 1e9 ? sci(b) : fmt(b)) + "</b></span><span class='x'>" + (b / a >= 100 ? fmt(Math.round(b / a)) : (b / a).toFixed(0)) + "×</span></div>").join("") + "<p class='ax-note'>Bars are on a log scale: each step to the right is ten times more.</p>";
      const rate = gf * 1e9 * eff / 100, tA = opA / rate, tL = opL / rate;
      out.innerHTML = "<dl><div><dt>AlexNet</dt><dd>" + dur(tA) + "</dd></div><div><dt>LeNet-5</dt><dd>" + dur(tL) + "</dd></div></dl><p class='ax-say'>AlexNet needs about " + sci(opA) + " operations to train; at this speed that is " + dur(tA) + (hw === 2 && eff >= 25 && eff <= 40 ? ", in line with the paper's " + A.days[0] + " to " + A.days[1] + " days." : ".") + (tA > 86400 * 365 * 2 ? " Nobody would wait that long, which is why this idea had to wait." : "") + " At 100% of peak the two GPUs would need " + dur(opA / (2 * A.gflopsPerGPU * 1e9)) + ", so the real training was running at roughly " + Math.round(opA / (2 * A.gflopsPerGPU * 1e9) / (5.5 * 86400) * 100) + "% of peak.</p>";
    }
    render();
  })();

  // ======================================================================
  // Contents bar: mark the section you are reading
  // ======================================================================
  (function toc() {
    const links = Array.from(document.querySelectorAll(".ax-toc a")); if (!links.length || !("IntersectionObserver" in window)) return;
    const byId = {}; links.forEach((a) => (byId[a.getAttribute("href").slice(1)] = a));
    const io = new IntersectionObserver((en) => {
      en.forEach((e) => { if (e.isIntersecting) { links.forEach((a) => a.classList.remove("on")); const a = byId[e.target.id]; if (a) { a.classList.add("on"); const bar = a.parentElement; if (bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: a.offsetLeft - 24, behavior: AX.reduceMotion ? "auto" : "smooth" }); } } });
    }, { rootMargin: "-30% 0px -60% 0px" });
    Object.keys(byId).forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  })();
})();
