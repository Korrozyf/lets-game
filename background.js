(() => {
  'use strict';

  if (!globalThis.LetsGameCore && typeof importScripts === 'function') {
    importScripts('core.js');
  }

  const Core = globalThis.LetsGameCore;
  const api = globalThis.browser || globalThis.chrome;
  const { MESSAGE_TYPES } = Core;
  let mutationQueue = Promise.resolve();

  async function applyMutation(message) {
    const stored = await api.storage.local.get(Core.STORAGE_KEY);
    let state = Core.normalizeState(stored[Core.STORAGE_KEY]);

    if (message.type === MESSAGE_TYPES.updateScore) {
      if (typeof message.teamId !== 'string' || (message.delta !== 1 && message.delta !== -1)) {
        return state;
      }
      if (!state.teams.some((team) => team.id === message.teamId)) return state;

      const score = state.scores[message.teamId] ?? 0;
      if (!Number.isSafeInteger(score + message.delta)) return state;
      state.scores[message.teamId] = score + message.delta;
    } else if (message.type === MESSAGE_TYPES.saveTeams) {
      if (!Array.isArray(message.teams)) throw new TypeError('A team list is required.');
      const scores = Object.fromEntries(message.teams.map((team) => {
        const id = team && typeof team.id === 'string' ? team.id : '';
        return [id, message.resetScores === true ? 0 : (state.scores[id] ?? 0)];
      }));
      state = Core.normalizeState({ teams: message.teams, scores });
    } else if (message.type === MESSAGE_TYPES.resetState) {
      state = Core.createDefaultState();
    } else if (message.type === MESSAGE_TYPES.startNewGame) {
      state.scores = Object.fromEntries(state.teams.map((team) => [team.id, 0]));
    } else {
      return state;
    }

    await api.storage.local.set({ [Core.STORAGE_KEY]: state });
    return state;
  }

  function enqueueMutation(message) {
    // All state read-modify-write operations run in one extension context and in order.
    const operation = mutationQueue.then(() => applyMutation(message));
    mutationQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !Object.values(MESSAGE_TYPES).includes(message.type)) return false;

    enqueueMutation(message).then(
      (state) => sendResponse({ ok: true, state }),
      (error) => {
        console.error('Could not update game state', error);
        sendResponse({ ok: false, error: 'Could not update game state.' });
      }
    );
    return true;
  });
})();
