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
