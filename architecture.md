# Atari Arcade — Architecture

A fully static, serverless web arcade: an Atari 800 XL game library that runs
in the browser (desktop and Android/iOS PWA). There is no backend, no build
step, and no framework — the repo *is* the site, deployed as-is to GitHub
Pages. All emulation happens client-side in WebAssembly.

```
┌────────────────────────────  GitHub Pages (static)  ───────────────────────────┐
│                                                                                │
│  index.html  ──fetch──►  games.json          emu/  (vendored AltirraSDL WASM)  │
│  (picker grid,           (game list)         ├─ index.html  ◄─ ARCADE-PATCH    │
│   search, PWA             │                  ├─ AltirraSDL.js / .wasm          │
│   install)                │                  ├─ wasm_lib_deeplink.js           │
│      │                    │                  ├─ config.json  (firmware, back)  │
│      └── card click ──────┴──────────────►   └─ library/*.xex|.atr  (62 games) │
│              emu/?lib=<file>&fs=1&pal=1&crt=0&…&back_url=../                   │
│                                                                                │
│  sw.js (offline cache)   manifest.webmanifest   firmware.zip   build-info.json │
└────────────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Picker shell — `index.html` + `games.json`

The entry point is a single self-contained page (inline CSS + vanilla ES5 JS,
no dependencies). It fetches `games.json`, renders a searchable card grid, and
turns each card into a deep link into the emulator. Supporting behaviors:

- **Auto-fullscreen on touch devices**: clicking a card calls
  `requestFullscreen()` *during the tap* (a user gesture, as browsers
  require), then navigates. Chrome keeps fullscreen across same-origin
  navigation, so the emulator starts already fullscreen. iOS lacks the API;
  there the installed PWA provides the chrome-less view instead.
- **`?rom=<name-or-file>` deep link**: jumps straight into a game, matching
  against `games.json` by display name or filename.
- **PWA install button**: wraps `beforeinstallprompt` (Android/desktop) with
  an instructional fallback for iOS ("Add to Home Screen").
- **Deploy stamp**: the footer shows `build-info.json`'s deploy time + commit.

`games.json` is the only "database": a flat list of
`{ name, file, description }` entries pointing into `emu/library/`. Adding a
game = drop the file + add one JSON entry + push.

### 2. Emulator — `emu/` (vendored AltirraSDL WASM bundle)

The emulator is **not built from source here**. `emu/` holds the prebuilt
WASM bundle from the [AltirraSDL](https://github.com/ilmenit/AltirraSDL)
nightly release (`AltirraSDL-*-wasm.zip`): the Emscripten loader
(`AltirraSDL.js`), the ~12 MB `AltirraSDL.wasm`, the host page
(`emu/index.html`), and `wasm_lib_deeplink.js`, which translates URL query
params into emulator CLI args / post-boot `Module._ATWasm*` export calls.

Two same-origin extension points configure the stock bundle:

- **`emu/config.json`** — points the emulator at `../firmware.zip` (Atari
  OS/BASIC ROMs, auto-fetched on first run into the emulator's IDBFS) and
  defines the "⬅ Games" back-link (`lobbyUrl: "../"`) shown in the page bar.
- **`emu/library/`** — the game images (`.xex`/`.atr`), fetched on demand by
  the deep-link loader and cached in IDBFS so repeat plays skip the download.

### 3. Launch contract — the URL

The picker→emulator interface is entirely URL query params (see
`launchUrl()` in `index.html`):

| Param | Purpose |
|---|---|
| `lib=<file>` | game image to fetch from `emu/library/` and boot |
| `fs=1` | first tap enters fullscreen (handled by the ARCADE-PATCH shim) |
| `pal=1&crt=0` | PAL video, CRT effects off (project default) |
| `experience=convenient&addons=off` | stock 800 XL first-run profile — best compatibility for 80s titles |
| `back_url=../&back_label=⬅ Games` | page-bar back link to the picker |

One game per launch; "exit" is a normal navigation back to the picker. This
keeps the picker and emulator fully decoupled — the emulator bundle can be
swapped without touching the picker, as long as the param contract holds.

### 4. Offline / PWA layer — `sw.js`, `manifest.webmanifest`, `icons/`

The service worker (registered by the picker) implements two policies:

- **Network-first** for `games.json` and `build-info.json` — lists and the
  deploy stamp are always fresh, with cache fallback when offline.
- **Cache-first** for everything else same-origin — including the WASM binary
  and game images, so after the first run the whole arcade plays offline.

Cache invalidation is deploy-driven: the workflow rewrites `CACHE_VERSION`
(`arcade-v1` → `arcade-<sha>`), and the worker's `activate` handler deletes
all caches that don't match the current version. The manifest requests
`display_override: ["fullscreen", "standalone"]` and landscape orientation,
so the installed app launches chrome-less on Android.

### 5. Deploy pipeline — `.github/workflows/deploy-pages.yml`

Every push to `main` deploys the repo root verbatim to GitHub Pages, with two
stamping steps before upload:

1. `sed` the commit SHA into `sw.js`'s `CACHE_VERSION` (cache bust).
2. Write deploy time + SHA into `build-info.json` (footer stamp).

There is deliberately no bundler/minifier — what's committed is what ships.

### 6. Local patch layer — `scripts/patch-emu.sh`

Because `emu/` is a vendored artifact, local modifications to it are managed
as a re-appliable patch: `scripts/emu-autofullscreen.snippet.html` (the
"ARCADE-PATCH" block — fullscreen top-bar hiding, `?fs=1` tap-to-fullscreen,
and a floating ☰ menu button while fullscreen) is injected into
`emu/index.html` by `scripts/patch-emu.sh` (idempotent). **Updating the
emulator = replace the `AltirraSDL.*` files from the nightly, re-run the
patch script.**

### 7. Upstream collaboration — `upstream-pr/`, `scripts/altirra-feature-request.sh`

Shell-side hacks get promoted into upstream AltirraSDL features so the patch
layer can shrink over time. `scripts/altirra-feature-request.sh` filed the
five embedder asks as
[AltirraSDL#81](https://github.com/ilmenit/AltirraSDL/issues/81); work to
date, each build-verified against the emsdk 5.0.6 `wasm-release` preset:

- [#82](https://github.com/ilmenit/AltirraSDL/pull/82) `ATWasmSetJoystick(dirMask, trigger)` — JS joystick input hook (tilt / gamepad), item 1. Patch kept in `upstream-pr/`.
- [#83](https://github.com/ilmenit/AltirraSDL/pull/83) `?joystick=analog|dpad8|dpad4` + `ATWasmSetJoystickStyle` — per-game stick style, item 3.
- [#84](https://github.com/ilmenit/AltirraSDL/pull/84) `?consolekeys=0|1` + `ATWasmSetConsoleKeys` — hide/auto-hide the START/SELECT/OPTION row, item 5 (partial).

Once these land in a nightly, the picker's `launchUrl()` grows the matching
params (e.g. `&joystick=dpad4` per game in `games.json`) and the arcade shell
can add tilt controls via `Module._ATWasmSetJoystick`.

## Directory map

```
atari-arcade/
├── index.html              # picker: grid, search, PWA install, deep links
├── games.json              # game list (the only "database")
├── build-info.json         # deploy stamp (rewritten by CI)
├── sw.js                   # service worker: offline cache, SHA-versioned
├── manifest.webmanifest    # PWA manifest (fullscreen, landscape)
├── icons/                  # PWA icons (192/512/maskable)
├── firmware.zip            # Atari OS/BASIC ROMs, fetched by emulator on first run
├── emu/                    # vendored AltirraSDL WASM nightly + config
│   ├── index.html          #   host page (carries the ARCADE-PATCH block)
│   ├── AltirraSDL.js/.wasm #   Emscripten loader + emulator core
│   ├── wasm_lib_deeplink.js#   URL params → CLI args / WASM export calls
│   ├── config.json         #   firmware URL + back-link
│   └── library/            #   62 game images (.xex/.atr)
├── scripts/
│   ├── patch-emu.sh        # re-apply local emulator patches after update
│   ├── emu-autofullscreen.snippet.html   # the ARCADE-PATCH block itself
│   └── altirra-feature-request.sh        # files/updates upstream issue #81
├── upstream-pr/            # upstream patch staging (see its README.md)
└── .github/workflows/deploy-pages.yml    # Pages deploy + stamping
```

## References

- **[ilmenit/atari-800-skills](https://github.com/ilmenit/atari-800-skills)** —
  AI-agent skill library for Atari 8-bit programming (6502, ANTIC/GTIA/POKEY,
  OS vectors, MADS). Not needed for the embedding/bridge work done so far
  (that follows AltirraSDL's own code patterns), but the go-to reference for:
  - `system/input.md` when wiring tilt/gamepad JS to
    `Module._ATWasmSetJoystick` (real-joystick behavior, trigger semantics);
  - `system/compatibility.md` for per-game launch params in `games.json`
    (PAL/NTSC, XL/XE quirks, which titles want `?joystick=dpad4`);
  - everything else if the arcade ever ships Atari-side 6502 code.

## Key design decisions

- **Static-only, zero build**: every file is servable as committed; deploys
  are pure copies. Debugging in production = View Source.
- **Vendor the emulator, don't fork it**: `emu/` is a drop-in nightly
  artifact; local needs live in a small idempotent patch (`patch-emu.sh`) or
  get pushed upstream (issue #81 → PRs #82–#84). This keeps emulator updates
  to a file swap.
- **URL params as the integration API**: the picker knows nothing about the
  emulator internals, only the query-string contract.
- **Offline-first with deploy-time invalidation**: cache-first for the heavy
  immutable assets, network-first for the two small mutable JSON files, SHA
  in the cache name so every deploy atomically drops stale caches.
