/* Part 5 (the architecture explorer) and part 7 (the paper, section by section). */
(function () {
  "use strict";
  const AX = window.AX, $ = AX.$, h = AX.h, fmt = AX.fmt, minus = AX.minus;
  const cap = (fig, bold, text) => fig.append(h("figcaption.ax-cap", h("b", bold + " "), text));
  const pctOf = (v, t) => (t ? (v / t * 100).toFixed(v / t < 0.01 ? 2 : 1) + "%" : "");

  // A little horizontal bar list: rows of {label, value, text, on, onclick}
  const barList = (rows, max, cls) => h("div.ax-bars" + (cls ? "." + cls : ""), rows.map((r) =>
    h("button.ax-barrow", { type: "button", "aria-pressed": String(!!r.on), onclick: r.onclick || null },
      h("span.l", r.label), h("span.t", h("i", { style: "width:" + Math.max(0.4, r.value / max * 100) + "%" })), h("span.v", r.text))));

  // ======================================================================
  // 5. Architecture explorer
  // ======================================================================
  (function arch() {
    const fig = $("axArch"); if (!fig) return;
    const L = AX.LAYERS, texts = {
      input: ["A colour picture, 227 × 227 × 3 = 154,587 numbers. (The paper says 224 × 224; training uses random 224 × 224 crops cut from 256 × 256 images.)", "Raw pixel values with the average subtracted. Nothing else is done to the image."],
      conv1: ["96 kernels of 11 × 11 × 3, stride 4. The result goes through response normalisation and 3 × 3 max pooling with stride 2, leaving 27 × 27 × 96.", "Edges at many angles, textures, and colourful blobs. The paper shows all 96 in its Figure 3."],
      conv2: ["256 kernels of 5 × 5 × 48. Each kernel only looks at the 48 maps on its own GPU. Then normalisation and pooling leave 13 × 13 × 256.", "Combinations of the first layer's patterns. The paper does not show these; later visualization work found textures and simple shapes."],
      conv3: ["384 kernels of 3 × 3 × 256. This is the one convolutional layer, after the first, that sees every map from the layer before, so the two GPUs exchange data here.", "Larger pieces of objects built from the layer below."],
      conv4: ["384 kernels of 3 × 3 × 192, each only reading the maps on its own GPU. No pooling or normalisation between conv 3, 4 and 5.", "More specific parts and patterns."],
      conv5: ["256 kernels of 3 × 3 × 192, then 3 × 3 max pooling leaves 6 × 6 × 256 = 9,216 numbers, which are handed to the fully connected layers.", "Object-sized patterns. This is the last layer that still keeps track of where things are."],
      fc6: ["Every one of the 9,216 inputs connects to each of 4,096 neurons. This is the biggest layer in the network by far. Dropout is applied here.", "Forgets position and mixes everything together."],
      fc7: ["4,096 neurons, each connected to all 4,096 before it. Dropout is applied here too. These 4,096 numbers are the vector from part 8.", "A description of the whole image: the embedding the paper compares with Euclidean distance."],
      fc8: ["4,096 inputs to 1,000 outputs, one score per class, fed to a softmax that turns the scores into probabilities.", "The answer: how likely each of the 1,000 labels is."]
    };
    let sel = "conv1", two = true;
    const svg = h("div.ax-arch"), detail = h("div.ax-archd"), tog = h("div.ax-chips",
      h("button.ax-chip", { type: "button", "data-g": "2", onclick: () => { two = true; render(); } }, "Two GPUs, as in the paper"),
      h("button.ax-chip", { type: "button", "data-g": "1", onclick: () => { two = false; render(); } }, "If every kernel saw every map"));
    const pcol = h("div"), mcol = h("div"), totals = h("p.ax-say.tot");
    fig.append(tog, svg, detail, h("div.ax-lab.charts", h("div", h("p.ax-label", "Where the weights are ", h("span", "(click a bar)")), pcol), h("div", h("p.ax-label", "Where the computation is ", h("span", "(multiplications per image)")), mcol)), totals);
    cap(fig, "Try it.", "Click any layer, in the picture or the bars. Then flip the switch above the picture: letting every kernel see every map would cost about 57% more computation, so the two-GPU split saves roughly a third. Cutting the links between the two GPUs was a deliberate trade the authors tuned until the communication was an acceptable fraction of the computation.");

    const shapeText = (l) => (l.kind === "fc" ? fmt(l.m) + " numbers" : l.out.join(" × "));
    function drawSvg() {
      const X0 = 30; let x = X0; const parts = [];
      const dims = L.map((l) => {
        if (l.kind === "input") return { w: 10, hh: 150, d: 8 };
        if (l.kind === "conv") return { w: 12 + Math.sqrt(l.K) * 2.6, hh: 30 + l.out[0] * 2.15, d: 0 };
        return { w: 14, hh: Math.min(170, 28 + Math.log2(l.m) * 11), d: 0 };
      });
      L.forEach((l, i) => {
        const d = dims[i], y = 190 - d.hh, on = l.id === sel;
        const lab = "<text x='" + (x + d.w / 2) + "' y='214' text-anchor='middle' class='lbl'>" + l.name + "</text><text x='" + (x + d.w / 2) + "' y='229' text-anchor='middle' class='sub'>" + (l.kind === "input" ? "227²×3" : l.kind === "fc" ? fmt(l.m) : l.out.join("×")) + "</text>";
        parts.push("<g class='blk" + (on ? " on" : "") + "' data-id='" + l.id + "' tabindex='0' role='button' aria-label='" + l.name + "'><rect x='" + (x - 6) + "' y='20' width='" + (d.w + 12) + "' height='215' fill='transparent'/><rect x='" + x + "' y='" + y + "' width='" + d.w + "' height='" + d.hh + "' class='bx " + l.kind + "'/>" + lab + "</g>");
        const GAP = l.kind === "fc" || l.kind === "input" ? 44 : 26; let nx = x + d.w + GAP;
        if (l.lrn || l.pool) { parts.push("<g class='mk'><line x1='" + (x + d.w + 4) + "' y1='195' x2='" + (nx - 4) + "' y2='195'/><text x='" + (x + d.w + GAP / 2) + "' y='18' text-anchor='middle'>" + (l.lrn ? "norm" : "") + (l.lrn && l.pool ? " + " : "") + (l.pool ? "pool" : "") + "</text></g>"); nx += 30; }
        x = nx;
      });
      svg.innerHTML = "<svg viewBox='0 0 " + Math.ceil(x) + " 240' role='group' aria-label='The nine layers of AlexNet, drawn so that height is picture size and width is number of maps'>" + parts.join("") + "</svg>";
      svg.querySelectorAll(".blk").forEach((g) => { const go = () => { sel = g.dataset.id; render(); }; g.addEventListener("click", go); g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }); });
    }
    function render() {
      tog.querySelectorAll(".ax-chip").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.g === "2") === two)));
      const T = AX.totals(two), l = L.find((x) => x.id === sel), p = AX.params(l, two), m = AX.macs(l, two);
      drawSvg();
      let facts;
      if (l.kind === "input") facts = [["Shape", "227 × 227 × 3"], ["Numbers", fmt(227 * 227 * 3)], ["Weights", "0"], ["Multiplications", "0"]];
      else if (l.kind === "conv") { const d = two ? l.depth : l.depth1; facts = [["Kernels", l.K + " of " + l.k + " × " + l.k + " × " + d], ["Stride, padding", l.s + ", " + l.p], ["Output", l.out.join(" × ") + (l.pool ? " → " + l.pool.join(" × ") + " after pooling" : "")], ["Weights", fmt(p) + " (" + pctOf(p, T.params) + ")"], ["Multiplications", fmt(m) + " (" + pctOf(m, T.macs) + ")"]]; }
      else facts = [["Connections", fmt(l.n) + " → " + fmt(l.m)], ["Weights", fmt(p) + " (" + pctOf(p, T.params) + ")"], ["Multiplications", fmt(m) + " (" + pctOf(m, T.macs) + ")"]];
      detail.innerHTML = "<div><h3>" + l.name + "</h3><p>" + texts[l.id][0] + "</p><p class='ax-sm'><b>Roughly what it responds to:</b> " + texts[l.id][1] + "</p></div><dl>" + facts.map(([a, b]) => "<div><dt>" + a + "</dt><dd>" + b + "</dd></div>").join("") + "</dl>";
      const learn = L.filter((x) => x.kind !== "input");
      pcol.replaceChildren(barList(learn.map((x) => ({ label: x.name, value: AX.params(x, two), text: fmt(AX.params(x, two)) + " · " + pctOf(AX.params(x, two), T.params), on: x.id === sel, onclick: () => { sel = x.id; render(); } })), Math.max(...learn.map((x) => AX.params(x, two)))));
      mcol.replaceChildren(barList(learn.map((x) => ({ label: x.name, value: AX.macs(x, two), text: fmt(AX.macs(x, two)) + " · " + pctOf(AX.macs(x, two), T.macs), on: x.id === sel, onclick: () => { sel = x.id; render(); } })), Math.max(...learn.map((x) => AX.macs(x, two)))));
      const conv = L.filter((x) => x.kind === "conv"), fc = L.filter((x) => x.kind === "fc");
      const cm = conv.reduce((s, x) => s + AX.macs(x, two), 0), fp = fc.reduce((s, x) => s + AX.params(x, two), 0);
      totals.innerHTML = "Total: <b>" + fmt(T.params) + "</b> weights (the paper rounds to 60 million) and <b>" + fmt(T.macs) + "</b> multiplications per image. The convolutional layers do <b>" + (cm / T.macs * 100).toFixed(0) + "%</b> of the computation; the three fully connected layers hold <b>" + (fp / T.params * 100).toFixed(0) + "%</b> of the weights." + (two ? "" : " Without the two-GPU split the same network would need " + ((T.macs / AX.totals(true).macs - 1) * 100).toFixed(0) + "% more computation.");
    }
    render();
  })();

  // ======================================================================
  // 7. The paper, section by section
  // ======================================================================
  (function paper() {
    const fig = $("axPaper"); if (!fig) return;
    const loadPhoto = (() => { const c = {}; return (f) => (c[f] ? Promise.resolve(c[f]) : AX.loadImage("alexnet/img/" + f + ".jpg").then((i) => (c[f] = i))); })();
    const jump = (id, text) => h("p.ax-jump", h("a", { href: "#" + id }, text + " ↓"));
    const stat = (a, b) => h("div", h("dt", a), h("dd", b));
    const facts = (...rows) => h("dl.ax-facts", rows.map(([a, b]) => stat(a, b)));
    const two = (left, right) => h("div.ax-two", left, right);
    const sec = (ref, ...kids) => h("div.ax-pp", h("p.ax-ref", ref), ...kids);

    const items = [
      // ---------------- Abstract ----------------
      { title: "Abstract", render(body) {
        const slider = h("input", { type: "range", min: 1, max: 10, value: 3, "aria-label": "Where the true label ranks in the model's list" });
        const list = h("ol.ax-guess"), badges = h("div.ax-badges");
        const names = ["African elephant", "Indian elephant", "tusker", "water buffalo", "hippopotamus", "warthog", "ox", "boar", "rhinoceros", "tapir"];
        const upd = () => {
          const r = +slider.value;
          list.innerHTML = names.map((n, i) => "<li class='" + (i + 1 === r ? "true" : "") + "'>" + n + (i + 1 === r ? " <b>(the true label)</b>" : "") + "</li>").join("");
          badges.innerHTML = "<span class='" + (r === 1 ? "ok" : "no") + "'>Top-1 " + (r === 1 ? "correct" : "wrong") + "</span><span class='" + (r <= 5 ? "ok" : "no") + "'>Top-5 " + (r <= 5 ? "correct" : "wrong") + "</span>";
        };
        slider.addEventListener("input", upd); upd();
        body.append(two(sec("Abstract and Section 1",
          h("p", "The authors trained a large, deep convolutional network to sort 1.2 million high-resolution photos into 1,000 classes. On the 2010 test set its top-1 and top-5 error rates were 37.5% and 17.0%, far better than the best earlier results. A variant entered in the 2012 contest won with a top-5 error of 15.3% against 26.2% for second place."),
          facts(["60 million", "weights"], ["650,000", "neurons"], ["5 + 3", "convolutional + fully connected layers"], ["1,000", "output classes"])),
          h("div", h("p.ax-label", "What do top-1 and top-5 mean?"), h("p.ax-note", "The model lists its guesses from most to least likely. Top-1 error counts a miss unless the true label is first. Top-5 error counts a miss only if the true label is not in the first five. Drag to move the true label down the list. (These guesses are illustrative, not real network output.)"), slider, list, badges)));
      } },

      // ---------------- Dataset ----------------
      { title: "The dataset", render(body) {
        const photos = [["elephant-away", "Savanna"], ["elephant-bathing", "River"], ["savanna-plain", "Wide landscape"]]; let pi = 0, sq = true, mean = false;
        const cv = h("canvas"), chips = h("div.ax-chips", photos.map(([f, l], i) => h("button.ax-chip", { type: "button", "data-i": i, onclick: () => { pi = i; draw(); } }, l)));
        const bq = h("button.ax-chip", { type: "button", onclick: () => { sq = !sq; draw(); } }, "Crop to the centre square"), bm = h("button.ax-chip", { type: "button", onclick: () => { mean = !mean; draw(); } }, "Subtract the average pixel");
        const draw = async () => {
          const im = await loadPhoto(photos[pi][0]); const iw = im.naturalWidth, ih = im.naturalHeight, w = 380, hh = Math.round(w * ih / iw);
          cv.width = w; cv.height = hh; const ctx = cv.getContext("2d"); ctx.drawImage(im, 0, 0, w, hh);
          if (mean) { const d = ctx.getImageData(0, 0, w, hh), px = d.data; let r = 0, g = 0, b = 0; const n = w * hh; for (let i = 0; i < n; i++) { r += px[i * 4]; g += px[i * 4 + 1]; b += px[i * 4 + 2]; } r /= n; g /= n; b /= n; for (let i = 0; i < n; i++) { px[i * 4] = AX.clamp(128 + (px[i * 4] - r), 0, 255); px[i * 4 + 1] = AX.clamp(128 + (px[i * 4 + 1] - g), 0, 255); px[i * 4 + 2] = AX.clamp(128 + (px[i * 4 + 2] - b), 0, 255); } ctx.putImageData(d, 0, 0); }
          if (sq) { const s = Math.min(w, hh), x0 = (w - s) / 2, y0 = (hh - s) / 2; ctx.fillStyle = "rgba(255,255,255,.72)"; ctx.fillRect(0, 0, w, y0); ctx.fillRect(0, y0 + s, w, hh - y0 - s); ctx.fillRect(0, y0, x0, s); ctx.fillRect(x0 + s, y0, w - x0 - s, s); ctx.strokeStyle = "#b3261e"; ctx.lineWidth = 2; ctx.strokeRect(x0 + 1, y0 + 1, s - 2, s - 2); }
          chips.querySelectorAll(".ax-chip").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.i === pi))); bq.setAttribute("aria-pressed", String(sq)); bm.setAttribute("aria-pressed", String(mean));
        };
        body.append(two(sec("Section 2",
          h("p", "ImageNet is a database of over 15 million labelled photographs in roughly 22,000 categories, labelled by people using Amazon's Mechanical Turk. The yearly contest, ILSVRC, uses a subset: about 1,000 images in each of 1,000 categories."),
          facts(["1.2 million", "training images"], ["50,000", "validation images"], ["150,000", "test images"]),
          h("p", "The network needs a fixed input size, so each photo is scaled until its shorter side is 256 pixels, then the central 256 × 256 square is cut out. The only other step is subtracting the average pixel value from every pixel. The network learns from nearly raw colours.")),
          h("div", h("p.ax-label", "The only preparation ", h("span", "(try both)")), h("div.ax-chips.tight", chips), h("div.ax-chips", bq, bm), h("div.ax-cv.free", cv))));
        draw();
      } },

      // ---------------- ReLU ----------------
      { title: "ReLU", render(body) {
        const cv = h("canvas", { width: 560, height: 280, "aria-label": "Plot of three activation functions" }), slider = h("input", { type: "range", min: -60, max: 60, value: 18, "aria-label": "Input value" }), read = h("div.ax-readout");
        const F = { ReLU: [(x) => Math.max(0, x), (x) => (x > 0 ? 1 : 0), "#0f5a44"], tanh: [Math.tanh, (x) => 1 - Math.tanh(x) ** 2, "#2b5fb3"], sigmoid: [(x) => 1 / (1 + Math.exp(-x)), (x) => { const s = 1 / (1 + Math.exp(-x)); return s * (1 - s); }, "#b4531a"] };
        const draw = () => {
          const ctx = cv.getContext("2d"), W = cv.width, H = cv.height, x0 = +slider.value / 10; ctx.clearRect(0, 0, W, H);
          const px = (x) => W / 2 + x * (W / 12), py = (y) => H * 0.78 - y * (H * 0.22);
          ctx.strokeStyle = "#ddd7ca"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, py(0)); ctx.lineTo(W, py(0)); ctx.moveTo(px(0), 0); ctx.lineTo(px(0), H); ctx.stroke();
          ctx.font = "600 12px sans-serif"; ctx.fillStyle = "#6e695d"; for (let t = -5; t <= 5; t += 5) ctx.fillText(t, px(t) - 3, py(0) + 16);
          for (const [n, [f, , c]] of Object.entries(F)) { ctx.strokeStyle = c; ctx.lineWidth = 2.4; ctx.beginPath(); for (let i = 0; i <= 240; i++) { const x = -6 + 12 * i / 240, y = Math.min(f(x), 4); i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y)); } ctx.stroke(); ctx.fillStyle = c; ctx.fillText(n, n === "ReLU" ? px(3.7) : n === "tanh" ? px(-5.9) : px(-5.9), n === "ReLU" ? py(3.9) : n === "tanh" ? py(-1) - 12 : py(0) - 8); }
          ctx.strokeStyle = "#121614"; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(px(x0), 0); ctx.lineTo(px(x0), H); ctx.stroke(); ctx.setLineDash([]);
          read.innerHTML = "<dl>" + Object.entries(F).map(([n, [f, d, c]]) => "<div><dt style='color:" + c + "'>" + n + "</dt><dd>" + minus(f(x0).toFixed(2)) + "<small> slope " + d(x0).toFixed(3) + "</small></dd></div>").join("") + "</dl>";
        };
        slider.addEventListener("input", draw); draw();
        const bars = h("div.ax-compare", h("p.ax-label", "Training steps to reach 25% error on CIFAR-10 ", h("span", "(the paper's Figure 1, relative)")), barList([{ label: "tanh", value: 6, text: "about 6×" }, { label: "ReLU", value: 1, text: "1×", on: true }], 6));
        body.append(two(sec("Section 3.1, the first and most important choice",
          h("p", "The usual way to model a neuron was a smooth S-shaped curve such as tanh. Those curves flatten out for large inputs, so the slope, and with it the learning signal, nearly vanishes. The authors used the ", h("b", "rectified linear unit"), ", ", h("code", "f(x) = max(0, x)"), ", whose slope is 1 for any positive input."),
          h("p", "In their test, a four-layer convolutional network with ReLUs reached 25% training error on CIFAR-10 about six times faster than the same network with tanh. They write that they could not have experimented with such large networks without it."), bars),
          h("div", h("p.ax-label", "Drag the input and compare the slopes"), cv, h("div.ax-slider", slider), read)));
      } },

      // ---------------- Two GPUs ----------------
      { title: "Two GPUs", render(body) {
        const svgRows = ["Conv 1", "Conv 2", "Conv 3", "Conv 4", "Conv 5", "FC 6", "FC 7", "FC 8"];
        const cross = [false, false, true, false, false, true, true, true];
        let x = 20; const cells = svgRows.map((n, i) => { const cx = x; x += 82; return "<g><rect x='" + cx + "' y='24' width='62' height='42' class='g1'/><rect x='" + cx + "' y='104' width='62' height='42' class='g2'/><text x='" + (cx + 31) + "' y='49' text-anchor='middle'>" + n + "</text><text x='" + (cx + 31) + "' y='129' text-anchor='middle'>" + n + "</text>" + (i < 7 ? "<line x1='" + (cx + 62) + "' y1='45' x2='" + (cx + 82) + "' y2='45' class='ln'/><line x1='" + (cx + 62) + "' y1='125' x2='" + (cx + 82) + "' y2='125' class='ln'/>" : "") + (cross[i + 1] && i < 7 ? "<line x1='" + (cx + 62) + "' y1='45' x2='" + (cx + 82) + "' y2='125' class='cx'/><line x1='" + (cx + 62) + "' y1='125' x2='" + (cx + 82) + "' y2='45' class='cx'/>" : "") + "</g>"; }).join("");
        const T2 = AX.totals(true), T1 = AX.totals(false);
        body.append(two(sec("Section 3.2",
          h("p", "A single GTX 580 has only 3 GB of memory, which limits how big a network fits on it. The authors found that 1.2 million examples are enough to train networks too big for one GPU, so they spread the network across two. Half the kernels live on each GPU, with one more trick: the GPUs only talk to each other at certain layers."),
          h("p", "Layer 3 reads every map from layer 2, but layers 4 and 5 only read the maps on their own GPU. This reduced the top-1 and top-5 error by 1.7% and 1.2% compared with a network with half as many kernels trained on one GPU, and it trained a little faster too."),
          facts([fmt(T2.params), "weights as built"], [fmt(T1.params), "weights if every kernel saw every map"], [fmt(T2.macs), "multiplications as built"], [fmt(T1.macs), "multiplications if every kernel saw every map"])),
          h("div", h("p.ax-label", "The two columns of the network ", h("span", "(crossing lines are where the GPUs talk)")), h("div.ax-gpu", { html: "<svg viewBox='0 0 " + (x + 4) + " 172' role='img' aria-label='Two GPUs running parallel copies of the layers, crossing at conv 3 and the fully connected layers'>" + cells + "<text x='6' y='100' class='lbl'>GPU 1</text><text x='6' y='168' class='lbl'>GPU 2</text></svg>" }), h("p.ax-note", "Kernels on the two GPUs learned different things. The paper says GPU 1's first-layer kernels were mostly colour-blind, while GPU 2's were mostly colour-specific, and that this happened on every run regardless of the random start."))));
      } },

      // ---------------- Normalise and pool ----------------
      { title: "Normalise and pool", render(body) {
        const lrn = h("div.ax-lrn"), pool = h("div.ax-pool"), ps = h("input", { type: "range", min: 1, max: 60, value: 12, "aria-label": "Size of the activations" });
        const act = [5, 38, 120, 64, 22, 9, 95, 31, 12]; let overlap = true, sel = [0, 0];
        const drawLrn = () => {
          const sc = +ps.value / 12, a = act.map((v) => v * sc), k = 2, n = 5, al = 1e-4, be = 0.75;
          const b = a.map((v, i) => { let s = 0; for (let j = Math.max(0, i - 2); j <= Math.min(8, i + 2); j++) s += a[j] * a[j]; return v / Math.pow(k + al * s, be); });
          const mx = Math.max(...a, 1);
          lrn.innerHTML = a.map((v, i) => "<div class='c'><span class='bar'><i style='height:" + v / mx * 100 + "%' class='a'></i><i style='height:" + b[i] / mx * 100 + "%' class='b'></i></span><small>" + (i + 1) + "</small></div>").join("");
          lrn.dataset.note = "Light bars: activity after ReLU. Dark bars: after normalisation. Larger neighbours shrink a channel; at small sizes nothing changes (k = 2, n = 5, α = 10⁻⁴, β = 0.75).";
        };
        ps.addEventListener("input", drawLrn); drawLrn();
        const R = AX.rng(11), grid = [...Array(49)].map(() => Math.floor(R() * 10));
        const drawPool = () => {
          const z = overlap ? 3 : 2, s = 2, o = Math.floor((7 - z) / s) + 1, out = [];
          for (let y = 0; y < o; y++) for (let x = 0; x < o; x++) { let m = -1; for (let u = 0; u < z; u++) for (let v = 0; v < z; v++) m = Math.max(m, grid[(y * s + u) * 7 + x * s + v]); out.push(m); }
          if (sel[0] >= o || sel[1] >= o) sel = [0, 0];
          const win = (x, y) => x >= sel[0] * s && x < sel[0] * s + z && y >= sel[1] * s && y < sel[1] * s + z;
          pool.innerHTML = "<div class='in'>" + grid.map((v, i) => "<span class='" + (win(i % 7, Math.floor(i / 7)) ? "w" : "") + "'>" + v + "</span>").join("") + "</div><i>→</i><div class='out' style='grid-template-columns:repeat(" + o + ",1fr)'>" + out.map((v, i) => "<button type='button' data-x='" + (i % o) + "' data-y='" + Math.floor(i / o) + "' class='" + (i % o === sel[0] && Math.floor(i / o) === sel[1] ? "w" : "") + "'>" + v + "</button>").join("") + "</div>";
          pool.querySelectorAll(".out button").forEach((b) => b.addEventListener("click", () => { sel = [+b.dataset.x, +b.dataset.y]; drawPool(); }));
          mode.textContent = "Window " + z + " × " + z + ", step " + s + " (" + (overlap ? "overlapping, as in AlexNet" : "not overlapping") + ") gives a " + o + " × " + o + " result";
        };
        const mode = h("p.ax-say"), tog = h("div.ax-chips", h("button.ax-chip", { type: "button", onclick: () => { overlap = true; tg(); drawPool(); } }, "3 × 3 windows, step 2"), h("button.ax-chip", { type: "button", onclick: () => { overlap = false; tg(); drawPool(); } }, "2 × 2 windows, step 2"));
        const tg = () => tog.querySelectorAll(".ax-chip").forEach((b, i) => b.setAttribute("aria-pressed", String((i === 0) === overlap)));
        tg(); drawPool();
        body.append(two(sec("Sections 3.3 and 3.4",
          h("p", h("b", "Local response normalisation."), " After the ReLU, each channel's activity is divided by a term built from the activities of its neighbouring channels at the same position. It works like lateral inhibition in real neurons: channels compete, and big activities suppress their neighbours. It cut the top-1 and top-5 errors by 1.4% and 1.2%."),
          h("p.ax-eq.sm", "b = a / (k + α Σ a²)^β"),
          h("p", h("b", "Overlapping pooling."), " A pooling layer summarises a small neighbourhood, here by keeping its maximum. Usually the windows tile the map without overlapping. AlexNet uses 3 × 3 windows moved 2 steps at a time, so neighbours overlap. This lowered the top-1 and top-5 errors by 0.4% and 0.3% and made overfitting slightly harder.")),
          h("div", h("p.ax-label", "Normalisation ", h("span", "(drag to make the activities larger)")), lrn, h("div.ax-slider", ps), h("p.ax-note", { text: lrn.dataset.note }), h("p.ax-label.gap", "Pooling a 7 × 7 map ", h("span", "(click a result to see its window)")), tog, pool, mode)));
      } },

      // ---------------- Overfitting ----------------
      { title: "Overfitting", render(body) {
        let ox = 16, oy = 16, flip = false, tenOn = false, drop = 0.5, mask = null;
        const cv = h("canvas", { width: 256, height: 256, "aria-label": "A 256 by 256 picture with a 224 by 224 crop box" }), sx = h("input", { type: "range", min: 0, max: 32, value: ox, "aria-label": "Crop left" }), sy = h("input", { type: "range", min: 0, max: 32, value: oy, "aria-label": "Crop top" });
        const crop = h("canvas", { width: 224, height: 224 }), cnt = h("p.ax-say", { "aria-live": "polite" });
        let img = null;
        const bf = h("button.ax-chip", { type: "button", onclick: () => { flip = !flip; draw(); } }, "Flip it"), bt = h("button.ax-chip", { type: "button", onclick: () => { tenOn = !tenOn; draw(); } }, "Show the 10 test crops");
        const draw = () => {
          if (!img) return; const ctx = cv.getContext("2d"); ctx.drawImage(img, 0, 0, 256, 256);
          ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(0, 0, 256, 256); ctx.drawImage(img, ox, oy, 224, 224, ox, oy, 224, 224);
          ctx.strokeStyle = "#b3261e"; ctx.lineWidth = 2; ctx.strokeRect(ox + 1, oy + 1, 222, 222);
          if (tenOn) { ctx.strokeStyle = "#0f5a44"; ctx.lineWidth = 1; [[0, 0], [32, 0], [0, 32], [32, 32], [16, 16]].forEach(([a, b]) => ctx.strokeRect(a + .5, b + .5, 223, 223)); }
          const c2 = crop.getContext("2d"); c2.save(); if (flip) { c2.translate(224, 0); c2.scale(-1, 1); } c2.drawImage(img, ox, oy, 224, 224, 0, 0, 224, 224); c2.restore();
          bf.setAttribute("aria-pressed", String(flip)); bt.setAttribute("aria-pressed", String(tenOn));
          cnt.innerHTML = "Crop at (" + ox + ", " + oy + ")" + (flip ? ", mirrored" : "") + ". There are 32 × 32 = " + fmt(1024) + " positions, and 2 mirror images, so each photo can show up as <b>" + fmt(2048) + "</b> different training examples. At test time the net averages its answers over 10: the four corners, the centre, and their mirror images.";
        };
        sx.addEventListener("input", () => { ox = +sx.value; draw(); }); sy.addEventListener("input", () => { oy = +sy.value; draw(); });
        loadPhoto("elephant-calf").then((im) => { const c = document.createElement("canvas"); c.width = c.height = 256; const s = Math.min(im.naturalWidth, im.naturalHeight); c.getContext("2d").drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, 256, 256); img = c; draw(); });
        const dg = h("div.ax-dots"), dsl = h("input", { type: "range", min: 0, max: 90, value: 50, "aria-label": "Dropout probability" }), dnote = h("p.ax-say", { "aria-live": "polite" });
        const resample = () => { const R = Math.random; mask = [...Array(64)].map(() => R() >= drop); redrop(); };
        const redrop = () => { dg.innerHTML = mask.map((on) => "<i class='" + (on ? "on" : "") + "'></i>").join(""); const k = mask.filter(Boolean).length; dnote.innerHTML = "On this pass " + k + " of 64 neurons are active. Every time an image is shown, a different random set is switched off. At test time all of them are on, and each output is multiplied by " + (1 - drop).toFixed(1).replace(/\.0$/, "") + " to compensate."; };
        dsl.addEventListener("input", () => { drop = +dsl.value / 100; resample(); }); resample();
        body.append(two(sec("Section 4, two ways to stop memorising",
          h("p", "With 60 million weights the network could simply memorise its 1.2 million training photos. Each image only supplies about 10 bits of constraint (a choice among 1,000 labels), which is not enough to pin down so many weights. Two main defences:"),
          h("p", h("b", "Data augmentation."), " Cut random 224 × 224 crops and mirror images from each 256 × 256 photo. That multiplies the training set by 2,048 for almost no computing cost, since the crops are made on the CPU while the GPU trains. The authors also randomly shifted the lighting colours, which cut the top-1 error by more than 1%."),
          h("p", h("b", "Dropout."), " In the first two fully connected layers, each neuron's output is set to zero with probability 0.5 on every pass. Neurons cannot lean on particular partners, so each has to learn something useful on its own. It roughly doubles the training time, but without it the network overfits badly.")),
          h("div", h("p.ax-label", "Move the crop"), h("div.ax-augrow", h("div", h("div.ax-cv.free", cv), h("label.ax-slide", h("span", "Move the crop left or right"), h("b", "0–32"), sx), h("label.ax-slide", h("span", "Move the crop up or down"), h("b", "0–32"), sy), h("div.ax-chips", bf, bt)), h("div", h("div.ax-cv.free.sm", crop), h("p.ax-note", "What the network sees"))), cnt, h("p.ax-label.gap", "Dropout ", h("span", "(probability of switching a neuron off)")), h("div.ax-slider", dsl), dg, dnote)));
      } },

      // ---------------- Learning ----------------
      { title: "Learning", render(body) {
        body.append(two(sec("Section 5",
          h("p", "AlexNet was trained with stochastic gradient descent, using the update rule from part 6: momentum plus a little weight decay."),
          facts(["128", "images per batch"], ["0.9", "momentum"], ["0.0005", "weight decay"], ["0.01", "starting learning rate, divided by 10 three times"], ["~90", "passes over the 1.2 million images"], ["5–6 days", "on two GTX 580s"]),
          h("p", "Weights start as small random numbers (a Gaussian with standard deviation 0.01). Some biases start at 1 so the ReLUs begin with positive input. The learning rate is cut by 10 whenever the validation error stops improving, by hand.")),
          h("div", h("p.ax-label", "Play with the update rule"), h("p.ax-note", "The rule is the same one you can run in the lab above. Change the knobs and watch a weight roll down a valley."), jump("axUpdate", "Open the update-rule lab"), h("p.ax-label.gap", "How long would this take without GPUs?"), jump("axCompute", "Open the compute calculator"))));
      } },

      // ---------------- Results ----------------
      { title: "Results", render(body) {
        let which = "2010";
        const data = {
          "2010": { note: "ILSVRC-2010 test set (Table 1). Lower is better.", rows: [["Sparse coding", 47.1, 28.2], ["SIFT + Fisher vectors", 45.7, 25.7], ["AlexNet (CNN)", 37.5, 17.0, true]] },
          "2012": { note: "ILSVRC-2012 (Table 2). Top-1 is validation error; top-5 is test error where the paper reports it, validation otherwise. Models marked * were pre-trained on the whole ImageNet 2011 release.", rows: [["SIFT + Fisher vectors (second place)", null, 26.2], ["1 CNN", 40.7, 18.2], ["5 CNNs averaged", 38.1, 16.4], ["1 CNN*", 39.0, 16.6], ["7 CNNs averaged*", 36.7, 15.3, true]] }
        };
        const holder = h("div"), chips = h("div.ax-chips", h("button.ax-chip", { type: "button", onclick: () => { which = "2010"; r(); } }, "2010 contest"), h("button.ax-chip", { type: "button", onclick: () => { which = "2012"; r(); } }, "2012 contest"));
        const r = () => {
          chips.querySelectorAll(".ax-chip").forEach((b, i) => b.setAttribute("aria-pressed", String((i === 0) === (which === "2010")))); const d = data[which];
          holder.replaceChildren(h("p.ax-note", d.note), h("div.ax-res", d.rows.map((row) => h("div.ax-resrow" + (row[3] ? ".win" : ""), h("p", row[0]), h("div", row[1] != null ? h("div.m", h("em", "top-1"), h("span.t1", h("i", { style: "width:" + row[1] * 2 + "%" })), h("b", row[1] + "%")) : null, h("div.m", h("em", "top-5"), h("span.t5", h("i", { style: "width:" + row[2] * 2 + "%" })), h("b", row[2] + "%")))))));
        };
        r();
        body.append(two(sec("Section 6",
          h("p", "On the 2010 test set AlexNet's top-5 error was 17.0%, against 25.7% for the best published method and 28.2% for the best contest entry. In the 2012 contest, an average of seven networks (two of them pre-trained on a bigger set of 15 million images) reached 15.3% top-5 error; the second-best entry scored 26.2%."),
          h("p", "The authors also report what happens when a layer is removed: losing any middle convolutional layer costs about 2% in top-1 accuracy. So depth really matters.")),
          h("div", chips, holder)));
      } },

      // ---------------- What it learned ----------------
      { title: "What it learned", render(body) {
        body.append(two(sec("Section 6.1",
          h("p", h("b", "The first-layer kernels."), " Figure 3 of the paper shows all 96. The network learned kernels selective for frequency and orientation, plus coloured blobs, without being told to."),
          h("p", h("b", "The 4,096-number vector."), " Figure 4 shows test images next to the six training images whose last-hidden-layer vectors are closest in Euclidean distance. The authors note that, at the pixel level, the retrieved images are generally not close to the query. For example, the retrieved dogs and elephants appear in a variety of poses."),
          h("p", "They add that comparing 4,096-number vectors directly is inefficient, but that training an auto-encoder to compress them into short binary codes should give a much better image-retrieval method than working from raw pixels.")),
          h("div", h("p.ax-label", "See both for yourself"), jump("axZoo", "Browse generated first-layer kernels on real photos"), jump("axElephants", "Compare pixel distance with the paper's elephant example"))));
      } }
    ];

    AX.tabs(fig, items, (it, body) => { body.classList.add("ax-fade"); it.render(body); });
    cap(fig, "Try it.", "Every tab summarises a section of the paper in plain English and has something to try. The section numbers are the paper's own. Wording and examples are mine.");
  })();
})();
