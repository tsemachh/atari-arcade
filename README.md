# Atari Arcade

Atari 800 XL game library for the browser (desktop + mobile PWA), powered by
[AltirraSDL](https://github.com/ilmenit/AltirraSDL) — a WebAssembly port of
Avery Lee's cycle-accurate [Altirra](https://www.virtualdub.org/altirra.html)
emulator.

## Layout

- `index.html` — game picker (grid, search, PWA entry point)
- `games.json` — game list; each entry maps a display name to a file in `emu/library/`
- `emu/AltirraSDL.{html,js,wasm,data}` — prebuilt emulator (from the
  AltirraSDL `nightly` release, `AltirraSDL-*-wasm.zip`)
- `emu/config.json` — same-origin firmware bundle + "⬅ Games" back-link
- `emu/library/` — the `.atr` disk images; launched via `?lib=<file>`
- `firmware.zip` — Atari OS/BASIC ROMs, fetched automatically on first run
- `sw.js`, `manifest.webmanifest`, `icons/` — PWA install + offline cache
- `.github/workflows/deploy-pages.yml` — GitHub Pages deploy with cache-bust
  and deploy-time stamping

## Adding a game

1. Drop the `.atr` (or `.xex`/`.car`/`.cas`) into `emu/library/`
2. Add `{ "name": "Game Name", "file": "GameFile.atr" }` to `games.json`
3. Commit + push — the deploy workflow does the rest

## Updating the emulator

Download the latest `AltirraSDL-*-wasm.zip` from the
[nightly release](https://github.com/ilmenit/AltirraSDL/releases/tag/nightly)
and replace the four `AltirraSDL.*` files in `emu/`.

## Deploy

Pushes to `main` deploy automatically via GitHub Pages (Settings → Pages →
Source: GitHub Actions). The picker footer shows the exact deploy time and
commit, and the service worker cache is busted on every deploy.

## License / attribution

The emulator under `emu/` is **[AltirraSDL](https://github.com/ilmenit/AltirraSDL)**
by Jakub Dębski, a portable fork of **[Altirra](https://www.virtualdub.org/altirra.html)**
by Avery Lee, licensed **GPLv2** (see [`emu/LICENSE`](emu/LICENSE)). The
vendored bundle is built from upstream commit
[`27d37558`](https://github.com/ilmenit/AltirraSDL/commit/27d37558); its
corresponding source is the upstream repository at that commit. Our
modifications to the emulator's host page (the ARCADE-PATCH block injected
into `emu/index.html`, source in
[`scripts/emu-autofullscreen.snippet.html`](scripts/emu-autofullscreen.snippet.html))
are published in this repository under the same GPLv2 terms.

Everything else in this repository (picker, service worker, scripts) is
separate from the emulator and not covered by the GPL. Game images under
`emu/library/` are the property of their respective copyright holders,
preserved via [Homesoft](http://www.mushca.com/f/atari/).

## Local patches to the emulator shell

`emu/index.html` carries an "ARCADE-PATCH" block (source:
`scripts/emu-autofullscreen.snippet.html`) that activates on `?lib=`
launches:

- **Arcade chrome** — hides the desktop bar from the first frame; ⌄
  toggles a compact START/SELECT/OPTION/RESET row, ☰ opens the menu,
  ⛶ appears while not fullscreen.
- **`?fs=1`** — a tap enters browser fullscreen (retried on
  end-of-gesture events until it takes).
- **TILT toggle + `?tilt=1`** — device-orientation steering (extra
  sensitivity on forward/back so the screen stays visible while
  accelerating).
- **AUTO FIRE slide switch** — pulses the trigger at ~11 Hz via
  `ATWasmSetJoystick`.
- **`?tv=1`** — smart-TV remote controls (CE-HTML/HbbTV key codes):
  D-pad → joystick, OK → fire, Red/Green/Yellow → START/SELECT/OPTION,
  Blue → auto-fire, Play/Pause → pause, Back → picker. Open the picker
  with `?tv=1` and every launch inherits it.
- **Analytics** — GoatCounter (atari-arcade.goatcounter.com),
  cookie-less. Game launches report as `/play/<Game>`, so the
  dashboard's Paths view doubles as a per-game popularity table.

After replacing the AltirraSDL bundle files, re-apply with:

    ./scripts/patch-emu.sh
