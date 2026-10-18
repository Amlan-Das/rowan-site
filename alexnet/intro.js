/* Parts 1 to 3, told as three questions you answer by doing:
   1. Does this look like that?      a stencil held over a snapshot, the score built up like a bill
   2. Where in the picture is it?    a magnifier you drag across a photo, painting a map as you go
   3. How do you do that millions of times?   one worker against many, then the rows-in-a-stack trick */
(function () {
  "use strict";
  const AX = window.AX, $ = AX.$, h = AX.h, minus = AX.minus;
  const num = (v) => minus(String(+v.toFixed(2)));
  const cap = (fig, bold, text) => fig.append(h("figcaption.ax-cap", h("b", bold + " "), text));
  const grey = (v) => { const g = Math.round(18 + AX.clamp(v, 0, 1) * 237); return "rgb(" + g + "," + g + "," + g + ")"; };
  const STENCILS = [
    { id: "edge", name: "Vertical edge", hint: "dark on the left, light on the right", k: [-1, 0, 1, -1, 0, 1, -1, 0, 1] },
    { id: "across", name: "Horizontal edge", hint: "dark above, light below", k: [-1, -1, -1, 0, 0, 0, 1, 1, 1] },
    { id: "diag", name: "Diagonal edge", hint: "dark in one corner, light in the other", k: [0, 1, 1, -1, 0, 1, -1, -1, 0] },
    { id: "dot", name: "Bright dot", hint: "light in the middle, dark all around", k: [-0.125, -0.125, -0.125, -0.125, 1, -0.125, -0.125, -0.125, -0.125] }
  ];
  const posSum = (k) => k.reduce((s, v) => s + Math.max(0, v), 0);                 // the best score a stencil can ever give
  const stencilTile = (k, cls) => { const m = Math.max(...k.map(Math.abs)); return h("div.ax-st" + (cls ? "." + cls : ""), k.map((v) => h("i", { style: "background:" + AX.tint(v, m) }))); };

  // ======================================================================
  // 1. Does this look like that?
  // ======================================================================
  (function match() {
    const fig = $("axMatch"); if (!fig) return;
    let patch = [0, 0.5, 1, 0, 0.5, 1, 0, 0.5, 1], sid = 0, step = 9, timer = 0, hot = -1;
    const SNAPS = [["Soft edge", [0, 0.5, 1, 0, 0.5, 1, 0, 0.5, 1]], ["Flipped", [1, 0.5, 0, 1, 0.5, 0, 1, 0.5, 0]], ["Horizon", [0, 0, 0, 0.5, 0.5, 0.5, 1, 1, 1]], ["Dot", [0, 0, 0, 0, 1, 0, 0, 0, 0]], ["Flat grey", [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]], ["Mixed up", [1, 0, 0.5, 0, 1, 0, 0.5, 1, 0]]];
    const pg = h("div.ax-pg"), cells = [];
    for (let i = 0; i < 9; i++) { const c = h("button.ax-tile", { type: "button", "aria-label": "Snapshot square " + (i + 1) + ", click to change its brightness", onclick: () => { patch[i] = patch[i] === 0 ? 0.5 : patch[i] === 0.5 ? 1 : 0; settle(); } }, h("i.k")); cells.push(c); pg.append(c); }
    const snaps = h("div.ax-snaps", SNAPS.map(([n, p]) => { const g = h("div.ax-snap", p.map((v) => h("i", { style: "background:" + grey(v) }))); return h("button.ax-snapbtn", { type: "button", "aria-label": "Use the snapshot called " + n, onclick: () => { patch = p.slice(); settle(); } }, g, h("span", n)); }));
    const cards = h("div.ax-cards", STENCILS.filter((s) => s.id !== "diag").map((s) => { const i = STENCILS.indexOf(s); return h("button.ax-card", { type: "button", "data-i": i, onclick: () => { sid = i; settle(); } }, stencilTile(s.k), h("span.n", s.name), h("span.t", s.hint)); }));
    const fall = h("div.ax-fall"), verdict = h("div.ax-verdict", { "aria-live": "polite" }), line = h("p.ax-receipt");
    const play = h("button.ax-btn", { type: "button", onclick: run }, "Add it up, one pixel at a time"), all = h("button.ax-btn.ghost", { type: "button", onclick: () => { stop(); step = 9; render(); } }, "Show the total");
    fig.append(h("div.ax-lab.match",
      h("div", h("p.ax-label", "1. The snapshot ", h("span", "(click a square to change it)")), pg, h("p.ax-label.gap", "Or try one of these"), snaps),
      h("div", h("p.ax-label", "2. What you are hunting for"), cards, h("p.ax-note", "Green: I want this bright. Red: I want this dark. The small marks on the snapshot show the same thing.")),
      h("div", h("p.ax-label", "3. The bill"), fall, line, verdict, h("div.ax-row", play, all))));
    cap(fig, "Try it.", "The starting snapshot is dark on the left and light on the right, so the edge stencil loves it. Flip it, or pick the horizon stencil, and watch the bars go red. A flat grey patch scores zero against every stencil, because a stencil only cares about differences.");
    const calc = () => { const k = STENCILS[sid].k, c = patch.map((p, i) => p * k[i]), cum = []; let s = 0; c.forEach((v) => { s += v; cum.push(s); }); return { k, c, cum, total: s, max: posSum(k) }; };
    function drawFall(m) {
      const W = 400, H = 232, L = 38, T = 14, B = 40, Rr = 8, rng = Math.max(1, m.max, ...m.cum.map(Math.abs)), bw = 24, gap = ((W - L - Rr) - 10 * bw) / 9;
      const y = (v) => T + (H - T - B) * (1 - (v + rng) / (2 * rng)), x = (i) => L + i * (bw + gap), parts = [];
      parts.push("<line class='zero' x1='" + L + "' x2='" + (W - Rr) + "' y1='" + y(0) + "' y2='" + y(0) + "'/>");
      [[rng, "+" + +rng.toFixed(1)], [0, "0"], [-rng, "−" + +rng.toFixed(1)]].forEach(([v, t]) => parts.push("<text class='ytick' x='" + (L - 8) + "' y='" + (y(v) + 4) + "' text-anchor='end'>" + t + "</text>"));
      for (let i = 0; i < 9; i++) {
        parts.push("<text class='xl' x='" + (x(i) + bw / 2) + "' y='" + (H - 22) + "' text-anchor='middle'>" + (i + 1) + "</text>");
        if (i >= step) continue;
        const a = i ? m.cum[i - 1] : 0, b = m.cum[i], top = Math.min(y(a), y(b)), hh = Math.max(Math.abs(y(a) - y(b)), 2.5), cls = m.c[i] > 0 ? "up" : m.c[i] < 0 ? "dn" : "zr";
        parts.push("<rect class='bar " + cls + (i === hot ? " hot" : "") + "' data-i='" + i + "' x='" + x(i) + "' y='" + top + "' width='" + bw + "' height='" + hh + "'/>");
        if (i < 8 && i + 1 < step) parts.push("<line class='con' x1='" + (x(i) + bw) + "' x2='" + x(i + 1) + "' y1='" + y(b) + "' y2='" + y(b) + "'/>");
      }
      parts.push("<text class='xl' x='" + (x(9) + bw / 2) + "' y='" + (H - 22) + "' text-anchor='middle'>Total</text><text class='xl pix' x='" + (L + (4 * (bw + gap)) + bw / 2) + "' y='" + (H - 6) + "' text-anchor='middle'>pixel by pixel, top-left to bottom-right</text>");
      if (step >= 9) parts.push("<rect class='bar tot " + (m.total >= 0 ? "up" : "dn") + "' x='" + x(9) + "' y='" + Math.min(y(0), y(m.total)) + "' width='" + bw + "' height='" + Math.max(Math.abs(y(0) - y(m.total)), 2.5) + "'/>");
      fall.innerHTML = "<svg viewBox='0 0 " + W + " " + H + "' role='img' aria-label='Bar chart: each pixel adds or subtracts from a running total'>" + parts.join("") + "</svg>";
      fall.querySelectorAll(".bar[data-i]").forEach((b) => { b.addEventListener("pointerenter", () => { if (!timer) { hot = +b.dataset.i; marks(); } }); b.addEventListener("pointerleave", () => { if (!timer) { hot = -1; marks(); } }); });
    }
    function marks() {
      const k = STENCILS[sid].k, mx = Math.max(...k.map(Math.abs));
      cells.forEach((c, i) => { c.style.background = grey(patch[i]); c.classList.toggle("on", i === hot); const m = c.querySelector(".k"); m.style.background = k[i] === 0 ? "transparent" : k[i] > 0 ? "#1f9a6c" : "#e0483c"; const sz = 5 + 11 * Math.abs(k[i]) / mx; m.style.width = m.style.height = (k[i] === 0 ? 0 : sz) + "px"; });
      fall.querySelectorAll(".bar[data-i]").forEach((b) => b.classList.toggle("hot", +b.dataset.i === hot));
    }
    function render() {
      const m = calc(); drawFall(m); marks();
      cards.querySelectorAll(".ax-card").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.i === sid)));
      const pct = m.max ? AX.clamp(m.total / m.max, -1, 1) : 0, words = pct >= 0.85 ? "A great match: it looks just like what you are hunting for." : pct >= 0.5 ? "A fairly close match." : pct >= 0.15 ? "A weak resemblance." : pct > -0.15 ? "Nothing in common. Flat patches always score near zero." : "The opposite of what you want.";
      verdict.innerHTML = step >= 9 ? "<b class='" + (pct > 0.15 ? "up" : pct < -0.15 ? "dn" : "") + "'>" + minus(Math.round(pct * 100)) + "% match</b><span>Total " + num(m.total) + " out of a best possible " + num(m.max) + ". " + words + "</span>" : "<span>Adding up…</span>";
      const i = step - 1;
      line.textContent = step === 0 ? "Press the button to build the total." : step < 9 || timer ? "Pixel " + (i + 1) + ": brightness " + num(patch[i]) + " × want " + num(m.k[i]) + " = " + (m.c[i] > 0 ? "+" : "") + num(m.c[i]) + ". Running total " + num(m.cum[i]) + "." : "Each bar is one pixel adding to the bill (green) or taking from it (red). The last bar is the total.";
    }
    function stop() { if (timer) { clearInterval(timer); timer = 0; } hot = -1; }
    function run() { stop(); step = 0; hot = -1; render(); if (AX.reduceMotion) { step = 9; render(); return; } timer = setInterval(() => { step++; hot = step - 1; if (step >= 9) { stop(); step = 9; } render(); }, 380); }
    function settle() { stop(); step = 9; render(); document.dispatchEvent(new CustomEvent("ax-stencil", { detail: STENCILS[sid].id })); }
    render();
  })();

  // ======================================================================
  // 2. Where in the picture is it?   (a magnifier that paints a map)
  // ======================================================================
  (function scan() {
    const fig = $("axScan"); if (!fig) return;
    const N = 64, O = 62;
    let gray = null, base = null, ki = 0, mx = 24, my = 30, painted = new Uint8Array(O * O), sc = new Float32Array(O * O), scale = 1, src = 0, anim = 0, prev = null, shifted = 0;
    const SRC = [["An elephant", "elephant-river"], ["On the savanna", "elephant-away"], ["Mother and calf", "elephant-calf"], ["A handwritten 7", "digit"], ["Test shapes", "shapes"]];
    const SC = [STENCILS[0], STENCILS[1], { id: "outline", name: "Outline", hint: "an edge in any direction", combo: true, k: STENCILS[0].k }, STENCILS[2]];
    const ID2KI = { edge: 0, across: 1, diag: 3, outline: 2 };
    const photoCv = h("canvas", { width: N, height: N, "aria-label": "The picture to search. Drag across it." }), mapCv = h("canvas", { width: O, height: O, "aria-label": "The map of match scores" });
    const win = h("i.ax-win.m"), ring = h("i.ax-ring"), mwin = h("i.ax-win.mm");
    const pwrap = h("div.ax-cv.big", photoCv, win, ring), mwrap = h("div.ax-cv.big", mapCv, mwin, h("p.ax-empty", "Drag the magnifier over the picture, or press Scan."));
    const insetP = h("canvas", { width: 3, height: 3 }), insetS = h("div.ax-insetS"), insetT = h("div.ax-insetT", { "aria-live": "polite" });
    const srcChips = h("div.ax-chips", SRC.map(([n], i) => h("button.ax-chip", { type: "button", "data-i": i, onclick: () => { src = i; shifted = 0; load(); } }, n)));
    const stChips = h("div.ax-cards.small", SC.map((s, i) => h("button.ax-card", { type: "button", "data-i": i, onclick: () => { ki = i; recompute(); render(); } }, stencilTile(s.k), h("span.n", s.name))));
    const scanB = h("button.ax-btn", { type: "button", onclick: scanAll }, "Scan the whole picture"), showB = h("button.ax-btn.ghost", { type: "button", onclick: () => { stopAnim(); painted.fill(1); render(); } }, "Show the whole map"), clrB = h("button.ax-btn.ghost", { type: "button", onclick: () => { stopAnim(); painted.fill(0); render(); } }, "Clear the map");
    const shL = h("button.ax-chip", { type: "button", onclick: () => shift(-6) }, "\u2190 Slide left"), shR = h("button.ax-chip", { type: "button", onclick: () => shift(6) }, "Slide right \u2192");
    fig.append(h("div.ax-lab.scan",
      h("div", h("p.ax-label", "1. Pick a picture"), srcChips, h("p.ax-label.gap", "2. What do you expect to see?"), stChips),
      h("div", h("p.ax-label", "3. Check one spot at a time ", h("span", "(drag the red square)")), pwrap, h("div.ax-row", shL, shR), h("div.ax-inset", h("div", h("p.ax-label", "The spot you are checking"), insetP, h("p.ax-x", "×")), h("div", h("p.ax-label", "Your expectation"), insetS), insetT)),
      h("div", h("p.ax-label", "4. The map: one score per spot"), mwrap, h("div.ax-row", scanB, showB, clrB), h("p.ax-say", { "aria-live": "polite" }))));
    cap(fig, "Try it.", "Keep the vertical edge expectation from step 1 and drag the red square across the elephant's legs. Under the picture, the page tells you what you expected and whether this spot meets it, and the spot gets a score on the map: green where dark meets light, red where light meets dark. Then choose Outline, which expects edges in every direction, and press Scan. The whole silhouette appears, from nothing but one small set of expectations checked everywhere.");
    const say = fig.querySelector(".ax-say"), emptyMsg = mwrap.querySelector(".ax-empty");
    // ---- pictures, shrunk to 64 x 64 and stretched so the contrast is easy to see
    const stretch = (g) => { const a = Float32Array.from(g).sort(), lo = a[Math.floor(a.length * 0.02)], hi = a[Math.floor(a.length * 0.98)], d = Math.max(1e-3, hi - lo); return g.map((v) => AX.clamp((v - lo) / d, 0, 1)); };
    const shapes = () => { const g = new Float32Array(N * N).fill(0.12); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0.12; if (x >= 8 && x <= 30 && y >= 14 && y <= 44) v = 0.92; if ((x - 47) ** 2 + (y - 22) ** 2 <= 121) v = 0.92; if (x >= 36 && x <= 58 && y >= 40 && y <= 60 && (x - 36) >= (60 - y)) v = 0.92; g[y * N + x] = v; } return g; };
    const fromPhoto = (im) => { const c = document.createElement("canvas"); c.width = c.height = N; const s = Math.min(im.naturalWidth, im.naturalHeight), ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, N, N); const d = ctx.getImageData(0, 0, N, N).data, g = new Float32Array(N * N); for (let i = 0; i < N * N; i++) g[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255; return stretch(g); };
    const imgs = {};
    function load() {
      stopAnim();
      const key = SRC[src][1];
      const done = (g) => { base = g; applyShift(); painted.fill(0); recompute(); render(); };
      if (key === "shapes") return done(shapes());
      if (key === "digit") return AX.samples.then((s) => { const im = s.imgs[s.labels.indexOf(7)], g = new Float32Array(N * N).fill(0.12); for (let y = 4; y < N - 4; y++) for (let x = 4; x < N - 4; x++) g[y * N + x] = 0.12 + 0.88 * im[Math.floor((y - 4) / 2) * 28 + Math.floor((x - 4) / 2)]; done(g); });
      (imgs[key] ? Promise.resolve(imgs[key]) : AX.loadImage("alexnet/img/" + key + ".jpg").then((i) => (imgs[key] = i))).then((im) => done(fromPhoto(im)));
    }
    function applyShift() { gray = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) gray[y * N + x] = base[y * N + AX.clamp(x - shifted, 0, N - 1)]; }
    function shift(d) { stopAnim(); shifted += d; applyShift(); recompute(); render(); }
    function recompute() {
      if (!gray) return; const k = SC[ki].k, k2 = STENCILS[1].k, combo = !!SC[ki].combo;
      for (let y = 0; y < O; y++) for (let x = 0; x < O; x++) { let s = 0, t = 0; for (let u = 0; u < 3; u++) for (let v = 0; v < 3; v++) { const g = gray[(y + u) * N + x + v]; s += k[u * 3 + v] * g; if (combo) t += k2[u * 3 + v] * g; } sc[y * O + x] = combo ? Math.hypot(s, t) : s; }
      const a = Float32Array.from(sc, Math.abs).sort(); scale = Math.max(0.05, a[Math.floor(a.length * 0.99)]);
    }
    function render() {
      if (!gray) return;
      const ctx = photoCv.getContext("2d"), im = ctx.createImageData(N, N); for (let i = 0; i < N * N; i++) { const g = 18 + gray[i] * 237; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = g; im.data[i * 4 + 3] = 255; } ctx.putImageData(im, 0, 0);
      AX.drawGrid(mapCv, sc, O, O, (v, x, y) => (painted[y * O + x] ? AX.tint(v / scale, 1) : "#ebe7de"));
      srcChips.querySelectorAll(".ax-chip").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.i === src)));
      stChips.querySelectorAll(".ax-card").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.i === ki)));
      insetS.replaceChildren(stencilTile(SC[ki].k, "lg"), ...(SC[ki].combo ? [h("span.ax-plus", "+"), stencilTile(STENCILS[1].k, "lg")] : [])); inset();
      const n = painted.reduce((s, v) => s + v, 0); emptyMsg.style.display = n ? "none" : "block";
      ring.style.display = "none";
      if (n === O * O) { let bi = 0; for (let i = 1; i < sc.length; i++) if (sc[i] > sc[bi]) bi = i; const bx = bi % O, by = Math.floor(bi / O); ring.style.display = "block"; ring.style.left = (bx - 3) / N * 100 + "%"; ring.style.top = (by - 3) / N * 100 + "%"; ring.style.width = ring.style.height = 9 / N * 100 + "%"; say.textContent = "The whole map is filled in. The circle on the picture marks the strongest match of all."; }
      else say.textContent = n ? n + " of " + fmtN(O * O) + " spots checked." : "";
    }
    const fmtN = (n) => n.toLocaleString("en-US");
    function inset() {
      if (!gray) return; const ctx = insetP.getContext("2d"), im = ctx.createImageData(3, 3), k = SC[ki].k, k2 = STENCILS[1].k, combo = !!SC[ki].combo; let s = 0, t2 = 0;
      for (let u = 0; u < 3; u++) for (let v = 0; v < 3; v++) { const g = gray[(my + u) * N + mx + v]; s += k[u * 3 + v] * g; if (combo) t2 += k2[u * 3 + v] * g; const o = (u * 3 + v) * 4; im.data[o] = im.data[o + 1] = im.data[o + 2] = 18 + g * 237; im.data[o + 3] = 255; }
      ctx.putImageData(im, 0, 0);
      if (combo) { const st = Math.hypot(s, t2), pc = AX.clamp(st / (scale * 1.0), 0, 1); insetT.innerHTML = "<b class='" + (pc > 0.15 ? "up" : "") + "'>" + Math.round(pc * 100) + "% edge</b><span>You expect an edge, running in any direction. " + (pc > 0.5 ? "This spot has a strong one." : pc > 0.15 ? "This spot has a faint one." : "This spot is smooth, so no edge here.") + "</span>"; }
      else { const pct = AX.clamp(s / posSum(k), -1, 1), v = pct >= 0.5 ? "The pixels here meet your expectation: a strong match." : pct >= 0.15 ? "The pixels here only partly meet your expectation." : pct > -0.15 ? "Nothing like what you expected, so the score is near zero." : "The opposite of what you expected, so the score is negative."; insetT.innerHTML = "<b class='" + (pct > 0.15 ? "up" : pct < -0.15 ? "dn" : "") + "'>" + minus(Math.round(pct * 100)) + "% match</b><span>You expect " + SC[ki].hint + ". " + v + "</span>"; }
      win.style.left = mx / N * 100 + "%"; win.style.top = my / N * 100 + "%"; win.style.width = win.style.height = 3 / N * 100 + "%";
      mwin.style.left = mx / O * 100 + "%"; mwin.style.top = my / O * 100 + "%"; mwin.style.width = mwin.style.height = 1 / O * 100 + "%";
    }
    function moveTo(x, y, paint) {
      x = AX.clamp(x, 0, O - 1); y = AX.clamp(y, 0, O - 1);
      if (paint) { const p = prev || [x, y], steps = Math.max(Math.abs(x - p[0]), Math.abs(y - p[1]), 1); for (let i = 0; i <= steps; i++) painted[Math.round(p[1] + (y - p[1]) * i / steps) * O + Math.round(p[0] + (x - p[0]) * i / steps)] = 1; }
      prev = [x, y]; mx = x; my = y; stopAnim(); render();
    }
    let down = false;
    pwrap.addEventListener("pointerdown", (e) => { down = true; prev = null; pwrap.setPointerCapture(e.pointerId); const c = AX.cellAt(e, pwrap, N, N); moveTo(c[0] - 1, c[1] - 1, true); e.preventDefault(); });
    pwrap.addEventListener("pointermove", (e) => { const c = AX.cellAt(e, pwrap, N, N); moveTo(c[0] - 1, c[1] - 1, true); });
    pwrap.addEventListener("pointerup", () => { down = false; prev = null; }); pwrap.addEventListener("pointerleave", () => { prev = null; });
    mwrap.addEventListener("pointermove", (e) => { const c = AX.cellAt(e, mwrap, O, O); moveTo(c[0], c[1], true); });
    mwrap.addEventListener("pointerleave", () => { prev = null; });
    photoCv.style.touchAction = "none"; void down;
    function stopAnim() { if (anim) { cancelAnimationFrame(anim); anim = 0; scanB.textContent = "Scan the whole picture"; } }
    function scanAll() {
      if (anim) { stopAnim(); return; }
      if (AX.reduceMotion) { painted.fill(1); render(); return; }
      painted.fill(0); let i = 0; scanB.textContent = "Stop"; prev = null;
      (function frame() { const end = Math.min(O * O, i + 31); for (; i < end; i++) painted[i] = 1; mx = (i - 1) % O; my = Math.floor((i - 1) / O); render(); if (i < O * O) anim = requestAnimationFrame(frame); else { anim = 0; scanB.textContent = "Scan the whole picture"; } })();
    }
    document.addEventListener("ax-stencil", (e) => { const i = ID2KI[e.detail]; if (i != null && i !== ki) { ki = i; recompute(); render(); } });
    load();
  })();

  // ======================================================================
  // 3a. One worker against many
  // ======================================================================
  (function race() {
    const fig = $("axRace"); if (!fig) return;
    const G = 26, TOTAL = G * G, PER = 3;
    let N2 = 512, raf = 0, done = [0, 0], marks = [new Uint8Array(TOTAL), new Uint8Array(TOTAL)], rounds = [0, 0];
    const cvs = [h("canvas", { width: G, height: G, "aria-label": "One worker's progress" }), h("canvas", { width: G, height: G, "aria-label": "Many workers' progress" })];
    const outs = [h("p.ax-clock"), h("p.ax-clock")];
    const labs = ["1 worker", "workers"].map((t) => h("p.ax-label", t));
    const sl = h("input", { type: "range", min: 0, max: 9, value: 9, "aria-label": "Number of workers", oninput: (e) => { N2 = Math.pow(2, +e.target.value); reset(); } });
    const val = h("b");
    const go = h("button.ax-btn", { type: "button", onclick: start }, "Go"), rs = h("button.ax-btn.ghost", { type: "button", onclick: reset }, "Reset");
    fig.append(h("div.ax-lab.race",
      h("div.ax-rc", labs[0], h("div.ax-cv.sq", cvs[0]), outs[0]),
      h("div.ax-rc", h("label.ax-slide", h("span", "Workers on the right"), val, sl), h("div.ax-cv.sq", cvs[1]), outs[1]),
      h("div.ax-rc.side", h("p.ax-label", "The job"), h("p.ax-note", "Every square is one match score for a 3 × 3 stencil on a 28 × 28 picture: 26 × 26 = 676 sums. A worker does one sum per round. Each round the workers on the right take the next batch."), h("div.ax-row", go, rs), h("p.ax-note", "A GTX 580 has 512 cores. Real chips lose some time to memory and scheduling, but the idea is exactly this."))));
    cap(fig, "Try it.", "Press Go with 512 workers: the right grid is done in two rounds while the left one is still crawling. Drag the slider down to see how much the number of workers matters. Every worker needs the same instruction and the same kind of data, which is why the work has to be lined up first.");
    const draw = (i) => { AX.drawGrid(cvs[i], marks[i], G, G, (v) => (v === 2 ? "#0f5a44" : v === 1 ? "#6fb59b" : "#ebe7de")); };
    function text() { [1, N2].forEach((w, i) => { const need = Math.ceil(TOTAL / w); outs[i].innerHTML = "Needs <b>" + need.toLocaleString("en-US") + " round" + (need === 1 ? "" : "s") + "</b>. " + (done[i] >= TOTAL ? "Finished after " + rounds[i] + " round" + (rounds[i] === 1 ? "" : "s") + "." : done[i] ? "Round " + rounds[i] + ", " + done[i] + " of " + TOTAL + " done." : "Waiting."); }); labs[1].textContent = N2 + " worker" + (N2 === 1 ? "" : "s"); val.textContent = N2; }
    function reset() { cancelAnimationFrame(raf); raf = 0; done = [0, 0]; rounds = [0, 0]; marks = [new Uint8Array(TOTAL), new Uint8Array(TOTAL)]; draw(0); draw(1); text(); go.textContent = "Go"; }
    function start() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; go.textContent = "Go"; return; }
      reset(); go.textContent = "Pause";
      if (AX.reduceMotion) { marks.forEach((m) => m.fill(2)); done = [TOTAL, TOTAL]; rounds = [Math.ceil(TOTAL), Math.ceil(TOTAL / N2)]; draw(0); draw(1); text(); go.textContent = "Go"; return; }
      (function frame() {
        [1, N2].forEach((w, i) => { for (let r = 0; r < PER && done[i] < TOTAL; r++) { marks[i].forEach((v, k) => { if (v === 1) marks[i][k] = 2; }); const end = Math.min(TOTAL, done[i] + w); for (let k = done[i]; k < end; k++) marks[i][k] = 1; done[i] = end; rounds[i]++; } draw(i); });
        text(); if (done[0] < TOTAL || done[1] < TOTAL) raf = requestAnimationFrame(frame); else { marks.forEach((m) => m.forEach((v, k) => { if (v === 1) m[k] = 2; })); draw(0); draw(1); raf = 0; go.textContent = "Go"; }
      })();
    }
    reset();
  })();

  // ======================================================================
  // 3b. Stack the rows
  // ======================================================================
  (function stack() {
    const fig = $("axStack"); if (!fig) return;
    const N = 6, O = 4;
    let im = "001100001100001100111111001100001100".split("").map(Number).map((v) => (v ? 1 : 0.1)), sid = 0, n = 3, timer = 0;
    const SK = [STENCILS[0], STENCILS[1]];
    const grid = h("div.ax-g6"), cells = [];
    for (let i = 0; i < 36; i++) { const c = h("button.ax-tile.sm", { type: "button", "aria-label": "Picture square " + (i + 1) + ", click to change", onclick: () => { im[i] = im[i] > 0.7 ? 0.1 : im[i] > 0.3 ? 1 : 0.55; reset(); } }); cells.push(c); grid.append(c); }
    const stCards = h("div.ax-cards.small", SK.map((s, i) => h("button.ax-card", { type: "button", "data-i": i, onclick: () => { sid = i; render(); } }, stencilTile(s.k), h("span.n", s.name))));
    const presets = h("div.ax-chips", h("button.ax-chip", { type: "button", onclick: () => { im = "001100001100001100111111001100001100".split("").map(Number).map((v) => (v ? 1 : 0.1)); reset(); } }, "Plus"), h("button.ax-chip", { type: "button", onclick: () => { im = "110000011000001100000110000011000001".split("").map(Number).map((v) => (v ? 1 : 0.1)); reset(); } }, "Diagonal"), h("button.ax-chip", { type: "button", onclick: () => { im = im.map(() => [0.1, 0.55, 1][Math.floor(Math.random() * 3)]); reset(); } }, "Random"));
    const rows = h("div.ax-stk"), outMap = h("div.ax-omap"), msg = h("p.ax-say.lead", { "aria-live": "polite" });
    const nextB = h("button.ax-btn", { type: "button", onclick: () => { stop(); n = Math.min(18, n + 1); render(); } }, "Next step"), allB = h("button.ax-btn.ghost", { type: "button", onclick: () => { stop(); n = 18; render(); } }, "Do it all"), rstB = h("button.ax-btn.ghost", { type: "button", onclick: reset }, "Start over"), playB = h("button.ax-btn.ghost", { type: "button", onclick: play }, "Play");
    const kstrip = h("div.ax-kstrip");
    fig.append(h("div.ax-lab.stack",
      h("div", h("p.ax-label", "The picture ", h("span", "(6 × 6, click to change)")), grid, presets, h("p.ax-label.gap", "The stencil"), stCards),
      h("div", h("p.ax-label", "The stack: one row per patch"), h("div.ax-stkhead", h("span", "patch, flattened into 9 numbers"), h("span", "× stencil")), rows),
      h("div", h("p.ax-label", "Stencil, flattened too"), kstrip, h("p.ax-label.gap", "Scores, folded back into a picture"), outMap)),
      msg, h("div.ax-row", nextB, playB, allB, rstB));
    cap(fig, "Try it.", "Press Next step and watch a patch get cut out, flattened and added to the stack. After all 16 are stacked, one multiplication scores every row at once, and the scores fold back into the 4 × 4 feature map from step 2.");
    const patch = (t) => { const y = Math.floor(t / O), x = t % O, r = []; for (let u = 0; u < 3; u++) for (let v = 0; v < 3; v++) r.push(im[(y + u) * N + x + v]); return r; };
    function stop() { if (timer) { clearInterval(timer); timer = 0; playB.textContent = "Play"; } }
    function reset() { stop(); n = 0; render(); }
    function play() { if (timer) { stop(); return; } if (n >= 18) n = 0; playB.textContent = "Pause"; render(); timer = setInterval(() => { n = Math.min(18, n + 1); render(); if (n >= 18) stop(); }, 260); }
    function render() {
      const k = SK[sid].k, cur = n >= 1 && n <= 16 ? n - 1 : -1, mx = Math.max(...k.map(Math.abs));
      cells.forEach((c, i) => { c.style.background = grey(im[i]); const y = Math.floor(i / N), x = i % N; let on = false; if (cur >= 0) { const py = Math.floor(cur / O), px = cur % O; on = y >= py && y < py + 3 && x >= px && x < px + 3; } c.classList.toggle("hot", on); });
      stCards.querySelectorAll(".ax-card").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.i === sid)));
      kstrip.innerHTML = k.map((v) => "<i style='background:" + AX.tint(v, mx) + "'></i>").join("");
      const shown = Math.min(n, 16), scores = []; for (let t = 0; t < 16; t++) scores.push(patch(t).reduce((s, v, i) => s + v * k[i], 0));
      const smax = Math.max(0.5, ...scores.map(Math.abs));
      rows.innerHTML = ""; for (let t = 0; t < 16; t++) {
        const vis = t < shown, p = patch(t);
        rows.append(h("div.ax-srow" + (t === cur ? ".on" : "") + (vis ? "" : ".dim"), h("em", String(t + 1)), h("div.ax-strip", p.map((v) => h("i", { style: vis ? "background:" + grey(v) : "" }))), h("b", { style: n >= 17 ? "color:" + (scores[t] > 0.05 ? "var(--up)" : scores[t] < -0.05 ? "var(--down)" : "var(--mist)") : "" }, n >= 17 ? (scores[t] > 0 ? "+" : "") + num(scores[t]) : "")));
      }
      outMap.innerHTML = ""; const mp = h("div.ax-om" + (n >= 18 ? ".on" : "")); scores.forEach((s) => mp.append(h("i", { style: n >= 18 ? "background:" + AX.tint(s / smax, 1) : "" }))); outMap.append(mp);
      msg.textContent = n === 0 ? "Start with a 6 × 6 picture and one stencil. We want a match score at every 3 × 3 spot: 16 spots in all." : n <= 16 ? "Patch " + n + ": cut it out of the picture, flatten it into a row of 9 numbers, and add the row to the stack." : n === 17 ? "Now multiply the whole stack by the stencil in a single step. Every row gets its score at the same moment." : "Fold the 16 scores back into a 4 × 4 picture. That is the feature map from step 2, made with one multiplication instead of 16 separate sums.";
    }
    render();
  })();
})();
