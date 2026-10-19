/* Coverage since launch on deals.html: a bar chart of the deals found in each update, the deals written up, and the
   running total of distinct deals and quoted value. Data: deals-history.json, kept by deals/history.py. */
(function () {
  "use strict";
  const box = document.getElementById("edHist"); if (!box) return;
  fetch("deals-history.json").then((r) => r.json()).then((h) => {
    const days = h.days || []; if (!days.length) return;
    const t = h.totals, fmt = (n) => n.toLocaleString("en-US"), usd = (v) => (v >= 1e12 ? "$" + (v / 1e12).toFixed(2) + " trillion" : "$" + Math.round(v / 1e9) + " billion");
    const d0 = new Date(days[0].date + "T12:00:00"), nice = (s) => new Date(s + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    document.getElementById("histN").innerHTML =
      "<div><dt>Distinct deals written up</dt><dd>" + fmt(t.deals) + "</dd></div><div><dt>Quoted value, added up</dt><dd>" + usd(t.usd) + "</dd><small>across " + t.with_usd_value + " deals that quote a dollar figure</small></div><div><dt>Daily updates</dt><dd>" + days.length + "</dd><small>since " + nice(days[0].date) + "</small></div>";
    const W = 560, H = 230, L = 30, R = 8, T = 12, B = 30, max = Math.max(...days.map((d) => d.found || d.shown), 10), top = Math.ceil(max / 10) * 10, tick = top > 50 ? 20 : 10, n = days.length, step = (W - L - R) / n, bw = Math.min(34, step * 0.62);
    const y = (v) => T + (1 - v / top) * (H - T - B);
    let g = ""; for (let v = 0; v <= top; v += tick) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="gl"/><text x="' + (L - 5) + '" y="' + (y(v) + 4) + '" class="ty">' + Math.round(v) + "</text>";
    days.forEach((d, i) => { const cx = L + step * (i + 0.5), f = d.found || d.shown;
      g += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + y(f).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (y(0) - y(f)).toFixed(1) + '" class="b1"><title>' + nice(d.date) + ": " + f + " deals found, " + d.shown + " written up, " + d.new + " new to the page</title></rect>" +
        '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + y(d.shown).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (y(0) - y(d.shown)).toFixed(1) + '" class="b2"/>' +
        '<text x="' + cx.toFixed(1) + '" y="' + (y(f) - 5).toFixed(1) + '" class="tv">' + f + "</text>" +
        (n <= 14 || i % 2 === 0 ? '<text x="' + cx.toFixed(1) + '" y="' + (H - 10) + '" class="tx">' + nice(d.date) + "</text>" : ""); });
    document.getElementById("histChart").innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Deals found in each daily update, with the number written up shown darker">' + g + "</svg>" +
      '<div class="hist-key"><span><i class="b1"></i>Deals found in the headlines</span><span><i class="b2"></i>Written up on this page</span></div>';
    document.getElementById("histNote").textContent = "Counted from each day’s last update. Values are the figures the headlines quote, so they are rough: US dollars only, a deal is counted once even if it is spelled two ways, and deals with no stated price add nothing.";
    box.hidden = false;
  }).catch(() => {});
})();
