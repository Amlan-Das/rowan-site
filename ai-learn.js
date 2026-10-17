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
  const templatesP = fetch("ai/mnist-templates.json", { cache: "no-store" })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => { const W = new Float32Array(10 * 784); d.W.forEach((row, c) => row.forEach((v, p) => (W[c * 784 + p] = v))); return { d, W }; });
  const inkOf = (img) => { const x = new Uint8Array(784); for (let i = 0; i < 784; i++) x[i] = img[i] > 127 ? 1 : 0; return x; };   // the script's "> 127"
  const shiftBy = (x, dx, dy) => {
    const o = new Uint8Array(784);
    for (let r = 0; r < 28; r++) { const sr = r - dy; if (sr < 0 || sr > 27) continue; for (let c = 0; c < 28; c++) { const sc = c - dx; if (sc >= 0 && sc < 28) o[r * 28 + c] = x[sr * 28 + sc]; } }
    return o;
  };
  const scoresOf = (W, x) => { const s = new Array(10); for (let k = 0; k < 10; k++) { let t = 0; const o = k * 784; for (let p = 0; p < 784; p++) if (x[p]) t += W[o + p]; s[k] = t; } return s; };   // W @ x
  const best = (s) => { let g = 0; for (let k = 1; k < s.length; k++) if (s[k] > s[g]) g = k; return g; };                                              // argmax
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
  // The update on paper: W[y] += x and W[guess] -= x, cell by cell
  // ======================================================================
  (function update() {
    const host = $("alUpd");
    if (!host) return;
    const X = [0, 1, 0, 0, 1, 0, 0, 1, 0];
    const minus = (n) => String(n).replace("-", "\u2212");
    const grid = (vals, kind, notes) => '<div class="al-g3 ' + kind + '">' + vals.map((v, i) =>
      '<span class="al-gc" style="' + (kind === "x" ? (v ? "background:#121614;color:#fff" : "") : "background:" + tint(v, 4) + (Math.abs(v) / 4 > 0.55 ? ";color:#fff" : "")) + '">' + minus(v) + (notes ? "<small>" + notes[i] + "</small>" : "") + "</span>").join("") + "</div>";
    const score = (w) => w.reduce((t, v, i) => t + v * X[i], 0);
    const rows = [
      { row: "1", sign: 1, W: [0, 2, 0, -1, 3, -1, 0, 1, 0],
        head: "The picture is a 1, so the 1 template gets the picture added",
        rule: "W[1] += x means: for every cell, new value = old value + the picture's value.",
        why: "The picture is only 0s and 1s, so every inked pixel goes up by 1 and every blank pixel stays the same. The 1 template gets a little more 1-shaped in exactly the spots where this 1 had ink." },
      { row: "7", sign: -1, W: [2, 2, 2, 0, 1, 1, 0, 1, 0],
        head: "Say the model wrongly guessed 7, so the 7 template gets the picture taken away",
        rule: "W[7] -= x means: for every cell, new value = old value \u2212 the picture's value.",
        why: "Every inked pixel goes down by 1 and blank pixels stay the same. Those pixels now count for less as evidence for 7." }
    ];
    host.innerHTML = rows.map((r) => {
      const after = r.W.map((w, i) => w + r.sign * X[i]);
      const notes = r.W.map((w, i) => minus(w) + (r.sign > 0 ? " + " : " \u2212 ") + X[i]);
      return '<div class="al-urow"><h4>' + r.head + '</h4><div class="al-ueq">' +
        '<div><p class="al-label">W[' + r.row + '] before</p>' + grid(r.W, "w") + "</div>" +
        '<span class="al-op">' + (r.sign > 0 ? "+" : "\u2212") + '</span><div><p class="al-label">x</p>' + grid(X, "x") + "</div>" +
        '<span class="al-op">=</span><div><p class="al-label">W[' + r.row + '] after</p>' + grid(after, "w", notes) + "</div></div>" +
        '<p class="al-urule"><code>' + r.rule.split(" means")[0] + "</code> means" + r.rule.split(" means")[1] + "</p><p>" + r.why + "</p>" +
        '<p class="al-uscore">Score for this picture, which adds up the weights under the ink: <b>' + minus(score(r.W)) + " before, " + minus(score(after)) + " after.</b> " +
        (r.sign > 0 ? "The 1 template now rates this picture higher." : "The 7 template now rates this picture lower.") + "</p></div>";
    }).join("") + '<p class="al-uend">Put together, the same picture will score higher for 1 and lower for 7 next time. If the model had guessed right, both lines would hit the same row, one adding x and one taking it away, and nothing would change.</p>';
  })();

  // ======================================================================
  // 1. Guided by hand: 3 shapes, 9 pixels, one step at a time
  // ======================================================================
  (function hand() {
    const host = $("alHand");
    if (!host) return;
    const SHAPES = [
      { name: "Vertical", glyph: "|", px: [0, 1, 0, 0, 1, 0, 0, 1, 0] },
      { name: "Horizontal", glyph: "\u2014", px: [0, 0, 0, 1, 1, 1, 0, 0, 0] },
      { name: "Diagonal", glyph: "\\", px: [1, 0, 0, 0, 1, 0, 0, 0, 1] }
    ];
    const LESSON = [2, 0, 1];                       // pictures cycle Diagonal, Vertical, Horizontal
    const STAGES = ["Look", "Score", "Guess", "Check", "Fix"];
    const minus = (n) => String(n).replace("-", "\u2212");
    const net = new Net(3, 9);
    let round = 0, st = 0, right = 0, flash = null, cur = null;

    host.innerHTML =
      '<ol class="al-stages" id="alStages">' + STAGES.map((s) => "<li>" + s + "</li>").join("") + "</ol>" +
      '<div class="al-gd-main"><div class="al-gd-pic"><p class="al-label" id="alGdRound"></p><div class="al-g3 x" id="alGdX"></div>' +
        '<p class="al-gd-ans">Right answer: <b id="alGdAns"></b></p></div>' +
      '<div class="al-gd-tpls" id="alGdW">' + SHAPES.map((s, c) => '<div class="al-tpl3" data-c="' + c + '"><div class="al-tpl3-head"><b>' + s.glyph + " " + s.name + '</b><span class="al-score"></span></div>' +
        '<div class="al-w3">' + new Array(9).fill(0).map((_, p) => '<span class="al-w" data-p="' + p + '"></span>').join("") + '</div><p class="al-sum"></p><p class="al-tag"></p></div>').join("") + "</div></div>" +
      '<div class="al-gd-say"><p class="al-gd-text" id="alGdText" aria-live="polite"></p><div class="al-gd-btns"><button type="button" class="al-next" id="alGdNext"></button>' +
        '<button type="button" class="al-link" id="alGdReset">Start over</button><span class="al-gd-tally" id="alGdTally"></span></div></div>';

    const gx = $("alGdX"), gw = $("alGdW");
    const state = () => {
      const x = SHAPES[LESSON[round % LESSON.length]].px, truth = LESSON[round % LESSON.length];
      const { guess, scores } = net.predict(x);
      return { x, truth, guess, scores };
    };
    const sumText = (x, c, score) => {
      const under = []; for (let p = 0; p < 9; p++) if (x[p]) under.push(net.W[c * 9 + p]);
      if (under.every((w) => w === 0)) return net.W.every((w) => w === 0) ? "All its weights are 0, so it adds up to 0." : "The weights under the ink are 0, so it adds up to 0.";
      return under.map((w) => (w < 0 ? "(" + minus(w) + ")" : String(w))).join(" + ") + " = " + minus(score);
    };
    cur = state();                                   // the round's guess is frozen before any learning happens
    const narrate = (s) => {
      const T = SHAPES[s.truth].name, G = SHAPES[s.guess].name, top = Math.max.apply(null, s.scores), tied = s.scores.filter((v) => v === top).length > 1;
      if (st === 0) return "Round " + (round + 1) + ". Here is a picture, and we know it is a " + T + ". The model does not. All it gets is x: a 1 for every square with ink and a 0 for every blank one." + (round === 0 ? " The three grids on the right are its templates, W. They start at all zeros, so right now it knows nothing." : "");
      if (st === 1) return "Each template adds up its weights wherever the picture has ink (the dot marks those squares). That total is the template's score." + (net.W.every((w) => w === 0) ? " Every weight is 0 so far, so every score is 0." : "");
      if (st === 2) return "The highest score wins, so the model guesses " + G + "." + (tied ? " Several templates tied for the top score, and a tie goes to the first one in the list." : "");
      if (st === 3) return s.guess === s.truth ? "Check: it is a " + T + ". The model was right." : "Check: it is a " + T + ", so the model was wrong.";
      return s.guess === s.truth
        ? "Nothing to fix. We would add the picture to the " + T + " template and take it away from the " + G + " template, but that is the same template, so the two cancel."
        : "The fix: add the picture to the " + T + " template (+1 on every inked square) and take it away from the " + G + " template (\u22121 on every inked square). Look at the weights change. Next time this picture scores higher for " + T + " and lower for " + G + ".";
    };

    const render = () => {
      const s = cur, m = Math.max(2, net.maxAbs()), now = st === 4 ? net.scores(s.x) : null;
      $("alGdRound").textContent = "Round " + (round + 1);
      $("alGdAns").textContent = SHAPES[s.truth].name;
      gx.innerHTML = s.x.map((v) => '<span class="al-gc" style="' + (v ? "background:#121614;color:#fff" : "") + '">' + v + "</span>").join("");
      host.querySelectorAll("#alStages li").forEach((li, i) => li.classList.toggle("on", i === st));
      gw.querySelectorAll(".al-tpl3").forEach((card) => {
        const c = +card.dataset.c, isGuess = c === s.guess && st >= 2, isTruth = c === s.truth && st >= 3;
        card.classList.toggle("guess", isGuess); card.classList.toggle("truth", isTruth);
        card.querySelectorAll(".al-w").forEach((cell) => {
          const p = +cell.dataset.p, w = net.W[c * 9 + p];
          cell.textContent = minus(w); cell.style.background = tint(w, m); cell.style.color = Math.abs(w) / m > 0.55 ? "#fff" : "";
          cell.classList.toggle("ink", !!s.x[p]); cell.classList.remove("up", "dn");
        });
        const show = st >= 1;
        card.querySelector(".al-score").textContent = !show ? "" : now ? "score " + minus(s.scores[c]) + " \u2192 " + minus(now[c]) : "score " + minus(s.scores[c]);
        card.querySelector(".al-sum").textContent = !show ? "" : now ? (now[c] === s.scores[c] ? "No change." : "Its score for this picture " + (now[c] > s.scores[c] ? "went up." : "went down.")) : sumText(s.x, c, s.scores[c]);
        card.querySelector(".al-tag").textContent = isGuess && isTruth ? "Guess, and the right answer" : isGuess ? "Its guess" : isTruth ? "The right answer" : "";
      });
      if (flash) { flash.forEach((f) => { const cell = gw.querySelector('.al-tpl3[data-c="' + f.c + '"] .al-w[data-p="' + f.p + '"]'); if (cell) cell.classList.add(f.d > 0 ? "up" : "dn"); }); flash = null; }
      $("alGdText").textContent = narrate(s);
      $("alGdNext").textContent = st === 4 ? "Next picture \u2192" : st === 3 ? (s.guess === s.truth ? "Continue" : "Fix it") : "Next step \u2192";
      $("alGdTally").textContent = round ? "Right so far: " + right + " of " + round : "";
    };

    $("alGdNext").addEventListener("click", () => {
      const s = cur;
      if (st === 3) {                                    // the model learns here, then the fix is shown
        if (s.guess === s.truth) right++;
        const before = Array.from(net.W); net.learn(s.x, s.truth, s.guess);
        flash = []; net.W.forEach((w, i) => { if (w !== before[i]) flash.push({ c: Math.floor(i / 9), p: i % 9, d: w - before[i] }); });
        st = 4;
      } else if (st === 4) { round++; st = 0; cur = state(); }
      else st++;
      render();
    });
    $("alGdReset").addEventListener("click", () => { net.reset(); round = 0; st = 0; right = 0; flash = null; cur = state(); render(); });
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
    templatesP
      .then(({ d }) => {
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
  // 3b. Where it stops: slide a real digit and the rigid templates fail
  // ======================================================================
  (function limits() {
    const host = $("alStop");
    if (!host) return;
    Promise.all([samples, templatesP]).then(([s, t]) => {
      const bins = s.imgs.map(inkOf), N = bins.length, R = 8;
      const read0 = bins.map((x) => best(scoresOf(t.W, x)));
      let at = read0.findIndex((g, i) => g === s.labels[i]), dx = 0, dy = 0, cache = null;
      host.innerHTML =
        '<div class="al-lim-left"><div class="al-lim-pic"><div class="al-lim-cv"><canvas id="alLimC" width="28" height="28"></canvas></div><p class="al-cap" id="alLimCap"></p>' +
          '<button type="button" class="al-link" id="alLimNext">Try another digit</button></div>' +
        '<div class="al-lim-acc"><p class="al-label">Right out of ' + N + ' sample digits, at each sideways shift</p><div class="al-acc" id="alLimAcc"></div>' +
          '<div class="al-acc-ax"><span>' + R + ' left</span><span>no shift</span><span>' + R + ' right</span></div><p class="al-read" id="alLimAccTxt"></p></div></div>' +
        '<div class="al-lim-right"><div class="al-lim-sl"><label class="al-cut">Slide sideways: <b id="alLimXv">0</b><input type="range" id="alLimX" min="-' + R + '" max="' + R + '" value="0"></label>' +
          '<label class="al-cut">Slide up or down: <b id="alLimYv">0</b><input type="range" id="alLimY" min="-' + R + '" max="' + R + '" value="0"></label></div>' +
          '<p class="al-label">Score of each template <span>(W @ x)</span></p><div class="al-bars" id="alLimBars"></div><p class="al-read" id="alLimRead" aria-live="polite"></p></div>';
      $("alLimBars").innerHTML = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => '<div class="al-bar-row"><b>' + k + '</b><span class="al-bar-t"><i></i></span><em></em></div>').join("");
      const accAt = (sx, sy) => { let n = 0; for (let i = 0; i < N; i++) if (best(scoresOf(t.W, shiftBy(bins[i], sx, sy))) === s.labels[i]) n++; return n; };
      const curve = () => { if (!cache || cache.dy !== dy) { const v = []; for (let sx = -R; sx <= R; sx++) v.push(accAt(sx, dy)); cache = { dy, v }; } return cache.v; };
      const draw = () => {
        const x = shiftBy(bins[at], dx, dy), sc = scoresOf(t.W, x), g = best(sc), truth = s.labels[at];
        const cv = $("alLimC").getContext("2d"), im = cv.createImageData(28, 28);
        for (let i = 0; i < 784; i++) { const o = i * 4; im.data[o] = INK[0]; im.data[o + 1] = INK[1]; im.data[o + 2] = INK[2]; im.data[o + 3] = x[i] ? 255 : 0; }
        cv.putImageData(im, 0, 0);
        $("alLimCap").innerHTML = "A real handwritten <b>" + truth + "</b>, with its ink as x";
        const top = Math.max(1, Math.max.apply(null, sc));
        host.querySelectorAll(".al-bar-row").forEach((row, k) => {
          row.querySelector("i").style.width = Math.max(0, sc[k]) / top * 100 + "%";
          row.querySelector("em").textContent = String(sc[k]).replace("-", "\u2212");
          row.classList.toggle("win", k === g); row.classList.toggle("truth", k === truth);
        });
        $("alLimRead").textContent = "The model reads it as " + g + (g === truth ? ", which is right." : ", but it is a " + truth + ".");
        const v = curve(), now = v[dx + R];
        host.querySelectorAll("#alLimAcc span").forEach((b, i) => b.classList.toggle("on", i === dx + R));
        $("alLimAcc").innerHTML = v.map((n, i) => '<span class="' + (i === dx + R ? "on" : "") + '" title="' + n + ' of ' + N + '"><i style="height:' + n / N * 100 + '%"></i></span>').join("");
        $("alLimAccTxt").textContent = "Right on " + now + " of " + N + " (" + Math.round(now / N * 100) + "%) at this shift. With the digits in place: " + v[R] + " of " + N + " (" + Math.round(v[R] / N * 100) + "%).";
      };
      host.addEventListener("input", (e) => {
        if (e.target.id === "alLimX") { dx = +e.target.value; $("alLimXv").textContent = dx; }
        else if (e.target.id === "alLimY") { dy = +e.target.value; $("alLimYv").textContent = dy; }
        else return;
        draw();
      });
      $("alLimNext").addEventListener("click", () => { let n = at; while (n === at) n = Math.floor(Math.random() * N); at = n; draw(); });
      draw();
    }).catch(() => { host.hidden = true; });
  })();

  // ======================================================================
  // 3c. Where it is used: reading a ZIP code with the real weights
  // ======================================================================
  (function zip() {
    const host = $("alZip");
    if (!host) return;
    Promise.all([samples, templatesP]).then(([s, t]) => {
      const reads = s.imgs.map((img) => best(scoresOf(t.W, inkOf(img))));
      host.innerHTML = '<div class="al-zip-row" id="alZipRow"></div><div class="al-zip-foot"><button type="button" class="al-next" id="alZipGo">Read another ZIP code</button><p class="al-zip-res" id="alZipRes" aria-live="polite"></p></div>';
      const draw = () => {
        const idx = Array.from({ length: 5 }, () => Math.floor(Math.random() * s.imgs.length)), wrong = idx.filter((i) => reads[i] !== s.labels[i]).length;
        $("alZipRow").innerHTML = idx.map((i) => '<div class="al-zd' + (reads[i] === s.labels[i] ? "" : " bad") + '"><canvas width="28" height="28"></canvas><b>' + reads[i] + "</b><small>" + (reads[i] === s.labels[i] ? "right" : "it is a " + s.labels[i]) + "</small></div>").join("");
        $("alZipRow").querySelectorAll("canvas").forEach((cv, k) => paint(cv, s.imgs[idx[k]]));
        const read = idx.map((i) => reads[i]).join(""), real = idx.map((i) => s.labels[i]).join("");
        $("alZipRes").innerHTML = wrong ? "Read as <b>" + read + "</b>, but the ZIP code is <b>" + real + "</b>. " + wrong + (wrong === 1 ? " digit is" : " digits are") + " wrong, so the letter goes to the wrong place."
          : "Read as <b>" + read + "</b>, which is right. Try a few more and see how often it slips.";
      };
      $("alZipGo").addEventListener("click", draw);
      draw();
    }).catch(() => { host.hidden = true; });
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
