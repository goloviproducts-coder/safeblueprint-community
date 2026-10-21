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
  function closeMenu() {
    nav.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = "Menu";
  }
  btn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.textContent = open ? "Close" : "Menu";
  });
  nav.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", closeMenu); });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeMenu(); });
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
