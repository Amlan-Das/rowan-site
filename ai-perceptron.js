/* Project 1 on ai-news.html: the perceptron. Re-runs the same 20-line algorithm in the browser (same data, same learning rate)
   and lets you scrub through the epochs. The numbers match the Python script's printed output. */
(function () {
  "use strict";
  const host = document.getElementById("ptRun"); if (!host) return;
  const DATA = [[[0, 0], -1], [[0, 1], -1], [[1, 0], -1], [[1, 1], 1]], LR = 0.1, EPOCHS = 20;
  const act = (v) => (v > 0 ? 1 : -1), r = (v) => Math.round(v * 1e6) / 1e6;
  // run the training once, keeping the state after every epoch and every mistake
  let w = [0, 0], b = 0; const states = [{ w: w.slice(), b, mistakes: [] }];
  for (let e = 0; e < EPOCHS; e++) {
    const mistakes = [];
    DATA.forEach(([x, t]) => { const s = x[0] * w[0] + x[1] * w[1] + b, p = act(s); if (p !== t) { mistakes.push({ x, t, p }); for (let i = 0; i < 2; i++) w[i] += LR * t * x[i]; b += LR * t; } });
    states.push({ w: w.slice(), b, mistakes });
  }
  const total = states.reduce((n, s) => n + s.mistakes.length, 0), last = states.reduce((n, s, i) => (s.mistakes.length ? i : n), 0);
  let k = 0, timer = 0;

  const NS = "http://www.w3.org/2000/svg", S = 300, P = 34, X = (v) => P + v * (S - 2 * P), Y = (v) => S - P - v * (S - 2 * P);
  const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 " + S + " " + S); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "The four training points and the line the perceptron has drawn between them");
  host.innerHTML = '<div class="pt-plot"></div><div class="pt-side"><div class="pt-ctl"><button type="button" class="pt-btn" id="ptPlay">Play</button><label class="pt-sl"><span>Passes</span><b id="ptEp">0</b><input id="ptRange" type="range" min="0" max="' + EPOCHS + '" value="0" aria-label="Passes through the data"></label></div>' +
    '<p class="pt-eq" id="ptEq"></p><div class="pt-tbl" id="ptTbl"></div><p class="pt-say" id="ptSay" aria-live="polite"></p></div>';
  host.querySelector(".pt-plot").appendChild(svg);

  function draw() {
    const st = states[k], [w1, w2] = st.w, bb = st.b;
    let g = '<rect x="' + P + '" y="' + P + '" width="' + (S - 2 * P) + '" height="' + (S - 2 * P) + '" class="box"/>';
    // positive side shading (clip to the unit square by sampling a polygon)
    const pts = []; const sq = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const f = (p) => w1 * p[0] + w2 * p[1] + bb;
    for (let i = 0; i < 4; i++) { const a = sq[i], c = sq[(i + 1) % 4], fa = f(a), fc = f(c); if (fa > 0) pts.push(a); if ((fa > 0) !== (fc > 0)) { const t = fa / (fa - fc); pts.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]); } }
    if (pts.length > 2) g += '<polygon points="' + pts.map((p) => X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join(" ") + '" class="pos"/>';
    // decision line, clipped to the square
    const hit = []; const addHit = (p) => { if (!hit.some((q) => Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) < 1e-9)) hit.push(p); };
    [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0]].forEach(([x1, y1, x2, y2]) => { const fa = f([x1, y1]), fc = f([x2, y2]); if (Math.abs(fa) < 1e-12) addHit([x1, y1]); if (Math.abs(fc) < 1e-12) addHit([x2, y2]); if (Math.abs(fa) > 1e-12 && Math.abs(fc) > 1e-12 && (fa > 0) !== (fc > 0)) { const t = fa / (fa - fc); addHit([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]); } });
    if (hit.length >= 2) g += '<line x1="' + X(hit[0][0]).toFixed(1) + '" y1="' + Y(hit[0][1]).toFixed(1) + '" x2="' + X(hit[1][0]).toFixed(1) + '" y2="' + Y(hit[1][1]).toFixed(1) + '" class="ln"/>';
    DATA.forEach(([x, t]) => { const ok = act(f(x)) === t; g += '<circle cx="' + X(x[0]) + '" cy="' + Y(x[1]) + '" r="13" class="' + (t === 1 ? "pt1" : "pt0") + (ok ? "" : " bad") + '"/><text x="' + X(x[0]) + '" y="' + (Y(x[1]) + 4) + '" class="tx' + (t === 1 ? " w" : "") + '">' + (t === 1 ? "+1" : "−1") + "</text>"; });
    g += '<text x="' + P + '" y="' + (S - 10) + '" class="ax">input 1 →</text><text x="8" y="' + (P - 12) + '" class="ax">input 2 ↑</text>';
    svg.innerHTML = g;
    host.querySelector("#ptEp").textContent = k; host.querySelector("#ptRange").value = k;
    host.querySelector("#ptEq").innerHTML = "<b>" + r(w1) + "</b>·x₁ + <b>" + r(w2) + "</b>·x₂ + <b>" + r(bb) + "</b> &gt; 0 ?";
    host.querySelector("#ptTbl").innerHTML = '<div class="h"><span>Input</span><span>Target</span><span>Score</span><span>Predicts</span></div>' + DATA.map(([x, t]) => { const s = r(w1 * x[0] + w2 * x[1] + bb), p = act(s); return '<div class="' + (p === t ? "ok" : "no") + '"><span>[' + x.join(", ") + "]</span><span>" + (t > 0 ? "+1" : "−1") + "</span><span>" + (s >= 0 ? "" : "−") + Math.abs(s).toFixed(1) + "</span><span>" + (p > 0 ? "+1" : "−1") + (p === t ? " ✓" : " ✗") + "</span></div>"; }).join("");
    const m = st.mistakes.length;
    host.querySelector("#ptSay").innerHTML = k === 0 ? "Start: both weights and the bias are 0, so every score is 0 and it answers −1 for everything." : m ? "In pass " + k + " (epoch " + (k - 1) + " in the code) it made <b>" + m + " mistake" + (m > 1 ? "s" : "") + "</b> and corrected the weights after each one." : k > last ? "No mistakes in this pass. The weights have stopped changing: it has <b>learned the AND gate</b>." : "No mistakes in this pass.";
  }
  const range = host.querySelector("#ptRange"), play = host.querySelector("#ptPlay");
  range.addEventListener("input", () => { stop(); k = +range.value; draw(); });
  function stop() { if (timer) { clearInterval(timer); timer = 0; play.textContent = "Play"; } }
  play.addEventListener("click", () => { if (timer) { stop(); return; } if (k >= EPOCHS) k = 0; play.textContent = "Pause"; draw(); timer = setInterval(() => { k = Math.min(EPOCHS, k + 1); draw(); if (k >= EPOCHS) stop(); }, 700); });
  window.__ptStates = states;
  const sum = document.getElementById("ptFinal"); if (sum) sum.innerHTML = "weights [" + r(w[0]) + ", " + r(w[1]) + "], bias " + r(b);
  const tm = document.getElementById("ptMist"); if (tm) tm.textContent = total;
  draw();
})();
