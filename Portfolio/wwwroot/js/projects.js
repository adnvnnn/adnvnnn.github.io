// Projects page: featured carousel, project switching, filters and the scrolling list.

import { qs, qsa, el, clamp, prefersReducedMotion, isStage } from './util.js';
import { bindRowArrows } from './row-arrows.js';

/** A link with a destination, or a disabled one (no href, aria-disabled) when the project has none. */
function setLink(link, url) {
  const ok = Boolean(url) && url !== '#';
  if (ok) link.setAttribute('href', url);
  else link.removeAttribute('href');
  if (ok) link.removeAttribute('aria-disabled');
  else link.setAttribute('aria-disabled', 'true');
  link.tabIndex = ok ? 0 : -1;
}

/* ==========================================================================================
   Carousel
   ========================================================================================== */
export function createCarousel(root) {
  const track = qs('.carousel__track', root);
  const dots = qs('.carousel__dots', root);
  const prev = qs('.carousel__nav--prev', root);
  const next = qs('.carousel__nav--next', root);
  let index = 0;
  let timer = 0;
  let visible = false;
  let hovered = false;

  const slides = () => qsa('.carousel__slide', track);

  function paint() {
    const count = slides().length;
    index = clamp(index, 0, Math.max(0, count - 1));
    root.dataset.count = String(count);
    root.style.setProperty('--slide', String(index));
    qsa('.carousel__slide', track).forEach((slide, i) => {
      slide.setAttribute('aria-hidden', i === index ? 'false' : 'true');
      slide.inert = i !== index;
    });
    qsa('.carousel__dot', dots).forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
      dot.setAttribute('aria-current', i === index ? 'true' : 'false');
    });
  }

  function rebuildDots() {
    dots.replaceChildren(
      ...slides().map((_, i) => {
        const dot = el('button', { class: 'carousel__dot', type: 'button', 'aria-label': `Show image ${i + 1}` });
        dot.addEventListener('click', () => goTo(i, { user: true }));
        return dot;
      }),
    );
  }

  function goTo(i, { user = false } = {}) {
    const count = slides().length;
    if (count < 2) return;
    index = (i + count) % count;
    paint();
    if (user) restart();
  }

  /* autoplay: only while visible, not hovered, not focused and motion is allowed */
  function stop() {
    clearInterval(timer);
    timer = 0;
  }

  function restart() {
    stop();
    if (!visible || hovered || prefersReducedMotion() || slides().length < 2) return;
    timer = setInterval(() => goTo(index + 1), 6000);
  }

  /* swipe / drag: the strip only follows the pointer once it has moved a few pixels sideways, so a
     click, or a vertical scroll that starts on the image, never nudges it */
  const DRAG_START = 6;
  let press = null;
  root.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || event.target.closest('button') || slides().length < 2) return;
    press = { id: event.pointerId, startX: event.clientX, dragging: false };
    try {
      root.setPointerCapture(event.pointerId);
    } catch {
      // the pointer is already gone; the guard in pointermove ends the press
    }
  });
  root.addEventListener('pointermove', (event) => {
    if (!press || event.pointerId !== press.id) return;
    if (event.buttons === 0) return endDrag(event, { cancelled: true });
    const delta = event.clientX - press.startX;
    if (!press.dragging) {
      if (Math.abs(delta) < DRAG_START) return;
      press.dragging = true;
      root.classList.add('is-dragging');
    }
    root.style.setProperty('--drag', `${delta}px`);
  });
  function endDrag(event, { cancelled = false } = {}) {
    if (!press || event.pointerId !== press.id) return;
    const { startX, dragging } = press;
    press = null;
    if (!dragging) return;
    root.classList.remove('is-dragging');
    root.style.removeProperty('--drag');
    // pointercancel has no position (Chrome reports 0, 0), so it can only mean "snap back"
    const delta = event.clientX - startX;
    if (!cancelled && Math.abs(delta) > root.clientWidth * 0.12) goTo(index + (delta < 0 ? 1 : -1), { user: true });
  }
  root.addEventListener('pointerup', (event) => endDrag(event));
  root.addEventListener('pointercancel', (event) => endDrag(event, { cancelled: true }));
  root.addEventListener('lostpointercapture', (event) => endDrag(event, { cancelled: true }));

  prev.addEventListener('click', () => goTo(index - 1, { user: true }));
  next.addEventListener('click', () => goTo(index + 1, { user: true }));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') goTo(index - 1, { user: true });
    if (event.key === 'ArrowRight') goTo(index + 1, { user: true });
  });
  root.addEventListener('pointerenter', () => ((hovered = true), stop()));
  root.addEventListener('pointerleave', () => ((hovered = false), restart()));
  root.addEventListener('focusin', stop);
  root.addEventListener('focusout', restart);

  new IntersectionObserver((entries) => {
    visible = entries.at(-1).isIntersecting; // several can queue up: the last one is current
    // Slides after the first are lazy in the markup, and one parked beside the clipped strip is never
    // "near the viewport" for the browser, so fetch them as soon as the carousel is on screen.
    if (visible) for (const image of qsa('img[loading="lazy"]', track)) image.loading = 'eager';
    restart();
  }).observe(root);

  rebuildDots();
  paint();

  return {
    /** Replace all slides. */
    setImages(urls, alt) {
      track.replaceChildren(
        ...urls.map((src, i) =>
          el(
            'li',
            { class: 'carousel__slide', 'aria-roledescription': 'slide', 'aria-label': `${i + 1} of ${urls.length}` },
            el('img', { src, alt: `${alt} screenshot ${i + 1}`, width: 1586, height: 889, decoding: 'async', draggable: 'false' }),
          ),
        ),
      );
      index = 0;
      rebuildDots();
      paint();
      restart();
    },
  };
}

/* ==========================================================================================
   Page controller
   ========================================================================================== */
export function initProjects() {
  const page = qs('.page--projects');
  const data = qs('#projects-data');
  if (!page || !data) return;

  const projects = JSON.parse(data.textContent);
  const byId = new Map(projects.map((project) => [project.id, project]));

  const featured = qs('.featured', page);
  const list = qs('.plist', page);
  const track = qs('.plist__track', list);
  const items = qsa('.plist__item', track);
  const cards = qsa('.pcard', track);
  const chips = qsa('.chip', page);
  const prevButton = qs('.plist__nav--prev', list);
  const nextButton = qs('.plist__nav--next', list);
  const carousel = featured ? createCarousel(qs('[data-carousel]', featured)) : null;
  let swapTimer = 0;

  // The blurred lower edge of every card is a second copy of its cover; reuse the <img>'s own URL.
  for (const card of cards) {
    const image = qs('.pcard__img', card);
    if (image?.src) card.style.setProperty('--cover', `url("${image.src}")`);
  }

  /* ----- featured project -------------------------------------------------------------- */
  function select(id) {
    const project = byId.get(id);
    if (!project || !featured) return;

    featured.dataset.featured = id;
    qs('.featured__title', featured).textContent = project.title;
    qs('.featured__text', featured).textContent = project.summary;
    qs('.tags', featured).replaceChildren(...project.tags.map((tag) => el('li', { class: 'tag' }, tag)));

    const live = qs('[data-role="live"]', featured);
    const source = qs('[data-role="source"]', featured);
    setLink(live, project.liveUrl);
    setLink(source, project.sourceUrl);
    carousel?.setImages(project.images, project.title);

    for (const card of cards) {
      const active = card.dataset.project === id;
      card.classList.toggle('is-selected', active);
      card.setAttribute('aria-pressed', String(active));
    }

    featured.classList.remove('is-swapping');
    void featured.offsetWidth;
    if (!prefersReducedMotion()) {
      featured.classList.add('is-swapping');
      clearTimeout(swapTimer);
      swapTimer = setTimeout(() => featured.classList.remove('is-swapping'), 900);
    }
  }

  for (const card of cards) {
    card.addEventListener('click', () => {
      select(card.dataset.project);
      // on narrow screens the featured card sits above the list: bring it into view
      if (!isStage()) {
        featured.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
      }
    });
  }

  document.addEventListener('portfolio:select-project', (event) => select(event.detail.id));

  /* ----- filters --------------------------------------------------------------------------- */
  function applyFilter(filter) {
    const all = filter.toLowerCase() === 'all';
    for (const chip of chips) {
      const active = chip.dataset.filter === filter;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', String(active));
    }
    for (const item of items) {
      const show = all || item.dataset.category.toLowerCase().split('|').includes(filter.toLowerCase());
      const wasHidden = item.hidden;
      item.hidden = !show;
      if (show && wasHidden && !prefersReducedMotion()) {
        item.classList.remove('is-entering');
        void item.offsetWidth;
        item.classList.add('is-entering');
        item.addEventListener('animationend', () => item.classList.remove('is-entering'), { once: true });
      }
    }
    track.scrollTo({ left: 0 });
    syncArrows();
  }

  for (const chip of chips) chip.addEventListener('click', () => applyFilter(chip.dataset.filter));

  /* ----- list arrows ------------------------------------------------------------------------- */
  const syncArrows = prevButton && nextButton ? bindRowArrows(track, prevButton, nextButton) : () => {};
}
