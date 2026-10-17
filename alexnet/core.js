/* Shared pieces for alexnet.html: small DOM and canvas helpers, the AlexNet layer arithmetic,
   the kernel generators and the digit samples from the last page. Everything else hangs off window.AX. */
(function () {
  "use strict";
  const AX = (window.AX = {});
  const $ = (id) => document.getElementById(id);
  AX.$ = $;
  AX.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- tiny DOM builder: h("div.cls#id", {attr}, child, child...) ----------
  AX.h = function (spec, attrs, ...kids) {
    const m = /^([a-z0-9]+)((?:[.#][\w-]+)*)$/i.exec(spec) || [null, "div", ""];
    const el = document.createElement(m[1]);
    (m[2].match(/[.#][\w-]+/g) || []).forEach((t) => (t[0] === "." ? el.classList.add(t.slice(1)) : (el.id = t.slice(1))));
    if (attrs && typeof attrs === "object" && !(attrs instanceof Node) && !Array.isArray(attrs)) {
      for (const k in attrs) {
        if (k === "html") el.innerHTML = attrs[k];
        else if (k === "text") el.textContent = attrs[k];
        else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
      }
    } else if (attrs != null) kids.unshift(attrs);
    kids.flat().forEach((c) => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return el;
  };
  const h = AX.h;

  AX.fmt = (n, d) => (d == null ? Math.round(n) : +n.toFixed(d)).toLocaleString("en-US");
  AX.minus = (s) => String(s).replace("-", "−");
  AX.sig = (v, d = 2) => AX.minus((+v.toFixed(d)).toString());
  AX.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  AX.rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  AX.gauss = (r) => { const u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // ---------- colour: green for positive, red for negative, like the last page ----------
  const GREEN = [15, 90, 68], RED = [179, 38, 30];
  AX.tint = (v, m) => {
    if (!v) return "#ffffff";
    const a = Math.min(1, Math.abs(v) / (m || 1)), c = v > 0 ? GREEN : RED;
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (0.1 + 0.9 * a).toFixed(3) + ")";
  };
  AX.rgbOf = (v, m) => {                      // same mapping as numbers on white, for pixel buffers
    const a = Math.min(1, Math.abs(v) / (m || 1)), c = v > 0 ? GREEN : RED, t = v === 0 ? 0 : 0.1 + 0.9 * a;
    return [255 + (c[0] - 255) * t, 255 + (c[1] - 255) * t, 255 + (c[2] - 255) * t];
  };

  // ---------- canvas helpers ----------
  // Draw a w x h array as crisp squares onto a canvas that is already sized w*scale by h*scale
  AX.drawGrid = (cv, data, w, h2, fn) => {
    const ctx = cv.getContext("2d"), cw = cv.width / w, ch = cv.height / h2;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < h2; y++) for (let x = 0; x < w; x++) { ctx.fillStyle = fn(data[y * w + x], x, y); ctx.fillRect(x * cw, y * ch, Math.ceil(cw), Math.ceil(ch)); }
  };
  // Put a w x h image of [r,g,b] bytes on a canvas of the same pixel size (CSS scales it up)
  AX.putRGB = (cv, rgb, w, h2) => {
    cv.width = w; cv.height = h2;
    const ctx = cv.getContext("2d"), im = ctx.createImageData(w, h2);
    for (let i = 0; i < w * h2; i++) { im.data[i * 4] = rgb[i * 3]; im.data[i * 4 + 1] = rgb[i * 3 + 1]; im.data[i * 4 + 2] = rgb[i * 3 + 2]; im.data[i * 4 + 3] = 255; }
    ctx.putImageData(im, 0, 0);
  };
  AX.loadImage = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  // The picture, centre-cropped to a square and scaled to n x n, as Float32 [0..1] RGB planes (HxWx3)
  AX.photoRGB = (img, n) => {
    const c = document.createElement("canvas"); c.width = c.height = n;
    const s = Math.min(img.naturalWidth, img.naturalHeight), sx = (img.naturalWidth - s) / 2, sy = (img.naturalHeight - s) / 2;
    c.getContext("2d").drawImage(img, sx, sy, s, s, 0, 0, n, n);
    const d = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, n, n).data, out = new Float32Array(n * n * 3);
    for (let i = 0; i < n * n; i++) { out[i * 3] = d[i * 4] / 255; out[i * 3 + 1] = d[i * 4 + 1] / 255; out[i * 3 + 2] = d[i * 4 + 2] / 255; }
    return out;
  };
  // Pointer position as a cell of a w x h grid drawn on this element
  AX.cellAt = (e, el, w, h2) => {
    const r = el.getBoundingClientRect();
    return [AX.clamp(Math.floor((e.clientX - r.left) / r.width * w), 0, w - 1), AX.clamp(Math.floor((e.clientY - r.top) / r.height * h2), 0, h2 - 1)];
  };

  // ---------- 3 x 3 kernels used in the first demos ----------
  AX.KERNELS = [
    { id: "vertical", name: "Vertical edge", k: [-1, 0, 1, -1, 0, 1, -1, 0, 1] },
    { id: "horizontal", name: "Horizontal edge", k: [-1, -1, -1, 0, 0, 0, 1, 1, 1] },
    { id: "diagonal", name: "Diagonal edge", k: [0, 1, 1, -1, 0, 1, -1, -1, 0] },
    { id: "spot", name: "Bright spot", k: [-0.5, -0.5, -0.5, -0.5, 1, -0.5, -0.5, -0.5, -0.5] },
    { id: "checker", name: "Checkerboard", k: [1, -1, 1, -1, 1, -1, 1, -1, 1] }
  ];

  // ---------- the AlexNet layers, with the paper's numbers ----------
  // depth = how many input maps each kernel sees. With two GPUs, conv 2, 4 and 5 only see the maps on their own GPU.
  AX.LAYERS = [
    { id: "input", name: "Input", kind: "input", out: [227, 227, 3] },
    { id: "conv1", name: "Conv 1", kind: "conv", inn: [227, 227, 3], k: 11, s: 4, p: 0, K: 96, depth: 3, depth1: 3, out: [55, 55, 96], lrn: true, pool: [27, 27, 96] },
    { id: "conv2", name: "Conv 2", kind: "conv", inn: [27, 27, 96], k: 5, s: 1, p: 2, K: 256, depth: 48, depth1: 96, out: [27, 27, 256], lrn: true, pool: [13, 13, 256] },
    { id: "conv3", name: "Conv 3", kind: "conv", inn: [13, 13, 256], k: 3, s: 1, p: 1, K: 384, depth: 256, depth1: 256, out: [13, 13, 384] },
    { id: "conv4", name: "Conv 4", kind: "conv", inn: [13, 13, 384], k: 3, s: 1, p: 1, K: 384, depth: 192, depth1: 384, out: [13, 13, 384] },
    { id: "conv5", name: "Conv 5", kind: "conv", inn: [13, 13, 384], k: 3, s: 1, p: 1, K: 256, depth: 192, depth1: 384, out: [13, 13, 256], pool: [6, 6, 256] },
    { id: "fc6", name: "FC 6", kind: "fc", n: 9216, m: 4096, out: [4096] },
    { id: "fc7", name: "FC 7", kind: "fc", n: 4096, m: 4096, out: [4096] },
    { id: "fc8", name: "FC 8", kind: "fc", n: 4096, m: 1000, out: [1000] }
  ];
  AX.params = (L, twoGPU = true) => {
    if (L.kind === "conv") { const d = twoGPU ? L.depth : L.depth1; return L.K * (L.k * L.k * d) + L.K; }
    if (L.kind === "fc") return L.n * L.m + L.m;
    return 0;
  };
  AX.macs = (L, twoGPU = true) => {            // multiply-adds for one image, forward pass
    if (L.kind === "conv") { const d = twoGPU ? L.depth : L.depth1; return L.out[0] * L.out[1] * L.K * L.k * L.k * d; }
    if (L.kind === "fc") return L.n * L.m;
    return 0;
  };
  AX.totals = (twoGPU = true) => AX.LAYERS.reduce((t, L) => ({ params: t.params + AX.params(L, twoGPU), macs: t.macs + AX.macs(L, twoGPU) }), { params: 0, macs: 0 });
  AX.outSize = (n, k, s, p) => (n + 2 * p - k) / s + 1;       // may be fractional, which is the point

  // LeNet-5 (LeCun et al., 1998), my arithmetic from its published layout
  AX.LENET = { params: 60840, macs: 326520, images: 60000, epochs: 20 };
  // Training facts from the paper
  AX.ALEX = { images: 1.2e6, epochs: 90, days: [5, 6], gpus: 2, gflopsPerGPU: 1.544 * 512 * 2 };

  // ---------- generated kernels in the style of the paper's Figure 3 (not the learned weights) ----------
  // 96 kernels of 11 x 11 x 3, stored as Float32Array(11*11*3) laid out [y][x][channel]
  AX.makeZoo = () => {
    const S = 11, c0 = 5, zoo = [];
    const make = (name, group, fn) => {
      const k = new Float32Array(S * S * 3);
      let sum = 0;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) for (let c = 0; c < 3; c++) { const v = fn(x - c0, y - c0, c); k[(y * S + x) * 3 + c] = v; sum += v * v; }
      const norm = Math.sqrt(sum) || 1;
      for (let i = 0; i < k.length; i++) k[i] /= norm;           // unit length, so every kernel is on the same scale
      zoo.push({ name, group, k });
    };
    const gabor = (x, y, th, lam, ph, sig) => {
      const xr = x * Math.cos(th) + y * Math.sin(th), yr = -x * Math.sin(th) + y * Math.cos(th);
      return Math.exp(-(xr * xr + 0.5 * yr * yr) / (2 * sig * sig)) * Math.cos(2 * Math.PI * xr / lam + ph);
    };
    // 48 stripes: grey, so the same weight on red, green and blue
    for (let o = 0; o < 8; o++) for (const lam of [4, 6, 9]) for (const ph of [0, Math.PI / 2]) {
      const th = o * Math.PI / 8;
      make("Stripes " + Math.round(th * 180 / Math.PI) + "°", "stripes", (x, y) => gabor(x, y, th, lam, ph, lam * 0.55 + 1));
    }
    // 24 colour edges: one colour on one side, its opposite on the other
    const opp = [[1, -1, 0], [-1, 1, 0], [0, 1, -1], [0, -1, 1], [1, 0, -1], [-1, 0, 1]];
    for (const col of opp) for (let o = 0; o < 4; o++) {
      const th = o * Math.PI / 4;
      make("Colour edge", "colour", (x, y, c) => col[c] * gabor(x, y, th, 8, Math.PI / 2, 3));
    }
    // 12 colour blobs: a patch of one colour in the middle, its opposite around it
    const blobCols = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, -1], [1, -1, 1], [-1, 1, 1]];
    for (const col of blobCols) for (const sgn of [1, -1]) {
      make("Colour blob", "blobs", (x, y, c) => { const r2 = x * x + y * y; return sgn * col[c] * (Math.exp(-r2 / 8) - 0.45 * Math.exp(-r2 / 30)); });
    }
    // 12 checkerboards: fine texture
    for (const lam of [3.2, 4.4, 6]) for (const ph of [[0, 0], [Math.PI / 2, 0], [0, Math.PI / 2], [Math.PI / 2, Math.PI / 2]]) {
      make("Checkerboard", "checker", (x, y) => Math.exp(-(x * x + y * y) / 18) * Math.cos(2 * Math.PI * x / lam + ph[0]) * Math.cos(2 * Math.PI * y / lam + ph[1]));
    }
    return zoo;
  };
  // Show a kernel as a small picture: grey 0.5 is zero, brighter is positive, darker is negative
  AX.kernelRGB = (k, S = 11) => {
    let m = 0; for (let i = 0; i < k.length; i++) m = Math.max(m, Math.abs(k[i]));
    const out = new Uint8ClampedArray(S * S * 3);
    for (let i = 0; i < k.length; i++) out[i] = 128 + (k[i] / (m || 1)) * 127;
    return out;
  };

  // ---------- the digits and templates from the last page ----------
  AX.samples = fetch("ai/mnist-samples.json").then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => ({ labels: d.labels, imgs: d.px.map((s) => { const a = new Float32Array(784); for (let i = 0; i < 784; i++) a[i] = parseInt(s.substr(i * 2, 2), 16) / 255; return a; }) }));
  AX.templates = fetch("ai/mnist-templates.json").then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => { const W = new Float32Array(7840); d.W.forEach((row, c) => row.forEach((v, p) => (W[c * 784 + p] = v))); return { d, W }; });

  // ---------- a small tab bar used by the paper reader ----------
  AX.tabs = (host, items, onShow) => {
    const bar = h("div.ax-tabs", { role: "tablist" }), body = h("div.ax-tabbody");
    const btns = items.map((it, i) => h("button.ax-tab", { type: "button", role: "tab", "aria-selected": "false", onclick: () => show(i) }, it.title));
    btns.forEach((b) => bar.append(b));
    host.append(bar, body);
    let cur = -1;
    function show(i) {
      if (i === cur) return;
      cur = i; btns.forEach((b, j) => { b.setAttribute("aria-selected", String(j === i)); });
      body.innerHTML = ""; onShow(items[i], body, i);
    }
    show(0);
    return { show };
  };
})();
