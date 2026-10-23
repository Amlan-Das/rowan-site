/* Coffee-chat notes on brief.html, read from coffee-chats.json. Add an object to that file to add a card. */
(function () {
  "use strict";
  const sec = document.getElementById("chats"), list = document.getElementById("chatList"); if (!sec) return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  fetch("coffee-chats.json").then((r) => r.json()).then((d) => {
    const cs = d.chats || []; if (!cs.length) return;
    list.innerHTML = cs.map((c) => '<article class="chat"><p class="chat-k">' + esc(c.topic) + (c.date ? " &middot; " + esc(c.date) : "") + '</p><h3>' + esc(c.title) + '</h3><p class="chat-who">' + esc(c.role) + '</p><div class="chat-cols"><div><h4>What I learned</h4><p>' + esc(c.learned) + '</p></div><div><h4>Why it matters</h4><p>' + esc(c.why) + "</p></div></div></article>").join("");
    sec.hidden = false;
  }).catch(() => {});
})();
