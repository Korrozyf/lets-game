(() => {
  'use strict';

  const Core = globalThis.LetsGameCore;
  const api = globalThis.browser || globalThis.chrome;
  const grid = document.querySelector('#teamsGrid');
  const empty = document.querySelector('#emptyGame');
  const finish = document.querySelector('#finishButton');
  const scoreFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  let state = Core.createDefaultState();
  let updateQueue = Promise.resolve();
  let layoutFrame = 0;

  async function readState() {
    const stored = await api.storage.local.get(Core.STORAGE_KEY);
    return Core.normalizeState(stored[Core.STORAGE_KEY]);
  }

  function fitTeamsGrid() {
    if (!state.teams.length || grid.hidden) return;
    const { columns, rows } = Core.getGameGridLayout(state.teams.length);
    grid.style.setProperty('--team-columns', columns);
    grid.style.setProperty('--team-rows', rows);

    const styles = getComputedStyle(grid);
    const columnGap = Number.parseFloat(styles.columnGap) || 0;
    const rowGap = Number.parseFloat(styles.rowGap) || 0;
    const maxTileByWidth = Math.max(1, (grid.clientWidth - columnGap * (columns - 1)) / columns);
    const maxEntryHeight = Math.max(1, (grid.clientHeight - rowGap * (rows - 1)) / rows);
    let tileSize = Math.max(1, Math.min(maxTileByWidth, maxEntryHeight - 24));
    let scoreArea = 0;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      scoreArea = Math.max(22, Math.min(52, tileSize * 0.22));
      tileSize = Math.max(1, Math.min(maxTileByWidth, maxEntryHeight - scoreArea));
    }
    scoreArea = Math.max(22, Math.min(52, tileSize * 0.22));

    const px = (value) => `${Math.round(value * 10) / 10}px`;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const logoSize = clamp(tileSize * 0.24, 14, 88);
    grid.style.setProperty('--team-tile-size', px(tileSize));
    grid.style.setProperty('--team-entry-size', px(tileSize + scoreArea));
    grid.style.setProperty('--score-area-size', px(scoreArea));
    grid.style.setProperty('--team-logo-size', px(logoSize));
    grid.style.setProperty('--team-logo-font-size', px(clamp(tileSize * 0.13, 9, 70)));
    grid.style.setProperty('--team-name-font-size', px(clamp(tileSize * 0.11, 7, 27)));
    grid.style.setProperty('--score-button-size', px(clamp(tileSize * 0.19, 18, 48)));
    grid.style.setProperty('--score-button-font-size', px(clamp(tileSize * 0.11, 12, 28)));
    grid.style.setProperty('--score-font-size', px(clamp(tileSize * 0.13, 10, 39)));
    grid.style.setProperty('--team-tile-padding', px(clamp(tileSize * 0.06, 2, 20)));
    grid.style.setProperty('--team-tile-gap', px(clamp(tileSize * 0.035, 1, 10)));
    grid.style.setProperty('--team-tile-radius', px(clamp(tileSize * 0.07, 6, 25)));
    grid.style.setProperty('--team-logo-radius', px(clamp(logoSize * 0.31, 4, 27)));
    grid.style.setProperty('--score-control-gap', px(clamp(tileSize * 0.025, 1, 8)));
  }

  function scheduleGridFit() {
    if (layoutFrame) cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      fitTeamsGrid();
    });
  }

  function render() {
    grid.replaceChildren();
    const hasTeams = state.teams.length > 0;
    const { columns, rows } = Core.getGameGridLayout(state.teams.length);
    grid.hidden = !hasTeams;
    grid.style.setProperty('--team-columns', columns);
    grid.style.setProperty('--team-rows', rows);
    empty.hidden = hasTeams;
    finish.disabled = !hasTeams;

    for (const [index, team] of state.teams.entries()) {
      const entry = document.createElement('article');
      entry.className = 'team-entry';
      if (state.teams.length % columns === 1 && index === state.teams.length - 1) {
        entry.style.gridColumn = '1 / -1';
      }
      const tile = document.createElement('div');
      tile.className = 'team-tile';
      tile.style.setProperty('--team-color', team.color);
      tile.style.setProperty('--team-ink', Core.readableInk(team.color));
      const logo = document.createElement('span');
      logo.className = 'team-logo';
      logo.textContent = team.emoji;
      logo.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'team-name';
      name.textContent = team.name;
      tile.append(logo, name);

      const panel = document.createElement('div');
      panel.className = 'score-panel';
      panel.style.setProperty('--team-color', team.color);
      const minus = document.createElement('button');
      minus.className = 'score-button';
      minus.type = 'button';
      minus.textContent = '−';
      minus.setAttribute('aria-label', `Diminuer le score de ${team.name}`);
      minus.dataset.teamId = team.id;
      minus.dataset.delta = '-1';
      const score = document.createElement('output');
      score.className = 'score-value';
      score.textContent = scoreFormatter.format(state.scores[team.id] ?? 0);
      score.setAttribute('aria-label', `Score de ${team.name}`);
      score.setAttribute('aria-live', 'polite');
      const plus = document.createElement('button');
      plus.className = 'score-button';
      plus.type = 'button';
      plus.textContent = '+';
      plus.setAttribute('aria-label', `Augmenter le score de ${team.name}`);
      plus.dataset.teamId = team.id;
      plus.dataset.delta = '1';
      panel.append(minus, score, plus);
      entry.append(tile, panel);
      grid.append(entry);
    }
    scheduleGridFit();
  }

  async function changeScore(teamId, delta) {
    const latest = await readState();
    const team = latest.teams.find((item) => item.id === teamId);
    if (!team) {
      state = latest;
      render();
      return;
    }
    const score = latest.scores[teamId] ?? 0;
    if (!Number.isSafeInteger(score + delta)) return;
    latest.scores[teamId] = score + delta;
    await api.storage.local.set({ [Core.STORAGE_KEY]: latest });
    state = latest;
    render();
  }

  grid.addEventListener('click', (event) => {
    const button = event.target.closest('.score-button');
    if (!button) return;
    const teamId = button.dataset.teamId;
    const delta = Number(button.dataset.delta);
    updateQueue = updateQueue
      .then(() => changeScore(teamId, delta))
      .catch((error) => console.error('Could not update the score', error));
  });

  finish.addEventListener('click', () => {
    if (state.teams.length) window.location.assign('podium.html');
  });

  if (api.storage.onChanged) {
    api.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes[Core.STORAGE_KEY]) return;
      state = Core.normalizeState(changes[Core.STORAGE_KEY].newValue);
      render();
    });
  }

  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(scheduleGridFit).observe(grid);
  }
  window.addEventListener('resize', scheduleGridFit, { passive: true });

  readState().then((nextState) => {
    state = nextState;
    render();
  }).catch((error) => {
    console.error('Could not load the game', error);
    state = { teams: [], scores: {} };
    render();
  });
})();
