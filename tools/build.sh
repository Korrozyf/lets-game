#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
VERSION=$(node -e "process.stdout.write(require('./manifest.json').version)")

node --check core.js
node --check background.js
node --check settings.js
node --check game.js
node --check podium.js
node --check launch.js
node --test tests/*.test.js
python3 - <<'PY'
import json

with open('manifest.json', encoding='utf-8') as manifest_file:
    manifest = json.load(manifest_file)
background = manifest.get('background', {})
assert background.get('service_worker') == 'background.js'
assert background.get('scripts') == ['core.js', 'background.js']
PY

mkdir -p dist
CHROMIUM="dist/lets-game-${VERSION}-chromium.zip"
FIREFOX="dist/lets-game-${VERSION}-firefox.xpi"
rm -f "$CHROMIUM" "$FIREFOX"
STAGING_DIR=$(mktemp -d "${TMPDIR:-/tmp}/lets-game-build.XXXXXX")
trap 'rm -rf "$STAGING_DIR"' EXIT HUP INT TERM
FILES="LICENSE manifest.json README.md launch.html launch.js settings.html settings.js game.html game.js podium.html podium.js app.css core.js background.js assets/icon-16.png assets/icon-32.png assets/icon-48.png assets/icon-128.png"

package() {
  browser="$1"
  archive="$2"
  stage="$STAGING_DIR/$browser"
  mkdir -p "$stage"

  for file in $FILES; do
    mkdir -p "$stage/$(dirname "$file")"
    cp "$file" "$stage/$file"
  done

  node -e '
    const fs = require("fs");
    const manifestPath = process.argv[1];
    const browser = process.argv[2];
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.background = browser === "chromium"
      ? { service_worker: "background.js" }
      : { scripts: ["core.js", "background.js"] };
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  ' "$stage/manifest.json" "$browser"

  node -e '
    const fs = require("fs");
    const [manifestPath, browser] = process.argv.slice(1);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const background = manifest.background;
    const valid = browser === "chromium"
      ? background.service_worker === "background.js" && !background.scripts
      : Array.isArray(background.scripts)
        && background.scripts.join(",") === "core.js,background.js"
        && !background.service_worker;
    if (!valid) throw new Error(`Invalid ${browser} background manifest.`);
  ' "$stage/manifest.json" "$browser"

  (cd "$stage" && zip -q -r "$ROOT/$archive" *)
  unzip -t "$ROOT/$archive" >/dev/null
  unzip -p "$ROOT/$archive" manifest.json | cmp - "$stage/manifest.json"
  unzip -Z1 "$ROOT/$archive" | grep -qx 'background.js'
  unzip -Z1 "$ROOT/$archive" | grep -qx 'core.js'
}

package chromium "$CHROMIUM"
package firefox "$FIREFOX"
printf 'Built and verified:\n  %s\n  %s\n' "$CHROMIUM" "$FIREFOX"
