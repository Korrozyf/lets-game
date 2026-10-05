(() => {
  'use strict';

  const Core = globalThis.LetsGameCore;
  const api = globalThis.browser || globalThis.chrome;
  const elements = {
    teamsList: document.querySelector('#teamsList'),
    count: document.querySelector('#teamCount'),
    add: document.querySelector('#addTeamButton'),
    reset: document.querySelector('#resetButton'),
    save: document.querySelector('#saveButton'),
    start: document.querySelector('#startButton'),
    status: document.querySelector('#saveStatus')
  };
  let teams = [];
  let busy = false;

  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  function setStatus(message, type = 'success') {
    elements.status.textContent = message;
    elements.status.dataset.type = type;
  }

  async function readState() {
    const stored = await api.storage.local.get(Core.STORAGE_KEY);
    return Core.normalizeState(stored[Core.STORAGE_KEY]);
  }

  async function saveState(resetScores = false) {
    const current = await readState();
    const scores = Object.fromEntries(teams.map((team) => [
      team.id,
      resetScores ? 0 : (current.scores[team.id] ?? 0)
    ]));
    const state = Core.normalizeState({ teams, scores });
    await api.storage.local.set({ [Core.STORAGE_KEY]: state });
    teams = state.teams;
    return state;
  }

  function makeTeamCard(team, index) {
    const card = makeElement('article', 'team-editor');
    card.style.setProperty('--team-color', team.color);

    const head = makeElement('div', 'team-editor-head');
    const title = makeElement('div', 'team-editor-title');
    const preview = makeElement('span', 'editor-logo-preview', team.emoji);
    preview.setAttribute('aria-hidden', 'true');
    const heading = makeElement('h3', '', `Équipe ${index + 1}`);
    heading.style.margin = '0';
    title.append(preview, heading);

    const remove = makeElement('button', 'remove-team', 'Supprimer');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Supprimer l’équipe ${team.name || index + 1}`);
    remove.addEventListener('click', () => {
      teams = teams.filter((item) => item.id !== team.id);
      renderTeams();
      setStatus('Suppression en attente d’enregistrement.', 'pending');
    });
    head.append(title, remove);

    const fields = makeElement('div', 'editor-fields');
    const nameField = makeElement('div', 'team-name-field');
    const nameLabel = makeElement('label', 'field-label', 'Nom de l’équipe');
    const nameControl = makeElement('div', 'team-name-control');
    const input = makeElement('input', 'team-name-input');
    const inputId = `team-name-${team.id}`;
    nameLabel.htmlFor = inputId;
    input.id = inputId;
    input.type = 'text';
    input.maxLength = 32;
    input.value = team.name;
    input.placeholder = 'Ex. Les Champions';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-controls', `team-name-options-${team.id}`);
    input.setAttribute('aria-expanded', 'false');

    const toggleSuggestions = makeElement('button', 'suggestions-toggle', '▾');
    toggleSuggestions.type = 'button';
    toggleSuggestions.setAttribute('aria-label', 'Afficher les noms d’équipe proposés');
    toggleSuggestions.setAttribute('aria-controls', `team-name-options-${team.id}`);
    toggleSuggestions.setAttribute('aria-expanded', 'false');
    toggleSuggestions.setAttribute('aria-haspopup', 'listbox');
    toggleSuggestions.setAttribute('title', 'Afficher les noms proposés');

    const suggestionMenu = makeElement('div', 'team-name-suggestions');
    suggestionMenu.id = `team-name-options-${team.id}`;
    suggestionMenu.setAttribute('role', 'listbox');
    suggestionMenu.setAttribute('aria-label', 'Noms d’équipe proposés');
    suggestionMenu.hidden = true;

    function renderNameOptions() {
      const options = Core.getAlternativeNames(input.value).map((name) => {
        const option = makeElement('button', 'name-suggestion', name);
        option.type = 'button';
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.addEventListener('click', () => {
          team.name = name;
          input.value = name;
          remove.setAttribute('aria-label', `Supprimer l’équipe ${team.name || index + 1}`);
          setSuggestionsOpen(false);
          input.focus();
          setStatus('Modifications en attente d’enregistrement.', 'pending');
        });
        return option;
      });
      suggestionMenu.replaceChildren(...options);
    }

    function setSuggestionsOpen(open) {
      if (open) renderNameOptions();
      suggestionMenu.hidden = !open;
      toggleSuggestions.setAttribute('aria-expanded', String(open));
      input.setAttribute('aria-expanded', String(open));
    }

    input.addEventListener('input', () => {
      team.name = input.value;
      remove.setAttribute('aria-label', `Supprimer l’équipe ${team.name || index + 1}`);
      if (!suggestionMenu.hidden) renderNameOptions();
      setStatus('Modifications en attente d’enregistrement.', 'pending');
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (suggestionMenu.hidden) setSuggestionsOpen(true);
        suggestionMenu.querySelector('.name-suggestion')?.focus();
      } else if (event.key === 'Escape' && !suggestionMenu.hidden) {
        setSuggestionsOpen(false);
      }
    });
    toggleSuggestions.addEventListener('click', () => {
      setSuggestionsOpen(suggestionMenu.hidden);
    });
    nameField.addEventListener('focusout', (event) => {
      if (!event.relatedTarget || !nameField.contains(event.relatedTarget)) {
        window.setTimeout(() => {
          if (!nameField.contains(document.activeElement)) setSuggestionsOpen(false);
        }, 0);
      }
    });

    nameControl.append(input, toggleSuggestions, suggestionMenu);
    nameField.append(nameLabel, nameControl);

    const logoField = makeElement('div');
    const logoLabel = makeElement('span', 'field-label', 'Logo sourire');
    const logoChoices = makeElement('div', 'logo-options');
    logoChoices.setAttribute('role', 'group');
    logoChoices.setAttribute('aria-label', `Choisir le logo de l’équipe ${index + 1}`);
    for (const logo of Core.LOGOS) {
      const choice = makeElement('button', 'logo-choice', logo.emoji);
      choice.type = 'button';
      choice.title = logo.label;
      choice.setAttribute('aria-label', logo.label);
      choice.setAttribute('aria-pressed', String(team.emoji === logo.emoji));
      choice.addEventListener('click', () => {
        team.emoji = logo.emoji;
        renderTeams();
        setStatus('Modifications en attente d’enregistrement.', 'pending');
      });
      logoChoices.append(choice);
    }
    logoField.append(logoLabel, logoChoices);

    const colorField = makeElement('div');
    const colorLabel = makeElement('span', 'field-label', 'Couleur de l’équipe');
    const colorChoices = makeElement('div', 'color-options');
    colorChoices.setAttribute('role', 'group');
    colorChoices.setAttribute('aria-label', `Choisir la couleur de l’équipe ${index + 1}`);
    for (const color of Core.COLORS) {
      const choice = makeElement('button', 'color-choice');
      choice.type = 'button';
      choice.title = color.label;
      choice.setAttribute('aria-label', color.label);
      choice.setAttribute('aria-pressed', String(team.color === color.hex));
      const swatch = makeElement('span', 'color-swatch');
      swatch.style.setProperty('--swatch', color.hex);
      swatch.setAttribute('aria-hidden', 'true');
      const colorName = makeElement('span', '', color.label);
      choice.append(swatch, colorName);
      choice.addEventListener('click', () => {
        team.color = color.hex;
        renderTeams();
        setStatus('Modifications en attente d’enregistrement.', 'pending');
      });
      colorChoices.append(choice);
    }
    colorField.append(colorLabel, colorChoices);

    fields.append(nameField, logoField, colorField);
    card.append(head, fields);
    return card;
  }

  function renderTeams() {
    elements.teamsList.replaceChildren(...teams.map(makeTeamCard));
    elements.count.textContent = `${teams.length} / ${Core.MAX_TEAMS} équipe${teams.length === 1 ? '' : 's'}`;
    elements.start.disabled = teams.length === 0 || busy;
    elements.reset.disabled = busy;
    elements.save.disabled = busy;
    elements.add.disabled = busy || teams.length >= Core.MAX_TEAMS;
  }

  function suggestedName() {
    const names = new Set(teams.map((team) => team.name.trim().toLocaleLowerCase('fr')));
    return Core.NAME_SUGGESTIONS.find((name) => !names.has(name.toLocaleLowerCase('fr')))
      || Core.NAME_SUGGESTIONS[teams.length % Core.NAME_SUGGESTIONS.length];
  }

  elements.add.addEventListener('click', () => {
    if (busy || teams.length >= Core.MAX_TEAMS) return;
    const index = teams.length;
    teams.push({
      id: Core.createId(),
      name: suggestedName(),
      emoji: Core.LOGOS[index % Core.LOGOS.length].emoji,
      color: Core.COLORS[index % Core.COLORS.length].hex
    });
    renderTeams();
    setStatus('Nouvelle équipe ajoutée. Enregistrez pour conserver les changements.', 'pending');
    const inputs = elements.teamsList.querySelectorAll('.team-name-input');
    inputs[inputs.length - 1]?.focus();
    inputs[inputs.length - 1]?.select();
  });

  elements.reset.addEventListener('click', async () => {
    if (busy) return;
    const confirmed = window.confirm(
      'Effacer les équipes personnalisées et rétablir les 2 équipes de base ? Les scores seront également remis à zéro.'
    );
    if (!confirmed) return;

    busy = true;
    renderTeams();
    try {
      const state = Core.createDefaultState();
      await api.storage.local.set({ [Core.STORAGE_KEY]: state });
      teams = state.teams;
      renderTeams();
      setStatus('Configuration de base restaurée : 2 équipes, scores remis à zéro.');
    } catch (error) {
      console.error('Could not reset team settings', error);
      setStatus('Réinitialisation impossible. Réessayez.', 'error');
    } finally {
      busy = false;
      renderTeams();
    }
  });

  elements.save.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    renderTeams();
    try {
      await saveState(false);
      setStatus('Paramètres enregistrés !');
    } catch (error) {
      console.error('Could not save team settings', error);
      setStatus('Enregistrement impossible. Réessayez.', 'error');
    } finally {
      busy = false;
      renderTeams();
    }
  });

  elements.start.addEventListener('click', async () => {
    if (busy || teams.length === 0) return;
    busy = true;
    renderTeams();
    try {
      await saveState(true);
      window.location.assign('game.html');
    } catch (error) {
      console.error('Could not start the game', error);
      setStatus('Impossible de démarrer. Vérifiez les paramètres et réessayez.', 'error');
      busy = false;
      renderTeams();
    }
  });

  (async () => {
    try {
      const state = await readState();
      teams = state.teams;
      renderTeams();
    } catch (error) {
      console.error('Could not load team settings', error);
      setStatus('Impossible de lire les paramètres de cette extension.', 'error');
    }
  })();
})();
