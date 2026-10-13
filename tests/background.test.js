const test = require('node:test');
const assert = require('node:assert/strict');
require('../core.js');
const Core = globalThis.LetsGameCore;

let storedState = Core.createDefaultState();
let failNextWrite = false;
const messageListeners = [];
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function makeTeam(id, name, index = 0) {
  return {
    id,
    name,
    emoji: Core.LOGOS[index % Core.LOGOS.length].emoji,
    color: Core.COLORS[index % Core.COLORS.length].hex
  };
}

const extensionApi = {
  runtime: {
    id: 'lets-game-test',
    onMessage: {
      addListener(listener) {
        messageListeners.push(listener);
      }
    }
  },
  storage: {
    local: {
      async get(key) {
        await wait(1);
        return { [key]: structuredClone(storedState) };
      },
      async set(values) {
        await wait(1);
        if (failNextWrite) {
          failNextWrite = false;
          throw new Error('Simulated storage failure');
        }
        storedState = structuredClone(values[Core.STORAGE_KEY]);
      }
    }
  }
};

globalThis.chrome = extensionApi;
require('../background.js');
const onMessage = messageListeners[0];

function sendFromTab(tabId, message) {
  return new Promise((resolve, reject) => {
    try {
      const keepAlive = onMessage(
        message,
        { id: extensionApi.runtime.id, tab: { id: tabId } },
        resolve
      );
      assert.equal(keepAlive, true, 'the listener must keep the async response channel open');
    } catch (error) {
      reject(error);
    }
  });
}

test('concurrent score updates from separate game tabs are serialized and survive a failed write', async () => {
  storedState = Core.createDefaultState();
  const requests = [
    ...Array.from({ length: 40 }, () => sendFromTab(101, {
      type: Core.MESSAGE_TYPES.updateScore,
      teamId: 'team-1',
      delta: 1
    })),
    ...Array.from({ length: 25 }, () => sendFromTab(202, {
      type: Core.MESSAGE_TYPES.updateScore,
      teamId: 'team-1',
      delta: 1
    })),
    ...Array.from({ length: 12 }, () => sendFromTab(202, {
      type: Core.MESSAGE_TYPES.updateScore,
      teamId: 'team-2',
      delta: -1
    }))
  ];
  const responses = await Promise.all(requests);

  assert.ok(responses.every((response) => response.ok));
  assert.equal(storedState.scores['team-1'], 65);
  assert.equal(storedState.scores['team-2'], -12);

  failNextWrite = true;
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const failed = await sendFromTab(101, {
      type: Core.MESSAGE_TYPES.updateScore,
      teamId: 'team-1',
      delta: 1
    });
    assert.equal(failed.ok, false);
    assert.equal(storedState.scores['team-1'], 65);

    const recovered = await sendFromTab(202, {
      type: Core.MESSAGE_TYPES.updateScore,
      teamId: 'team-1',
      delta: 1
    });
    assert.equal(recovered.ok, true);
    assert.equal(storedState.scores['team-1'], 66);
  } finally {
    console.error = originalConsoleError;
  }
});

test('saveTeams is serialized with score updates and preserves or resets scores as requested', async () => {
  storedState = Core.createDefaultState();
  const teams = [
    { ...storedState.teams[0], name: 'Renamed team' },
    makeTeam('team-3', 'New team', 2)
  ];
  const [beforeSave, saved, afterSave] = await Promise.all([
    sendFromTab(101, {
      type: Core.MESSAGE_TYPES.updateScore,
      teamId: 'team-1',
      delta: 1
    }),
    sendFromTab(202, {
      type: Core.MESSAGE_TYPES.saveTeams,
      teams,
      resetScores: false
    }),
    sendFromTab(101, {
      type: Core.MESSAGE_TYPES.updateScore,
      teamId: 'team-1',
      delta: 1
    })
  ]);

  assert.ok(beforeSave.ok && saved.ok && afterSave.ok);
  assert.equal(beforeSave.state.scores['team-1'], 1);
  assert.equal(saved.state.scores['team-1'], 1);
  assert.deepEqual(saved.state.teams, teams);
  assert.deepEqual(afterSave.state.scores, { 'team-1': 2, 'team-3': 0 });
  assert.deepEqual(storedState, afterSave.state);

  const resetScores = await sendFromTab(202, {
    type: Core.MESSAGE_TYPES.saveTeams,
    teams,
    resetScores: true
  });
  assert.equal(resetScores.ok, true);
  assert.deepEqual(resetScores.state.scores, { 'team-1': 0, 'team-3': 0 });
  assert.deepEqual(storedState, resetScores.state);
});

test('resetState restores the default teams and clears saved scores', async () => {
  storedState = Core.normalizeState({
    teams: [makeTeam('custom-team', 'Custom team')],
    scores: { 'custom-team': 42 }
  });

  const response = await sendFromTab(101, { type: Core.MESSAGE_TYPES.resetState });
  const expected = Core.createDefaultState();

  assert.equal(response.ok, true);
  assert.deepEqual(response.state, expected);
  assert.deepEqual(storedState, expected);
});

test('startNewGame resets scores while preserving the saved teams', async () => {
  storedState = Core.normalizeState({
    teams: [makeTeam('custom-1', 'Custom one'), makeTeam('custom-2', 'Custom two', 1)],
    scores: { 'custom-1': 18, 'custom-2': -7 }
  });
  const savedTeams = structuredClone(storedState.teams);

  const response = await sendFromTab(202, { type: Core.MESSAGE_TYPES.startNewGame });
  const expected = { teams: savedTeams, scores: { 'custom-1': 0, 'custom-2': 0 } };

  assert.equal(response.ok, true);
  assert.deepEqual(response.state, expected);
  assert.deepEqual(storedState, expected);
});
