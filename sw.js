"use strict";

/* Jodi service worker.
   Kaam do: (1) app shell offline ke liye cache, (2) naya deploy aate hi
   turant activate — skipWaiting + clients.claim, taaki update fauran mile.
   API, SSE aur strokes kabhi cache nahi hote (woh live data hai). */

const VERSION = "jodi-v1";
const SHELL = [
  "/",
  "/index.html",
  "/app.js",
  "/local.js",
  "/styles.css",
  "/content.json"
];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(VERSION)
      .then(function (cache) { return cache.addAll(SHELL); })
      .catch(function () { /* ek file fail ho to bhi install chalta rahe */ })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys
          .filter(function (key) { return key !== VERSION; })
          .map(function (key) { return caches.delete(key); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("message", function (event) {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try { url = new URL(request.url); } catch (e) { return; }

  /* doosre origin (YouTube) aur live API — inhe bilkul mat chhedo */
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") === 0) return;

  /* network pehle: jo abhi deploy hua hai wahi milega.
     network na mile to cache, aur navigation ke liye index.html. */
  event.respondWith(
    fetch(request)
      .then(function (response) {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(VERSION)
            .then(function (cache) { return cache.put(request, copy); })
            .catch(function () {});
        }
        return response;
      })
      .catch(function () {
        return caches.match(request).then(function (hit) {
          if (hit) return hit;
          if (request.mode === "navigate") return caches.match("/index.html");
          return undefined;
        });
      })
  );
});
