/* Shared by index.html, pitches.html and brief.html. Reads its content from data.js.
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
   Used on the home page (opts.charts = false) and on pitches.html (opts.charts = true). */
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

  const metrics = (p) => {
    const lp = live[p.ticker] || {};
    const cur = typeof lp.current === "number" ? lp.current : (typeof p.current === "number" ? p.current : null);
    const have = typeof p.pitchPrice === "number" && typeof p.target === "number" && p.target !== p.pitchPrice;
    const way = (price) => ((price - p.pitchPrice) / (p.target - p.pitchPrice));
    const m = {
      cur: cur, curDate: lp.currentDate || null,
      progress: have && cur != null ? way(cur) : null,
      implied: have ? (p.target / p.pitchPrice - 1) * 100 : null,
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

  const progText = (pr) => {
    if (pr == null) return "Waiting for the first close";
    if (pr >= 1) return "Target reached";
    const n = Math.round(Math.abs(pr) * 100);
    return pr >= 0 ? n + "% of the way" : n + "% against the call";
  };

  const rowHtml = (p, i) => {
    const m = metrics(p);
    const t = p.ticker;
    const pBtn = p.link ? '<a class="btn solid" href="' + esc(p.link) + '" target="_blank" rel="noopener">Read the pitch</a>' : "";
    const mBtn = p.model ? '<a class="btn" href="' + esc(p.model) + '" target="_blank" rel="noopener">Download the model</a>' : "";
    const cBtn = !opts.charts ? '<a class="btn" href="pitches.html#' + esc(t) + '">Live chart</a>' : "";

    const facts = [];
    if (p.dateLabel) facts.push(["Pitched", esc(p.dateLabel)]);
    if (p.horizonMonths) facts.push(["Horizon", p.horizonMonths + " months" + (m.end ? "<small>Ends " + fmtMonth(m.end) + "</small>" : "")]);
    if (m.total != null) facts.push(["Time elapsed", m.elapsed >= m.total ? "Horizon has ended" : "Day " + m.elapsed + " of " + m.total]);
    if (m.closest) {
      const c = m.closest;
      facts.push([c.hit ? "Target hit" : "Closest print",
        esc(fmtUSD(c.price)) + "<small>" + "On " + esc(fmtDate(c.date)) +
        (!c.hit && m.closestWay != null ? ", " + Math.max(Math.round(m.closestWay * 100), 0) + "% of the way" : "") + "</small>"]);
    }

    const chart = opts.charts
      ? '<div class="lchart"><div class="tv" id="tv-' + esc(t) + '"></div><p>Live chart from TradingView. Not investment advice.</p></div>' : "";

    return '<div class="lrow' + (i === 0 ? " open" : "") + '" data-ticker="' + esc(t) + '" id="' + esc(t) + '">' +
      '<button class="lbtn" type="button" id="lb-' + esc(t) + '" aria-controls="lp-' + esc(t) + '" aria-expanded="false">' +
        '<span class="c-co"><span class="co">' + esc(p.company || t) + '</span><span class="tk">' + esc(t) + "</span></span>" +
        '<span class="c-call">' + esc(p.direction || "Pitch") + "</span>" +
        '<span class="c-date">' + (p.date ? esc(fmtDate(p.date)) : "") + "</span>" +
        '<span class="c-num" data-label="Pitch price">' + (fmtUSD(p.pitchPrice) || "–") + "</span>" +
        '<span class="c-num" data-label="Target">' + (fmtUSD(p.target) || "–") + (m.implied != null ? "<small>" + signedPct(m.implied) + "</small>" : "") + "</span>" +
        '<span class="c-num" data-label="Last close">' + (fmtUSD(m.cur) || "–") + (m.curDate ? "<small>" + esc(fmtShort(m.curDate)) + "</small>" : "") + "</span>" +
        '<span class="c-prog prog"><span class="track"' +
          (m.progress != null ? ' data-progress="' + m.progress.toFixed(4) + '"' : "") + ">" +
          '<i class="fill"></i><i class="tick tp"></i><i class="tick tt"></i>' + (m.progress != null ? '<i class="dot"></i>' : "") +
          '</span><span class="ptxt">' + progText(m.progress) + "</span></span>" +
        '<span class="ind" aria-hidden="true"></span>' +
      "</button>" +
      '<div class="lpanel" id="lp-' + esc(t) + '" role="region" aria-labelledby="lb-' + esc(t) + '"><div class="inner">' +
        '<div class="pbody"><div>' +
          '<p class="a">' + (p.thesis ? esc(p.thesis) : '<span class="missing">Add why you made this call.</span>') + "</p>" +
          '<div class="btns">' + pBtn + mBtn + cBtn + "</div></div>" +
          '<dl class="facts">' + facts.map((f) => "<div><dt>" + f[0] + "</dt><dd>" + f[1] + "</dd></div>").join("") + "</dl>" +
        "</div>" + chart +
      "</div></div></div>";
  };

  host.innerHTML =
    '<div class="lhead" aria-hidden="true"><span>Company</span><span>Call</span><span>Pitched</span>' +
    '<span class="r">Pitch price</span><span class="r">Target</span><span class="r">Last close</span>' +
    "<span>Pitch price to target</span><span></span></div>" + items.map(rowHtml).join("");

  // Progress tracks: pitch price sits at the left tick, the target at the right tick.
  // The marker moves from the pitch price to where the stock is now, once, when the list comes into view.
  const TP = 16, TT = 84;
  const place = (track, i) => {
    const pr = parseFloat(track.dataset.progress);
    if (isNaN(pr)) return;
    const clamped = Math.max(-TP / (TT - TP), Math.min(pr, (100 - TP) / (TT - TP)));
    const x = TP + (TT - TP) * clamped;
    track.style.setProperty("--delay", reduceMotion ? "0ms" : i * 110 + "ms");
    track.style.setProperty("--c", pr >= 0 ? "var(--up)" : "var(--down)");
    track.style.setProperty("--x", x.toFixed(2) + "%");
    track.style.setProperty("--l", Math.min(x, TP).toFixed(2) + "%");
    track.style.setProperty("--w", Math.abs(x - TP).toFixed(2) + "%");
  };
  const tracks = Array.from(host.querySelectorAll(".track[data-progress]"));
  if (reduceMotion) tracks.forEach(place);
  else tracks.forEach((tr, i) => onVisible(tr, () => requestAnimationFrame(() => place(tr, i)), 1));

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
      theme: "light", style: "1", locale: "en",
      backgroundColor: "rgba(255,255,255,1)", gridColor: "rgba(16,27,45,0.06)",
      hide_top_toolbar: false, allow_symbol_change: false, support_host: "https://www.tradingview.com"
    });
    container.appendChild(inner);
    container.appendChild(script);
    slot.appendChild(container);
  };

  makeAccordion(host, loadChart);

  // Deep link: pitches.html#GEV opens that row
  const fromHash = () => {
    const t = decodeURIComponent(location.hash.slice(1));
    const row = t && Array.from(host.querySelectorAll(".lrow")).find((r) => r.dataset.ticker === t);
    if (!row) return false;
    host.querySelectorAll(".lrow.open").forEach((r) => setRowOpen(r, false));
    setRowOpen(row, true); loadChart(row);
    return true;
  };
  if (!fromHash()) { const first = host.querySelector(".lrow.open"); if (first) loadChart(first); }
  window.addEventListener("hashchange", fromHash);
}
