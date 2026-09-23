/* Shared by index.html and pitches.html. Reads its content from data.js.
   Nothing in here needs editing — go to data.js for your content. */

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

// Ticker tape (any page)
document.getElementById("tape").innerHTML = TAPE.concat(TAPE)
  .map((t) => '<span class="item"><span class="arrow">▲</span>' + esc(t) + "</span>").join("");

// Terminal (any page)
(function () {
  const term = document.getElementById("term");
  const out = document.getElementById("termOut");
  const form = document.getElementById("termForm");
  const input = document.getElementById("termIn");
  const fab = document.getElementById("termOpen");
  const history = [];
  let hIdx = 0, greeted = false;

  const print = (html, cls) => {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    d.innerHTML = html;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  };
  const open = () => {
    term.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    if (!greeted) {
      print("Rowan's desk terminal.");
      print('Type <span style="color:#3CD6A0">help</span> to see what it can do.', "dim");
      greeted = true;
    }
    input.focus();
  };
  const close = () => { term.hidden = true; fab.setAttribute("aria-expanded", "false"); fab.focus(); };
  const toggle = () => (term.hidden ? open() : close());

  const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);
  const mail = '<a href="mailto:' + esc(CONTACT.email) + '">' + esc(CONTACT.email) + "</a>";
  const commands = {
    help: () => print([
      "about            who I am",
      "projects         everything on the blotter",
      "quote <ticker>   a project or a pitch, e.g. quote note / quote v",
      "pitches          stock calls I've made",
      "experience       where I've worked",
      "resume           open my résumé",
      "contact          how to reach me",
      "shock            send a vol spike through the surface",
      "buy rowan        you know what this does",
      "clear            clear the screen"
    ].join("\n")),
    about: () => print("Commerce student at the University of Toronto, finance and economics, class of 2028. U.S. corporate tax intern at PwC in Montreal, junior analyst on the Rotman Commerce Student Fund. Learning markets by building tools a desk would use."),
    projects: () => print(PROJECTS.map((p) =>
      '<span style="color:' + p.color + '">' + pad(p.ticker, 8) + "</span>" + pad(p.status, 9) + esc(p.title)
    ).join("\n")),
    pitches: () => {
      if (!PITCHES.length) { print("No pitches yet."); return; }
      print(PITCHES.map((p) => {
        const dir = typeof p.current === "number" && typeof p.target === "number" && p.target
          ? " " + (((p.current - p.target) / p.target) * 100 >= 0 ? "+" : "") + (((p.current - p.target) / p.target) * 100).toFixed(1) + "% vs target"
          : " target not reached yet";
        return '<span style="color:' + p.color + '">' + pad("$" + p.ticker, 8) + "</span>" + pad(p.direction || "-", 7) + esc(p.company || "") + dir;
      }).join("\n") + "\n\nFull detail and live charts: pitches.html");
    },
    quote: (arg) => {
      const key = (arg || "").replace("$", "").toUpperCase();
      const proj = PROJECTS.find((x) => x.ticker.replace("$", "") === key);
      if (proj) {
        print('<span style="color:' + proj.color + '">' + esc(proj.ticker) + "  " + esc(proj.title) + "</span>\n" +
          "Status    " + esc(proj.status) + "\n" +
          "Question  " + esc(proj.question) + "\n" +
          "Result    " + (proj.result ? esc(proj.result) : "Coming soon"));
        return;
      }
      const pit = PITCHES.find((x) => x.ticker.toUpperCase() === key);
      if (pit) {
        print('<span style="color:' + pit.color + '">$' + esc(pit.ticker) + "  " + esc(pit.company || "") + "</span>\n" +
          "Direction " + esc(pit.direction || "-") + "\n" +
          "Pitched   " + (pit.dateLabel || "-") + "\n" +
          "Target    " + (typeof pit.target === "number" ? "$" + pit.target.toFixed(2) : "-") + "\n" +
          "Current   " + (typeof pit.current === "number" ? "$" + pit.current.toFixed(2) : "not updated yet"));
        return;
      }
      print("Unknown ticker. Try projects or pitches to see what's tracked.");
    },
    experience: () => print([
      "PwC                          U.S. Corporate Tax Intern",
      "Rotman Commerce Student Fund Junior Analyst, Industrials",
      "KKR Wharton PE Case Comp     Top 8 finalist",
      "UofT AI Collective           VP Finance",
      "Allure Ventures              Associate Intern",
      "Student PE Association       Associate"
    ].join("\n")),
    resume: () => { window.open(RESUME, "_blank", "noopener"); print("Opening résumé in a new tab."); },
    contact: () => print("Email     " + mail + '\nLinkedIn  <a href="' + esc(CONTACT.linkedin) + '" target="_blank" rel="noopener">' + esc(CONTACT.linkedin) + '</a>\nGitHub    <a href="' + esc(CONTACT.github) + '" target="_blank" rel="noopener">' + esc(CONTACT.github) + "</a>"),
    shock: () => {
      const box = document.getElementById("surfacebox");
      if (!window.shockMarket) { print("No surface to shock here. Head to the home page."); return; }
      window.shockMarket();
      if (box) {
        const r = box.getBoundingClientRect();
        const onScreen = r.bottom > 0 && r.top < window.innerHeight;
        print("Vol spike sent. Short-dated vol jumps the most." + (onScreen ? "" : " Scroll to the top to watch it."));
      } else {
        print("Vol spike sent. Short-dated vol jumps the most.");
      }
    },
    buy: (arg) => {
      if ((arg || "").toLowerCase() !== "rowan") { print("Only one thing is for sale here. Try buy rowan."); return; }
      print('<span style="color:#3CD6A0">Order filled: 1 ROWAN at market.</span>\nSettlement: ' + mail);
    },
    sell: (arg) => print((arg || "").toLowerCase() === "rowan" ? "No shares available to sell. Try buy rowan." : "Nothing to sell. Try buy rowan."),
    sudo: (arg) => ((arg || "").toLowerCase().includes("hire") ? commands.buy("rowan") : print("Permission granted. It didn't help.")),
    clear: () => { out.innerHTML = ""; },
    exit: () => close()
  };
  commands.ls = commands.projects;
  commands.whoami = commands.about;
  commands.hire = () => commands.buy("rowan");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    input.value = "";
    if (!raw) return;
    history.push(raw); hIdx = history.length;
    print("$ " + esc(raw), "echo");
    const [cmd, ...rest] = raw.split(/\s+/);
    const fn = commands[cmd.toLowerCase()];
    if (fn) fn(rest.join(" ")); else print("Command not found: " + esc(cmd) + ". Type help.");
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" && hIdx > 0) { hIdx--; input.value = history[hIdx]; e.preventDefault(); }
    if (e.key === "ArrowDown") { hIdx = Math.min(hIdx + 1, history.length); input.value = history[hIdx] || ""; e.preventDefault(); }
  });

  fab.addEventListener("click", toggle);
  document.getElementById("termClose").addEventListener("click", close);
  document.querySelectorAll("[data-term]").forEach((b) => b.addEventListener("click", open));
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); toggle(); }
    if (e.key === "Escape" && !term.hidden) close();
  });
  if (/Mac|iPhone|iPad/.test(navigator.platform)) fab.querySelector("kbd").textContent = "⌘K";
})();
