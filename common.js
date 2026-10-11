/* Shared by every page. Reads its content from data.js.
   Nothing in here needs editing. Go to data.js for your content. */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const onVisible = (el, fn, threshold) => {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { fn(en.target); io.unobserve(en.target); } });
  }, { threshold: threshold || 0.15 });
  io.observe(el);
};

// Résumé links (any page)
document.querySelectorAll("[data-resume]").forEach((a) => { a.href = RESUME; a.target = "_blank"; a.rel = "noopener"; });

/* ---------- Formatting ---------- */
const fmtUSD = (v) => (typeof v === "number" && isFinite(v))
  ? "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;
const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtShort = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtMonth = (d) => d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
const signedPct = (n, digits) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(digits == null ? 1 : digits) + "%";
// Short price for tight spaces: whole dollars from $100 up
const fmtUSD0 = (v) => (typeof v === "number" && isFinite(v))
  ? "$" + (Math.abs(v) >= 100 ? Math.round(v).toLocaleString("en-US") : v.toFixed(2)) : null;
const fmtDateObj = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/* ---------- Editorial pages (brief.html and deals.html) ---------- */
const etTime = (iso, withDate) => {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const o = { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" };
  if (withDate) { o.month = "short"; o.day = "numeric"; }
  return d.toLocaleString("en-US", o) + " ET";
};

// [3] or [2, 5] in the model's text become superscript links to the source list
const citeHtml = (text) => esc(text).replace(/\s*\[(\d+(?:\s*,\s*\d+)*)\]/g, (_, g) =>
  '<sup class="ed-cite">' + g.split(",").map((n) => {
    n = n.trim();
    return '<a href="#s' + n + '" data-n="' + n + '" aria-label="Source ' + n + '">' + n + "</a>";
  }).join(",") + "</sup>");

// Hovering a citation highlights its source in the list
function citeHover() {
  document.addEventListener("mouseover", (e) => {
    const a = e.target.closest(".ed-cite a, .ed-hit .n, .ed-found a, .deal-srcs a");
    document.querySelectorAll(".ed-src.lit").forEach((x) => x.classList.remove("lit"));
    if (a) { const s = document.getElementById("s" + (a.dataset.n || a.textContent)); if (s) s.classList.add("lit"); }
  });
}

// The "how it was made" steps: whichever one is in the middle of the screen is the active one
function initSteps(list, onStep) {
  list.classList.add("js");
  const steps = Array.from(list.querySelectorAll(".ed-step"));
  steps[0].classList.add("on");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      steps.forEach((s) => s.classList.toggle("on", s === en.target));
      if (onStep) onStep(+en.target.dataset.step);
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  steps.forEach((s) => io.observe(s));
}

/* ---------- Primers (brief.html) ----------
   Turns a hand-written Markdown primer into HTML. Covers what a primer needs:
   headings, paragraphs, bullet and numbered lists, quotes, tables, dividers,
   images, links, bold, italic and code. HTML comments are dropped, which is
   where each primer file keeps its writing guide. */
function mdToHtml(src) {
  const text = String(src || "").replace(/<!--[\s\S]*?-->/g, "").replace(/\r\n?/g, "\n");
  const url = (u) => /^\s*(javascript|data|vbscript):/i.test(u) ? "#" : u;
  const inline = (t) => esc(t)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, u) => '<img src="' + url(u) + '" alt="' + alt + '" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) =>
      '<a href="' + url(u) + '"' + (/^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : "") + ">" + t + "</a>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\s](?:[^*]*[^*\s])?)\*/g, "$1<em>$2</em>")
    .replace(/(^|[^\w])_([^_\s](?:[^_]*[^_\s])?)_(?=[^\w]|$)/g, "$1<em>$2</em>");
  const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

  const lines = text.split("\n"), out = [];
  let para = [];
  const flush = () => { if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; } };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], t = line.trim();
    if (!t) { flush(); continue; }
    let m;
    if ((m = t.match(/^(#{1,4})\s+(.*)$/))) {
      flush();
      const lv = Math.min(m[1].length + 2, 6);   // # becomes h3, so headings sit under the primer title
      out.push("<h" + lv + ">" + inline(m[2].replace(/\s#+$/, "")) + "</h" + lv + ">");
    } else if (/^([-*_])(\s*\1){2,}$/.test(t)) {
      flush(); out.push("<hr>");
    } else if (t.startsWith(">")) {
      flush();
      const q = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) q.push(lines[i++].trim().replace(/^>\s?/, ""));
      i--;
      out.push("<blockquote>" + q.join("\n").split(/\n\s*\n/).map((p) => "<p>" + inline(p.replace(/\n/g, " ")) + "</p>").join("") + "</blockquote>");
    } else if (/^([-*+]|\d+[.)])\s+/.test(t)) {
      flush();
      const ordered = /^\d/.test(t), items = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        if (/^([-*+]|\d+[.)])\s+/.test(l)) items.push(l.replace(/^([-*+]|\d+[.)])\s+/, ""));
        else if (l && items.length && /^\s+/.test(lines[i])) items[items.length - 1] += " " + l;  // wrapped line
        else break;
        i++;
      }
      i--;
      out.push("<" + (ordered ? "ol" : "ul") + ">" + items.map((x) => "<li>" + inline(x) + "</li>").join("") + "</" + (ordered ? "ol" : "ul") + ">");
    } else if (t.startsWith("|") && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1].trim())) {
      flush();
      const head = cells(t), body = [];
      const align = cells(lines[i + 1]).map((c) => /:$/.test(c) ? (/^:/.test(c) ? "center" : "right") : "");
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) body.push(cells(lines[i++]));
      i--;
      const td = (tag, c, k) => "<" + tag + (align[k] ? ' style="text-align:' + align[k] + '"' : "") + ">" + inline(c) + "</" + tag + ">";
      out.push('<div class="primer-table"><table><thead><tr>' + head.map((c, k) => td("th", c, k)).join("") + "</tr></thead><tbody>" +
        body.map((r) => "<tr>" + r.map((c, k) => td("td", c, k)).join("") + "</tr>").join("") + "</tbody></table></div>");
    } else {
      para.push(t);
    }
  }
  flush();
  return out.join("\n");
}

/* ---------- Open and close rows (one open at a time) ---------- */
function setRowOpen(row, open) {
  row.classList.toggle("open", open);
  const btn = row.querySelector(".lbtn");
  const inner = row.querySelector(".lpanel > .inner");
  btn.setAttribute("aria-expanded", String(open));
  if (inner) { inner.inert = !open; inner.setAttribute("aria-hidden", String(!open)); }
}
function makeAccordion(list, onOpen) {
  list.querySelectorAll(".lrow").forEach((row) => setRowOpen(row, row.classList.contains("open")));
  list.addEventListener("click", (e) => {
    const btn = e.target.closest(".lbtn");
    if (!btn || !list.contains(btn)) return;
    const row = btn.closest(".lrow");
    const willOpen = !row.classList.contains("open");
    list.querySelectorAll(".lrow.open").forEach((r) => setRowOpen(r, false));
    if (willOpen) { setRowOpen(row, true); if (onOpen) onOpen(row); }
  });
}

/* ---------- Pitches ----------
   Used on the home page (opts.charts = false) and on pitches.html (opts.charts = true).
   Each pitch is one row. Closed, the row shows the call and a small slider from the pitch
   price to the target. Open, it adds the thesis, a full-size slider with the last close and
   the closest print, a clock for the horizon, and the numbers behind them. */
async function renderPitches(host, opts) {
  opts = opts || {};
  let live = {};
  try {
    const r = await fetch("pitch-prices.json", { cache: "no-store" });
    if (r.ok) live = (await r.json()).prices || {};
  } catch (e) { /* the page still works on the numbers in data.js */ }

  if (!PITCHES.length) { host.innerHTML = '<p class="missing">No pitches yet. Add one in data.js.</p>'; return; }

  const now = new Date();
  const DAY = 86400000;
  const items = PITCHES.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const dark = !!host.closest(".dark");

  const metrics = (p) => {
    const lp = live[p.ticker] || {};
    const cur = typeof lp.current === "number" ? lp.current : (typeof p.current === "number" ? p.current : null);
    const have = typeof p.pitchPrice === "number" && typeof p.target === "number" && p.target !== p.pitchPrice;
    const way = (price) => ((price - p.pitchPrice) / (p.target - p.pitchPrice));
    const m = {
      cur: cur, curDate: lp.currentDate || null,
      progress: have && cur != null ? way(cur) : null,
      implied: have ? (p.target / p.pitchPrice - 1) * 100 : null,
      since: typeof p.pitchPrice === "number" && cur != null ? (cur / p.pitchPrice - 1) * 100 : null,
      toGo: typeof p.target === "number" && cur != null ? (p.target / cur - 1) * 100 : null,
      closest: lp.closest || null,
      closestWay: have && lp.closest ? way(lp.closest.price) : null
    };
    const start = p.date ? new Date(p.date + "T00:00:00") : null;
    if (start && !isNaN(start)) {
      const end = new Date(start); end.setMonth(end.getMonth() + (p.horizonMonths || 12));
      m.total = Math.max(Math.round((end - start) / DAY), 1);
      m.elapsed = Math.max(Math.round((now - start) / DAY), 0);
      m.end = end;
    }
    return m;
  };

  // Short wording for the small slider, longer wording for the open panel
  const progText = (pr) => {
    if (pr == null) return "No close yet";
    if (pr >= 1) return "Target hit";
    const n = Math.round(Math.abs(pr) * 100);
    return pr >= 0 ? n + "% there" : n + "% against";
  };
  const progSentence = (p, m) => {
    const pr = m.progress;
    if (pr == null) return "Waiting for the first close after the pitch.";
    const left = fmtUSD(Math.abs(p.target - m.cur)) + " (" + signedPct(m.toGo) + ") from the last close to the target.";
    if (pr >= 1) return "The target has been reached.";
    const n = Math.round(Math.abs(pr) * 100);
    return pr >= 0 ? n + "% of the way there. " + left
      : n + "% against the call. The stock is " + signedPct(m.since) + " since the pitch, and " + left.toLowerCase();
  };

  // The slider. The pitch price sits on the left tick and the target on the right tick.
  // The dot is the last close and the ring is the closest the stock has come to the target.
  const trackHtml = (p, m, big) => {
    const has = m.progress != null, ring = m.closestWay != null;
    const money = (v) => (big ? fmtUSD(v) : fmtUSD0(v)) || "–";
    return '<span class="track' + (big ? " big" : "") + '"' +
      (has ? ' data-progress="' + m.progress.toFixed(4) + '"' : "") +
      (ring ? ' data-closest="' + m.closestWay.toFixed(4) + '"' : "") + ">" +
      (ring ? '<i class="reach"></i>' : "") + '<i class="fill"></i><i class="tick tp"></i><i class="tick tt"></i>' +
      (ring ? '<i class="ring"></i>' : "") + (has ? '<i class="dot"></i><b class="bubble">' + money(m.cur) + "</b>" : "") +
      '<span class="tl l">' + money(p.pitchPrice) + (big ? "<small>Pitch price</small>" : "") + "</span>" +
      '<span class="tl r">' + money(p.target) + (big ? "<small>Target</small>" : "") + "</span>" +
      '<span class="tl m">' + progText(m.progress) + "</span></span>";
  };

  const clockHtml = (m) => {
    if (m.total == null) return "";
    const f = Math.min(m.elapsed / m.total, 1);
    return '<div class="phead"><b>Time to the horizon</b><span class="lg">Day ' + Math.min(m.elapsed, m.total) + " of " + m.total + "</span></div>" +
      '<span class="clock" data-time="' + f.toFixed(4) + '"><i class="cfill"></i><i class="cdot"></i></span>' +
      '<span class="cends"><span>Pitched</span><span>' + (m.elapsed >= m.total ? "Horizon ended" : "Ends " + fmtDateObj(m.end)) + "</span></span>" +
      (m.progress != null && m.elapsed < m.total
        ? '<p class="pline">Price is ' + Math.round(Math.max(m.progress, 0) * 100) + "% of the way to the target with " + Math.round(f * 100) + "% of the horizon used.</p>" : "");
  };

  const tile = (label, value, sub) =>
    '<div class="ftile"><span class="fl">' + label + '</span><span class="fv">' + value + "</span>" + (sub ? '<span class="fs">' + sub + "</span>" : "") + "</div>";

  const rowHtml = (p, i) => {
    const m = metrics(p);
    const t = p.ticker;
    const short = /short/i.test(p.direction || "");
    const pBtn = p.link ? '<a class="btn solid" href="' + esc(p.link) + '" target="_blank" rel="noopener">Read the pitch</a>' : "";
    const mBtn = p.model ? '<a class="btn" href="' + esc(p.model) + '" target="_blank" rel="noopener">Download the model</a>' : "";
    const cBtn = !opts.charts ? '<a class="btn" href="pitches.html#' + esc(t) + '">Live chart</a>' : "";

    const c = m.closest;
    const tiles = [];
    if (p.dateLabel) tiles.push(tile("Pitched", esc(p.dateLabel), m.elapsed != null ? m.elapsed + " days ago" : ""));
    if (p.horizonMonths) tiles.push(tile("Horizon", p.horizonMonths + " months", m.end ? "Ends " + fmtMonth(m.end) : ""));
    if (fmtUSD(p.pitchPrice)) tiles.push(tile("Pitch price", fmtUSD(p.pitchPrice), esc(p.direction || "") + " entry"));
    if (fmtUSD(p.target)) tiles.push(tile("Target", fmtUSD(p.target), m.implied != null ? signedPct(m.implied) + " from the pitch price" : ""));
    if (fmtUSD(m.cur)) tiles.push(tile("Last close", fmtUSD(m.cur), (m.since != null ? signedPct(m.since) + " since the pitch" : "") + (m.curDate ? (m.since != null ? ", " : "") + esc(fmtShort(m.curDate)) : "")));
    if (c) tiles.push(tile(c.hit ? "Target hit" : "Closest print", fmtUSD(c.price),
      esc(fmtShort(c.date)) + (!c.hit && m.closestWay != null ? ", " + Math.max(Math.round(m.closestWay * 100), 0) + "% of the way" : "")));

    const legend = '<span class="lgs">' +
      (m.progress != null ? '<span class="lg"><i class="sw sw-dot"></i>Last close ' + fmtUSD(m.cur) + "</span>" : "") +
      (c ? '<span class="lg"><i class="sw sw-ring"></i>' + (c.hit ? "Target hit " : "Closest print ") + fmtUSD(c.price) + ", " + esc(fmtShort(c.date)) + "</span>" : "") + "</span>";

    const chart = opts.charts
      ? '<div class="lchart"><div class="tv" id="tv-' + esc(t) + '"></div><p>Live chart from TradingView. Not investment advice.</p></div>' : "";

    return '<div class="lrow' + (i === 0 ? " open" : "") + '" data-ticker="' + esc(t) + '" id="' + esc(t) + '">' +
      '<button class="lbtn" type="button" id="lb-' + esc(t) + '" aria-controls="lp-' + esc(t) + '" aria-expanded="false">' +
        '<span class="c-co"><span class="co">' + esc(p.company || t) + '</span><span class="tk">' + esc(t) + "</span></span>" +
        '<span class="c-call"><span class="call ' + (short ? "short" : "long") + '">' + esc(p.direction || "Pitch") + "</span></span>" +
        '<span class="c-date">' + (p.date ? esc(fmtDate(p.date)) : "") + "</span>" +
        '<span class="c-num" data-label="Pitch price">' + (fmtUSD(p.pitchPrice) || "–") + "</span>" +
        '<span class="c-num" data-label="Target">' + (fmtUSD(p.target) || "–") + (m.implied != null ? "<small>" + signedPct(m.implied) + "</small>" : "") + "</span>" +
        '<span class="c-num" data-label="Last close">' + (fmtUSD(m.cur) || "–") + (m.curDate ? "<small>" + esc(fmtShort(m.curDate)) + "</small>" : "") + "</span>" +
        '<span class="c-prog prog">' + trackHtml(p, m, false) + "</span>" +
        '<span class="ind" aria-hidden="true"></span>' +
      "</button>" +
      '<div class="lpanel" id="lp-' + esc(t) + '" role="region" aria-labelledby="lb-' + esc(t) + '"><div class="inner">' +
        '<div class="pbody"><div class="pleft">' +
          '<p class="a">' + (p.thesis ? esc(p.thesis) : '<span class="missing">Add why you made this call.</span>') + "</p>" +
          '<div class="btns">' + pBtn + mBtn + cBtn + "</div></div>" +
          '<div class="pslider">' +
            '<div class="phead"><b>Pitch price to target</b>' + legend + "</div>" +
            trackHtml(p, m, true) + '<p class="pline">' + progSentence(p, m) + "</p>" + clockHtml(m) +
          "</div>" +
        "</div>" +
        '<div class="ftiles">' + tiles.join("") + "</div>" + chart +
      "</div></div></div>";
  };

  host.innerHTML =
    '<div class="lhead" aria-hidden="true"><span>Company</span><span>Call</span><span>Pitched</span>' +
    '<span class="r">Pitch price</span><span class="r">Target</span><span class="r">Last close</span>' +
    "<span>Pitch price to target</span><span></span></div>" + items.map(rowHtml).join("");

  // Sliders. The pitch price sits at the left tick, the target at the right tick. Each marker
  // moves from the pitch price to where it belongs, once, when it comes into view.
  const TP = 16, TT = 84, EDGE = 12;
  const pos = (way) => {
    const lo = (EDGE - TP) / (TT - TP), hi = (100 - EDGE - TP) / (TT - TP);
    return TP + (TT - TP) * Math.max(lo, Math.min(way, hi));
  };
  const place = (track, i) => {
    const pr = parseFloat(track.dataset.progress), cw = parseFloat(track.dataset.closest);
    const set = (k, v) => track.style.setProperty(k, v);
    set("--delay", reduceMotion ? "0ms" : (i || 0) * 110 + "ms");
    if (!isNaN(pr)) {
      const x = pos(pr);
      set("--c", pr >= 0 ? "var(--up)" : "var(--down)");
      set("--x", x.toFixed(2) + "%"); set("--l", Math.min(x, TP).toFixed(2) + "%"); set("--w", Math.abs(x - TP).toFixed(2) + "%");
    }
    if (!isNaN(cw)) {
      const rx = pos(Math.max(cw, 0));
      set("--rx", rx.toFixed(2) + "%"); set("--rl", Math.min(rx, TP).toFixed(2) + "%"); set("--rw", Math.abs(rx - TP).toFixed(2) + "%");
    }
  };
  const placeClock = (clock) => clock.style.setProperty("--t", (parseFloat(clock.dataset.time) * 100).toFixed(2) + "%");
  const reveal = (root, i) => {
    root.querySelectorAll(".track").forEach((tr) => place(tr, i));
    root.querySelectorAll(".clock").forEach(placeClock);
  };

  const rows = Array.from(host.querySelectorAll(".lrow"));
  rows.forEach((row, i) => {
    const small = row.querySelector(".lbtn .track");
    if (reduceMotion) { reveal(row, 0); return; }
    // The slider in the row animates when it scrolls into view; the one in the panel when the row opens
    onVisible(small, () => requestAnimationFrame(() => {
      place(small, i);
      if (row.classList.contains("open")) reveal(row.querySelector(".lpanel"), 0);
    }), 1);
  });

  // Charts (pitches page): load one only when its row is opened
  const loaded = {};
  const loadChart = (row) => {
    const t = row.dataset.ticker;
    if (!opts.charts || loaded[t]) return;
    loaded[t] = true;
    const p = PITCHES.find((x) => x.ticker === t);
    const slot = document.getElementById("tv-" + t);
    if (!slot) return;
    if (!p || !p.tvSymbol) { slot.innerHTML = '<p class="missing" style="padding:16px">Add a tvSymbol (for example "NYSE:' + esc(t) + '") to show the live chart.</p>'; return; }
    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    container.style.height = "100%";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = "100%";
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.text = JSON.stringify({
      autosize: true, symbol: p.tvSymbol, interval: "D", timezone: "Etc/UTC",
      theme: dark ? "dark" : "light", style: "1", locale: "en",
      backgroundColor: dark ? "rgba(10,19,34,1)" : "rgba(255,255,255,1)",
      gridColor: dark ? "rgba(255,255,255,0.06)" : "rgba(16,27,45,0.06)",
      hide_top_toolbar: false, allow_symbol_change: false, support_host: "https://www.tradingview.com"
    });
    container.appendChild(inner);
    container.appendChild(script);
    slot.appendChild(container);
  };

  const onOpen = (row) => { loadChart(row); reveal(row.querySelector(".lpanel"), 0); };
  makeAccordion(host, onOpen);

  // Deep link: pitches.html#GEV opens that row
  const fromHash = () => {
    const t = decodeURIComponent(location.hash.slice(1));
    const row = t && rows.find((r) => r.dataset.ticker === t);
    if (!row) return false;
    host.querySelectorAll(".lrow.open").forEach((r) => setRowOpen(r, false));
    setRowOpen(row, true); onOpen(row);
    return true;
  };
  if (!fromHash()) { const first = host.querySelector(".lrow.open"); if (first) loadChart(first); }
  window.addEventListener("hashchange", fromHash);
}
