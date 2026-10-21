// Bump CACHE on every release. The name is the build version: safeblueprint-<date>-<version>.
// Activate deletes every other cache, which is what drops the previous offline copy.
// Navigations, HTML, and CSS are network-first: fetch, update this cache, and use the
// cache only when the network fails. Icons and images stay cache-first.
var CACHE = "safeblueprint-selfhost-1.1.0-dev";
var FILES = [
  "/",
  "/index.html",
  "/app.css",
  "/config.js",
  "/forms.js",
  "/home.js",
  "/report.js",
  "/checklist.js",
  "/ui.js",
  "/questions/engine.js",
  "/questions/loader.js",
  "/questions/default.csv",
  "/questions/default.json",
  "/questions/template.csv",
  "/schema/questions/v1.json",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/og-image.png",
  "/ai-security-checklist/",
  "/ai-security-checklist/index.html",
  "/contact/",
  "/contact/index.html",
  "/privacy/",
  "/privacy/index.html",
  "/about/",
  "/about/index.html",
  "/security/",
  "/security/index.html",
  "/sample/",
  "/sample/index.html",
  "/schema/",
  "/schema/index.html",
  "/schema/report/v1.json",
  "/schema/report/v1.1.json",
  "/.well-known/security.txt"
];

function isImage(url, request) {
  if (request.destination === "image") return true;
  return /\.(?:png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname);
}

function store(request, response) {
  if (!response || response.status < 200 || response.status >= 300) return Promise.resolve(response);
  var copy = response.clone();
  return caches.open(CACHE).then(function (cache) {
    return cache.put(request, copy);
  }).then(function () {
    return response;
  }, function () {
    return response;
  });
}

function offline(request, url) {
  return caches.match(request).then(function (hit) {
    if (hit) return hit;
    return caches.match(url.pathname);
  }).then(function (hit) {
    return hit || new Response("", { status: 504, statusText: "offline" });
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return cache.addAll(FILES);
  }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) { return key !== CACHE; }).map(function (key) {
      return caches.delete(key);
    }));
  }).then(function () {
    return self.clients.claim();
  }));
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;
  var url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;
  if (isImage(url, request)) {
    event.respondWith(caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) { return store(request, response); });
    }));
    return;
  }
  event.respondWith(fetch(request).then(function (response) {
    return store(request, response);
  }).catch(function () {
    return offline(request, url);
  }));
});
