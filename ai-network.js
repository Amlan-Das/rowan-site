/* The AI financing network on ai-news.html.

   The companies sit on a turning sphere and every deal is an arc between two of them, lifted off the
   surface so it reads as 3D. An arrowhead shows which way the value flows. Equity investments are
   solid blue lines and purchase commitments are dashed orange ones. The deals come from AI_NETWORK
   in data.js, and the table under the sphere lists the same deals in plain text.

   Drag to turn it. Point at a company or a line, or pick one from the list, to light up its deals. */
(function () {
  "use strict";
  const root = document.getElementById("aiNet");
  if (!root || typeof AI_NETWORK === "undefined") return;

  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { nodes, deals } = AI_NETWORK;
  const N = nodes.length;

  const COLORS = { equity: "#2b5fb3", purchase: "#b4531a", lab: "#0f5a44", chips: "#121614", cloud: "#5b6b7a", dc: "#6d4a9a", power: "#8a6a00", finance: "#a33a5c", electrical: "#2f7f8f", collab: "#7a8a84" };
  const KIND_LABEL = { lab: "AI lab", chips: "Chipmaker", cloud: "Cloud", dc: "Data centers", power: "Power", finance: "Finance", electrical: "Electrical equipment" };
  const TYPE_LABEL = { equity: "Equity investment", purchase: "Purchase commitment", collab: "Technology collaboration" };

  // ---------- Data ----------
  const idx = {};
  nodes.forEach((n, i) => (idx[n.id] = i));
  const links = deals.map((d, k) => Object.assign({ k, a: idx[d.from], b: idx[d.to] }, d));
  const money = (l) => l.type !== "collab";
  links.forEach((l) => { l.twoWay = money(l) && links.some((m) => money(m) && m.a === l.b && m.b === l.a); });
  const pairKey = (l) => Math.min(l.a, l.b) + "-" + Math.max(l.a, l.b);
  const groups = {};
  links.forEach((l) => (groups[pairKey(l)] = groups[pairKey(l)] || []).push(l));
  const twoWayPairs = new Set(links.filter((l) => l.twoWay).map(pairKey)).size;
  const nodeTwoWay = nodes.map((_, i) => links.some((l) => l.twoWay && (l.a === i || l.b === i)));

  // ---------- Layout: spread the companies over the sphere, linked ones nearer each other ----------
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (v) => { const m = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / m, v[1] / m, v[2] / m]; };

  const w = Array.from({ length: N }, () => new Array(N).fill(0));
  links.forEach((l) => { w[l.a][l.b]++; w[l.b][l.a]++; });
  const degree = w.map((row) => row.reduce((s, x) => s + x, 0));
  const golden = Math.PI * (3 - Math.sqrt(5));
  let P = new Array(N);
  nodes.map((_, i) => i).sort((a, b) => degree[b] - degree[a]).forEach((ni, r) => {
    const y = 1 - (r + 0.5) / N * 2, rad = Math.sqrt(1 - y * y), t = r * golden;
    P[ni] = [Math.cos(t) * rad, y, Math.sin(t) * rad];
  });
  for (let it = 0; it < 500; it++) {
    const F = P.map(() => [0, 0, 0]);
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const d = [P[i][0] - P[j][0], P[i][1] - P[j][1], P[i][2] - P[j][2]];
      const dist = Math.hypot(d[0], d[1], d[2]) || 1e-3;
      const f = 0.03 / (dist * dist) - (w[i][j] ? (dist - 1.3) * 0.005 * Math.min(w[i][j], 3) : 0);
      for (let c = 0; c < 3; c++) { F[i][c] += d[c] / dist * f; F[j][c] -= d[c] / dist * f; }
    }
    P = P.map((p, i) => norm([p[0] + F[i][0], p[1] + F[i][1], p[2] + F[i][2]]));
  }
  // Turn the whole layout so the busiest company starts facing you
  const hub = degree.indexOf(Math.max.apply(null, degree));
  (function faceFront() {
    const from = P[hub], to = [0, 0.15, 1].map((x, _, a) => x / Math.hypot(a[0], a[1], a[2]));
    const axis = cross(from, to), s = Math.hypot(axis[0], axis[1], axis[2]), c = dot(from, to);
    if (s < 1e-6) return;
    const k = axis.map((x) => x / s);
    P = P.map((v) => {
      const kv = cross(k, v), kd = dot(k, v);
      return [0, 1, 2].map((i) => v[i] * c + kv[i] * s + k[i] * kd * (1 - c));
    });
  })();

  // ---------- Arcs: each deal follows a great circle and bulges out from the sphere ----------
  const M = 44;
  links.forEach((l) => {
    const A = P[l.a], B = P[l.b];
    const th = Math.acos(Math.max(-1, Math.min(1, dot(A, B))));
    let n = cross(A, B);
    n = Math.hypot(n[0], n[1], n[2]) < 1e-6 ? [0, 1, 0] : norm(n);
    const g = groups[pairKey(l)];
    const off = 0.1 * (g.indexOf(l) - (g.length - 1) / 2);   // parallel deals fan out instead of overlapping
    const lift = 0.1 + (l.type === "purchase" ? 0.04 : 0);
    const nxA = cross(n, A);
    l.theta = th;
    l.pts = [];
    for (let i = 0; i <= M; i++) {
      const t = i / M, ang = t * th, bump = Math.sin(Math.PI * t);
      let p = [0, 1, 2].map((c) => A[c] * Math.cos(ang) + nxA[c] * Math.sin(ang) + n[c] * off * bump);
      p = norm(p);
      const r = 1 + lift * bump;
      l.pts.push([p[0] * r, p[1] * r, p[2] * r]);
    }
  });

  // ---------- Canvas ----------
  const stage = $("netStage"), canvas = $("netCanvas"), ctx = canvas.getContext("2d");
  const tip = $("netTip");
  let W = 0, H = 0, CX = 0, CY = 0, R = 0, fontPx = 13, nameW = [];
  let ax = -0.2, ay = 0, vx = 0, vy = 0, dragging = null;
  let hover = null, pinned = null, circular = false, dirty = true, on = true, raf = 0;
  let frame = { nodes: [] };

  const font = (px) => "600 " + px + "px " + (getComputedStyle(document.body).fontFamily || "sans-serif");
  const fit = () => {
    const r = stage.getBoundingClientRect();
    if (!r.width) return;
    W = r.width; H = r.height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    CX = W / 2; CY = H / 2;
    R = Math.min(W, H) / 2 * 0.78;
    fontPx = Math.max(10, Math.min(14, R * 0.05));
    ctx.font = font(fontPx);
    nameW = nodes.map((n) => ctx.measureText(n.name).width + fontPx * 1.3);
    dirty = true;
  };

  const proj = (p) => {
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    const x1 = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy;
    const y2 = p[1] * cx - z1 * sx, z2 = p[1] * sx + z1 * cx;
    const sc = 3.4 / (3.4 - z2);
    return [CX + x1 * R * sc, CY + y2 * R * sc, z2, sc];
  };
  const depthOf = (z) => 0.3 + 0.7 * Math.min(1, Math.max(0, (z + 1.2) / 2.4));
  const active = () => pinned || hover;

  const linkAlpha = (l) => {
    if (circular && !l.twoWay) return 0.07;
    const a = active();
    if (!a) return 0.9;
    if (a.kind === "edge") return a.k === l.k ? 1 : 0.08;
    return l.a === a.i || l.b === a.i ? 1 : 0.08;
  };
  const nodeAlpha = (i) => {
    if (circular && !nodeTwoWay[i]) return 0.35;
    const a = active();
    if (!a) return 1;
    if (a.kind === "edge") { const l = links[a.k]; return l.a === i || l.b === i ? 1 : 0.3; }
    return a.i === i || links.some((l) => (l.a === a.i && l.b === i) || (l.b === a.i && l.a === i)) ? 1 : 0.3;
  };

  const roundRect = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };

  const drawSphere = () => {
    const g = ctx.createRadialGradient(CX - R * 0.32, CY - R * 0.38, R * 0.08, CX, CY, R * 1.02);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.65, "#f1f5f3"); g.addColorStop(1, "#dde6e1");
    ctx.globalAlpha = 1; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#b9c2bd"; ctx.lineWidth = 1; ctx.stroke();
    // Meridians and parallels that turn with the sphere, so the rotation reads as depth
    const line = (fn) => {
      let prev = null;
      for (let i = 0; i <= 72; i++) {
        const q = proj(fn(i / 72 * Math.PI * 2));
        if (prev) {
          ctx.globalAlpha = 0.05 + 0.2 * depthOf((q[2] + prev[2]) / 2);
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        }
        prev = q;
      }
    };
    ctx.strokeStyle = "#8a9690"; ctx.lineWidth = 0.8;
    for (let m = 0; m < 6; m++) { const lon = m * Math.PI / 6; line((t) => [Math.cos(lon) * Math.cos(t), Math.sin(t), Math.sin(lon) * Math.cos(t)]); }
    [-60, -30, 0, 30, 60].forEach((deg) => { const la = deg * Math.PI / 180; line((t) => [Math.cos(t) * Math.cos(la), Math.sin(la), Math.sin(t) * Math.cos(la)]); });
    ctx.globalAlpha = 1;
  };

  const drawLink = (l, pass, time) => {
    const sp = l.sp, A = frame.nodes[l.a], B = frame.nodes[l.b];
    const inside = (p, n) => Math.abs(p[0] - n.x) < n.w / 2 + 3 && Math.abs(p[1] - n.y) < n.h / 2 + 3;
    let s0 = 0, s1 = M;
    while (s0 < M && inside(sp[s0], A)) s0++;
    while (s1 > 0 && inside(sp[s1], B)) s1--;
    l.vis = [s0, s1];
    if (s1 - s0 < 2) return;
    const al = linkAlpha(l);
    if (al < 0.02) return;
    const a = active(), strong = al >= 0.99 && (a || (circular && l.twoWay));
    const col = COLORS[l.type];
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = "round";
    const dashes = Math.max(5, Math.round(l.theta * 11));
    for (let i = s0; i < s1; i++) {
      const zm = (sp[i][2] + sp[i + 1][2]) / 2;
      if ((zm < 0 ? 0 : 1) !== pass) continue;
      if (l.type === "purchase" && Math.floor((i + 0.5) / M * dashes) % 2 === 1) continue;
      if (l.type === "collab" && Math.floor((i + 0.5) / M * dashes * 3) % 2 === 1) continue;
      ctx.globalAlpha = al * depthOf(zm);
      ctx.lineWidth = (l.type === "equity" ? 2.1 : l.type === "purchase" ? 1.8 : 1.6) * (sp[i][3] + sp[i + 1][3]) / 2 + (strong ? 0.9 : 0);
      ctx.beginPath(); ctx.moveTo(sp[i][0], sp[i][1]); ctx.lineTo(sp[i + 1][0], sp[i + 1][1]); ctx.stroke();
    }
    // Arrowhead where the arc meets the destination
    const e = sp[s1], f = sp[Math.max(s1 - 2, 0)];
    if (l.type !== "collab" && (e[2] < 0 ? 0 : 1) === pass) {
      const ang = Math.atan2(e[1] - f[1], e[0] - f[0]), sz = 8.5 * e[3];
      ctx.globalAlpha = Math.min(1, al * depthOf(e[2]) + 0.15);
      ctx.beginPath();
      ctx.moveTo(e[0], e[1]);
      ctx.lineTo(e[0] - Math.cos(ang - 0.42) * sz, e[1] - Math.sin(ang - 0.42) * sz);
      ctx.lineTo(e[0] - Math.cos(ang + 0.42) * sz, e[1] - Math.sin(ang + 0.42) * sz);
      ctx.closePath(); ctx.fill();
    }
    // Dots travelling from source to destination
    if (!reduceMotion && al > 0.4 && l.type !== "collab") {
      for (let q = 0; q < 3; q++) {
        const u = (time * 0.00007 + q / 3 + l.k * 0.137) % 1;
        const fi = s0 + u * (s1 - s0), i = Math.min(Math.floor(fi), s1 - 1), fr = fi - i;
        const x = sp[i][0] + (sp[i + 1][0] - sp[i][0]) * fr, y = sp[i][1] + (sp[i + 1][1] - sp[i][1]) * fr;
        const z = sp[i][2] + (sp[i + 1][2] - sp[i][2]) * fr;
        if ((z < 0 ? 0 : 1) !== pass) continue;
        ctx.globalAlpha = al * depthOf(z);
        ctx.beginPath(); ctx.arc(x, y, 2.5 * sp[i][3], 0, Math.PI * 2); ctx.fill();
      }
    }
  };

  const drawNode = (i, pass) => {
    const n = frame.nodes[i];
    if ((n.z < 0 ? 0 : 1) !== pass) return;
    const al = nodeAlpha(i);
    ctx.globalAlpha = al * (0.55 + 0.45 * depthOf(n.z));
    ctx.fillStyle = COLORS[nodes[i].kind];
    roundRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h, n.h / 2); ctx.fill();
    const a = active();
    if (a && a.kind === "node" && a.i === i) { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke(); ctx.strokeStyle = COLORS[nodes[i].kind]; ctx.lineWidth = 1; roundRect(n.x - n.w / 2 - 3, n.y - n.h / 2 - 3, n.w + 6, n.h + 6, n.h / 2 + 3); ctx.stroke(); }
    ctx.globalAlpha = al;
    ctx.fillStyle = "#ffffff"; ctx.font = font(fontPx * n.sc); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(nodes[i].name, n.x, n.y + 0.5);
  };

  const draw = (time) => {
    ctx.clearRect(0, 0, W, H);
    drawSphere();
    frame.nodes = nodes.map((_, i) => {
      const q = proj(P[i]);
      return { x: q[0], y: q[1], z: q[2], sc: q[3], w: nameW[i] * q[3], h: fontPx * 1.8 * q[3] };
    });
    links.forEach((l) => { l.sp = l.pts.map(proj); });
    const byDepth = nodes.map((_, i) => i).sort((p, q) => frame.nodes[p].z - frame.nodes[q].z);
    [0, 1].forEach((pass) => {
      links.forEach((l) => drawLink(l, pass, time));
      byDepth.forEach((i) => drawNode(i, pass));
    });
    ctx.globalAlpha = 1;
  };

  // ---------- Picking what is under the pointer ----------
  const pick = (x, y) => {
    const order = nodes.map((_, i) => i).sort((p, q) => frame.nodes[q].z - frame.nodes[p].z);
    for (const i of order) {
      const n = frame.nodes[i];
      if (Math.abs(x - n.x) <= n.w / 2 + 2 && Math.abs(y - n.y) <= n.h / 2 + 2) return { kind: "node", i };
    }
    let best = null, bestD = 9;
    links.forEach((l) => {
      if (!l.vis || l.vis[1] - l.vis[0] < 2 || linkAlpha(l) < 0.3) return;
      for (let i = l.vis[0]; i < l.vis[1]; i++) {
        const p = l.sp[i], q = l.sp[i + 1], dx = q[0] - p[0], dy = q[1] - p[1];
        const t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (y - p[1]) * dy) / (dx * dx + dy * dy || 1)));
        const d = Math.hypot(x - (p[0] + dx * t), y - (p[1] + dy * t)) - (p[2] > 0 ? 1.5 : 0);   // prefer lines on the near side
        if (d < bestD) { bestD = d; best = { kind: "edge", k: l.k }; }
      }
    });
    return best;
  };
  const same = (a, b) => (!a && !b) || (a && b && a.kind === b.kind && (a.kind === "node" ? a.i === b.i : a.k === b.k));

  // ---------- Text panels ----------
  const name = (i) => nodes[i].name;
  const dealName = (l) => name(l.a) + (l.type === "collab" ? " and " : " to ") + name(l.b);
  const flagMark = (l) => (l.flag ? " *" : "");
  const detail = $("netDetail");
  const renderDetail = () => {
    const a = active();
    document.querySelectorAll(".net-chip").forEach((c) => c.classList.toggle("on", !!a && ((a.kind === "node" && +c.dataset.i === a.i) || (a.kind === "edge" && (+c.dataset.i === links[a.k].a || +c.dataset.i === links[a.k].b)))));
    document.querySelectorAll("#netRows tr").forEach((r) => r.classList.toggle("on", !!a && a.kind === "edge" && +r.dataset.k === a.k));
    const mini = $("netMini");
    if (mini) {
      mini.textContent = !a ? "Point at a company or a line to see its deals."
        : a.kind === "edge" ? dealName(links[a.k]) + ": " + TYPE_LABEL[links[a.k].type].toLowerCase() + ", " + links[a.k].amount
        : name(a.i) + ": " + links.filter((l) => l.a === a.i || l.b === a.i).length + " deals";
    }
    if (!a) {
      detail.innerHTML = '<p class="net-hint">Point at a company or a line, or pick one above, to see its deals. Tap to hold a selection.</p>';
      return;
    }
    if (a.kind === "edge") {
      const l = links[a.k];
      detail.innerHTML = '<p class="net-dtitle">' + esc(dealName(l)) + '</p><p class="net-dkind ' + l.type + '">' + TYPE_LABEL[l.type] + " &middot; " + esc(l.amount) + "</p><p>" + esc(l.what) + "</p>" +
        (l.flag ? '<p class="net-dflag">* ' + esc(l.flag) + "</p>" : "") + (l.twoWay ? '<p class="net-dflag">Money also flows the other way between these two.</p>' : "");
      return;
    }
    const i = a.i;
    const group = (label, list, who) => list.length
      ? '<p class="net-grp">' + label + "</p><ul>" + list.map((l) => "<li><span>" + esc(name(who(l))) + (l.twoWay ? ' <i title="Money also flows back">&#8646;</i>' : "") + "</span><b>" + esc(l.amount) + flagMark(l) + "</b></li>").join("") + "</ul>"
      : "";
    detail.innerHTML = '<p class="net-dtitle">' + esc(name(i)) + "</p>" +
      group("Invests in", links.filter((l) => l.type === "equity" && l.a === i), (l) => l.b) +
      group("Funded by", links.filter((l) => l.type === "equity" && l.b === i), (l) => l.a) +
      group("Commits to buy from", links.filter((l) => l.type === "purchase" && l.a === i), (l) => l.b) +
      group("Receives purchase commitments from", links.filter((l) => l.type === "purchase" && l.b === i), (l) => l.a) +
      group("Collaborates with", links.filter((l) => l.type === "collab" && (l.a === i || l.b === i)), (l) => (l.a === i ? l.b : l.a));
  };

  const setHover = (h) => { if (same(h, hover)) return; hover = h; dirty = true; if (!pinned) renderDetail(); };
  const setPinned = (p) => { pinned = same(p, pinned) ? null : p; dirty = true; renderDetail(); };

  // ---------- Build the page parts ----------
  const kinds = Array.from(new Set(nodes.map((n) => n.kind)));
  $("netKey").innerHTML = kinds.map((k) => '<span><i style="background:' + COLORS[k] + '"></i>' + KIND_LABEL[k] + "</span>").join("");
  $("netChips").innerHTML = nodes.map((n, i) =>
    '<button type="button" class="net-chip" data-i="' + i + '"><i style="background:' + COLORS[n.kind] + '"></i>' + esc(n.name) + "</button>").join("");
  $("netRows").innerHTML = links.map((l) =>
    '<tr data-k="' + l.k + '"><td>' + esc(dealName(l)) + '</td><td class="net-t ' + l.type + '">' + TYPE_LABEL[l.type] + "</td><td>" + esc(l.amount) + "</td><td>" + esc(l.what) +
    (l.flag ? ' <span class="net-dflag">* ' + esc(l.flag) + "</span>" : "") + "</td></tr>").join("");
  const nMoney = links.filter(money).length, nCollab = links.length - nMoney;
  $("netStats").textContent = nMoney + " deals" + (nCollab ? " and " + nCollab + " technology collaborations" : "") + " between " + N + " companies. " + twoWayPairs + " pairs pay each other in both directions.";
  $("netCount").textContent = "All " + links.length + " deals and collaborations";
  $("netSources").innerHTML = (AI_NETWORK.sources || []).map((s) => '<a href="' + esc(s.href) + '" target="_blank" rel="noopener">' + esc(s.label) + "</a>").join(", ");
  $("netChecked").textContent = AI_NETWORK.checked || "";
  canvas.setAttribute("aria-label", "Interactive 3D diagram of " + links.length + " financing deals between " + N + " AI companies. Every deal is also listed in the table below.");

  root.addEventListener("mouseover", (e) => {
    const c = e.target.closest(".net-chip"), r = e.target.closest("#netRows tr");
    if (c) setHover({ kind: "node", i: +c.dataset.i });
    else if (r) setHover({ kind: "edge", k: +r.dataset.k });
  });
  root.addEventListener("mouseout", (e) => { if (e.target.closest(".net-chip, #netRows tr")) setHover(null); });
  root.addEventListener("focusin", (e) => { const c = e.target.closest(".net-chip"); if (c) setHover({ kind: "node", i: +c.dataset.i }); });
  root.addEventListener("focusout", (e) => { if (e.target.closest(".net-chip")) setHover(null); });
  root.addEventListener("click", (e) => {
    const c = e.target.closest(".net-chip"), r = e.target.closest("#netRows tr");
    if (c) setPinned({ kind: "node", i: +c.dataset.i });
    else if (r) setPinned({ kind: "edge", k: +r.dataset.k });
  });
  const circBtn = $("netCircular");
  circBtn.addEventListener("click", () => { circular = !circular; circBtn.setAttribute("aria-pressed", String(circular)); dirty = true; });

  // ---------- Pointer: drag to turn, tap to hold ----------
  const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener("pointerdown", (e) => {
    dragging = { x: e.clientX, y: e.clientY, moved: false };
    canvas.setPointerCapture(e.pointerId);
    stage.classList.add("grab");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (dragging) {
      const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragging.moved = true;
      vy = dx * 0.006; vx = -dy * 0.006;
      dragging.x = e.clientX; dragging.y = e.clientY;
      tip.hidden = true;
      return;
    }
    if (e.pointerType === "touch") return;
    const [x, y] = local(e), h = pick(x, y);
    stage.classList.toggle("over", !!h);
    setHover(h);
    if (h && h.kind === "edge") {
      const l = links[h.k];
      tip.innerHTML = "<b>" + esc(dealName(l)) + "</b> " + esc(l.amount);
      tip.style.left = Math.min(x + 14, W - 190) + "px"; tip.style.top = Math.max(y - 34, 4) + "px"; tip.hidden = false;
    } else tip.hidden = true;
  });
  const release = (e) => {
    if (dragging && !dragging.moved && e.type === "pointerup") { const [x, y] = local(e); setPinned(pick(x, y)); }
    dragging = null; stage.classList.remove("grab");
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", () => { if (!dragging) { setHover(null); tip.hidden = true; stage.classList.remove("over"); } });

  // ---------- Animation: turn slowly, and only while it is on screen ----------
  const loop = (time) => {
    ay += vy; ax += vx;
    if (!dragging) {
      vx *= 0.94;
      const spin = reduceMotion || active() || circular ? 0 : 0.0022;
      vy += (spin - vy) * 0.04;
      if (Math.abs(vx) < 1e-5) vx = 0;
      if (Math.abs(vy) < 1e-5) vy = 0;
    }
    ax = Math.max(-1.25, Math.min(1.25, ax));
    if (!reduceMotion || dirty || dragging || vx || vy) { draw(time); dirty = false; }
    raf = on ? requestAnimationFrame(loop) : 0;
  };
  fit();
  renderDetail();
  new ResizeObserver(fit).observe(stage);
  new IntersectionObserver((en) => {
    on = en[0].isIntersecting;
    if (on && !raf) raf = requestAnimationFrame(loop);
  }).observe(stage);
})();
