(() => {
  'use strict';

  const api = globalThis.browser || globalThis.chrome;
  const link = document.querySelector('#openLink');
  const target = api.runtime.getURL('game.html');
  link.href = target;

  api.tabs.create({ url: target }).then(() => {
    window.close();
  }).catch((error) => {
    console.warn('Could not open a game tab automatically', error);
    document.querySelector('body').insertAdjacentText('beforeend', ' Click the link to continue.');
  });
})();
