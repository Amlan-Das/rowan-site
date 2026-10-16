/* The AI timeline on ai-news.html: a horizontal rail you scroll sideways.

   Every milestone in AI_TIMELINE (data.js) is a card on the rail, oldest on the left and newest on the
   right, alternating above and below so they sit close together. Click a card to read the full story
   and its sources in the panel underneath. You can swipe, drag, use the arrow buttons, jump to a year,
   or focus the rail and use the arrow keys. The chips narrow it to one kind of milestone. */
(function () {
  "use strict";
  const scroller = document.getElementById("aitlScroll"), track = document.getElementById("aitlTrack");
  const bar = document.getElementById("aitlBar"), detail = document.getElementById("aitlDetail");
  if (!scroller || !track || !bar || !detail || typeof AI_TIMELINE === "undefined") return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CATS = ["Models", "Products", "Chips and compute", "Money and markets", "Policy and safety", "Science", "Power"];
  const COLORS = { "Models": "#0f5a44", "Products": "#2b5fb3", "Chips and compute": "#121614", "Money and markets": "#b4531a", "Policy and safety": "#6d4a9a", "Science": "#2f7f8f", "Power": "#8a6a00" };
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const colour = (cat) => COLORS[cat] || "#5b6b7a";
  const dateLabel = (d) => { const p = d.split("-"); return MONTHS[+p[1] - 1] + (p[2] ? " " + +p[2] : "") + ", " + p[0]; };

  // Oldest first, so the rail reads left to right. Entries on one date keep their order in data.js.
  const items = AI_TIMELINE.map((e, i) => Object.assign({ i }, e)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const count = (cat) => items.filter((e) => !cat || e.cat === cat).length;

  let current = "";      // category shown, or "" for all
  let selected = null;   // the chosen milestone's index in AI_TIMELINE
  const shown = () => items.filter((e) => !current || e.cat === current);

  // ---------- The controls above the rail ----------
  const chip = (label, cat) => '<button type="button" class="net-chip' + (cat === current ? " on" : "") + '" data-cat="' + esc(cat) + '">' +
    (cat ? '<i style="background:' + colour(cat) + '"></i>' : "") + esc(label) + " <small>" + count(cat) + "</small></button>";
  // Years before 2020 are grouped by decade so the jump links stay short
  const jumpTargets = () => {
    const seen = {}, out = [];
    shown().forEach((e) => {
      const y = e.date.slice(0, 4), key = +y < 2020 ? y.slice(0, 3) + "0s" : y;
      if (!seen[key]) { seen[key] = true; out.push({ key, year: y }); }
    });
    return out;
  };
  const renderBar = () => {
    bar.innerHTML = '<div class="aitl-chips">' + chip("All", "") + CATS.filter((c) => count(c)).map((c) => chip(c, c)).join("") + "</div>" +
      '<div class="aitl-jump"><span>Jump to</span>' + jumpTargets().map((t) => '<button type="button" data-year="' + t.year + '">' + t.key + "</button>").join("") + "</div>";
  };

  // ---------- The rail ----------
  const renderTrack = () => {
    let html = '<div class="aitl-rail"></div>', year = "";
    shown().forEach((e, k) => {
      const y = e.date.slice(0, 4);
      if (y !== year) { year = y; html += '<div class="aitl-yr" data-y="' + y + '"><b>' + y + "</b></div>"; }
      html += '<div class="aitl-col ' + (k % 2 ? "dn" : "up") + '" style="--c:' + colour(e.cat) + '"><span class="aitl-dot"></span>' +
        '<button type="button" class="aitl-card' + (e.i === selected ? " on" : "") + '" data-i="' + e.i + '" id="aitl-' + e.date + "-" + e.i + '" aria-controls="aitlDetail">' +
          '<span class="aitl-date">' + dateLabel(e.date) + '</span><span class="aitl-title">' + esc(e.title) + "</span></button></div>";
    });
    track.innerHTML = html;
  };

  // ---------- The reading panel ----------
  const renderDetail = () => {
    const list = shown(), at = list.findIndex((e) => e.i === selected), e = list[at];
    if (!e) {
      detail.style.removeProperty("--c");
      detail.innerHTML = '<p class="aitl-hint">Click any milestone to read the story and see its sources. The newest are on the right, so scroll left to go back in time.</p>';
      return;
    }
    const links = (e.links || []).map((l) => '<a href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a>").join("");
    detail.style.setProperty("--c", colour(e.cat));
    detail.innerHTML = '<div class="aitl-d1"><p class="aitl-meta"><span>' + dateLabel(e.date) + '</span><span class="aitl-cat">' + esc(e.cat) + "</span></p>" +
      "<h3>" + esc(e.title) + '</h3><p class="aitl-lead">' + esc(e.summary) + '</p></div><div class="aitl-d2"><p>' + esc(e.detail) + "</p>" +
      (links ? '<p class="aitl-links"><b>Read more</b>' + links + "</p>" : "") + "</div>" +
      '<div class="aitl-step"><button type="button" class="net-toggle" data-go="-1"' + (at === 0 ? " disabled" : "") + '>&larr; Earlier</button>' +
      '<button type="button" class="net-toggle" data-go="1"' + (at === list.length - 1 ? " disabled" : "") + '>Later &rarr;</button></div>';
  };

  // ---------- Scrolling ----------
  const smooth = reduceMotion ? "auto" : "smooth";
  const toEnd = () => { scroller.scrollLeft = scroller.scrollWidth; };
  const centre = (el) => {
    const left = el.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
    scroller.scrollTo({ left: left - (scroller.clientWidth - el.offsetWidth) / 2, behavior: smooth });
  };

  const select = (i) => {
    selected = i;
    track.querySelectorAll(".aitl-card").forEach((c) => c.classList.toggle("on", +c.dataset.i === i));
    renderDetail();
    const card = i == null ? null : track.querySelector('.aitl-card[data-i="' + i + '"]');
    if (card) centre(card);
  };

  const frame = document.getElementById("aitlFrame");
  const arrows = frame ? Array.from(frame.querySelectorAll(".aitl-arrow")) : [];
  const updateArrows = () => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    arrows.forEach((a) => a.classList.toggle("dis", +a.dataset.step < 0 ? scroller.scrollLeft < 8 : scroller.scrollLeft > max - 8));
  };
  scroller.addEventListener("scroll", updateArrows, { passive: true });
  if (frame) frame.addEventListener("click", (e) => {
    const s = e.target.closest("[data-step]");
    if (s) scroller.scrollBy({ left: +s.dataset.step * scroller.clientWidth * 0.8, behavior: smooth });
  });

  bar.addEventListener("click", (e) => {
    const c = e.target.closest(".net-chip"), y = e.target.closest("[data-year]");
    if (c) {
      current = c.dataset.cat;
      if (selected != null && !shown().some((x) => x.i === selected)) selected = null;
      renderBar(); renderTrack(); renderDetail(); toEnd();
    } else if (y) {
      const m = track.querySelector('.aitl-yr[data-y="' + y.dataset.year + '"]');
      if (m) scroller.scrollTo({ left: m.offsetLeft - 24, behavior: smooth });
    }
  });

  let dragged = false;
  track.addEventListener("click", (e) => {
    if (dragged) { dragged = false; return; }     // the end of a drag is not a click
    const card = e.target.closest(".aitl-card");
    if (card) select(selected === +card.dataset.i ? null : +card.dataset.i);
  });
  detail.addEventListener("click", (e) => {
    const g = e.target.closest("[data-go]");
    if (!g) return;
    const list = shown(), at = list.findIndex((x) => x.i === selected), next = list[at + +g.dataset.go];
    if (next) select(next.i);
  });

  // Drag to scroll with a mouse. Touch and trackpads already scroll on their own.
  let drag = null;
  scroller.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag = { x: e.clientX, left: scroller.scrollLeft, moved: false };
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 5) return;
    drag.moved = true; scroller.classList.add("grab");
    scroller.scrollLeft = drag.left - dx;
  });
  window.addEventListener("pointerup", () => {
    if (drag && drag.moved) { dragged = true; setTimeout(() => (dragged = false), 0); }
    drag = null; scroller.classList.remove("grab");
  });

  // ---------- Start ----------
  renderBar(); renderTrack(); renderDetail();
  toEnd();                                              // open on the newest milestones
  updateArrows();
  window.addEventListener("load", () => { if (selected == null) toEnd(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (selected == null) toEnd(); });

  // A link like ai-news.html#aitl-2025-01-27-12 opens that milestone
  const fromHash = () => {
    if (location.hash.indexOf("#aitl-") !== 0) return;
    const card = document.getElementById(location.hash.slice(1));
    if (card) select(+card.dataset.i);
  };
  fromHash();
  window.addEventListener("hashchange", fromHash);

  // Say how fresh it is
  const latest = document.getElementById("aitlLatest"), n = items[items.length - 1];
  if (latest && n) latest.textContent = (n.date.length > 4 ? MONTHS[+n.date.slice(5, 7) - 1] + " " : "") + n.date.slice(0, 4);
})();
