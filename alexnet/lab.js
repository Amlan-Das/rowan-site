/* Parts 1 to 4: dot product, convolution, vectorization, tensors and the kernel zoo. */
(function () {
  "use strict";
  const AX = window.AX, $ = AX.$, h = AX.h, minus = AX.minus;
  const num = (v) => minus(String(+v.toFixed(2)));
  const cap = (fig, bold, text) => fig.append(h("figcaption.ax-cap", h("b", bold + " "), text));

  // ======================================================================
  // 1. Dot product lab
  // ======================================================================
  (function dot() {
    const fig = $("axDot"); if (!fig) return;
    let patch = [-1, 0, 1, -1, 0, 1, -1, 0, 1], kid = "vertical", kern = AX.KERNELS[0].k.slice();
    const gp = h("div.ax-g3"), gk = h("div.ax-g3"), gx = h("div.ax-g3"), sum = h("p.ax-big"), meter = h("div.ax-meter", h("i.neg"), h("i.pos"), h("span")), say = h("p.ax-say", { "aria-live": "polite" });
    const presets = h("div.ax-chips", AX.KERNELS.map((k) => h("button.ax-chip", { type: "button", "data-k": k.id, onclick: () => { kid = k.id; kern = k.k.slice(); render(); } }, k.name)));
    const pcell = (i) => h("button.ax-cell.pix", { type: "button", "aria-label": "Patch square " + (i + 1), onclick: () => { patch[i] = patch[i] === -1 ? 0 : patch[i] === 0 ? 1 : -1; render(); } });
    const kcell = (i) => h("button.ax-cell", { type: "button", "aria-label": "Kernel weight " + (i + 1), onclick: () => { const c = [-1, -0.5, 0, 0.5, 1], at = c.indexOf(kern[i]); kern[i] = c[(at + 1) % 5]; kid = "custom"; render(); } });
    for (let i = 0; i < 9; i++) { gp.append(pcell(i)); gk.append(kcell(i)); gx.append(h("span.ax-cell.out")); }
    const actions = h("div.ax-row",
      h("button.ax-btn", { type: "button", onclick: () => { patch = kern.map((v) => Math.sign(v)); render(); } }, "Make the patch match the kernel"),
      h("button.ax-btn.ghost", { type: "button", onclick: () => { patch = patch.map((v) => -v); render(); } }, "Invert the patch"),
      h("button.ax-btn.ghost", { type: "button", onclick: () => { patch = patch.map(() => [-1, 0, 1][Math.floor(Math.random() * 3)]); render(); } }, "Random patch"));
    fig.append(h("div.ax-lab.three",
      h("div", h("p.ax-label", "Image patch ", h("span", "(brightness compared with average; click a square)")), gp),
      h("div", h("p.ax-label", "Kernel ", h("span", "(click a weight, or pick one)")), gk, presets),
      h("div", h("p.ax-label", "Multiply each pair, then add"), gx, sum, meter, say)), actions);
    cap(fig, "Try it.", "The patch starts dark on the left and bright on the right, and the kernel is a vertical-edge detector, so they match perfectly: similarity 1. Invert the patch and the score flips sign. Patch values are brightness minus the average, which is what the paper does to every pixel before the first layer.");
    function render() {
      let dotp = 0, np = 0, nk = 0, m = 0;
      for (let i = 0; i < 9; i++) { dotp += patch[i] * kern[i]; np += patch[i] * patch[i]; nk += kern[i] * kern[i]; m = Math.max(m, Math.abs(patch[i] * kern[i])); }
      [...gp.children].forEach((c, i) => { const v = patch[i]; c.style.background = v < 0 ? "#121614" : v === 0 ? "#b9c2bd" : "#ffffff"; c.style.color = v < 0 ? "#fff" : "#121614"; c.textContent = minus(v); });
      [...gk.children].forEach((c, i) => { c.style.background = AX.tint(kern[i], 1); c.style.color = Math.abs(kern[i]) > 0.55 ? "#fff" : "#121614"; c.textContent = num(kern[i]); });
      [...gx.children].forEach((c, i) => { const v = patch[i] * kern[i]; c.style.background = AX.tint(v, 1); c.style.color = Math.abs(v) > 0.55 ? "#fff" : "#121614"; c.textContent = num(v); });
      presets.querySelectorAll(".ax-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === kid)));
      const cos = np && nk ? dotp / Math.sqrt(np * nk) : 0;
      sum.innerHTML = "Sum = <b>" + num(dotp) + "</b>";
      const pos = meter.querySelector(".pos"), neg = meter.querySelector(".neg");
      pos.style.width = Math.max(0, cos) * 50 + "%"; neg.style.width = Math.max(0, -cos) * 50 + "%";
      meter.querySelector("span").textContent = "similarity " + num(cos);
      say.textContent = !np ? "A blank patch has nothing to match, so the score is 0."
        : cos > 0.85 ? "A strong match: the patch looks like the kernel."
        : cos > 0.4 ? "A partial match."
        : cos > -0.4 ? "Not much in common, so the score is near zero."
        : "The opposite: the patch looks like the kernel's mirror image.";
    }
    render();
  })();

  // ======================================================================
  // 2. Convolution studio
  // ======================================================================
  (function conv() {
    const fig = $("axConv"); if (!fig) return;
    const W = 28, O = 26, S = 12;
    let img = new Float32Array(W * W), kid = 0, relu = true, pos = null, timer = 0, erase = false, drawing = false;
    let kern = AX.KERNELS[0].k.slice(), custom = false;
    const cin = h("canvas", { width: W * S, height: W * S, "aria-label": "Drawing area" }), cout = h("canvas", { width: O * S, height: O * S, "aria-label": "Feature map" });
    const boxIn = h("i.ax-win"), boxOut = h("i.ax-win.out");
    const inWrap = h("div.ax-cv", cin, boxIn), outWrap = h("div.ax-cv", cout, boxOut);
    const info = h("div.ax-calc"), minis = h("div.ax-minis");
    const kgrid = h("div.ax-g3.small"), kcells = [];
    for (let i = 0; i < 9; i++) { const c = h("button.ax-cell", { type: "button", "aria-label": "Kernel weight " + (i + 1), onclick: () => { const cy = [-1, -0.5, 0, 0.5, 1]; kern[i] = cy[(cy.indexOf(kern[i]) + 1) % 5]; custom = true; render(); } }); kcells.push(c); kgrid.append(c); }
    const kchips = h("div.ax-chips", AX.KERNELS.map((k, i) => h("button.ax-chip", { type: "button", "data-i": i, onclick: () => { kid = i; kern = k.k.slice(); custom = false; render(); } }, k.name)));
    const reluBtn = h("button.ax-chip", { type: "button", "aria-pressed": "true", onclick: () => { relu = !relu; render(); } }, "Rectifier on");
    const sm = h("div.ax-chips");
    const eraseBtn = h("button.ax-chip", { type: "button", "aria-pressed": "false", onclick: () => { erase = !erase; eraseBtn.setAttribute("aria-pressed", String(erase)); } }, "Eraser");
    const digitBtns = h("div.ax-chips");
    const shift = (dx, dy) => { const o = new Float32Array(W * W); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const sx = x - dx, sy = y - dy; if (sx >= 0 && sx < W && sy >= 0 && sy < W) o[y * W + x] = img[sy * W + sx]; } img = o; render(); };
    const sbtn = (t, dx, dy, l) => h("button.ax-chip", { type: "button", "aria-label": l, onclick: () => shift(dx, dy) }, t);
    const scanBtn = h("button.ax-btn.ghost", { type: "button", onclick: scan }, "Slide it across");
    fig.append(h("div.ax-lab.conv",
      h("div", h("p.ax-label", "Draw here ", h("span", "(or pick a real digit)")), inWrap, h("div.ax-row", eraseBtn, sbtn("←", -2, 0, "Move left"), sbtn("→", 2, 0, "Move right"), sbtn("↑", 0, -2, "Move up"), sbtn("↓", 0, 2, "Move down"), h("button.ax-chip", { type: "button", onclick: () => { img = new Float32Array(W * W); render(); } }, "Clear")), digitBtns),
      h("div", h("p.ax-label", "Kernel ", h("span", "(3 × 3, click to edit)")), h("div.ax-kern", kgrid, kchips), reluBtn, scanBtn, info),
      h("div", h("p.ax-label", "Feature map ", h("span", "(green: match, red: opposite)")), outWrap, h("p.ax-note", "Point at the picture or the map to see one dot product."))),
      h("p.ax-label.gap", "The same picture through five different kernels: a layer with five kernels makes a stack of five maps. AlexNet's first layer makes 96."), minis);
    cap(fig, "Try it.", "Draw a vertical stroke and the vertical-edge kernel lights up along its sides. Move the drawing and the bright spots move with it, which is why a sliding kernel copes with position.");

    const compute = (k, rl) => {
      const out = new Float32Array(O * O);
      for (let y = 0; y < O; y++) for (let x = 0; x < O; x++) {
        let s = 0; for (let u = 0; u < 3; u++) for (let v = 0; v < 3; v++) s += k[u * 3 + v] * img[(y + u) * W + x + v];
        out[y * O + x] = rl ? Math.max(0, s) : s;
      }
      return out;
    };
    const draw = (cv, data, w, mx, scaleTint = true) => AX.drawGrid(cv, data, w, w, (v) => (scaleTint ? AX.tint(v, mx) : "#fff"));
    function render() {
      AX.drawGrid(cin, img, W, W, (v) => "rgb(" + Math.round(255 - v * 235) + "," + Math.round(255 - v * 233) + "," + Math.round(255 - v * 235) + ")");
      const out = compute(kern, relu); let mx = 0.5; out.forEach((v) => (mx = Math.max(mx, Math.abs(v))));
      draw(cout, out, O, mx);
      kcells.forEach((c, i) => { c.style.background = AX.tint(kern[i], 1); c.style.color = Math.abs(kern[i]) > 0.55 ? "#fff" : "#121614"; c.textContent = num(kern[i]); });
      kchips.querySelectorAll(".ax-chip").forEach((b) => b.setAttribute("aria-pressed", String(!custom && +b.dataset.i === kid)));
      reluBtn.setAttribute("aria-pressed", String(relu)); reluBtn.textContent = relu ? "Rectifier on: negatives become 0" : "Rectifier off";
      minis.innerHTML = "";
      AX.KERNELS.forEach((k) => {
        const c = h("canvas", { width: O * 4, height: O * 4 }), o2 = compute(k.k, relu); let m2 = 0.5; o2.forEach((v) => (m2 = Math.max(m2, Math.abs(v))));
        AX.drawGrid(c, o2, O, O, (v) => AX.tint(v, m2)); minis.append(h("figure", c, h("figcaption", k.name)));
      });
      marker();
    }
    function marker() {
      if (!pos) { boxIn.style.display = boxOut.style.display = "none"; info.innerHTML = "<p class='ax-hint'>No position chosen yet.</p>"; return; }
      const [px, py] = pos, k = kern;
      boxIn.style.display = boxOut.style.display = "block";
      boxIn.style.left = px / W * 100 + "%"; boxIn.style.top = py / W * 100 + "%"; boxIn.style.width = boxIn.style.height = 3 / W * 100 + "%";
      boxOut.style.left = px / O * 100 + "%"; boxOut.style.top = py / O * 100 + "%"; boxOut.style.width = boxOut.style.height = 1 / O * 100 + "%";
      let s = 0; const rows = [];
      for (let u = 0; u < 3; u++) { const r = []; for (let v = 0; v < 3; v++) { const p = img[(py + u) * W + px + v], t = p * k[u * 3 + v]; s += t; r.push(num(p) + " × " + num(k[u * 3 + v])); } rows.push(r); }
      info.innerHTML = "<p class='ax-label'>One dot product, at row " + (py + 1) + ", column " + (px + 1) + "</p><table class='ax-mini'>" + rows.map((r) => "<tr>" + r.map((c) => "<td>" + c + "</td>").join("") + "</tr>").join("") + "</table><p class='ax-sumline'>Sum = <b>" + num(s) + "</b>" + (relu && s < 0 ? " &rarr; rectifier makes it 0" : "") + "</p>";
    }
    function at(e, el, n) { const c = AX.cellAt(e, el, n, n); return n === W ? [AX.clamp(c[0] - 1, 0, O - 1), AX.clamp(c[1] - 1, 0, O - 1)] : c; }
    cin.addEventListener("pointermove", (e) => { if (!drawing) { pos = at(e, cin, W); stop(); marker(); } });
    cout.addEventListener("pointermove", (e) => { pos = at(e, cout, O); stop(); marker(); });
    const paint = (e) => { const [cx, cy] = AX.cellAt(e, cin, W, W); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W || y >= W) continue; const w = dx === 0 && dy === 0 ? 1 : 0.45; img[y * W + x] = erase || e.shiftKey ? Math.max(0, img[y * W + x] - w) : Math.max(img[y * W + x], w); } render(); };
    cin.addEventListener("pointerdown", (e) => { drawing = true; cin.setPointerCapture(e.pointerId); paint(e); e.preventDefault(); });
    cin.addEventListener("pointermove", (e) => { if (drawing) paint(e); });
    const end = () => { drawing = false; }; cin.addEventListener("pointerup", end); cin.addEventListener("pointercancel", end);
    cin.style.touchAction = "none";
    function stop() { if (timer) { clearInterval(timer); timer = 0; scanBtn.textContent = "Slide it across"; } }
    function scan() {
      if (timer) { stop(); return; }
      if (AX.reduceMotion) { pos = [10, 10]; marker(); return; }
      let i = 0; scanBtn.textContent = "Stop";
      timer = setInterval(() => { pos = [i % O, Math.floor(i / O)]; marker(); i += 3; if (i >= O * O) stop(); }, 40);
    }
    // real digits to start from
    AX.samples.then((s) => {
      [1, 7, 4, 0, 3].forEach((d) => {
        const idx = s.labels.indexOf(d), cv = h("canvas", { width: 28, height: 28 });
        const ctx = cv.getContext("2d"), im = ctx.createImageData(28, 28);
        for (let i = 0; i < 784; i++) { im.data[i * 4] = 18; im.data[i * 4 + 1] = 22; im.data[i * 4 + 2] = 20; im.data[i * 4 + 3] = s.imgs[idx][i] * 255; }
        ctx.putImageData(im, 0, 0);
        digitBtns.append(h("button.ax-thumb", { type: "button", "aria-label": "Use a handwritten " + d, onclick: () => { img = Float32Array.from(s.imgs[idx]); render(); } }, cv));
      });
      img = Float32Array.from(s.imgs[s.labels.indexOf(1)]); pos = [11, 8]; render();
    }).catch(() => { for (let y = 5; y < 23; y++) for (let x = 13; x < 16; x++) img[y * W + x] = 1; pos = [11, 8]; render(); });
    render();
  })();

  // ======================================================================
  // 3. Vectorization: unroll the patches, multiply once
  // ======================================================================
  (function vec() {
    const fig = $("axVec"); if (!fig) return;
    const N = 6, O = 4;
    let im = [0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0];
    const Ks = [AX.KERNELS[0], AX.KERNELS[1]];
    let mode = "loop", t = 5;
    const grid = h("div.ax-grid6"), cells = [];
    for (let i = 0; i < 36; i++) { const c = h("button.ax-cell.pix", { type: "button", "aria-label": "Pixel " + (i + 1), onclick: () => { im[i] = im[i] ? 0 : 1; t = 0; render(); } }); cells.push(c); grid.append(c); }
    const ptab = h("div.ax-mat"), ktab = h("div.ax-mat"), otab = h("div.ax-mat"), maps = h("div.ax-outmaps"), note = h("p.ax-say", { "aria-live": "polite" });
    const modeBtns = h("div.ax-chips",
      h("button.ax-chip", { type: "button", "data-m": "loop", onclick: () => { mode = "loop"; t = 0; render(); } }, "One dot product at a time"),
      h("button.ax-chip", { type: "button", "data-m": "mat", onclick: () => { mode = "mat"; render(); } }, "All at once, as a matrix"));
    const next = h("button.ax-btn", { type: "button", onclick: () => { t = Math.min(O * O, t + 1); render(); } }, "Next position");
    const nextAll = h("button.ax-btn.ghost", { type: "button", onclick: () => { t = O * O; render(); } }, "Finish");
    const reset = h("button.ax-btn.ghost", { type: "button", onclick: () => { t = 0; render(); } }, "Start over");
    const presetBtns = h("div.ax-chips",
      h("button.ax-chip", { type: "button", onclick: () => { im = "001100001100001100111111001100001100".split("").map(Number); t = 0; render(); } }, "Plus"),
      h("button.ax-chip", { type: "button", onclick: () => { im = "110000011000001100000110000011000001".split("").map(Number); t = 0; render(); } }, "Diagonal"),
      h("button.ax-chip", { type: "button", onclick: () => { im = im.map(() => (Math.random() < 0.4 ? 1 : 0)); t = 0; render(); } }, "Random"));
    fig.append(h("div.ax-lab.vec",
      h("div", h("p.ax-label", "A 6 × 6 image ", h("span", "(click to flip pixels)")), grid, presetBtns, modeBtns, h("div.ax-row", next, nextAll, reset), note),
      h("div", h("p.ax-label", "Patches, unrolled: one row each"), ptab),
      h("div", h("p.ax-label", "Two kernels, unrolled"), ktab, h("p.ax-times", "×")),
      h("div", h("p.ax-label", "= Dot products"), otab, maps)));
    cap(fig, "Try it.", "Step through the loop, then switch to the matrix. The numbers are identical. The difference is that the matrix form hands the whole job to the hardware in one go.");
    const patchOf = (y, x) => { const r = []; for (let u = 0; u < 3; u++) for (let v = 0; v < 3; v++) r.push(im[(y + u) * N + x + v]); return r; };
    function render() {
      cells.forEach((c, i) => { c.style.background = im[i] ? "#121614" : "#f3f5f4"; });
      modeBtns.querySelectorAll(".ax-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.m === mode)));
      const P = [], out = []; for (let y = 0; y < O; y++) for (let x = 0; x < O; x++) { const p = patchOf(y, x); P.push(p); out.push(Ks.map((k) => p.reduce((s, v, i) => s + v * k.k[i], 0))); }
      const shown = mode === "mat" ? O * O : t, cur = mode === "loop" && t > 0 ? t - 1 : -1;
      cells.forEach((c, i) => { const y = Math.floor(i / N), x = i % N; let on = false; if (cur >= 0) { const py = Math.floor(cur / O), px = cur % O; on = y >= py && y < py + 3 && x >= px && x < px + 3; } c.classList.toggle("hot", on); });
      const rowsHtml = P.map((p, r) => "<tr class='" + (r === cur ? "on" : r < shown ? "" : "dim") + "'><th>" + (r + 1) + "</th>" + p.map((v) => "<td class='" + (v ? "one" : "") + "'>" + v + "</td>").join("") + "</tr>").join("");
      ptab.innerHTML = "<table>" + rowsHtml + "</table><p class='ax-dim'>16 × 9</p>";
      ktab.innerHTML = "<table class='kt'><tr><th></th><th>vertical</th><th>horizontal</th></tr>" + [...Array(9).keys()].map((i) => "<tr><th>" + (i + 1) + "</th>" + Ks.map((k) => "<td class='" + (k.k[i] > 0 ? "pos" : k.k[i] < 0 ? "neg" : "") + "'>" + minus(k.k[i]) + "</td>").join("") + "</tr>").join("") + "</table><p class='ax-dim'>9 × 2</p>";
      otab.innerHTML = "<table>" + out.map((o, r) => "<tr class='" + (r === cur ? "on" : r < shown ? "" : "dim") + "'><th>" + (r + 1) + "</th>" + o.map((v) => "<td class='" + (v > 0 ? "pos" : v < 0 ? "neg" : "") + "'>" + (r < shown ? minus(v) : "") + "</td>").join("") + "</tr>").join("") + "</table><p class='ax-dim'>16 × 2</p>";
      maps.innerHTML = "";
      Ks.forEach((k, ki) => {
        const c = h("canvas", { width: O * 3, height: O * 3 }), data = out.map((o, r) => (r < shown ? o[ki] : 0));
        AX.drawGrid(c, data, O, O, (v) => AX.tint(v, 3)); maps.append(h("figure", c, h("figcaption", k.name + " map")));
      });
      note.textContent = mode === "mat"
        ? "One matrix multiplication: 16 patches × 2 kernels = 32 dot products, 288 multiplications, computed together."
        : t === 0 ? "Press Next position. The loop does one dot product per step: 32 in all."
        : "Position " + t + ": patch row " + t + " times each kernel gives " + out[t - 1].map(minus).join(" and ") + ".";
    }
    render();
  })();

  // ======================================================================
  // 3b. Words become a matrix too (a toy)
  // ======================================================================
  (function words() {
    const fig = $("axWords"); if (!fig) return;
    const D = 6;
    const input = h("input.ax-input", { type: "text", value: "what does GPT stand for", "aria-label": "A sentence", maxlength: "60" });
    const table = h("div.ax-mat.wide"), flow = h("div.ax-flow");
    fig.append(h("p.ax-label", "The same trick for text: words become rows of a matrix ", h("span", "(toy numbers, made from each word's spelling)")),
      input, h("div.ax-wordgrid", table, flow));
    cap(fig, "Try it.", "Type a sentence. Each word becomes a vector and the vectors stack into a matrix. In a real model the numbers are learned and each word has thousands of them, not six.");
    function render() {
      const ws = input.value.trim().split(/\s+/).filter(Boolean).slice(0, 8);
      table.innerHTML = "<table>" + ws.map((w) => {
        let seed = 7; for (const ch of w.toLowerCase()) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
        const r = AX.rng(seed), v = [...Array(D)].map(() => +(r() * 2 - 1).toFixed(2));
        return "<tr><th>" + w.replace(/</g, "&lt;") + "</th>" + v.map((x) => "<td class='" + (x > 0 ? "pos" : "neg") + "'>" + minus(x.toFixed(2)) + "</td>").join("") + "</tr>";
      }).join("") + "</table>";
      flow.innerHTML = "<span class='box'>" + ws.length + " words</span><i>&rarr;</i><span class='box'>" + ws.length + " × " + D + " matrix</span><i>&rarr;</i><span class='box strong'>Transformer step<br><small>repeated 96 times in the biggest GPT-3</small></span><i>&rarr;</i><span class='box'>next word</span>";
    }
    input.addEventListener("input", render); render();
  })();

  // ======================================================================
  // 4a. Shape studio
  // ======================================================================
  (function shape() {
    const fig = $("axShape"); if (!fig) return;
    const S0 = { n: 227, C: 3, k: 11, s: 4, p: 0, K: 96 };
    const st = Object.assign({}, S0);
    const specs = [["n", "Input size n", 8, 256, 1], ["C", "Input depth (channels)", 1, 384, 1], ["k", "Kernel size k", 1, 13, 1], ["s", "Stride s", 1, 6, 1], ["p", "Padding p", 0, 6, 1], ["K", "Number of kernels", 1, 384, 1]];
    const inputs = {}, outs = {};
    const rows = specs.map(([key, label, lo, hi, step]) => {
      const out = h("b"), inp = h("input", { type: "range", min: lo, max: hi, step, value: st[key], "aria-label": label, oninput: (e) => { st[key] = +e.target.value; render(); } });
      inputs[key] = inp; outs[key] = out; return h("label.ax-slide", h("span", label), out, inp);
    });
    const presets = [["AlexNet conv 1", { n: 227, C: 3, k: 11, s: 4, p: 0, K: 96 }], ["conv 2", { n: 27, C: 48, k: 5, s: 1, p: 2, K: 256 }], ["conv 3", { n: 13, C: 256, k: 3, s: 1, p: 1, K: 384 }], ["conv 4", { n: 13, C: 192, k: 3, s: 1, p: 1, K: 384 }], ["conv 5", { n: 13, C: 192, k: 3, s: 1, p: 1, K: 256 }], ["Paper's 224", { n: 224, C: 3, k: 11, s: 4, p: 0, K: 96 }], ["LeNet conv 1", { n: 32, C: 1, k: 5, s: 1, p: 0, K: 6 }]];
    const chips = h("div.ax-chips", presets.map(([l, v]) => h("button.ax-chip", { type: "button", onclick: () => { Object.assign(st, v); render(); } }, l)));
    const svg = h("div.ax-tensors"), read = h("div.ax-readout"), warn = h("p.ax-warn", { "aria-live": "polite" });
    chips.style.marginBottom = "22px"; fig.append(chips, h("div.ax-lab.shape", h("div.ax-sliders", rows), h("div", svg, read, warn)));
    cap(fig, "Try it.", "Pick “AlexNet conv 1”, then “Paper's 224” to see the input size that does not divide evenly. The other presets are the layers of the real network, with the depth each kernel sees. Conv 2 shows 48 because each of the two GPUs only passes half the maps along.");
    const box = (x, y, w, hgt, d, fill, label, sub) => {
      const dx = Math.min(34, d * 0.5 + 6), dy = dx * 0.6;
      return "<g><polygon points='" + [[x, y], [x + dx, y - dy], [x + w + dx, y - dy], [x + w, y]].join(" ") + "' fill='" + fill + "' opacity='.55'/><polygon points='" + [[x + w, y], [x + w + dx, y - dy], [x + w + dx, y + hgt - dy], [x + w, y + hgt]].join(" ") + "' fill='" + fill + "' opacity='.75'/><rect x='" + x + "' y='" + y + "' width='" + w + "' height='" + hgt + "' fill='" + fill + "'/><text x='" + (x + w / 2 + dx / 2) + "' y='" + (y + hgt + 18) + "' text-anchor='middle' class='lbl'>" + label + "</text><text x='" + (x + w / 2 + dx / 2) + "' y='" + (y + hgt + 33) + "' text-anchor='middle' class='sub'>" + sub + "</text></g>";
    };
    const size = (n) => Math.max(14, Math.min(120, Math.sqrt(n) * 7.4));
    function render() {
      specs.forEach(([key]) => { inputs[key].value = st[key]; outs[key].textContent = st[key]; });
      const raw = AX.outSize(st.n, st.k, st.s, st.p), ok = Number.isInteger(raw) && raw >= 1, o = Math.max(1, Math.floor(raw)), kk = st.k * st.k * st.C;
      const params = st.K * (kk + 1), macs = o * o * st.K * kk;
      const a = size(st.n), b = Math.max(12, Math.min(40, st.k * 3.4)), c = size(o);
      svg.innerHTML = "<svg viewBox='0 0 520 190' role='img' aria-label='Input tensor, kernel tensor and output tensor drawn to scale'>" +
        box(20, 40, a, a, st.C, "#dde6e1", "Input", st.n + " × " + st.n + " × " + st.C) +
        "<text x='" + (a + 70) + "' y='" + (40 + a / 2) + "' class='op'>∗</text>" +
        box(a + 105, 70, b, b, st.C, "#8bb5a5", "One kernel", st.k + " × " + st.k + " × " + st.C) +
        "<text x='" + (a + b + 150) + "' y='" + (40 + a / 2) + "' class='op'>× " + st.K + "</text>" +
        box(a + b + 215, 40, Math.min(c, 120), Math.min(c, 120), st.K / 6, "#7fa395", "Output", o + " × " + o + " × " + st.K) + "</svg>";
      read.innerHTML = "<dl>" +
        "<div><dt>Output size</dt><dd>" + (ok ? raw : "(" + st.n + " + " + 2 * st.p + " − " + st.k + ") / " + st.s + " + 1 = " + +raw.toFixed(2)) + "</dd></div>" +
        "<div><dt>Numbers in one kernel</dt><dd>" + st.k + " × " + st.k + " × " + st.C + " = " + AX.fmt(kk) + "</dd></div>" +
        "<div><dt>Weights in the layer</dt><dd>" + AX.fmt(params) + "</dd></div>" +
        "<div><dt>Multiplications per image</dt><dd>" + AX.fmt(macs) + "</dd></div></dl>";
      warn.innerHTML = ok ? "" : "This does not divide evenly. Real code has to pad or crop the edge. The paper says 224 &times; 224; most implementations use 227 &times; 227 so the first layer comes out at exactly 55.";
      warn.style.display = ok ? "none" : "block";
    }
    render();
  })();

  // ======================================================================
  // 4b. Kernel zoo on a real photo (layer 1 of a network like AlexNet)
  // ======================================================================
  (function zoo() {
    const fig = $("axZoo"); if (!fig) return;
    const kernels = AX.makeZoo(), N = 227, O = 55;
    const photos = [["elephant-bathing", "Elephant in a river"], ["elephant-away", "Elephant on the savanna"], ["elephant-calf", "Mother and calf"], ["elephant-tusker", "Tusker in the forest"], ["savanna-trees", "Empty savanna"]];
    let pi = 0, ki = 12, relu = true, group = "all", rgb = null, wins = null;
    const imgCache = {};
    const groups = [["all", "All 96"], ["stripes", "Stripes (48)"], ["colour", "Colour edges (24)"], ["blobs", "Colour blobs (12)"], ["checker", "Checkerboards (12)"]];
    const gchips = h("div.ax-chips", groups.map(([g, l]) => h("button.ax-chip", { type: "button", "data-g": g, onclick: () => { group = g; render(); } }, l)));
    const pchips = h("div.ax-chips", photos.map(([f, l], i) => h("button.ax-thumb.photo", { type: "button", "data-i": i, "aria-label": l, title: l, onclick: () => { pi = i; load(); } }, h("img", { src: "alexnet/img/" + f + ".jpg", alt: "" }))));
    const kgrid = h("div.ax-kzoo");
    const kcv = kernels.map((k, i) => { const c = h("canvas", { width: 11, height: 11 }); AX.putRGB(c, AX.kernelRGB(k.k), 11, 11); const b = h("button.ax-k", { type: "button", "aria-label": "Kernel " + (i + 1) + ": " + k.name, onclick: () => { ki = i; render(); } }, c); kgrid.append(b); return b; });
    const photoCv = h("canvas", { width: N, height: N }), mapCv = h("canvas", { width: O, height: O }), big = h("canvas", { width: 11, height: 11 });
    const pbox = h("i.ax-win"), mbox = h("i.ax-win.out"), pwrap = h("div.ax-cv.photo", photoCv, pbox), mwrap = h("div.ax-cv.photo", mapCv, mbox);
    const info = h("p.ax-say", { "aria-live": "polite" }), reluB = h("button.ax-chip", { type: "button", "aria-pressed": "true", onclick: () => { relu = !relu; render(); } }, "Rectifier on");
    const allBtn = h("button.ax-btn.ghost", { type: "button", onclick: showAll }, "Show all 96 maps for this photo");
    const allWrap = h("div.ax-allmaps", { hidden: true });
    fig.append(h("div.ax-lab.zoo",
      h("div", h("p.ax-label", "1. Pick a photo"), pchips, h("p.ax-label.gap", "2. Pick a kernel ", h("span", "(11 × 11 × 3, drawn as a picture)")), gchips, kgrid),
      h("div", h("p.ax-label", "The photo, cut to 227 × 227"), pwrap, h("p.ax-label.gap", "The kernel"), h("div.ax-row.mid", h("div.ax-bigk", big), h("div", h("p.ax-kname"), reluB))),
      h("div", h("p.ax-label", "Feature map: 55 × 55"), mwrap, info)), allBtn, allWrap);
    cap(fig, "Try it.", "Pick a stripe kernel and the map lights up wherever the photo has an edge or texture at that angle: horizon lines, cloud edges, blades of grass. Colour edges respond where one colour meets another, blobs respond to broad patches of colour such as sky and ground, and checkerboards fire on fine texture. Press the button to see all 96 at once. These are my generated kernels in the three families the paper reports, not its learned weights.");

    const scores = (kr, d) => {
      const out = new Float32Array(O * O);
      for (let y = 0; y < O; y++) for (let x = 0; x < O; x++) {
        let s = 0; const y0 = y * 4, x0 = x * 4;
        for (let u = 0; u < 11; u++) { const row = ((y0 + u) * N + x0) * 3, kr0 = u * 33; for (let i = 0; i < 33; i++) s += kr[kr0 + i] * (d[row + i] - 0.5); }
        out[y * O + x] = s;
      }
      return out;
    };
    let curMap = null;
    const pct = (m, rl) => { const a = Array.from(m, (v) => (rl ? Math.max(0, v) : Math.abs(v))).sort((x, y) => x - y); return Math.max(1e-6, a[Math.floor(a.length * 0.99)]); };   // 99th percentile, so one bright pixel does not set the scale
    const tone = (v, mx, rl) => { const t = Math.pow(Math.min(1, Math.abs(rl ? Math.max(0, v) : v) / mx), 0.7); return AX.tint((rl ? 1 : Math.sign(v)) * t, 1); };
    function render() {
      gchips.querySelectorAll(".ax-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.g === group)));
      pchips.querySelectorAll(".ax-thumb").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.i === pi)));
      kcv.forEach((b, i) => { b.classList.toggle("on", i === ki); b.classList.toggle("dim", group !== "all" && kernels[i].group !== group); });
      AX.putRGB(big, AX.kernelRGB(kernels[ki].k), 11, 11);
      fig.querySelector(".ax-kname").textContent = "Kernel " + (ki + 1) + ": " + kernels[ki].name.toLowerCase() + ". 363 weights.";
      reluB.setAttribute("aria-pressed", String(relu)); reluB.textContent = relu ? "Rectifier on" : "Rectifier off";
      if (!rgb) return;
      curMap = scores(kernels[ki].k, rgb);
      const mx = pct(curMap, relu);
      AX.drawGrid(mapCv, curMap, O, O, (v) => tone(v, mx, relu));
      info.textContent = "Point at the photo to see the dot product at that spot.";
    }
    function load() {
      const f = photos[pi][0];
      (imgCache[f] ? Promise.resolve(imgCache[f]) : AX.loadImage("alexnet/img/" + f + ".jpg").then((im) => (imgCache[f] = im))).then((im) => {
        rgb = AX.photoRGB(im, N);
        const bytes = new Uint8ClampedArray(N * N * 3); for (let i = 0; i < bytes.length; i++) bytes[i] = rgb[i] * 255;
        AX.putRGB(photoCv, bytes, N, N);
        allWrap.hidden = true; allWrap.innerHTML = ""; render();
      });
    }
    function point(e) {
      if (!rgb || !curMap) return;
      const [cx, cy] = AX.cellAt(e, pwrap, N, N), mx = AX.clamp(Math.round((cx - 5) / 4), 0, O - 1), my = AX.clamp(Math.round((cy - 5) / 4), 0, O - 1);
      pbox.style.display = mbox.style.display = "block";
      pbox.style.left = mx * 4 / N * 100 + "%"; pbox.style.top = my * 4 / N * 100 + "%"; pbox.style.width = pbox.style.height = 11 / N * 100 + "%";
      mbox.style.left = mx / O * 100 + "%"; mbox.style.top = my / O * 100 + "%"; mbox.style.width = mbox.style.height = 1 / O * 100 + "%";
      const v = curMap[my * O + mx];
      info.textContent = "At this spot, the 11 × 11 × 3 patch gives a dot product of " + num(v) + (relu && v < 0 ? ", which the rectifier turns into 0." : ".");
    }
    pwrap.addEventListener("pointermove", point); pwrap.addEventListener("pointerdown", point);
    pwrap.addEventListener("pointerleave", () => { pbox.style.display = mbox.style.display = "none"; });
    function showAll() {
      if (!rgb) return;
      allWrap.hidden = false; allWrap.innerHTML = ""; allBtn.disabled = true; allBtn.textContent = "Computing 96 maps…";
      let i = 0; const t0 = performance.now();
      (function step() {
        const end = Math.min(kernels.length, i + 8);
        for (; i < end; i++) {
          const idx = i, m = scores(kernels[idx].k, rgb), mx = pct(m, true);
          const c = h("canvas", { width: O, height: O }); AX.drawGrid(c, m, O, O, (v) => tone(v, mx, true));
          allWrap.append(h("button.ax-map", { type: "button", "aria-label": "Kernel " + (idx + 1) + " map", onclick: () => { ki = idx; render(); } }, c));
        }
        if (i < kernels.length) requestAnimationFrame(step);
        else { allBtn.disabled = false; allBtn.textContent = "Show all 96 maps for this photo"; allWrap.prepend(h("p.ax-say.full", "These 96 maps are the output of layer 1 (before pooling), computed in " + Math.round(performance.now() - t0) + " ms in your browser. In AlexNet this one layer is " + AX.fmt(AX.macs(AX.LAYERS[1])) + " multiplications per image, for every image, 90 times over.")); }
      })();
    }
    load();
  })();
})();
