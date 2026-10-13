(function (root) {
  'use strict';

  const STORAGE_KEY = 'letsGameState';
  const MESSAGE_TYPES = Object.freeze({
    updateScore: 'lets-game/update-score',
    saveTeams: 'lets-game/save-teams',
    resetState: 'lets-game/reset-state',
    startNewGame: 'lets-game/start-new-game'
  });
  const MAX_TEAMS = 8;
  const NAME_SUGGESTIONS = [
    'The Comets',
    'The Foxes',
    'The Lightning',
    'The Explorers',
    'The Llamas',
    'The Phoenixes',
    'The Robots',
    'The Tigers'
  ];
  const LOGOS = [
    { emoji: '😀', label: 'Smile' },
    { emoji: '😎', label: 'Sunglasses' },
    { emoji: '🤓', label: 'Nerd' },
    { emoji: '🥳', label: 'Party' },
    { emoji: '😺', label: 'Happy cat' },
    { emoji: '🤖', label: 'Robot' },
    { emoji: '🥸', label: 'Disguise' },
    { emoji: '😜', label: 'Winking face' }
  ];
  const COLORS = [
    { hex: '#c2185b', label: 'Raspberry' },
    { hex: '#e65100', label: 'Tangerine' },
    { hex: '#f9a825', label: 'Sunshine' },
    { hex: '#2e7d32', label: 'Emerald' },
    { hex: '#00897b', label: 'Lagoon' },
    { hex: '#1565c0', label: 'Ocean' },
    { hex: '#6a1b9a', label: 'Amethyst' },
    { hex: '#455a64', label: 'Graphite' }
  ];
  const LEGACY_COLORS = new Map([
    ['#9d174d', '#c2185b'],
    ['#9a3412', '#e65100'],
    ['#854d0e', '#f9a825'],
    ['#166534', '#2e7d32'],
    ['#1d4ed8', '#1565c0'],
    ['#6d28d9', '#6a1b9a'],
    ['#0f766e', '#00897b'],
    ['#475569', '#455a64']
  ]);

  function getAlternativeNames(currentName) {
    const selected = typeof currentName === 'string'
      ? currentName.trim().toLocaleLowerCase('en-GB')
      : '';
    return NAME_SUGGESTIONS.filter((name) => name.toLocaleLowerCase('en-GB') !== selected);
  }

  function createDefaultState() {
    const teams = NAME_SUGGESTIONS.slice(0, 2).map((name, index) => ({
      id: `team-${index + 1}`,
      name,
      emoji: LOGOS[index].emoji,
      color: COLORS[index].hex
    }));
    return {
      teams,
      scores: Object.fromEntries(teams.map((team) => [team.id, 0]))
    };
  }

  function getGameGridLayout(teamCount) {
    const count = Number.isInteger(teamCount) ? Math.max(0, teamCount) : 0;
    const columns = count > 4 ? 4 : 2;
    return { columns, rows: Math.ceil(count / columns) };
  }

  function normalizeState(value) {
    if (!value || !Array.isArray(value.teams)) return createDefaultState();

    const seenIds = new Set();
    const teams = value.teams.slice(0, MAX_TEAMS).map((rawTeam, index) => {
      const source = rawTeam && typeof rawTeam === 'object' ? rawTeam : {};
      let id = typeof source.id === 'string' && source.id.trim()
        ? source.id.trim()
        : `team-${index + 1}`;
      while (seenIds.has(id)) id = `${id}-${index + 1}`;
      seenIds.add(id);

      const suggestedName = NAME_SUGGESTIONS[index % NAME_SUGGESTIONS.length];
      const name = typeof source.name === 'string' && source.name.trim()
        ? source.name.trim()
        : suggestedName;
      const emoji = LOGOS.some((logo) => logo.emoji === source.emoji)
        ? source.emoji
        : LOGOS[index % LOGOS.length].emoji;
      const color = COLORS.some((item) => item.hex === source.color)
        ? source.color
        : LEGACY_COLORS.get(source.color) || COLORS[index % COLORS.length].hex;
      return { id, name, emoji, color };
    });

    const previousScores = value.scores && typeof value.scores === 'object' ? value.scores : {};
    const scores = Object.fromEntries(teams.map((team) => {
      const score = previousScores[team.id];
      return [team.id, Number.isSafeInteger(score) ? score : 0];
    }));
    return { teams, scores };
  }

  function createPodium(teams, scores) {
    const ordered = teams.map((team) => ({
      ...team,
      score: Number.isSafeInteger(scores && scores[team.id]) ? scores[team.id] : 0
    })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'en-GB'));

    const groups = [];
    for (const team of ordered) {
      const last = groups[groups.length - 1];
      if (last && last.score === team.score) last.teams.push(team);
      else groups.push({ score: team.score, teams: [team] });
    }

    return [0, 1, 2].map((index) => ({
      rank: index + 1,
      score: groups[index] ? groups[index].score : null,
      teams: groups[index] ? groups[index].teams : []
    }));
  }

  function createId() {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') return root.crypto.randomUUID();
    return `team-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function readableInk(hex) {
    const channels = hex.match(/[a-f0-9]{2}/gi).map((part) => parseInt(part, 16) / 255);
    const linear = channels.map((channel) => channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4);
    const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    const whiteContrast = 1.05 / (luminance + 0.05);
    const darkContrast = (luminance + 0.05) / 0.05;
    return whiteContrast >= darkContrast ? '#ffffff' : '#172033';
  }

  root.LetsGameCore = {
    STORAGE_KEY,
    MESSAGE_TYPES,
    MAX_TEAMS,
    NAME_SUGGESTIONS,
    getAlternativeNames,
    LOGOS,
    COLORS,
    createDefaultState,
    getGameGridLayout,
    normalizeState,
    createPodium,
    createId,
    readableInk
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
