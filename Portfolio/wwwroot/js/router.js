// Client-side navigation between the four pages.
//
// The server already renders every page and marks one as visible, so deep links, reloads
// and crawlers work without JavaScript. This module only swaps visibility with a transition,
// keeps the URL in sync (History API) and moves the sliding pill in the navigation.

import { qs, qsa, prefersReducedMotion, wait, debounce } from './util.js';

export function initRouter({ onNavigate } = {}) {
  const app = qs('.app');
  const nav = qs('.nav');
  const pill = qs('.nav__pill');
  const links = qsa('.nav__link');
  const pages = new Map(qsa('.page').map((section) => [section.dataset.page, section]));
  if (!app || !nav || pages.size === 0) return { go() {} };

  const titles = new Map(links.map((link) => [link.dataset.page, link.dataset.title]));
  const hrefs = new Map(links.map((link) => [link.dataset.page, link.getAttribute('href')]));
  let current = app.dataset.page;
  let leaving = null;

  /* ----- sliding pill ----------------------------------------------------------------- */
  function placePill({ animate = true } = {}) {
    const active = links.find((link) => link.dataset.page === current);
    if (!active || !pill) return;
    const box = active.getBoundingClientRect();
    const origin = nav.getBoundingClientRect();
    if (!animate) pill.style.transition = 'none';
    pill.style.setProperty('--pill-x', `${box.left - origin.left}px`);
    pill.style.setProperty('--pill-y', `${box.top - origin.top}px`);
    pill.style.setProperty('--pill-w', `${box.width}px`);
    pill.style.setProperty('--pill-h', `${box.height}px`);
    pill.style.setProperty('--pill-o', '1');
    if (!animate) {
      void pill.offsetWidth; // flush so the next change animates
      pill.style.transition = '';
    }
  }

  function setActiveLink(page) {
    for (const link of links) {
      const active = link.dataset.page === page;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    app.dataset.page = page;
  }

  /* ----- page swap ---------------------------------------------------------------------- */
  async function swap(fromPage, toPage) {
    const from = pages.get(fromPage);
    const to = pages.get(toPage);
    if (!from || !to || from === to) return;

    leaving = from;
    from.classList.remove('is-entering');

    if (!prefersReducedMotion()) {
      from.classList.add('is-leaving');
      await wait(200);
    }
    if (leaving !== from) return; // a newer navigation took over

    from.classList.remove('is-leaving');
    from.hidden = true;
    from.inert = true;

    to.hidden = false;
    to.inert = false;
    document.dispatchEvent(new CustomEvent('portfolio:page-shown'));
    if (!prefersReducedMotion()) {
      to.classList.add('is-entering');
      to.addEventListener('animationend', function done(event) {
        if (event.target !== to) return;
        to.classList.remove('is-entering');
        to.removeEventListener('animationend', done);
      });
      // the grow animation outlives page-in; clean up after the longest one
      setTimeout(() => to.classList.remove('is-entering'), 1800);
    }
  }

  async function go(page, { push = true, project } = {}) {
    if (!pages.has(page)) return;
    const previous = current;

    if (page !== previous) {
      current = page;
      setActiveLink(page);
      placePill();
      document.title = titles.get(page) || document.title;
      if (push) history.pushState({ page }, '', hrefs.get(page));
      onNavigate?.(page, previous);
      await swap(previous, page);
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
      qs('h1', pages.get(page))?.setAttribute('tabindex', '-1');
      qs('h1', pages.get(page))?.focus({ preventScroll: true });
    }

    if (project) document.dispatchEvent(new CustomEvent('portfolio:select-project', { detail: { id: project } }));
  }

  /* ----- wiring --------------------------------------------------------------------------- */
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[data-page]');
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const page = link.dataset.page;
    if (!pages.has(page)) return;
    event.preventDefault();
    go(page, { project: link.dataset.project });
  });

  window.addEventListener('popstate', () => {
    const segment = location.pathname.replace(/\/+$/, '').split('/').pop().toLowerCase();
    const page = segment === '' || !pages.has(segment) ? 'home' : segment;
    go(page, { push: false });
  });

  const refit = debounce(() => placePill({ animate: false }), 60);
  new ResizeObserver(refit).observe(nav);
  addEventListener('resize', refit);
  document.fonts?.ready.then(() => placePill({ animate: false }));
  placePill({ animate: false });

  history.replaceState({ page: current }, '', location.href);

  return { go, get current() { return current; } };
}
