# Let's Game

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A lightweight browser extension for setting up teams, keeping score, and showing the podium.

## Download

The latest stable release, with packages for Chrome, Edge, and Firefox, is available on the [GitHub Releases page](https://github.com/Korrozyf/lets-game/releases/latest).

## Features

- **Team settings:** Create up to eight teams, add or remove teams, enter custom names, and choose from eight emoji icons and eight clearly distinct preset colours. The name suggestion button offers alternative names even when a name has already been entered. The add button is disabled at the team limit. Resetting restores the two default teams and resets their scores to zero.
- **Game:** Square team cards display two teams per row for up to four teams, or four per row for five to eight teams. Use the `+` and `−` buttons to change scores; negative scores are allowed. Tiles and controls resize to fit the window, so all teams and controls remain visible without scrolling.
- **Podium:** Teams tied on score share a podium place. Subsequent places are based on the next distinct scores, and the podium shows up to three score groups.
- **New games:** Starting a new game resets all scores to zero. Team settings and current scores are stored locally in the browser.
- **Privacy:** No account, network requests, or data collection.

## Install in Chrome or Edge

1. Download and extract `lets-game-<version>-chromium.zip` from the [GitHub Releases page](https://github.com/Korrozyf/lets-game/releases/latest).
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Turn on **Developer mode**.
4. Select **Load unpacked** and choose the extracted folder.
5. Select the Let's Game icon. The game opens in a new tab.

To edit teams, select **Settings** from the game. Changes are saved only after selecting **Save settings** or **Start a new game**.

## Temporarily install in Firefox

1. Download the Firefox package, `lets-game-<version>-firefox.xpi`, from the [GitHub Releases page](https://github.com/Korrozyf/lets-game/releases/latest), not the Chromium package.
2. Extract the `.xpi` file to a folder using an archive utility. An XPI is a ZIP archive; if needed, rename a copy to use the `.zip` extension before extracting it.
3. Open `about:debugging#/runtime/this-firefox` and select **Load Temporary Add-on…**.
4. In the extracted folder, select `manifest.json`. Confirm that the Firefox manifest has `background.scripts` containing `core.js` and `background.js`, and does **not** contain `background.service_worker`.

Do not use the Chromium package or the source `manifest.json` at the repository root. Select the manifest extracted from the Firefox XPI. This installation is temporary and must be repeated after Firefox closes.

The supplied `.xpi` is unsigned. For a permanent Firefox installation, Mozilla must sign the extension (for example, by submitting it as an unlisted add-on).

## Test and build packages

Requirements: Node.js, Python 3, `zip`, and `unzip`.

```sh
./tools/build.sh
```

The script runs the tests and creates Chromium and Firefox packages in `dist/`. Each package also includes the `LICENSE` file. GitHub Actions automatically attaches both packages to a GitHub Release when a tag matching the manifest version is pushed (for example, `v1.4.3`).

## Licence

The original source code and assets in this repository are distributed under the [MIT Licence](LICENSE). The `LICENSE` file is included in the Chromium and Firefox packages. Any third-party components remain subject to their respective licence notices.
