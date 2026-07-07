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

## Honest caveat

This was written by reading the source, **not compiled** — I don't have
the Emscripten toolchain set up. Treat it as review-ready, build-pending.
It's deliberately tiny and mirrors existing patterns exactly, so risk is
low, but do a local build before merging.

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
  --body "Implements item 1 of #81. Mirrors ATWasmConsoleSwitch; reuses the touch layer's ApplyDirectionMask + JoyButton0 so no new input-map bindings are needed. 63 lines, no deletions. Note: written from source review, not yet build-tested locally — please confirm the WASM build before merging."
```

Once merged and in a nightly, the JS tilt code on the arcade side is a
small `deviceorientation` listener that calls
`Module._ATWasmSetJoystick(mask, trigger)`.
