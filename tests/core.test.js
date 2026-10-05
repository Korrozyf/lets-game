const test = require('node:test');
const assert = require('node:assert/strict');
require('../core.js');
const Core = globalThis.LetsGameCore;

test('the eight preset team colors are distinct and visually separated', () => {
  const channels = Core.COLORS.map(({ hex }) => hex.match(/[a-f0-9]{2}/gi).map((part) => parseInt(part, 16)));
  let closestPairDistance = Infinity;
  for (let i = 0; i < channels.length; i += 1) {
    for (let j = i + 1; j < channels.length; j += 1) {
      const distance = Math.sqrt(channels[i].reduce((sum, channel, index) => (
        sum + (channel - channels[j][index]) ** 2
      ), 0));
      closestPairDistance = Math.min(closestPairDistance, distance);
    }
  }
  assert.equal(Core.COLORS.length, 8);
  assert.equal(new Set(Core.COLORS.map(({ hex }) => hex)).size, 8);
  assert.ok(closestPairDistance > 60, `closest RGB distance was ${closestPairDistance}`);
});

test('name suggestions show alternatives despite a selected or custom team name', () => {
  const selected = '  LES COMÈTES  ';
  const alternatives = Core.getAlternativeNames(selected);
  assert.equal(alternatives.length, 7);
  assert.ok(!alternatives.includes('Les Comètes'));
  assert.deepEqual(Core.getAlternativeNames('Mon équipe personnalisée'), Core.NAME_SUGGESTIONS);
  assert.deepEqual(Core.getAlternativeNames(''), Core.NAME_SUGGESTIONS);
});

test('the base configuration has two distinct teams at zero', () => {
  const state = Core.createDefaultState();
  assert.equal(state.teams.length, 2);
  assert.equal(new Set(state.teams.map((team) => team.name)).size, 2);
  assert.deepEqual(Object.values(state.scores), [0, 0]);
});

test('game grid uses two columns for up to four teams and four columns above that', () => {
  assert.deepEqual(Core.getGameGridLayout(0), { columns: 2, rows: 0 });
  assert.deepEqual(Core.getGameGridLayout(1), { columns: 2, rows: 1 });
  assert.deepEqual(Core.getGameGridLayout(4), { columns: 2, rows: 2 });
  assert.deepEqual(Core.getGameGridLayout(5), { columns: 4, rows: 2 });
  assert.deepEqual(Core.getGameGridLayout(8), { columns: 4, rows: 2 });
});

test('normalization limits saved teams to eight', () => {
  const teams = Array.from({ length: 10 }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Team ${index + 1}`,
    emoji: Core.LOGOS[index % Core.LOGOS.length].emoji,
    color: Core.COLORS[index % Core.COLORS.length].hex
  }));
  const scores = Object.fromEntries(teams.map((team) => [team.id, team.id.length]));
  const state = Core.normalizeState({ teams, scores });
  assert.equal(Core.MAX_TEAMS, 8);
  assert.equal(state.teams.length, 8);
  assert.equal(state.teams.at(-1).id, 'team-8');
  assert.equal(Object.keys(state.scores).length, 8);
});

test('normalization retains negative scores and ignores scores for deleted teams', () => {
  const state = Core.normalizeState({
    teams: [
      { id: 'one', name: '  Les A  ', emoji: '😀', color: '#9d174d' },
      { id: 'two', name: 'Les B', emoji: '🤖', color: '#166534' }
    ],
    scores: { one: -4, two: 2, old: 99 }
  });
  assert.deepEqual(state.scores, { one: -4, two: 2 });
  assert.equal(state.teams[0].name, 'Les A');
});

test('normalization migrates colors saved with the previous palette', () => {
  const state = Core.normalizeState({
    teams: [{ id: 'legacy', name: 'Ancienne équipe', emoji: '😀', color: '#6d28d9' }],
    scores: { legacy: 3 }
  });
  assert.equal(state.teams[0].color, '#6a1b9a');
  assert.equal(state.scores.legacy, 3);
});

test('normalization supplies safe defaults for invalid logo and color values', () => {
  const state = Core.normalizeState({
    teams: [{ id: 'team', name: '', emoji: '<script>', color: 'red' }],
    scores: { team: 1.5 }
  });
  assert.equal(state.teams[0].name, Core.NAME_SUGGESTIONS[0]);
  assert.equal(state.teams[0].emoji, Core.LOGOS[0].emoji);
  assert.equal(state.teams[0].color, Core.COLORS[0].hex);
  assert.equal(state.scores.team, 0);
});

test('tied teams share a podium position; following positions use the next distinct score', () => {
  const teams = [
    { id: 'a', name: 'Alphas', emoji: '😀', color: '#9d174d' },
    { id: 'b', name: 'Betas', emoji: '😎', color: '#9a3412' },
    { id: 'c', name: 'Gammas', emoji: '🤓', color: '#854d0e' },
    { id: 'd', name: 'Deltas', emoji: '🥳', color: '#166534' }
  ];
  const podium = Core.createPodium(teams, { a: 8, b: 8, c: 5, d: -2 });
  assert.deepEqual(podium.map((place) => place.rank), [1, 2, 3]);
  assert.deepEqual(podium.map((place) => place.score), [8, 5, -2]);
  assert.deepEqual(podium[0].teams.map((team) => team.id).sort(), ['a', 'b']);
  assert.deepEqual(podium[1].teams.map((team) => team.id), ['c']);
  assert.deepEqual(podium[2].teams.map((team) => team.id), ['d']);
});

test('readable text color selects contrast for team cards', () => {
  assert.equal(Core.readableInk('#1d4ed8'), '#ffffff');
  assert.equal(Core.readableInk('#f9c74f'), '#172033');
});
