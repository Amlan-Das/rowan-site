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
