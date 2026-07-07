# Upstream PR: `ATWasmSetJoystick` export (AltirraSDL issue #81, item 1)

Adds a WASM export so JS embedders can drive the emulated joystick —
the primitive that unlocks tilt steering, external gamepads, and custom
D-pad overlays. Mirrors the existing `ATWasmConsoleSwitch` export and
reuses the touch layer's `ApplyDirectionMask` / `JoyButton0` paths, so
it needs no new input-map bindings and no export-list changes
(EMSCRIPTEN_KEEPALIVE auto-exports).

Files touched (63 lines added, no deletions):
- `source/input/touch_controls.h` — declare `ATTouchControls_SetExternalJoystick`
- `source/input/touch_controls.cpp` — implement it (edge-diffed, cleared in `ReleaseAll`)
- `source/app/wasm_bridge.cpp` — `extern "C" ATWasmSetJoystick(int dirMask, int trigger)`

## Status

**Submitted upstream: [ilmenit/AltirraSDL#82](https://github.com/ilmenit/AltirraSDL/pull/82)**
(2026-07-07, from fork branch `tsemachh:wasm-setjoystick-export`, commit
`28f6dc0` on main HEAD `1d5a5f2`).

## Build status

Build-verified (2026-07-07): compiles and links clean with emsdk 5.0.6
via the repo's `wasm-release` CMake preset, against `d2dc14a` (the
commit the current nightly wasm asset was cut from) — and
`git apply --check` passes on main HEAD `1d5a5f2` too.
`_ATWasmSetJoystick` confirmed present in the generated `AltirraSDL.js`
loader (`Module["_ATWasmSetJoystick"]`). No changes were needed to the
patch.

## How to open the PR

```sh
# 1. Fork AltirraSDL to your account (once):
gh repo fork ilmenit/AltirraSDL --clone
cd AltirraSDL

# 2. Branch + apply the patch:
git checkout -b wasm-setjoystick-export
git apply /path/to/atari-arcade/upstream-pr/atwasm-setjoystick.patch
git add -A
git commit -m "WASM: add ATWasmSetJoystick export for JS-driven joystick input

Mirrors ATWasmConsoleSwitch. Lets embedders (tilt, gamepad, custom
overlays) drive joystick port 0 from JS via the existing touch-layer
ApplyDirectionMask / JoyButton0 paths. Addresses item 1 of #81."

# 3. (recommended) build the WASM target to confirm it compiles, then:
git push -u origin wasm-setjoystick-export
gh pr create --repo ilmenit/AltirraSDL --fill \
  --title "WASM: add ATWasmSetJoystick export for JS-driven joystick input" \
  --body "Implements item 1 of #81. Mirrors ATWasmConsoleSwitch; reuses the touch layer's ApplyDirectionMask + JoyButton0 so no new input-map bindings are needed. 63 lines, no deletions. Build-verified with emsdk 5.0.6 (wasm-release preset): links clean and _ATWasmSetJoystick is exported in the generated loader."
```

Once merged and in a nightly, the JS tilt code on the arcade side is a
small `deviceorientation` listener that calls
`Module._ATWasmSetJoystick(mask, trigger)`.
