// Projects page: featured carousel, project switching, filters and the scrolling list.

import { qs, qsa, el, clamp, prefersReducedMotion, debounce } from './util.js';

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

  /* swipe / drag */
  let startX = 0;
  let dragging = false;
  root.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button') || slides().length < 2) return;
    dragging = true;
    startX = event.clientX;
    root.setPointerCapture(event.pointerId);
    root.classList.add('is-dragging');
  });
  root.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    root.style.setProperty('--drag', `${event.clientX - startX}px`);
  });
  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    const delta = event.clientX - startX;
    root.classList.remove('is-dragging');
    root.style.removeProperty('--drag');
    if (Math.abs(delta) > root.clientWidth * 0.12) goTo(index + (delta < 0 ? 1 : -1), { user: true });
  };
  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);

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

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
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
    live.href = project.liveUrl || '#';
    source.href = project.sourceUrl || '#';
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
      if (matchMedia('(max-width: 1099px)').matches) {
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
      const show = all || item.dataset.category.toLowerCase() === filter.toLowerCase();
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
  function syncArrows() {
    if (!prevButton || !nextButton) return;
    const max = track.scrollWidth - track.clientWidth - 2;
    prevButton.disabled = track.scrollLeft <= 2;
    nextButton.disabled = track.scrollLeft >= max;
  }

  function scrollList(direction) {
    const step = items.find((item) => !item.hidden);
    const distance = step ? (step.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || '0')) * direction : track.clientWidth * direction;
    track.scrollBy({ left: distance, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  prevButton?.addEventListener('click', () => scrollList(-1));
  nextButton?.addEventListener('click', () => scrollList(1));
  track.addEventListener('scroll', debounce(syncArrows, 40), { passive: true });
  new ResizeObserver(syncArrows).observe(track);
  syncArrows();
}
