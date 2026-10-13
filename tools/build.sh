#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
VERSION=$(node -e "process.stdout.write(require('./manifest.json').version)")

node --check core.js
node --check settings.js
node --check game.js
node --check podium.js
node --check launch.js
node --test tests/*.test.js
python3 -c "import json; json.load(open('manifest.json', encoding='utf-8'))"

mkdir -p dist
CHROMIUM="dist/lets-game-${VERSION}-chromium.zip"
FIREFOX="dist/lets-game-${VERSION}-firefox.xpi"
rm -f "$CHROMIUM" "$FIREFOX"
FILES="LICENSE manifest.json README.md launch.html launch.js settings.html settings.js game.html game.js podium.html podium.js app.css core.js assets/icon-16.png assets/icon-32.png assets/icon-48.png assets/icon-128.png"
# shellcheck disable=SC2086
zip -q "$CHROMIUM" $FILES
# shellcheck disable=SC2086
zip -q "$FIREFOX" $FILES
unzip -t "$CHROMIUM" >/dev/null
unzip -t "$FIREFOX" >/dev/null
printf 'Built and verified:\n  %s\n  %s\n' "$CHROMIUM" "$FIREFOX"
