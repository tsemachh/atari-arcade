/* Service worker for Atari Arcade (AltirraSDL-based PWA).
 *
 * - Precache the tiny shell.
 * - Network-first for games.json / build-info.json (always fresh lists).
 * - Cache-first for everything else same-origin, including the ~7 MB
 *   emulator .wasm and the game library, so everything plays offline
 *   after the first run.
 * CACHE_VERSION is stamped with the commit SHA by the deploy workflow.
 */

const CACHE_VERSION = "arcade-v1";
const SHELL = ["index.html", "manifest.webmanifest", "games.json"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(function (cache) {
        return cache
          .addAll(SHELL)
          .then(function () {
            // Pre-warm the entire game library (~1.7MB). The emulator's
            // deep-link loader treats a failed game download as non-fatal
            // and boots anyway — on a flaky first mobile load that means
            // an empty Atari dropping into Self Test. With every .xex/.atr
            // already in the SW cache, launches never race the network.
            return fetch("games.json", { cache: "no-cache" })
              .then(function (r) { return r.json(); })
              .then(function (data) {
                var files = ((data && data.games) || []).map(function (g) {
                  return "emu/library/" + g.file;
                });
                return Promise.all(
                  files.map(function (u) {
                    return cache.add(u).catch(function () { /* best effort */ });
                  }),
                );
              })
              .catch(function () { /* library warmup is best effort */ });
          });
      })
      .then(function () {
        return self.skipWaiting();
      }),
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) {
              return k !== CACHE_VERSION;
            })
            .map(function (k) {
              return caches.delete(k);
            }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for page navigations (picker + emulator HTML) so a new
  // deploy shows up on the very next launch — no cache-first "one version
  // behind" dance. Offline still falls back to the cached copy. The
  // versioned assets (?v= tags) and game files stay cache-first below.
  const alwaysFresh =
    request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("games.json") ||
    url.pathname.endsWith("build-info.json");

  if (alwaysFresh) {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(request, copy);
          });
          return response;
        })
        .catch(function () {
          return caches.match(request);
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: false }).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      });
    }),
  );
});
