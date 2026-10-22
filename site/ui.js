if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
(function () {
  var pill = document.getElementById("net-pill");
  if (!pill) return;
  function showReady() {
    if (navigator.onLine === false) return;
    pill.classList.remove("is-offline");
    pill.hidden = false;
    pill.textContent = "Offline ready";
  }
  function paintNet() {
    if (navigator.onLine === false) {
      pill.hidden = false;
      pill.classList.add("is-offline");
      pill.textContent = "Offline";
      return;
    }
    if (!("serviceWorker" in navigator) || !("caches" in window)) {
      pill.hidden = true;
      return;
    }
    navigator.serviceWorker.ready.then(function () {
      return caches.keys().then(function (keys) {
        var name = "";
        keys.forEach(function (key) {
          if (key.indexOf("safeblueprint-") === 0) name = key;
        });
        if (!name) return null;
        return caches.open(name).then(function (cache) { return cache.match("/app.css"); });
      });
    }).then(function (hit) {
      if (hit) showReady();
    }).catch(function () {});
  }
  window.addEventListener("offline", paintNet);
  window.addEventListener("online", paintNet);
  paintNet();
})();
(function () {
  var btn = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");
  if (!btn || !nav) return;
  var mobile = window.matchMedia("(max-width:900px)");
  var groups = Array.prototype.slice.call(nav.querySelectorAll(".nav-group-btn"));
  function closeGroups(except) {
    groups.forEach(function (g) { if (g !== except) g.setAttribute("aria-expanded", "false"); });
  }
  function setMenu(open) {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    btn.firstElementChild.textContent = open ? "\u00d7" : "\u2630";
    if (open) { var first = nav.querySelector("a"); if (first) first.focus(); }
  }
  btn.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
  groups.forEach(function (g) {
    if (mobile.matches) g.setAttribute("tabindex", "-1");
    g.addEventListener("click", function () {
      if (mobile.matches) return;
      var open = g.getAttribute("aria-expanded") !== "true";
      closeGroups(g);
      g.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) { var a = g.nextElementSibling.querySelector("a"); if (a) a.focus(); }
    });
  });
  mobile.addEventListener("change", function () {
    closeGroups(null); setMenu(false);
    groups.forEach(function (g) { if (mobile.matches) g.setAttribute("tabindex", "-1"); else g.removeAttribute("tabindex"); });
  });
  nav.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", function () { closeGroups(null); setMenu(false); }); });
  document.addEventListener("click", function (e) { if (!nav.contains(e.target)) closeGroups(null); });
  nav.addEventListener("focusout", function (e) { if (!mobile.matches && e.relatedTarget && !nav.contains(e.relatedTarget)) closeGroups(null); });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var openG = groups.filter(function (g) { return g.getAttribute("aria-expanded") === "true"; })[0];
    if (openG && !mobile.matches) { closeGroups(null); openG.focus(); return; }
    if (nav.classList.contains("open")) { setMenu(false); btn.focus(); }
  });
})();
(function () {
  var el = document.getElementById("deadline-chip");
  if (!el) return;
  var now = new Date();
  var today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  var end = Date.UTC(2026, 11, 10);
  var days = Math.round((end - today) / 86400000);
  if (days > 1) el.textContent = days + " days to 10 Dec 2026";
  else if (days === 1) el.textContent = "1 day to 10 Dec 2026";
  else if (days === 0) el.textContent = "0 days to 10 Dec 2026";
  else el.textContent = "10 Dec 2026 has passed";
})();
