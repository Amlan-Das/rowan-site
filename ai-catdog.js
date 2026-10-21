/* Project 2 on ai-news.html: the cat-or-dog perceptron. Shows the same preprocessing as the Python (resize to 32 x 32, grayscale, flatten to
   1,024 numbers) on two illustration photos, then the very first weight update from all-zero weights, computed with the same rule. */
(function () {
  "use strict";
  const host = document.getElementById("cdDemo"); if (!host) return;
  const PHOTOS = { cat: { src: "ai/catdog/cat.png", label: 0 }, dog: { src: "ai/catdog/dog.png", label: 1 } }, N = 32, LR = 0.01;
  let who = "dog"; const imgs = {};
  host.innerHTML = '<div class="cd-tabs" role="group" aria-label="Photo"><button type="button" data-w="cat">Cat drawing</button><button type="button" data-w="dog">Dog drawing</button></div>' +
    '<div class="cd-flow">' +
    '<figure><canvas id="cdA" width="200" height="200"></canvas><figcaption><b>1. Picture</b>48 &times; 48 as stored</figcaption></figure><span class="ar">&rarr;</span>' +
    '<figure><canvas id="cdB" width="32" height="32"></canvas><figcaption><b>2. Resize</b>squashed to 32 &times; 32</figcaption></figure><span class="ar">&rarr;</span>' +
    '<figure><canvas id="cdC" width="32" height="32"></canvas><figcaption><b>3. Grayscale</b>one brightness per pixel</figcaption></figure><span class="ar">&rarr;</span>' +
    '<figure class="vec"><div id="cdV" class="cd-vec"></div><figcaption><b>4. Flatten</b>1,024 numbers</figcaption></figure></div>' +
    '<div class="cd-upd"><div class="cd-say" id="cdSay" aria-live="polite"></div><figure><canvas id="cdW" width="32" height="32"></canvas><figcaption id="cdWc"></figcaption></figure></div>';
  const $ = (id) => host.querySelector("#" + id);
  function load(k) { return imgs[k] ? Promise.resolve(imgs[k]) : new Promise((res) => { const im = new Image(); im.onload = () => { imgs[k] = im; res(im); }; im.src = PHOTOS[k].src; }); }
  const lum = (r, g, b) => (0.2989 * r + 0.587 * g + 0.114 * b) / 255;   // the weights torchvision's Grayscale uses
  function ramp(v, m) { const t = Math.max(-1, Math.min(1, v / (m || 1))); return t >= 0 ? [Math.round(255 - t * 240), Math.round(255 - t * 165), Math.round(255 - t * 60)] : [Math.round(255 + t * 60), Math.round(255 + t * 195), Math.round(255 + t * 215)]; }
  async function run() {
    const im = await load(who), ph = PHOTOS[who];
    const A = $("cdA").getContext("2d"); A.clearRect(0, 0, 200, 200); const s = Math.min(im.width, im.height); A.drawImage(im, 0, 0, im.width, im.height, 0, 0, 200, 200);
    const B = $("cdB"), bx = B.getContext("2d"); bx.imageSmoothingEnabled = true; bx.drawImage(im, 0, 0, im.width, im.height, 0, 0, N, N);
    const d = bx.getImageData(0, 0, N, N).data, x = new Float32Array(N * N), C = $("cdC").getContext("2d"), cd = C.createImageData(N, N);
    for (let i = 0; i < N * N; i++) { x[i] = lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]); const g = Math.round(x[i] * 255); cd.data.set([g, g, g, 255], i * 4); }
    C.putImageData(cd, 0, 0);
    $("cdV").innerHTML = "<code>[" + Array.from(x.slice(0, 8)).map((v) => v.toFixed(2)).join(", ") + ", &hellip; 1,016 more]</code>";
    // the first update, from all-zero weights and bias
    const score = 0, guess = score > 0 ? 1 : 0, err = ph.label - guess, W = $("cdW").getContext("2d"), wd = W.createImageData(N, N);
    const w = Array.from(x, (v) => LR * err * v), m = Math.max(0.0001, ...w.map(Math.abs)) / 0.9;
    w.forEach((v, i) => { const c = err === 0 ? [240, 244, 242] : ramp(v, m); wd.data.set([c[0], c[1], c[2], 255], i * 4); });
    W.putImageData(wd, 0, 0);
    $("cdSay").innerHTML = "<p><b>The very first update.</b> All 1,024 weights and the bias start at 0, so the score is 0 &times; every pixel + 0 = <b>0</b>, which is not above 0, so the guess is <b>0</b>.</p>" +
      "<p>This picture&rsquo;s label is <b>" + ph.label + "</b>, so <code>error = label &minus; guess = " + ph.label + " &minus; " + guess + " = " + err + "</code>.</p>" +
      (err === 0 ? "<p>The guess was right, so <code>error &times; pixels</code> is all zeros and <b>nothing changes</b>. Weights that start at zero only start moving when the model is wrong about a label-1 picture.</p>"
        : "<p>The new weights are <code>0 + 0.01 &times; " + err + " &times; pixels</code>: the weight picture becomes a faint copy of this picture, and the bias becomes " + (LR * err).toFixed(2) + ". Every later mistake adds or subtracts another picture, so over many images the weights drift toward &ldquo;what the label-1 pictures have more of than the label-0 pictures&rdquo;.</p>");
    $("cdWc").innerHTML = err === 0 ? "<b>Weights after this picture</b>unchanged (all zero)" : "<b>Weights after this picture</b>blue = positive, red = negative";
    host.querySelectorAll(".cd-tabs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.w === who)));
  }
  host.querySelectorAll(".cd-tabs button").forEach((b) => b.addEventListener("click", () => { who = b.dataset.w; run(); }));
  run();

  // results from my own run (ai/catdog-results.json), drawn as an accuracy graph, the learned weights and the headline numbers
  fetch("ai/catdog-results.json").then((r) => r.json()).then((d) => {
    const box = document.getElementById("cdResults"); if (!box || !d.per_epoch_accuracy) return;
    const pc = (v) => (v * 100).toFixed(1) + "%", acc = d.per_epoch_accuracy, E = acc.length, W = 520, H = 240, L = 44, R = 12, T = 14, B = 44;
    const x = (e) => L + e / (E - 1) * (W - L - R), y = (v) => T + (1 - v) * (H - T - B);
    const path = acc.map((v, e) => (e ? "L" : "M") + x(e).toFixed(1) + " " + y(v).toFixed(1)).join("");
    let g = ""; [0, 0.25, 0.5, 0.75, 1].forEach((v) => { g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="gl' + (v === 0.5 ? " ch" : "") + '"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" class="ty">' + Math.round(v * 100) + "%</text>"; });
    [0, 250, 500, 750, 1000].forEach((e) => { if (e <= E) g += '<text x="' + x(Math.min(e, E - 1)) + '" y="' + (H - 24) + '" class="tx">' + e + "</text>"; });
    g += '<text x="' + (L + (W - L - R) / 2) + '" y="' + (H - 6) + '" class="tx">epoch</text>';
    g += '<text x="' + (W - R - 4) + '" y="' + (y(0.5) - 5) + '" class="ty chl">coin flip: 50%</text>';
    if (typeof d.test_accuracy === "number") g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(d.test_accuracy) + '" y2="' + y(d.test_accuracy) + '" class="tline"/><text x="' + (W - R - 4) + '" y="' + (y(d.test_accuracy) + 14) + '" class="tt">test accuracy on unseen drawings: ' + pc(d.test_accuracy) + "</text>";
    box.innerHTML = '<h3>What actually happened</h3><p class="cd-run">One run of my script on my machine: ' + d.train_images + " training and " + d.test_images + " test drawings, " + E + " epochs.</p>" +
      '<figure class="cd-chart"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Training accuracy for each of ' + E + ' epochs"><g>' + g + '</g><path d="' + path + '" class="ln"/></svg><figcaption>Training accuracy in each epoch: the share of pictures guessed right before the weights changed.</figcaption></figure>' +
      '<div class="cd-row"><figure class="cd-wm"><canvas id="cdWm" width="32" height="32" aria-label="The learned weights as a 32 by 32 picture"></canvas><figcaption><b>The learned weights</b>red = positive, blue = negative</figcaption></figure>' +
      '<dl class="cd-num"><div><dt>Test accuracy</dt><dd>' + (typeof d.test_accuracy === "number" ? pc(d.test_accuracy) : "n/a") + "<small>" + (d.test_correct != null ? d.test_correct + " of " + d.test_images + " unseen drawings" : "") + "</small></dd></div><div><dt>Last epoch, training</dt><dd>" + pc(acc[E - 1]) + "<small>first epoch: " + pc(acc[0]) + "</small></dd></div><div><dt>Script&rsquo;s printed <code>correct</code></dt><dd>" + (d.printed_correct != null ? Number(d.printed_correct).toFixed(4) : "n/a") + "<small>average over all epochs</small></dd></div></dl></div>";
    box.hidden = false;
    const wm = box.querySelector("#cdWm"), c = wm.getContext("2d"), img = c.createImageData(32, 32), m = Math.max(...d.weights.map(Math.abs)) || 1;
    d.weights.forEach((v, i) => { const t = v / m, col = t >= 0 ? [255, Math.round(255 - t * 190), Math.round(255 - t * 200)] : [Math.round(255 + t * 200), Math.round(255 + t * 130), 255]; img.data.set([col[0], col[1], col[2], 255], i * 4); });
    c.putImageData(img, 0, 0);
  }).catch(() => {});
})();

/* "Which pixels matter": uses the 1,024 weights my run learned. A pixel's vote on one picture is weight x brightness, and the
   score is the sum of the votes plus the bias, so pixels with big weights move the answer far more than pixels with small ones. */
(function () {
  "use strict";
  const host = document.getElementById("cdPx"); if (!host) return;
  const N = 32, SRC = { cat: "ai/catdog/cat.png", dog: "ai/catdog/dog.png" };
  fetch("ai/catdog-results.json").then((r) => r.json()).then((d) => {
    const w = d.weights, b = d.bias; if (!w || w.length !== N * N) return;
    let who = "dog", keep = N * N, pick = -1, x = null; const imgs = {};
    const order = w.map((v, i) => i).sort((p, q) => Math.abs(w[q]) - Math.abs(w[p])), rank = new Array(N * N); order.forEach((i, r) => (rank[i] = r));
    const mw = Math.max(...w.map(Math.abs));
    host.innerHTML = '<h3>Which Pixels Matter</h3><p class="cd-run">Every pixel gets its own weight, and the weights are not equal. Here are the 1,024 weights my run learned, used on a drawing.</p>' +
      '<div class="px-tabs"><button type="button" data-w="cat">Cat drawing</button><button type="button" data-w="dog">Dog drawing</button></div>' +
      '<div class="px-grid"><figure><canvas id="pxA" width="32" height="32"></canvas><figcaption><b>The pixels</b>brightness, 0 to 1</figcaption></figure><span class="op">&times;</span>' +
      '<figure><canvas id="pxW" width="32" height="32"></canvas><figcaption><b>Their weights</b>red pushes toward dog, blue toward cat; faint means it barely counts</figcaption></figure><span class="op">=</span>' +
      '<figure><canvas id="pxC" width="32" height="32"></canvas><figcaption><b>Each pixel&rsquo;s vote</b>weight &times; brightness</figcaption></figure></div>' +
      '<label class="px-sl"><span>Count only the heaviest pixels</span><b id="pxN"></b><input id="pxR" type="range" min="1" max="100" value="100" aria-label="Percent of pixels counted, heaviest weights first"></label>' +
      '<div class="px-out" id="pxO" aria-live="polite"></div><p class="px-hint" id="pxH">Point at a pixel in any of the pictures to read its numbers.</p>' +
      '<p class="px-why"><b>Why some pixels weigh more.</b> A weight only changes when the model gets a picture wrong, and then it moves by that pixel&rsquo;s brightness. A pixel that looks the same in every cat and dog (the corners, the background) is pushed up by one class and down by the other, so its weight stays near zero. A pixel that is bright in dogs and dark in cats keeps being pushed the same way, so its weight grows. The size of a weight is how much that pixel has helped separate the classes.</p>';
    const $ = (id) => host.querySelector("#" + id);
    const ramp = (t) => (t >= 0 ? [255, Math.round(255 - t * 200), Math.round(255 - t * 210)] : [Math.round(255 + t * 210), Math.round(255 + t * 130), 255]);
    function paint(id, f) { const c = $(id), g = c.getContext("2d"), im = g.createImageData(N, N); for (let i = 0; i < N * N; i++) { const col = f(i); im.data.set([col[0], col[1], col[2], 255], i * 4); } g.putImageData(im, 0, 0); }
    function load(k) { return imgs[k] ? Promise.resolve(imgs[k]) : new Promise((res) => { const im = new Image(); im.onload = () => { imgs[k] = im; res(im); }; im.src = SRC[k]; }); }
    function draw() {
      const on = (i) => rank[i] < keep, vote = (i) => (on(i) ? w[i] * x[i] : 0);
      paint("pxA", (i) => { const g = Math.round(x[i] * 255); return [g, g, g]; });
      paint("pxW", (i) => (on(i) ? ramp(w[i] / mw) : [235, 238, 236]));
      const mv = Math.max(0.001, ...Array.from({ length: N * N }, (_, i) => Math.abs(w[i] * x[i])));
      paint("pxC", (i) => (on(i) ? ramp(vote(i) / mv) : [235, 238, 236]));
      let s = b, pos = 0, neg = 0; for (let i = 0; i < N * N; i++) { const v = vote(i); s += v; if (v > 0) pos += v; else neg -= v; }
      const tot = Array.from({ length: N * N }, (_, i) => Math.abs(w[i] * x[i])), all = tot.reduce((a, c) => a + c, 0), top = tot.slice().sort((p, q) => q - p).slice(0, 102).reduce((a, c) => a + c, 0);
      const say = s > 0 ? "dog" : "cat", right = say === who;
      $("pxN").textContent = Math.round(keep / 10.24) + "% (" + keep + " pixels)";
      $("pxO").innerHTML = '<div><dt>Votes toward dog</dt><dd>+' + pos.toFixed(1) + '</dd></div><div><dt>Votes toward cat</dt><dd>&minus;' + neg.toFixed(1) + '</dd></div><div><dt>Bias</dt><dd>' + (b >= 0 ? "+" : "&minus;") + Math.abs(b).toFixed(2) + '</dd></div><div class="ans"><dt>Score &rarr; answer</dt><dd>' + (s >= 0 ? "+" : "&minus;") + Math.abs(s).toFixed(1) + " &rarr; " + say + (right ? " &#10003;" : " &#10007;") + "</dd></div>" +
        '<p class="px-top">The 10% of pixels with the biggest votes carry <b>' + Math.round(top / all * 100) + '%</b> of all the vote on this drawing.</p>';
    }
    async function run() { const im = await load(who), c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"); g.drawImage(im, 0, 0, im.width, im.height, 0, 0, N, N); const dd = g.getImageData(0, 0, N, N).data; x = Array.from({ length: N * N }, (_, i) => (0.2989 * dd[i * 4] + 0.587 * dd[i * 4 + 1] + 0.114 * dd[i * 4 + 2]) / 255); host.querySelectorAll(".px-tabs button").forEach((q) => q.setAttribute("aria-pressed", String(q.dataset.w === who))); draw(); }
    host.querySelectorAll(".px-tabs button").forEach((q) => q.addEventListener("click", () => { who = q.dataset.w; run(); }));
    $("pxR").addEventListener("input", (e) => { keep = Math.max(1, Math.round(+e.target.value * 10.24)); draw(); });
    ["pxA", "pxW", "pxC"].forEach((id) => { const c = $(id); c.addEventListener("pointermove", (e) => { const r = c.getBoundingClientRect(), i = Math.min(N - 1, Math.floor((e.clientY - r.top) / r.height * N)) * N + Math.min(N - 1, Math.floor((e.clientX - r.left) / r.width * N)); if (!x) return;
      $("pxH").innerHTML = "Pixel (" + (i % N) + ", " + Math.floor(i / N) + "): brightness <b>" + x[i].toFixed(2) + "</b> &times; weight <b>" + w[i].toFixed(2) + "</b> = vote <b>" + (w[i] * x[i] >= 0 ? "+" : "&minus;") + Math.abs(w[i] * x[i]).toFixed(2) + "</b>. Its weight is the " + (rank[i] + 1) + (rank[i] % 100 > 9 && rank[i] % 100 < 14 ? "th" : ["th", "st", "nd", "rd"][(rank[i] + 1) % 10 > 3 ? 0 : (rank[i] + 1) % 10]) + " biggest of 1,024."; }); });
    host.hidden = false; run();
  }).catch(() => {});
})();
