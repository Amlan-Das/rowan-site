/* Parts 1 to 4: dot product, convolution, vectorization, tensors and the kernel zoo. */
(function () {
  "use strict";
  const AX = window.AX, $ = AX.$, h = AX.h, minus = AX.minus;
  const num = (v) => minus(String(+v.toFixed(2)));
  const cap = (fig, bold, text) => fig.append(h("figcaption.ax-cap", h("b", bold + " "), text));

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
