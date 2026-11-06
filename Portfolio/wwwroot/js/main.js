// Entry point. Everything is progressive enhancement: the page is complete HTML + CSS
// without any of this, and each module only touches markup that the server rendered.

import { initRouter } from './router.js';
import { initProfile } from './profile.js';
import { initProjects } from './projects.js';
import { initContact } from './contact.js';
import { initSound, playSound } from './sound.js';
import { initGlass } from './glass.js';
import { initHireSpin } from './hire-spin.js';
import { bindRowDrag } from './row-drag.js';
import { prefersReducedMotion, qs, qsa, toast } from './util.js';

function boot() {
  document.addEventListener('click', (event) => {
    const hint = event.target.closest?.('[data-toast]');
    if (hint) toast(hint.dataset.toast);
  });

  initGlass();
  initHireSpin();
  initSound();
  initProfile();
  initProjects();
  initContact();
  qsa('.page--profile .tiles, .plist__track').forEach(bindRowDrag);
  initRouter({ onNavigate: () => playSound('page') });

  // Entrance of the first page (the server renders it fully visible, so this only adds motion).
  const first = qs('.page:not([hidden])');
  if (first && !prefersReducedMotion()) {
    first.classList.add('is-entering');
    setTimeout(() => first.classList.remove('is-entering'), 1800);
  }

  document.documentElement.classList.add('is-ready');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
