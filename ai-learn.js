/* "How a machine learns" on ai-news.html.

   Four live pieces that all use the same rule as template_digits.py:
     1. a by-hand playground: 3 shapes, 9 pixels, every number visible
     2. a live trainer: 10 pixel-font digits, the rule run thousands of times in the browser
     3. the real templates the Python script learned on MNIST (ai/mnist-templates.json)
     4. the Python itself, split into sections, with notes that light up the line they explain

   The learning rule, for every picture x with the right answer y:
       guess = the template with the highest score        (score = W[c] . x)
       W[y]     += x      add the picture's ink to the right template
       W[guess] -= x      take the picture's ink away from the guessed template
   If guess == y the two lines hit the same row and cancel out. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GREEN = [15, 90, 68], RED = [179, 38, 30];
  const tint = (v, m) => {
    if (!v) return "#ffffff";
    const a = Math.min(1, Math.abs(v) / m), c = v > 0 ? GREEN : RED;
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (0.1 + 0.9 * a).toFixed(3) + ")";
  };
  const signed = (v) => (v > 0 ? "+" : v < 0 ? "\u2212" : "") + Math.abs(v);

  // ---------- The model: a table W with one row per class, one column per pixel ----------
  class Net {
    constructor(classes, pixels) { this.C = classes; this.P = pixels; this.W = new Float32Array(classes * pixels); }
    reset() { this.W.fill(0); }
    scores(x) {                                   // W @ x
      const s = new Array(this.C);
      for (let c = 0; c < this.C; c++) {
        let t = 0; const o = c * this.P;
        for (let p = 0; p < this.P; p++) t += this.W[o + p] * x[p];
        s[c] = t;
      }
      return s;
    }
    predict(x) {                                  // argmax, and like NumPy a tie goes to the first row
      const s = this.scores(x); let g = 0;
      for (let c = 1; c < s.length; c++) if (s[c] > s[g]) g = c;
      return { guess: g, scores: s };
    }
    learn(x, y, guess) {                          // W[y] += x ; W[guess] -= x
      const a = y * this.P, b = guess * this.P;
      for (let p = 0; p < this.P; p++) { this.W[a + p] += x[p]; this.W[b + p] -= x[p]; }
    }
    maxAbs() { let m = 1; for (let i = 0; i < this.W.length; i++) m = Math.max(m, Math.abs(this.W[i])); return m; }
  }

  // ======================================================================
  // 0. Real handwriting: a wall of MNIST digits and the picture -> x explorer
  // ======================================================================
  const samples = fetch("ai/mnist-samples.json")
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => ({ labels: d.labels, imgs: d.px.map((s) => { const a = new Uint8Array(784); for (let i = 0; i < 784; i++) a[i] = parseInt(s.substr(i * 2, 2), 16); return a; }) }));
  const INK = [18, 22, 20];
  const paint = (cv, img, thr) => {                 // thr undefined: grey scan, otherwise ink / no ink
    const c = cv.getContext("2d"), d = c.createImageData(28, 28);
    for (let i = 0; i < 784; i++) {
      const v = img[i], o = i * 4, on = thr == null ? v : v > thr ? 255 : 0;
      d.data[o] = INK[0]; d.data[o + 1] = INK[1]; d.data[o + 2] = INK[2]; d.data[o + 3] = on;
    }
    c.putImageData(d, 0, 0);
  };

  (function wall() {
    const host = $("alWall");
    if (!host) return;
    samples.then((s) => {
      host.innerHTML = s.imgs.map(() => '<canvas width="28" height="28"></canvas>').join("");
      host.querySelectorAll("canvas").forEach((cv, i) => paint(cv, s.imgs[i]));
    }).catch(() => { $("alWallFig").hidden = true; });
  })();

  (function see() {
    const host = $("alSee");
    if (!host) return;
    samples.then((s) => {
      let at = 0, thr = 127;
      host.innerHTML =
        '<div class="al-see-pic"><div class="al-see-cv"><canvas id="alSeeG" width="28" height="28"></canvas><i class="al-hov"></i></div>' +
          '<p class="al-cap"><b>What the scanner saw</b><br>784 brightness values, 0 to 255</p></div>' +
        '<div class="al-see-pic"><div class="al-see-cv bin"><canvas id="alSeeB" width="28" height="28"></canvas><i class="al-hov"></i></div>' +
          '<p class="al-cap"><b>x</b>, ink or no ink<br><span id="alSeeInk"></span></p></div>' +
        '<div class="al-see-side"><p class="al-label">Pick a digit</p><div class="al-see-pick" id="alSeePick"></div>' +
          '<label class="al-cut">Ink if brighter than <b id="alSeeThrV">127</b><input type="range" id="alSeeThr" min="1" max="254" value="127"></label>' +
          '<p class="al-read" id="alSeeRead" aria-live="polite"></p></div>';
      const G = $("alSeeG"), B = $("alSeeB"), pick = $("alSeePick"), read = $("alSeeRead");
      pick.innerHTML = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => '<button type="button" data-d="' + d + '" aria-label="Show a ' + d + '"><canvas width="28" height="28"></canvas></button>').join("");
      pick.querySelectorAll("button").forEach((b, d) => paint(b.firstChild, s.imgs[s.labels.indexOf(d)]));
      const inkCount = () => { let n = 0; const im = s.imgs[at]; for (let i = 0; i < 784; i++) if (im[i] > thr) n++; return n; };
      const hint = () => { read.textContent = "Point at a pixel. The pixels are numbered 0 to 783, left to right and then down, so pixel 28 is the first one on the second row."; };
      const draw = () => {
        paint(G, s.imgs[at]); paint(B, s.imgs[at], thr);
        $("alSeeInk").textContent = inkCount() + " of 784 pixels are 1";
        pick.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.d === s.labels[at])));
      };
      pick.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        const d = +b.dataset.d, same = s.labels.map((l, i) => (l === d ? i : -1)).filter((i) => i >= 0);
        at = s.labels[at] === d ? same[(same.indexOf(at) + 1) % same.length] : same[0];   // press the same digit again for another handwriting
        draw();
      });
      $("alSeeThr").addEventListener("input", (e) => { thr = +e.target.value; $("alSeeThrV").textContent = thr; draw(); });
      const point = (e) => {
        const cv = e.currentTarget, b = cv.getBoundingClientRect();
        const c = Math.min(27, Math.max(0, Math.floor((e.clientX - b.left) / b.width * 28))), r = Math.min(27, Math.max(0, Math.floor((e.clientY - b.top) / b.height * 28)));
        host.querySelectorAll(".al-hov").forEach((m) => { m.style.display = "block"; m.style.left = c / 28 * 100 + "%"; m.style.top = r / 28 * 100 + "%"; });
        const v = s.imgs[at][r * 28 + c];
        read.textContent = "Pixel " + (r * 28 + c) + " (row " + (r + 1) + ", column " + (c + 1) + "): brightness " + v + ", so x is " + (v > thr ? 1 : 0) + ".";
      };
      host.querySelectorAll(".al-see-cv").forEach((el) => {
        el.addEventListener("pointermove", point); el.addEventListener("pointerdown", point);
        el.addEventListener("pointerleave", () => { host.querySelectorAll(".al-hov").forEach((m) => (m.style.display = "none")); hint(); });
      });
      hint(); draw();
    }).catch(() => { host.hidden = true; });
  })();

  // ======================================================================
  // 1. By hand: 3 shapes, 9 pixels
  // ======================================================================
  (function hand() {
    const host = $("alHand");
    if (!host) return;
    const SHAPES = [
      { name: "Vertical", glyph: "|", px: [0, 1, 0, 0, 1, 0, 0, 1, 0] },
      { name: "Horizontal", glyph: "\u2014", px: [0, 0, 0, 1, 1, 1, 0, 0, 0] },
      { name: "Diagonal", glyph: "\\", px: [1, 0, 0, 0, 1, 0, 0, 0, 1] }
    ];
    const net = new Net(3, 9);
    let x = SHAPES[2].px.slice(), truth = 2, note = "", flash = null;

    host.innerHTML =
      '<div class="al-hand-x"><p class="al-label">x, your picture</p><div class="al-px" id="alHandX"></div>' +
        '<div class="al-row" id="alHandPre"></div></div>' +
      '<div class="al-hand-w"><p class="al-label">W, the three templates <span>(one row each; a dot marks ink in x)</span></p><div class="al-tpls3" id="alHandW"></div></div>' +
      '<div class="al-hand-do"><p class="al-label">What is it really?</p><div class="al-row" id="alHandTruth"></div>' +
        '<button type="button" class="net-toggle al-go" id="alHandGo">Show it to the model</button>' +
        '<button type="button" class="al-link" id="alHandReset">Reset W to zeros</button>' +
        '<p class="al-msg" id="alHandMsg" aria-live="polite"></p></div>';

    const gx = $("alHandX"), gw = $("alHandW"), msg = $("alHandMsg");
    gx.innerHTML = x.map((_, p) => '<button type="button" class="al-cell" data-p="' + p + '" aria-pressed="false" aria-label="Pixel ' + (p + 1) + '"></button>').join("");
    $("alHandPre").innerHTML = SHAPES.map((s, i) => '<button type="button" class="al-chipbtn" data-pre="' + i + '">' + s.glyph + " " + s.name + "</button>").join("") + '<button type="button" class="al-chipbtn" data-pre="clear">Clear</button>';
    $("alHandTruth").innerHTML = SHAPES.map((s, i) => '<button type="button" class="al-chipbtn" data-truth="' + i + '" aria-pressed="false">' + s.glyph + " " + s.name + "</button>").join("");
    gw.innerHTML = SHAPES.map((s, c) => '<div class="al-tpl3" data-c="' + c + '"><div class="al-tpl3-head"><b>' + s.glyph + " " + s.name + '</b><span class="al-score"></span></div>' +
      '<div class="al-w3">' + x.map((_, p) => '<span class="al-w" data-p="' + p + '"></span>').join("") + '</div><p class="al-sum"></p></div>').join("");

    const render = () => {
      gx.querySelectorAll(".al-cell").forEach((b, p) => { b.classList.toggle("on", !!x[p]); b.setAttribute("aria-pressed", String(!!x[p])); });
      host.querySelectorAll("[data-truth]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.truth === truth)));
      const { guess, scores } = net.predict(x), m = Math.max(2, net.maxAbs());
      gw.querySelectorAll(".al-tpl3").forEach((card) => {
        const c = +card.dataset.c;
        card.classList.toggle("guess", guess === c);
        card.querySelectorAll(".al-w").forEach((cell) => {
          const p = +cell.dataset.p, w = net.W[c * 9 + p];
          cell.textContent = signed(w);
          cell.style.background = tint(w, m);
          cell.style.color = Math.abs(w) / m > 0.55 ? "#fff" : "";
          cell.classList.toggle("ink", !!x[p]);
          cell.classList.remove("up", "dn");
        });
        const minus = (n) => String(n).replace("-", "\u2212");
        card.querySelector(".al-score").textContent = "score " + minus(scores[c]);
        const under = []; for (let p = 0; p < 9; p++) if (x[p]) under.push(net.W[c * 9 + p]);
        const blank = net.W.every((w) => w === 0);
        card.querySelector(".al-sum").textContent = !under.length ? "No ink drawn, so there is nothing to add up."
          : under.every((w) => w === 0) ? (blank ? "Every weight is still 0, so the score is 0. Nothing has been learned yet." : "The weights under the ink are all 0, so the score is 0.")
          : "Weights under the ink: " + under.map((w) => (w < 0 ? "(" + minus(w) + ")" : String(w))).join(" + ") + " = " + minus(scores[c]);
      });
      if (flash) {
        flash.forEach((f) => {
          const cell = gw.querySelector('.al-tpl3[data-c="' + f.c + '"] .al-w[data-p="' + f.p + '"]');
          if (cell) cell.classList.add(f.d > 0 ? "up" : "dn");
        });
        flash = null;
      }
      msg.textContent = note || "Draw a picture and say what it really is, then show it to the model. While W is all zeros every score ties, so it guesses the first row, Vertical.";
    };

    host.addEventListener("click", (e) => {
      const cell = e.target.closest(".al-cell"), pre = e.target.closest("[data-pre]"), tr = e.target.closest("[data-truth]");
      if (cell) { x[+cell.dataset.p] = x[+cell.dataset.p] ? 0 : 1; note = ""; }
      else if (pre) { x = pre.dataset.pre === "clear" ? x.map(() => 0) : SHAPES[+pre.dataset.pre].px.slice(); if (pre.dataset.pre !== "clear") truth = +pre.dataset.pre; note = ""; }
      else if (tr) { truth = +tr.dataset.truth; note = ""; }
      else if (e.target.closest("#alHandReset")) { net.reset(); note = "W is back to all zeros: the model knows nothing."; }
      else if (e.target.closest("#alHandGo")) {
        if (!x.some(Boolean)) { note = "Draw something first. A blank picture has no ink to add or take away."; }
        else {
          const { guess } = net.predict(x), before = Array.from(net.W);
          const ok = guess === truth;
          net.learn(x, truth, guess);
          flash = [];
          net.W.forEach((w, i) => { if (w !== before[i]) flash.push({ c: Math.floor(i / 9), p: i % 9, d: w - before[i] }); });
          const again = net.predict(x).guess;
          note = ok
            ? "It guessed " + SHAPES[guess].name + ", which is right. W[truth] += x and W[guess] -= x hit the same row, so they cancel and nothing changes."
            : "It guessed " + SHAPES[guess].name + " but the picture is " + SHAPES[truth].name + ". So the " + SHAPES[truth].name + " row gets x added (+1 under every ink pixel) and the " + SHAPES[guess].name + " row gets x subtracted (\u22121 under every ink pixel). Shown the same picture again it would now guess " + SHAPES[again].name + ".";
        }
      } else return;
      render();
    });
    render();
  })();

  // ======================================================================
  // 2. Live trainer: pixel-font digits with noise
  // ======================================================================
  (function live() {
    const host = $("alLive");
    if (!host) return;
    const ROWS = 7, COLS = 5, P = ROWS * COLS;
    const GLYPHS = [
      "01110 10001 10011 10101 11001 10001 01110", "00100 01100 00100 00100 00100 00100 01110",
      "01110 10001 00001 00010 00100 01000 11111", "11110 00001 00001 01110 00001 00001 11110",
      "00010 00110 01010 10010 11111 00010 00010", "11111 10000 11110 00001 00001 10001 01110",
      "00110 01000 10000 11110 10001 10001 01110", "11111 00001 00010 00100 01000 01000 01000",
      "01110 10001 10001 01110 10001 10001 01110", "01110 10001 10001 01111 00001 00010 01100"
    ].map((g) => g.replace(/ /g, "").split("").map(Number));
    const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

    const net = new Net(10, P);
    let rng = mulberry(7), noise = 0.08, seen = 0, recent = [], history = [], cur = null, busy = false, testSet = [];
    const makeSample = (r) => { const y = Math.floor(r() * 10), f = []; return { y, f, x: GLYPHS[y].map((v, i) => { if (r() < noise) { f.push(i); return 1 - v; } return v; }) }; };
    const makeTests = () => { const r = mulberry(99); testSet = Array.from({ length: 400 }, () => makeSample(r)); };
    const testAcc = () => testSet.reduce((n, s) => n + (net.predict(s.x).guess === s.y ? 1 : 0), 0) / testSet.length;

    host.innerHTML =
      '<div class="al-live-top"><div class="al-live-x"><p class="al-label">x, the next picture</p><canvas id="alLx" width="125" height="175"></canvas>' +
        '<p class="al-xl" id="alLxl">No picture yet</p></div>' +
      '<div class="al-tpls" id="alTpls"></div></div>' +
      '<div class="al-controls"><button type="button" class="net-toggle" id="alStep">Show one image</button>' +
        '<button type="button" class="net-toggle" data-n="100">Train 100</button><button type="button" class="net-toggle" data-n="1000">Train 1,000</button>' +
        '<button type="button" class="al-link" id="alLReset">Reset</button>' +
        '<label class="al-noise">Messiness <input type="range" id="alNoise" min="0" max="25" value="8"><b id="alNoiseV">8% of pixels flipped</b></label></div>' +
      '<p class="al-msg" id="alLmsg" aria-live="polite"></p>' +
      '<div class="al-stats"><div><b id="alSeen">0</b><span>pictures seen</span></div><div><b id="alRecent">-</b><span>mistakes in the last 100</span></div><div><b id="alAcc">10%</b><span>right on 400 unseen pictures</span></div>' +
        '<div class="al-spark"><svg viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="35" x2="300" y2="35" class="g"/><polyline id="alSpark" points=""/></svg><span>accuracy as it learns</span></div></div>';

    const tpls = $("alTpls");
    tpls.innerHTML = GLYPHS.map((_, d) => '<div class="al-tplc" data-d="' + d + '"><canvas width="40" height="56" aria-label="Template for digit ' + d + '"></canvas>' +
      '<div class="al-tplc-m"><b>' + d + '</b><span class="al-sc">0</span></div><div class="al-bar"><i></i></div><span class="al-tag"></span></div>').join("");
    const cvs = Array.from(tpls.querySelectorAll("canvas"));

    const drawGrid = (ctx, cells, cw, ch, fn) => {
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { ctx.fillStyle = fn(cells[r * COLS + c]); ctx.fillRect(c * cw, r * ch, cw - 1, ch - 1); }
    };
    const flips = (s) => (s.f.length === 1 ? "1 pixel was" : s.f.length + " pixels were") + " flipped by noise";
    const draw = (info) => {
      const m = Math.max(2, net.maxAbs());
      cvs.forEach((cv, d) => drawGrid(cv.getContext("2d"), Array.from(net.W.slice(d * P, d * P + P)), 8, 8, (v) => tint(v, m)));
      const lx = $("alLx").getContext("2d");
      lx.clearRect(0, 0, 125, 175);
      drawGrid(lx, cur ? cur.x : new Array(P).fill(0), 25, 25, (v) => (v ? "#121614" : "#eef2f0"));
      if (cur) { lx.fillStyle = "#d4372c"; cur.f.forEach((i) => lx.fillRect((i % COLS) * 25 + 3, Math.floor(i / COLS) * 25 + 3, 8, 8)); }   // red dot: this pixel was flipped
      const sc = info ? info.scores : net.predict(cur ? cur.x : new Array(P).fill(0)).scores;
      const top = Math.max(1, ...sc.map(Math.abs));
      tpls.querySelectorAll(".al-tplc").forEach((card, d) => {
        card.querySelector(".al-sc").textContent = sc[d];
        const bar = card.querySelector(".al-bar i");
        bar.style.width = Math.max(0, sc[d]) / top * 100 + "%";
        card.classList.toggle("guess", !!info && info.guess === d);
        card.classList.toggle("truth", !!info && info.y === d);
        const tag = card.querySelector(".al-tag");
        tag.textContent = info && info.wrong ? (info.y === d ? "+x" : info.guess === d ? "\u2212x" : "") : "";
        tag.className = "al-tag" + (info && info.wrong ? (info.y === d ? " add" : info.guess === d ? " sub" : "") : "");
      });
      $("alSeen").textContent = seen.toLocaleString("en-US");
      $("alRecent").textContent = recent.length ? recent.reduce((a, b) => a + b, 0) : "-";
      const acc = testAcc();
      $("alAcc").textContent = Math.round(acc * 100) + "%";
      const pts = history.concat([{ n: seen, a: acc }]);
      const maxN = Math.max(100, pts[pts.length - 1].n);
      $("alSpark").setAttribute("points", pts.map((p) => (p.n / maxN * 300).toFixed(1) + "," + (68 - p.a * 66).toFixed(1)).join(" "));
    };

    const stepOnce = () => {
      cur = makeSample(rng);
      const { guess, scores } = net.predict(cur.x), wrong = guess !== cur.y;
      net.learn(cur.x, cur.y, guess);
      seen++; recent.push(wrong ? 1 : 0); if (recent.length > 100) recent.shift();
      return { guess, scores, y: cur.y, wrong };
    };
    const say = (info) => {
      $("alLxl").textContent = "It was a " + info.y + ". " + (cur.f.length ? flips(cur) : "No pixels were flipped") + ".";
      $("alLmsg").textContent = info.wrong
        ? "Guessed " + info.guess + ", but it was a " + info.y + ". So: add x to template " + info.y + ", subtract x from template " + info.guess + "."
        : "Guessed " + info.guess + ", which is right. Adding x and subtracting x from the same row cancel, so nothing changed.";
    };

    $("alStep").addEventListener("click", () => { if (busy) return; const info = stepOnce(); say(info); draw(info); });
    const train = (n) => {
      if (busy) return;
      busy = true; host.classList.add("busy");
      const chunk = reduceMotion ? n : Math.max(10, Math.round(n / 40));
      let left = n, last = null;
      const frame = () => {
        const k = Math.min(chunk, left);
        for (let i = 0; i < k; i++) last = stepOnce();
        left -= k;
        history.push({ n: seen, a: testAcc() });
        draw(null);
        if (left > 0) requestAnimationFrame(frame);
        else {
          busy = false; host.classList.remove("busy");
          $("alLxl").textContent = "It was a " + last.y + ". " + (cur.f.length ? flips(cur) : "No pixels were flipped") + ".";
          $("alLmsg").textContent = "Trained on " + n.toLocaleString("en-US") + " more pictures. Each one made one small correction to W, and only where a mistake was made.";
          draw(last);
        }
      };
      frame();
    };
    host.addEventListener("click", (e) => { const t = e.target.closest("[data-n]"); if (t) train(+t.dataset.n); });
    const reset = () => { net.reset(); rng = mulberry(7); seen = 0; recent = []; history = []; cur = null; $("alLxl").textContent = "No picture yet"; $("alLmsg").textContent = "W is back to all zeros, so the model guesses 0 for everything and is right about one time in ten."; draw(null); };
    $("alLReset").addEventListener("click", () => { if (!busy) reset(); });
    $("alNoise").addEventListener("input", (e) => {
      noise = +e.target.value / 100; $("alNoiseV").textContent = e.target.value + "% of pixels flipped";
      makeTests(); history = []; draw(null);
    });
    makeTests();
    $("alLmsg").textContent = "Press Show one image to watch a single correction, or Train 1,000 to watch the templates sharpen.";
    draw(null);
  })();

  // ======================================================================
  // 3. The real templates from the Python run
  // ======================================================================
  (function real() {
    const host = $("alReal");
    if (!host) return;
    fetch("ai/mnist-templates.json", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => {
        const m = Math.max(Math.abs(d.min), Math.abs(d.max));
        host.innerHTML = '<div class="al-real-grid">' + d.W.map((_, i) => '<figure><canvas width="28" height="28" aria-label="Learned template for digit ' + i + '"></canvas><figcaption>' + i + "</figcaption></figure>").join("") + "</div>" +
          '<div class="al-legend"><span>votes against</span><i></i><span>votes for</span></div>' +
          '<div class="al-epochs">' + d.epochs.map((e) => "<div><b>" + (e.accuracy * 100).toFixed(1) + "%</b><span>after pass " + e.epoch + "<br>" + e.mistakes.toLocaleString("en-US") + " mistakes while training</span></div>").join("") +
          "<div><b>" + signed(d.min) + " to " + signed(d.max) + "</b><span>the range of every weight<br>(all whole numbers)</span></div></div>";
        host.querySelectorAll("canvas").forEach((cv, i) => {
          const ctx = cv.getContext("2d");
          d.W[i].forEach((v, p) => { ctx.fillStyle = tint(v, m); ctx.fillRect(p % 28, Math.floor(p / 28), 1, 1); });
        });
      })
      .catch(() => { host.hidden = true; });
  })();

  // ======================================================================
  // 4. The code, with notes that light up the lines they explain
  // ======================================================================
  (function code() {
    const host = $("alCode"), srcEl = $("alCodeSrc");
    if (!host || !srcEl) return;
    const src = srcEl.textContent.replace(/^\n/, "").replace(/\n+$/, "");
    const lines = src.split("\n");

    // Split at the "# ---------- N." banners. Everything before the first one is the recipe and the imports.
    const starts = [0];
    lines.forEach((l, i) => { if (i && /^# -{5,} \d\./.test(l)) starts.push(i); });
    const secs = starts.map((s, k) => ({ from: s, to: k + 1 < starts.length ? starts[k + 1] : lines.length }));

    const SECTIONS = [
      { title: "The recipe and the tools", notes: [
        { snip: "1. guess = the class", text: "Step one of the rule. Score the picture against every template and take the highest. This is the model's guess." },
        { snip: "2. add the image's ink", text: "Step two. The picture's ink is added to the template of the digit it really is, so that template will score this kind of picture higher next time." },
        { snip: "3. subtract the image's ink", text: "Step three. The same ink is taken away from the template that was guessed, so that template will score this kind of picture lower next time." },
        { snip: "(if the guess was right", text: "When the guess is right, steps two and three hit the same template. One adds x and the other subtracts x, so they cancel and nothing changes. The model only learns from its mistakes. This is called the perceptron rule." },
        { snip: "import gzip", text: "gzip opens the compressed MNIST files. os checks whether they are already on disk, and urllib.request downloads them if they are not." },
        { snip: "import numpy as np", text: "NumPy does the matrix math. One line like W @ x runs thousands of multiplications in fast compiled code instead of a slow Python loop." },
        { snip: "import matplotlib.pyplot", text: "Matplotlib draws the pictures at the end, the learned templates and the bar chart of scores." }
      ] },
      { title: "1 \u00b7 Load the pictures", notes: [
        { snip: "URL =", text: "MNIST is 70,000 scans of handwritten digits, each 28 by 28 pixels. 60,000 are for training and 10,000 are kept back for testing." },
        { snip: "def load(key):", text: "One small function that gets any of the four files: training pictures, training answers, test pictures, test answers." },
        { snip: "urllib.request.urlretrieve", text: "Downloads the file only if it is not already in the mnist_data folder, so the second run starts instantly." },
        { snip: "np.frombuffer(raw, np.uint8, offset=16)", text: "The picture files start with a 16-byte header, so skip it. What remains is one long run of bytes, each a pixel brightness from 0 to 255." },
        { snip: ".reshape(-1, 784)", text: "Cut the long run into rows of 784 numbers, which is 28 times 28. The -1 means work out how many rows there are: one per picture. Each row is a flattened image." },
        { snip: "offset=8", text: "The answer files have an 8-byte header and then one number from 0 to 9 per picture: the right answer." },
        { snip: 'train_x, train_y = load("train_x")', text: "x is the pictures and y is the right answers. The model trains on these 60,000. The test set is loaded separately and never used for learning." },
        { snip: "(train_x > 127)", text: "Brightness runs from 0 to 255. Anything above 127 becomes 1 (ink) and everything else becomes 0 (no ink). A picture is now 784 yes or no values. That list is what the rest of the code calls x." }
      ] },
      { title: "2 \u00b7 The model: ten templates", notes: [
        { snip: "W = np.zeros((10, 784)", text: "This table is the entire model: 10 rows, one per digit, and 784 columns, one per pixel, so 7,840 numbers. Row 3, column 400 says how strongly ink at pixel 400 argues for a 3. Positive is for, negative is against, zero is no opinion. They all start at zero, so the model knows nothing." },
        { snip: "scores = W @ x", text: "The @ is matrix multiplication. A 10 by 784 table times a list of 784 numbers gives 10 numbers, one score per template. Because x is only ones and zeros, each score is just the sum of a template's weights wherever the picture has ink." },
        { snip: "return np.argmax(scores)", text: "argmax returns the position of the biggest score, which is the digit the model guesses. If scores tie, it picks the first. With W at zero every score is 0, so an untrained model guesses 0 every time." },
        { snip: "def accuracy(xs, ys):", text: "A helper that grades the model on a whole set of pictures at once. It changes nothing in W." },
        { snip: "xs @ W.T", text: "W.T flips the table so it is 784 by 10. All 10,000 test pictures (10,000 by 784) times that gives a 10,000 by 10 table of scores in one go." },
        { snip: "np.argmax(xs @ W.T, axis=1)", text: "axis=1 means take the biggest score along each row, so each picture gets its own guess." },
        { snip: "(guesses == ys).mean()", text: "Compare the guesses with the answers. Each match counts as 1 and each miss as 0, so the average is the fraction right." }
      ] },
      { title: "3 \u00b7 Train: guess, then fix the mistakes", notes: [
        { snip: "EPOCHS = 3", text: "One epoch is one full pass through all 60,000 training pictures. Three passes means 180,000 chances to correct a mistake." },
        { snip: "np.random.default_rng(0)", text: "A random number generator with a fixed seed, so every run shuffles in the same order and gives the same result." },
        { snip: "rng.permutation(len(train_x))", text: "A shuffled list of picture numbers. Every pass goes through the pictures in a new random order, so the model cannot learn the order." },
        { snip: "for i in order:", text: "The inner loop. Each turn takes one picture, guesses it, and corrects W. This runs 60,000 times per epoch." },
        { snip: "x, y = train_x[i]", text: "Pick up picture number i (x, the 784 ones and zeros) along with its right answer (y)." },
        { snip: "guess = predict(x)", text: "The model guesses using its current W. At the very start every score is 0, so it guesses 0 for everything." },
        { snip: "mistakes += 1", text: "Count the wrong guesses in this pass, just for reporting. It plays no part in learning." },
        { snip: "W[y] += x", text: "Add the picture to the correct row. Wherever the picture has ink, that row's weight goes up by 1. A 7 drawn here makes the 7 template a little more like this 7." },
        { snip: "W[guess] -= x", text: "Subtract the picture from the row that was guessed. Wherever the picture has ink, that row's weight goes down by 1, so the wrong template is pushed away from this picture. If the guess was right, y and guess are the same row and the two lines cancel." },
        { snip: "test accuracy", text: "After each pass the model is graded on the 10,000 test pictures, which it never trained on. That tells you how it does on handwriting it has not seen." }
      ] },
      { title: "4 \u00b7 Look at what it learned", notes: [
        { snip: "plt.subplots(2, 5", text: "A grid of 2 rows and 5 columns, one slot per digit." },
        { snip: "W[digit].reshape(28, 28)", text: "Take one row of W, 784 weights in a line, and fold it back into a 28 by 28 square so it can be drawn as a picture." },
        { snip: 'cmap="gray"', text: "Draw weights as shades of grey: light is a positive weight (votes for the digit), dark is negative (votes against). The page above uses green and red for the same thing." }
      ] },
      { title: "5 \u00b7 Score one picture", notes: [
        { snip: "idx = rng.integers", text: "Pick one random test picture." },
        { snip: "scores = W @ x", text: "The same matrix multiplication as before, this time kept so the ten scores can be drawn." },
        { snip: "ax2.bar(range(10), scores)", text: "A bar chart with one bar per template. The tallest bar is the guess, and the title above the picture says whether it was right." }
      ] }
    ];

    // A small Python highlighter: enough for this file
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const KW = "import|from|as|def|return|if|for|in|not|with|and|or|else|elif|while|True|False|None";
    const TOK = new RegExp('(f?"[^"\\n]*"|f?\'[^\'\\n]*\')|(#.*$)|\\b(' + KW + ')\\b|\\b(\\d+(?:\\.\\d+)?)\\b|\\b(print|len|range|open|str)\\b(?=\\()', "g");
    let inDoc = false;
    const hl = lines.map((l) => {
      const marks = (l.match(/"""/g) || []).length;
      const doc = inDoc || marks > 0;
      if (marks % 2 === 1) inDoc = !inDoc;
      if (doc) return '<span class="tk-c">' + esc(l) + "</span>";
      return esc(l).replace(TOK, (m, s, c, k, n, b) => s ? '<span class="tk-s">' + m + "</span>" : c ? '<span class="tk-c">' + m + "</span>" : k ? '<span class="tk-k">' + m + "</span>" : n ? '<span class="tk-n">' + m + "</span>" : '<span class="tk-b">' + m + "</span>");
    });

    let html = '<div class="al-code-head"><span>template_digits.py</span><button type="button" class="al-copy" id="alCopy">Copy the code</button></div>';
    secs.forEach((s, k) => {
      const def = SECTIONS[k] || { title: "", notes: [] };
      const codeHtml = hl.slice(s.from, s.to).map((h, j) => '<span class="al-ln" data-l="' + (s.from + j) + '"><i>' + (s.from + j + 1) + "</i>" + (h || " ") + "</span>").join("");
      const notes = def.notes.map((n) => {
        const at = lines.findIndex((l, i) => i >= s.from && i < s.to && l.indexOf(n.snip) !== -1);
        if (at < 0 && window.console) console.warn("ai-learn: note not matched:", n.snip);
        return '<li tabindex="0" data-l="' + at + '">' + esc(n.text) + "</li>";
      }).join("");
      html += '<div class="al-sec"><h4>' + esc(def.title) + '</h4><div class="al-sec-grid"><pre class="al-pre"><code>' + codeHtml + '</code></pre><ol class="al-notes">' + notes + "</ol></div></div>";
    });
    host.innerHTML = html;

    const light = (l) => { host.querySelectorAll(".al-ln.hl").forEach((e) => e.classList.remove("hl")); if (l >= 0) { const e = host.querySelector('.al-ln[data-l="' + l + '"]'); if (e) { e.classList.add("hl"); } } };
    host.addEventListener("mouseover", (e) => { const li = e.target.closest(".al-notes li"); if (li) light(+li.dataset.l); });
    host.addEventListener("mouseout", (e) => { if (e.target.closest(".al-notes li")) light(-1); });
    host.addEventListener("focusin", (e) => { const li = e.target.closest(".al-notes li"); if (li) light(+li.dataset.l); });
    host.addEventListener("focusout", () => light(-1));
    host.addEventListener("click", (e) => {
      const li = e.target.closest(".al-notes li"); if (li) light(+li.dataset.l);   // tap on a phone
      if (e.target.closest("#alCopy")) {
        const b = $("alCopy"), done = () => { b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy the code"), 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(src).then(done, done);
        else { const t = document.createElement("textarea"); t.value = src; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (x) { /* ignore */ } t.remove(); done(); }
      }
    });
  })();
})();
