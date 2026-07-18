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
// Immutable heavy assets (emulator binaries, game files, posters) live in
// a cache that SURVIVES deploys — their URLs are content-addressed (?v=
// tags / new filenames), so a shell deploy must not force a 12MB wasm
// re-download. Only the versioned shell cache is dropped on activate.
const STATIC_CACHE = "arcade-static-v1";
const SHELL = ["index.html", "manifest.webmanifest", "games.json"];
function isStatic(url) {
  return url.pathname.indexOf("/emu/") > -1 ||
         url.pathname.indexOf("/posters/") > -1 ||
         url.pathname.indexOf("three.min.js") > -1;
}

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
                return caches.open(STATIC_CACHE).then(function (sc) {
                  return Promise.all(
                    files.map(function (u) {
                      return sc.match(u).then(function (hit) {
                        return hit ? null : sc.add(u).catch(function () {});
                      });
                    }),
                  );
                });
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
              return k !== CACHE_VERSION && k !== STATIC_CACHE;
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
    // Network-first, but never make the user wait on a slow connection:
    // race the network against a short timeout and fall back to cache.
    // The network response still lands in the cache in the background,
    // so a timed-out launch is at most one deploy behind.
    event.respondWith(
      new Promise(function (resolve) {
        let settled = false;
        const timer = setTimeout(function () {
          caches.match(request).then(function (cached) {
            if (!settled && cached) { settled = true; resolve(cached); }
          });
        }, 1500);
        fetch(request)
          .then(function (response) {
            clearTimeout(timer);
            const copy = response.clone();
            caches.open(CACHE_VERSION).then(function (cache) {
              cache.put(request, copy);
            });
            if (!settled) { settled = true; resolve(response); }
          })
          .catch(function () {
            clearTimeout(timer);
            caches.match(request).then(function (cached) {
              if (!settled) { settled = true; resolve(cached || Response.error()); }
            });
          });
      }),
    );
    return;
  }

  const bucket = isStatic(url) ? STATIC_CACHE : CACHE_VERSION;
  event.respondWith(
    caches.match(request, { ignoreSearch: false }).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(bucket).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      });
    }),
  );
});
