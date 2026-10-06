/* The "headlines in embedding space" figure on brief.html and deals.html.
   Each dot is a headline. As the steps scroll past, the dots go from raw text to
   vectors, cluster by topic, light up when a search finds them, and end up as the
   numbered sources the model cites.

   RagFigure.mount(host, {
     groups:  [{ name, label, query, hits: [{ n, similarity }] }]   one per search the pipeline ran
     sources: [{ n, ... }]                                           the numbered headlines
     cited:   [n, ...]                                               which of them the model cited
     steps:   [{ label, mode, note }]                                one per step on the page;
                                                                     mode is raw, embed, store, search, prompt or write
     pos:     (name, i, count) => [x, y]                             optional cluster positions, 0 to 1
     noun:    "move" or "deal"                                       what a group is called
   })
   Returns { setStep(n) }, which the page calls as the reader scrolls. */
const RagFigure = (function () {
  const MODES = ["raw", "embed", "store", "search", "prompt", "write"];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function mount(host, o) {
    const groups = o.groups || [], sources = o.sources || [], steps = o.steps || [];
    const cited = new Set(o.cited || []);
    if (!groups.length) { host.hidden = true; return { setStep() {} }; }
    const noun = o.noun || "move";

    host.hidden = false;
    host.innerHTML =
      '<div class="fig-frame">' +
        '<div class="fig-top"><span data-r="state"></span><button type="button" data-r="next">Next search &#9656;</button></div>' +
        '<canvas role="img" aria-label="Dots representing headlines move from lines of text into topic clusters, then a search lights up the nearest ones."></canvas>' +
        '<div class="fig-cap"><span class="fn">Fig. 1</span><span class="ft">Headlines in embedding space</span><span class="fs">768 dimensions, drawn in 2</span></div>' +
      "</div>" +
      '<div class="fig-moves" role="group" aria-label="Run a search for one ' + noun + '"></div>' +
      '<p class="fig-note" aria-live="polite"></p>';
    const $ = (r) => host.querySelector('[data-r="' + r + '"]');
    const cv = host.querySelector("canvas"), ctx = cv.getContext("2d");
    const moveBtns = host.querySelector(".fig-moves"), noteEl = host.querySelector(".fig-note");

    // Where each topic sits in the sketch. Related topics can sit near each other.
    const clusters = groups.map((g, i) => {
      const p = (o.pos && o.pos(g.name, i, groups.length)) || [.2 + .3 * (i % 3), .26 + .26 * Math.floor(i / 3)];
      return { name: g.label || g.name, x: p[0], y: p[1] };
    });

    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const clamp = (v) => Math.min(.96, Math.max(.04, v));

    const P = [];
    clusters.forEach((c, ci) => { for (let k = 0; k < 440; k++) P.push({ ci, ex: clamp(c.x + gauss() * .055), ey: clamp(c.y + gauss() * .048) }); });
    for (let k = 0; k < 640; k++) P.push({ ci: -1, ex: .06 + rnd() * .88, ey: .1 + rnd() * .8 });

    // Real headlines from this run sit in the cluster of the first search that found them
    const home = {};
    groups.forEach((g, ci) => (g.hits || []).forEach((h) => { if (!(h.n in home)) home[h.n] = ci; }));
    const byN = {};
    sources.forEach((s, i) => {
      const c = clusters[home[s.n]];
      const d = { n: s.n, head: true, ci: c ? home[s.n] : -1, ex: clamp(c ? c.x + gauss() * .05 : .48 + gauss() * .07), ey: clamp(c ? c.y + gauss() * .045 : .56 + gauss() * .05), col: i };
      byN[s.n] = d; P.push(d);
    });

    // Step 1 layout: every dot sits in lines of "text", like a raw feed
    const slots = [];
    for (let y = .12; y < .9 && slots.length < P.length * 1.4; y += .026) {
      let x = .07;
      while (x < .93) { const w = 3 + Math.floor(rnd() * 8); for (let k = 0; k < w && x < .93; k++, x += .0072) slots.push([x, y]); x += .0144; }
    }
    for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    P.forEach((p, i) => { const s = slots[i % slots.length]; p.rx = s[0]; p.ry = s[1]; p.x = p.rx; p.y = p.ry; });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let step = 1, q = 0, manual = false, visible = false, auto = null, W = 0;

    moveBtns.innerHTML = groups.map((g, i) => '<button type="button" data-i="' + i + '" aria-pressed="false">' + esc(g.label || g.name) + "</button>").join("");
    const stepInfo = () => steps[Math.min(Math.max(step, 1), steps.length) - 1] || { label: "", mode: "raw", note: "" };
    const mode = () => (manual ? "search" : stepInfo().mode);
    const rank = (m) => MODES.indexOf(m);

    function describe() {
      const m = mode();
      $("state").textContent = manual ? "Searching" : "Step " + step + " of " + steps.length + ": " + stepInfo().label;
      $("next").hidden = m !== "search";
      moveBtns.querySelectorAll("button").forEach((btn, i) => btn.setAttribute("aria-pressed", String(m === "search" && i === q)));
      if (m === "search") {
        const g = groups[q];
        noteEl.textContent = 'Search: "' + g.query + '". ' + ((g.hits || []).length
          ? "The " + g.hits.length + " nearest headlines light up, scores " + g.hits.map((h) => h.similarity.toFixed(2)).join(", ") + "."
          : "Nothing was close enough to pass the cutoff.");
      } else noteEl.textContent = stepInfo().note || "";
    }

    function cycle() {
      clearInterval(auto);
      if (mode() === "search" && !manual && !reduce) auto = setInterval(() => { q = (q + 1) % groups.length; describe(); }, 3600);
    }
    function setStep(s) { step = s; manual = false; describe(); cycle(); kick(); }
    const pick = (i) => { q = i; manual = stepInfo().mode !== "search"; describe(); clearInterval(auto); kick(); };
    moveBtns.addEventListener("click", (e) => { const t = e.target.closest("button"); if (t) pick(+t.dataset.i); });
    $("next").addEventListener("click", () => pick((q + 1) % groups.length));
    cv.addEventListener("click", () => pick(mode() === "search" ? (q + 1) % groups.length : q));

    function target(p, m) {
      if (m === "raw") return [p.rx, p.ry];
      if (rank(m) >= 4 && p.head) return [.9, .1 + p.col * (.8 / Math.max(1, sources.length - 1))];
      return [p.ex, p.ey];
    }

    const soft = "63,75,94", accent = "37,82,212", ink = "16,27,45", mist = "95,107,124";
    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth;
      cv.width = W * dpr; cv.height = W * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(animate) {
      const m = mode(), r = rank(m), g = groups[q];
      const hitSet = new Set(m === "search" ? (g.hits || []).map((h) => h.n) : []);
      ctx.clearRect(0, 0, W, W);
      let moving = false;

      P.forEach((p) => {
        const [tx, ty] = target(p, m);
        if (animate) { p.x += (tx - p.x) * .075; p.y += (ty - p.y) * .075; if (Math.abs(tx - p.x) + Math.abs(ty - p.y) > .0015) moving = true; }
        else { p.x = tx; p.y = ty; }
        const X = p.x * W, Y = p.y * W;
        if (p.head && r >= 1) {
          const hot = hitSet.has(p.n) || (m === "write" && cited.has(p.n)) || m === "prompt";
          const on = m !== "search" || hitSet.has(p.n);
          ctx.fillStyle = "rgba(" + (hot ? accent : soft) + "," + (on ? .95 : .35) + ")";
          ctx.beginPath(); ctx.arc(X, Y, hitSet.has(p.n) ? 3.6 : r >= 4 ? 2.6 : 2.1, 0, Math.PI * 2); ctx.fill();
        } else {
          let a = m === "raw" ? .42 : m === "embed" ? .42 : m === "store" ? .36 : m === "search" ? (p.ci === q ? .5 : .12) : .1;
          if (p.head && m === "raw") a = .75;
          ctx.fillStyle = "rgba(" + soft + "," + a + ")";
          ctx.fillRect(X, Y, 1.2, 1.2);
        }
      });

      ctx.font = '11px "IBM Plex Sans", Helvetica, Arial, sans-serif';
      ctx.textAlign = "center";
      if (m === "store" || m === "search") {
        clusters.forEach((c, i) => {
          ctx.fillStyle = m === "search" && i === q ? "rgba(" + ink + ",.95)" : "rgba(" + mist + ",.9)";
          ctx.fillText(c.name.length > 22 ? c.name.slice(0, 21) + "…" : c.name, c.x * W, (c.y - .1) * W);
        });
      }
      if (m === "search") {
        const c = clusters[q], qx = (c.x + .07) * W, qy = (c.y - .05) * W;
        (g.hits || []).forEach((h) => {
          const d = byN[h.n]; if (!d) return;
          ctx.strokeStyle = "rgba(" + accent + "," + (.25 + h.similarity * .6) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(d.x * W, d.y * W); ctx.stroke();
        });
        ctx.strokeStyle = "rgba(" + ink + ",.95)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(qx, qy, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "rgba(" + ink + ",1)"; ctx.beginPath(); ctx.arc(qx, qy, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      if (r >= 4) {
        ctx.textAlign = "right"; ctx.font = '10px "IBM Plex Sans", Helvetica, Arial, sans-serif';
        sources.forEach((s, i) => {
          ctx.fillStyle = m === "write" && !cited.has(s.n) ? "rgba(" + mist + ",.8)" : "rgba(" + accent + ",.95)";
          ctx.fillText(String(s.n), .87 * W, (.1 + i * (.8 / Math.max(1, sources.length - 1))) * W + 3.5);
        });
        ctx.textAlign = "center"; ctx.fillStyle = "rgba(" + mist + ",.9)";
        ctx.fillText("prompt", .885 * W, .06 * W);
      }
      return moving;
    }

    let raf = 0;
    function loop() {
      const moving = draw(!reduce);
      raf = (visible && (moving || mode() === "search")) ? requestAnimationFrame(loop) : 0;
    }
    function kick() { if (reduce) { draw(false); return; } if (!raf && visible) raf = requestAnimationFrame(loop); }

    new IntersectionObserver((en) => { visible = en[0].isIntersecting; kick(); }).observe(cv);
    new ResizeObserver(() => { size(); draw(false); kick(); }).observe(cv);
    size(); describe(); draw(false);
    return { setStep };
  }

  return { mount };
})();
