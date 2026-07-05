#!/bin/sh
# Re-apply the Atari Arcade local patches to emu/index.html after updating
# the AltirraSDL bundle. Idempotent - run from the repo root.
set -e
if grep -q "ARCADE-PATCH: auto-fullscreen" emu/index.html; then
  echo "patch already present"
  exit 0
fi
python3 - << 'PYEOF'
src = open("emu/index.html").read()
patch = open("scripts/emu-autofullscreen.snippet.html").read()
src = src.replace("</body>", patch + "</body>")
open("emu/index.html", "w").write(src)
print("patch applied")
PYEOF
