/* The AI timeline on ai-news.html.

   Every milestone in AI_TIMELINE (data.js) becomes one row, newest first and grouped by year.
   A row shows the date, headline and a one-line summary. Clicking it opens a longer write-up and
   links to the sources. The filter chips narrow the list to one kind of milestone. */
(function () {
  "use strict";
  const list = document.getElementById("aitlList"), filters = document.getElementById("aitlFilters");
  if (!list || !filters || typeof AI_TIMELINE === "undefined") return;

  const CATS = ["Models", "Products", "Chips and compute", "Money and markets", "Policy and safety", "Science", "Power"];
  const COLORS = { "Models": "#0f5a44", "Products": "#2b5fb3", "Chips and compute": "#121614", "Money and markets": "#b4531a", "Policy and safety": "#6d4a9a", "Science": "#2f7f8f", "Power": "#8a6a00" };
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Newest first. Entries on the same date keep the order they have in data.js.
  const items = AI_TIMELINE.map((e, i) => Object.assign({ i }, e)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const dateLabel = (d) => { const p = d.split("-"); return MONTHS[+p[1] - 1] + (p[2] ? " " + +p[2] : ""); };
  const count = (cat) => items.filter((e) => !cat || e.cat === cat).length;

  let current = "";   // the category being shown, or "" for all

  const rowHtml = (e) => {
    const c = COLORS[e.cat] || "#5b6b7a";
    const links = (e.links || []).map((l) => '<a href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a>").join("");
    return '<details class="aitl-item" style="--c:' + c + '" id="aitl-' + e.date + "-" + e.i + '">' +
      "<summary>" +
        '<span class="aitl-date">' + dateLabel(e.date) + "</span>" +
        '<span class="aitl-dot"></span>' +
        '<span class="aitl-main"><span class="aitl-title">' + esc(e.title) + '</span><span class="aitl-cat">' + esc(e.cat) + "</span>" +
        '<span class="aitl-sum">' + esc(e.summary) + "</span></span>" +
      "</summary>" +
      '<div class="aitl-more"><p>' + esc(e.detail) + "</p>" + (links ? '<p class="aitl-links"><b>Read more</b>' + links + "</p>" : "") + "</div>" +
    "</details>";
  };

  const render = () => {
    const shown = items.filter((e) => !current || e.cat === current);
    let html = "", year = "";
    shown.forEach((e) => {
      const y = e.date.slice(0, 4);
      if (y !== year) {
        year = y;
        const n = shown.filter((x) => x.date.slice(0, 4) === y).length;
        html += '<div class="aitl-year"><h3>' + y + "</h3><span>" + n + (n === 1 ? " milestone" : " milestones") + "</span></div>";
      }
      html += rowHtml(e);
    });
    list.innerHTML = html || '<p class="net-hint">Nothing in this group yet.</p>';
  };

  const chip = (label, cat) => '<button type="button" class="net-chip' + (cat === current ? " on" : "") + '" data-cat="' + esc(cat) + '">' +
    (cat ? '<i style="background:' + COLORS[cat] + '"></i>' : "") + esc(label) + " <small>" + count(cat) + "</small></button>";
  const renderFilters = () => {
    filters.innerHTML = chip("All", "") + CATS.filter((c) => count(c)).map((c) => chip(c, c)).join("") +
      '<button type="button" class="net-toggle aitl-expand" id="aitlExpand">Open all</button>';
  };

  filters.addEventListener("click", (e) => {
    const c = e.target.closest(".net-chip");
    if (c) { current = c.dataset.cat; renderFilters(); render(); return; }
    if (e.target.closest("#aitlExpand")) {
      const all = Array.from(list.querySelectorAll(".aitl-item")), open = all.some((d) => !d.open);
      all.forEach((d) => (d.open = open));
      e.target.closest("#aitlExpand").textContent = open ? "Close all" : "Open all";
    }
  });

  renderFilters();
  render();

  // A link like ai-news.html#aitl-2025-01-27-12 opens that milestone
  const fromHash = () => {
    const t = location.hash.indexOf("#aitl-") === 0 ? document.getElementById(location.hash.slice(1)) : null;
    if (t) { t.open = true; t.scrollIntoView({ block: "center" }); }
  };
  fromHash();
  window.addEventListener("hashchange", fromHash);

  // The latest entry, so the page says how fresh it is
  const latest = $("aitlLatest");
  if (latest && items.length) latest.textContent = dateLabel(items[0].date) + " " + items[0].date.slice(0, 4);
  function $(id) { return document.getElementById(id); }
})();
