(() => {
  'use strict';

  const Core = globalThis.LetsGameCore;
  const api = globalThis.browser || globalThis.chrome;
  const podium = document.querySelector('#podium');
  const replay = document.querySelector('#replayButton');
  const medals = ['🥇', '🥈', '🥉'];
  const placeNames = ['Première place', 'Deuxième place', 'Troisième place'];
  const scoreFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  let state = Core.createDefaultState();

  function render() {
    podium.replaceChildren();
    for (const place of Core.createPodium(state.teams, state.scores)) {
      const column = document.createElement('section');
      column.className = `podium-column rank-${place.rank}`;
      column.setAttribute('aria-label', placeNames[place.rank - 1]);

      const medal = document.createElement('span');
      medal.className = 'podium-medal';
      medal.setAttribute('aria-hidden', 'true');
      medal.textContent = medals[place.rank - 1];
      const badge = document.createElement('span');
      badge.className = 'podium-place';
      badge.textContent = String(place.rank);
      const label = document.createElement('h2');
      label.textContent = placeNames[place.rank - 1];
      label.style.cssText = 'margin:0 0 6px;font-size:14px;';
      column.append(medal, badge, label);

      if (place.teams.length) {
        const score = document.createElement('p');
        score.className = 'podium-score';
        score.textContent = `${scoreFormatter.format(place.score)} ${Math.abs(place.score) === 1 ? 'point' : 'points'}`;
        const list = document.createElement('div');
        list.className = 'podium-team-list';
        for (const team of place.teams) {
          const item = document.createElement('div');
          item.className = 'podium-team';
          item.style.setProperty('--team-color', team.color);
          item.style.setProperty('--team-ink', Core.readableInk(team.color));
          const emoji = document.createElement('span');
          emoji.className = 'podium-team-emoji';
          emoji.textContent = team.emoji;
          emoji.setAttribute('aria-hidden', 'true');
          const name = document.createElement('span');
          name.textContent = team.name;
          item.append(emoji, name);
          list.append(item);
        }
        column.append(score, list);
      } else {
        const empty = document.createElement('p');
        empty.className = 'podium-empty';
        empty.textContent = 'Aucune équipe sur cette marche';
        column.append(empty);
      }
      podium.append(column);
    }
  }

  replay.addEventListener('click', async () => {
    replay.disabled = true;
    try {
      const stored = await api.storage.local.get(Core.STORAGE_KEY);
      const latest = Core.normalizeState(stored[Core.STORAGE_KEY]);
      latest.scores = Object.fromEntries(latest.teams.map((team) => [team.id, 0]));
      await api.storage.local.set({ [Core.STORAGE_KEY]: latest });
      window.location.assign('game.html');
    } catch (error) {
      console.error('Could not start a new game', error);
      replay.disabled = false;
    }
  });

  api.storage.local.get(Core.STORAGE_KEY).then((stored) => {
    state = Core.normalizeState(stored[Core.STORAGE_KEY]);
    render();
  }).catch((error) => {
    console.error('Could not load the podium', error);
    state = { teams: [], scores: {} };
    render();
  });
})();
