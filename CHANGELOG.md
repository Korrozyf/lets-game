# Changelog

## 1.4.2

- Centralized game-state writes in the background context and serialized updates to prevent score changes from being lost across open game tabs.

## 1.4.1

- Added the MIT license to the repository and included it in the Chromium and Firefox packages.

## 1.4.0

- First launch and reset now restore the default two-team configuration with scores set to zero.
- The game grid displays two teams per row for up to four teams, then four per row for five to eight teams.
- The grid and controls resize to the window so the entire game fits without scrolling.
