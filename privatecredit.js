/* privatecredit.html: SOFR, the 10-year Treasury yield and US CPI inflation on one monthly chart. Data: rates.json from scripts/rates.py (FRED). */
(function () {
  "use strict";
  const host = document.getElementById("pcChart"); if (!host) return;
  const COL = { sofr: "#0f5a44", ten_year: "#2f6fd1", inflation: "#d9731a" }, NAME = { sofr: "SOFR", ten_year: "10-year Treasury yield", inflation: "US inflation (CPI, year over year)" };
  fetch("rates.json").then((r) => r.json()).then((d) => {
    const S = d.series.filter((s) => s.month >= "2018-04"), n = S.length;
    const W = 960, H = 440, L = 46, R = 18, T = 16, B = 38, lo = Math.floor(Math.min(0, ...S.map((s) => Math.min(s.sofr, s.ten_year, s.inflation == null ? 9 : s.inflation)))), hi = Math.ceil(Math.max(...S.map((s) => Math.max(s.sofr, s.ten_year, s.inflation == null ? 0 : s.inflation))) + 0.5);
    const x = (i) => L + (i / (n - 1)) * (W - L - R), y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const line = (k) => { let p = "", on = false; S.forEach((s, i) => { if (s[k] == null) { on = false; return; } p += (on ? "L" : "M") + x(i).toFixed(1) + " " + y(s[k]).toFixed(1); on = true; }); return p; };
    let g = ""; for (let v = lo; v <= hi; v += 1) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="gl' + (v === 0 ? " z" : "") + '"/><text x="' + (L - 7) + '" y="' + (y(v) + 4) + '" class="ty">' + v + "%</text>";
    S.forEach((s, i) => { if (s.month.endsWith("-01") && +s.month.slice(0, 4) % 1 === 0) g += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 14) + '" class="tx">' + s.month.slice(0, 4) + "</text>"; });
    host.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Monthly SOFR, 10-year Treasury yield and US inflation since 2018">' + g +
      '<path d="' + line("ten_year") + '" class="l" style="stroke:' + COL.ten_year + '"/><path d="' + line("inflation") + '" class="l" style="stroke:' + COL.inflation + '"/><path d="' + line("sofr") + '" class="l" style="stroke:' + COL.sofr + '"/>' +
      '<line id="pcX" class="cx" y1="' + T + '" y2="' + (H - B) + '" x1="0" x2="0" style="display:none"/><g id="pcDots"></g><rect id="pcHit" x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="transparent"/></svg><div class="pc-tip" id="pcTip" hidden></div>';
    document.getElementById("pcKey").innerHTML = ["sofr", "ten_year", "inflation"].map((k) => '<span><i style="background:' + COL[k] + '"></i>' + NAME[k] + "</span>").join("");
    const last = S[n - 1], lastInf = [...S].reverse().find((s) => s.inflation != null), lat = d.latest, fmt = (v) => v.toFixed(2) + "%";
    const nice = (m) => new Date(m + "-15").toLocaleDateString("en-US", { month: "short", year: "numeric" });
    document.getElementById("pcTiles").innerHTML =
      '<div><dt>SOFR</dt><dd style="color:' + COL.sofr + '">' + fmt(lat.sofr.value) + "</dd><small>" + lat.sofr.date + "</small></div>" +
      '<div><dt>10-year Treasury yield</dt><dd style="color:' + COL.ten_year + '">' + fmt(lat.ten_year.value) + "</dd><small>" + lat.ten_year.date + "</small></div>" +
      '<div><dt>10-year minus SOFR</dt><dd>' + (lat.ten_year.value - lat.sofr.value >= 0 ? "+" : "\\u2212") + Math.abs(lat.ten_year.value - lat.sofr.value).toFixed(2) + " pts</dd><small>the slope between long and overnight rates</small></div>" +
      '<div><dt>US inflation</dt><dd style="color:' + COL.inflation + '">' + fmt(lastInf.inflation) + "</dd><small>CPI, " + nice(lastInf.month) + ", year over year</small></div>";
    document.getElementById("pcNote").textContent = "Monthly averages of daily rates. SOFR is the Secured Overnight Financing Rate and starts in April 2018. The 10-year line is a yield, not a price: when the price of the Treasury note falls, its yield rises. Inflation is the change in the consumer price index over the previous 12 months and lags the rates by a month or two. Source: FRED, Federal Reserve Bank of St. Louis (SOFR, DGS10, CPIAUCSL). Updated " + d.updated.slice(0, 10) + ".";
    const svg = host.querySelector("svg"), hit = host.querySelector("#pcHit"), cx = host.querySelector("#pcX"), dots = host.querySelector("#pcDots"), tip = host.querySelector("#pcTip");
    hit.addEventListener("pointermove", (e) => { const r = svg.getBoundingClientRect(), sx = (e.clientX - r.left) / r.width * W, i = Math.max(0, Math.min(n - 1, Math.round((sx - L) / (W - L - R) * (n - 1)))), s = S[i];
      cx.setAttribute("x1", x(i)); cx.setAttribute("x2", x(i)); cx.style.display = "";
      dots.innerHTML = ["ten_year", "inflation", "sofr"].filter((k) => s[k] != null).map((k) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(s[k]).toFixed(1) + '" r="4.5" fill="#fff" stroke="' + COL[k] + '" stroke-width="2.4"/>').join("");
      tip.hidden = false; tip.innerHTML = "<b>" + nice(s.month) + "</b>" + ["sofr", "ten_year", "inflation"].map((k) => '<span><i style="background:' + COL[k] + '"></i>' + NAME[k].split(" (")[0] + "<em>" + (s[k] == null ? "n/a" : s[k].toFixed(2) + "%") + "</em></span>").join("");
      const pxX = x(i) / W * r.width; tip.style.left = Math.min(Math.max(pxX, 90), r.width - 90) + "px"; });
    hit.addEventListener("pointerleave", () => { cx.style.display = "none"; dots.innerHTML = ""; tip.hidden = true; });
  }).catch(() => { host.innerHTML = '<p class="missing">The rates data could not be loaded.</p>'; });
})();
