#!/bin/sh
# File (or update) the AltirraSDL feature request covering the five
# embedder asks from the Atari Arcade project.
#
# Usage:
#   ./scripts/altirra-feature-request.sh              # create a new issue
#   ISSUE=123 ./scripts/altirra-feature-request.sh    # update issue #123 in place
#
# Requires the GitHub CLI (`gh auth login` done once).

set -e
REPO="ilmenit/AltirraSDL"
TITLE="WASM embed: JS joystick export, per-game quicksave, per-game joystick style, ?fullscreen, console-key auto-hide"

BODY=$(cat <<'EOF'
Hi — thanks for AltirraSDL. I'm self-hosting the WASM build as a small
"arcade": a picker page deep-links into games via `?lib=`, one game per
launch, played fullscreen on Android. Five small requests, each of which
removes a hack or unlocks a feature on the embedder side. Roughly in
priority order.

## 1. Export `ATWasmSetJoystick(dirMask, trigger)` — JS input hook

The WASM build already exports `ATWasmConsoleSwitch(bit, down)`, which is
how a web button drives START/SELECT/OPTION. There's no equivalent for the
joystick, so an embedder can't feed stick input from JS at all.

`touch_controls.cpp` already has `ApplyDirectionMask(mask)` that pokes
`ATInputManager::OnButtonDown/Up(0, kATInputCode_JoyStick1*)`. Exposing a
tiny `EMSCRIPTEN_KEEPALIVE` wrapper — e.g.

    ATWasmSetJoystick(uint8 dirMask /*b0=L,b1=R,b2=U,b3=D*/, int trigger)

that calls the existing mask logic + trigger — would let embedders add
input sources the core doesn't ship: **device-orientation (tilt) steering**,
external gamepads via the Web Gamepad API, etc. Highest-leverage item for
me: one small export and I can add tilt controls entirely in my shell.

## 2. Per-game quicksave slot

`QuickSaveStatePath()` is a single fixed `quicksave.atstate2`, so quicksave
(and auto-save / restore-on-startup) is one slot shared across all games —
saving in game A then playing B overwrites A. Keying the path on the loaded
media (basename/hash) would make save + auto-restore naturally per-game.
There's no exported save/load-state function, so I can't work around this
from JS without racing the built-in restore timing.

## 3. `?joystick=analog|dpad4|dpad8` URL param (per-launch control style)

Different games want different stick styles — D-Pad 4 is great for grid
games (Boulder Dash), but an 8-way / analog game (Bruce Lee) wants
diagonals. The style is currently a single global `JoystickStyle` config
value with no URL override and no WASM export. A `?joystick=` param (or an
`ATWasmSetJoystickStyle(n)` export mirroring `ATWasmSetTouchControls`)
would let a per-game launcher pick the right scheme per title, e.g.
`?lib=BoulderDash.xex&joystick=dpad4`.

## 4. `?fullscreen=1` URL param

For a kiosk/arcade launch, a first-class param that requests element-
fullscreen on first user gesture (browsers require a gesture) would let me
drop the shell script I currently inject to do this + hide the top bar.

## 5. Console-key auto-hide / per-button visibility (Gaming Mode)

The START/SELECT/OPTION/RESET row is always visible during play; the
opacity slider dims the joystick/fire too, so it's not a substitute.
`ui_mobile.h` already has an unused `topBarTimer`/`topBarVisible` pair that
looks intended for this. Auto-hiding the console keys after N seconds of
inactivity (tap to reveal) and/or per-key visibility (e.g. START only)
would clean up the fullscreen view.

Context: self-hosted nightly WASM bundle, `?lib=` deep links, Android
fullscreen PWA. Happy to test any of these on real hardware — especially
#1, where I can wire up tilt the moment the export lands. Thanks!
EOF
)

if [ -n "$ISSUE" ]; then
  echo "Updating $REPO issue #$ISSUE ..."
  gh issue edit "$ISSUE" --repo "$REPO" --title "$TITLE" --body "$BODY"
  gh issue view "$ISSUE" --repo "$REPO" --web
else
  echo "Creating a new issue on $REPO ..."
  gh issue create --repo "$REPO" --title "$TITLE" --body "$BODY" --web
fi
