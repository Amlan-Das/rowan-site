/* Project 2 on ai-news.html: the cat-or-dog perceptron. Shows the same preprocessing as the Python (resize to 32 x 32, grayscale, flatten to
   1,024 numbers) on two illustration photos, then the very first weight update from all-zero weights, computed with the same rule. */
(function () {
  "use strict";
  const host = document.getElementById("cdDemo"); if (!host) return;
  const PHOTOS = { cat: { src: "ai/catdog/cat.jpg", label: 0 }, dog: { src: "ai/catdog/dog.jpg", label: 1 } }, N = 32, LR = 0.01;
  let who = "dog"; const imgs = {};
  host.innerHTML = '<div class="cd-tabs" role="group" aria-label="Photo"><button type="button" data-w="cat">Cat photo</button><button type="button" data-w="dog">Dog photo</button></div>' +
    '<div class="cd-flow">' +
    '<figure><canvas id="cdA" width="200" height="200"></canvas><figcaption><b>1. Photo</b>any size</figcaption></figure><span class="ar">&rarr;</span>' +
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
      "<p>This photo&rsquo;s label is <b>" + ph.label + "</b>, so <code>error = label &minus; guess = " + ph.label + " &minus; " + guess + " = " + err + "</code>.</p>" +
      (err === 0 ? "<p>The guess was right, so <code>error &times; pixels</code> is all zeros and <b>nothing changes</b>. Weights that start at zero only start moving when the model is wrong about a label-1 photo.</p>"
        : "<p>The new weights are <code>0 + 0.01 &times; " + err + " &times; pixels</code>: the weight picture becomes a faint copy of this photo, and the bias becomes " + (LR * err).toFixed(2) + ". Every later mistake adds or subtracts another photo, so over many images the weights drift toward &ldquo;what the label-1 photos have more of than the label-0 photos&rdquo;.</p>");
    $("cdWc").innerHTML = err === 0 ? "<b>Weights after this photo</b>unchanged (all zero)" : "<b>Weights after this photo</b>blue = positive, red = negative";
    host.querySelectorAll(".cd-tabs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.w === who)));
  }
  host.querySelectorAll(".cd-tabs button").forEach((b) => b.addEventListener("click", () => { who = b.dataset.w; run(); }));
  run();

  // results from my own run, shown only once ai/catdog-results.json has real numbers
  fetch("ai/catdog-results.json").then((r) => r.json()).then((d) => {
    const box = document.getElementById("cdResults"); if (!box || typeof d.train_images !== "number") return;
    const f = (v, u) => (typeof v === "number" ? (u === "%" ? (v * 100).toFixed(1) + "%" : v.toLocaleString("en-US")) : "n/a");
    let html = '<dl class="pt-facts cd-facts"><div><dt>Training photos</dt><dd>' + f(d.train_images) + '</dd></div><div><dt>Test photos</dt><dd>' + f(d.test_images) + '</dd></div>' +
      '<div><dt>Training accuracy</dt><dd>' + f(d.training_accuracy_printed, "%") + '</dd></div><div><dt>Test accuracy</dt><dd>' + f(d.test_accuracy, "%") + "</dd></div></dl>";
    if (d.curve_image || d.weights_image) html += '<div class="cd-imgs">' + (d.curve_image ? '<figure><img src="' + d.curve_image + '" alt="Training accuracy over epochs, from my run"><figcaption>Training curve from my run</figcaption></figure>' : "") + (d.weights_image ? '<figure><img src="' + d.weights_image + '" alt="The learned pixel weights as a 32 by 32 picture"><figcaption>The learned pixel weights, 32 &times; 32</figcaption></figure>' : "") + "</div>";
    box.innerHTML = '<h3>What actually happened</h3>' + html; box.hidden = false;
  }).catch(() => {});
})();
