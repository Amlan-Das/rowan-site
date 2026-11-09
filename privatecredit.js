/* privatecredit.html: policy-linked overnight rate, 10-year government yield and CPI inflation on one monthly chart, for the US and Canada.
   Data: rates.json from scripts/rates.py (FRED for the US, Bank of Canada for Canada). */
(function () {
  "use strict";
  if (!document.getElementById("pcChartUS")) return;
  const COL = { rate: "#0f5a44", ten_year: "#2f6fd1", inflation: "#d9731a" };
  const nice = (m) => new Date(m + "-15").toLocaleDateString("en-US", { month: "short", year: "numeric" });

  function render(id, cfg, d) {
    const host = document.getElementById("pcChart" + id), S = cfg.series.filter((s) => s.month >= "2018-04").map((s) => ({ month: s.month, rate: s[cfg.rateKey], ten_year: s.ten_year, inflation: s.inflation })), n = S.length;
    const NAME = { rate: cfg.rateName, ten_year: cfg.tenName, inflation: cfg.infName };
    const W = 960, H = 440, L = 46, R = 18, T = 16, B = 38, vals = (s) => [s.rate, s.ten_year, s.inflation].filter((v) => v != null);
    const lo = Math.floor(Math.min(0, ...S.flatMap(vals))), hi = Math.ceil(Math.max(...S.flatMap(vals)) + 0.5);
    const x = (i) => L + (i / (n - 1)) * (W - L - R), y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const line = (k) => { let p = "", on = false; S.forEach((s, i) => { if (s[k] == null) { on = false; return; } p += (on ? "L" : "M") + x(i).toFixed(1) + " " + y(s[k]).toFixed(1); on = true; }); return p; };
    let g = ""; for (let v = lo; v <= hi; v += 1) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="gl' + (v === 0 ? " z" : "") + '"/><text x="' + (L - 7) + '" y="' + (y(v) + 4) + '" class="ty">' + v + "%</text>";
    S.forEach((s, i) => { if (s.month.endsWith("-01")) g += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 14) + '" class="tx">' + s.month.slice(0, 4) + "</text>"; });
    host.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + cfg.label + '">' + g +
      '<path d="' + line("ten_year") + '" class="l" style="stroke:' + COL.ten_year + '"/><path d="' + line("inflation") + '" class="l" style="stroke:' + COL.inflation + '"/><path d="' + line("rate") + '" class="l" style="stroke:' + COL.rate + '"/>' +
      '<line class="cx" y1="' + T + '" y2="' + (H - B) + '" x1="0" x2="0" style="display:none"/><g class="dots"></g><rect class="hit" x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="transparent"/></svg><div class="pc-tip" hidden></div>';
    document.getElementById("pcKey" + id).innerHTML = ["rate", "ten_year", "inflation"].map((k) => '<span><i style="background:' + COL[k] + '"></i>' + NAME[k] + "</span>").join("");
    const lastInf = [...S].reverse().find((s) => s.inflation != null), lat = cfg.latest, fmt = (v) => v.toFixed(2) + "%", gap = lat.ten_year.value - lat.rate.value;
    document.getElementById("pcTiles" + id).innerHTML =
      '<div><dt>' + cfg.rateShort + '</dt><dd style="color:' + COL.rate + '">' + fmt(lat.rate.value) + "</dd><small>" + lat.rate.date + "</small></div>" +
      '<div><dt>10-year yield</dt><dd style="color:' + COL.ten_year + '">' + fmt(lat.ten_year.value) + "</dd><small>" + lat.ten_year.date + "</small></div>" +
      '<div><dt>10-year minus ' + cfg.rateShort + '</dt><dd>' + (gap >= 0 ? "+" : "−") + Math.abs(gap).toFixed(2) + " pts</dd><small>the slope between long and overnight rates</small></div>" +
      '<div><dt>Inflation</dt><dd style="color:' + COL.inflation + '">' + fmt(lastInf.inflation) + "</dd><small>CPI, " + nice(lastInf.month) + ", year over year</small></div>";
    document.getElementById("pcNote" + id).textContent = cfg.note + " Updated " + d.updated.slice(0, 10) + ".";
    const svg = host.querySelector("svg"), hit = host.querySelector(".hit"), cx = host.querySelector(".cx"), dots = host.querySelector(".dots"), tip = host.querySelector(".pc-tip");
    hit.addEventListener("pointermove", (e) => { const r = svg.getBoundingClientRect(), sx = (e.clientX - r.left) / r.width * W, i = Math.max(0, Math.min(n - 1, Math.round((sx - L) / (W - L - R) * (n - 1)))), s = S[i];
      cx.setAttribute("x1", x(i)); cx.setAttribute("x2", x(i)); cx.style.display = "";
      dots.innerHTML = ["ten_year", "inflation", "rate"].filter((k) => s[k] != null).map((k) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(s[k]).toFixed(1) + '" r="4.5" fill="#fff" stroke="' + COL[k] + '" stroke-width="2.4"/>').join("");
      tip.hidden = false; tip.innerHTML = "<b>" + nice(s.month) + "</b>" + ["rate", "ten_year", "inflation"].map((k) => '<span><i style="background:' + COL[k] + '"></i>' + NAME[k].split(" (")[0] + "<em>" + (s[k] == null ? "n/a" : s[k].toFixed(2) + "%") + "</em></span>").join("");
      tip.style.left = Math.min(Math.max(x(i) / W * r.width, 100), r.width - 100) + "px"; });
    hit.addEventListener("pointerleave", () => { cx.style.display = "none"; dots.innerHTML = ""; tip.hidden = true; });
  }

  fetch("rates.json").then((r) => r.json()).then((d) => {
    render("US", { series: d.series, rateKey: "sofr", rateName: "SOFR", rateShort: "SOFR", tenName: "10-year Treasury yield", infName: "US inflation (CPI, year over year)", latest: { rate: d.latest.sofr, ten_year: d.latest.ten_year }, label: "Monthly SOFR, 10-year Treasury yield and US inflation since 2018",
      note: "Monthly averages of daily rates. SOFR is the Secured Overnight Financing Rate and starts in April 2018. The 10-year line is a yield, not a price: when the price of the Treasury note falls, its yield rises. Inflation is the change in the consumer price index over the previous 12 months and lags the rates by a month or two. Source: FRED, Federal Reserve Bank of St. Louis (SOFR, DGS10, CPIAUCSL)." }, d);
    const c = d.canada; if (!c) return;
    render("CA", { series: c.series, rateKey: "corra", rateName: "CORRA", rateShort: "CORRA", tenName: "Government of Canada 10-year yield", infName: "Canadian inflation (CPI, year over year)", latest: { rate: c.latest.corra, ten_year: c.latest.ten_year }, label: "Monthly CORRA, Government of Canada 10-year yield and Canadian inflation since 2018",
      note: "Monthly averages of daily rates. CORRA is the Canadian Overnight Repo Rate Average, the Canadian counterpart to SOFR, and moves with the Bank of Canada's policy rate. The 10-year line is the benchmark Government of Canada bond yield. Inflation is total CPI, unadjusted, against the same month a year earlier. Source: Bank of Canada Valet API (AVG.INTWO, BD.CDN.10YR.DQ.YLD, STATIC_TOTALCPICHANGE)." }, d);
  }).catch(() => { document.querySelectorAll(".pc-chart").forEach((h) => (h.innerHTML = '<p class="missing">The rates data could not be loaded.</p>')); });
})();
