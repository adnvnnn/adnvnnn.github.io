// Prev/next buttons for a row that scrolls sideways (the project list, the skill tiles).

import { prefersReducedMotion, debounce } from './util.js';

/**
 * One item per click; a button is disabled once the row cannot scroll any further that way.
 * Returns sync(), to call when the row's content changes (a filter hiding items, say).
 */
export function bindRowArrows(track, prevButton, nextButton) {
  function sync() {
    const max = track.scrollWidth - track.clientWidth - 2;
    prevButton.disabled = track.scrollLeft <= 2;
    nextButton.disabled = track.scrollLeft >= max;
  }

  function scroll(direction) {
    const item = [...track.children].find((child) => !child.hidden);
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const distance = (item ? item.getBoundingClientRect().width + gap : track.clientWidth) * direction;
    track.scrollBy({ left: distance, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  prevButton.addEventListener('click', () => scroll(-1));
  nextButton.addEventListener('click', () => scroll(1));
  track.addEventListener('scroll', debounce(sync, 40), { passive: true });
  new ResizeObserver(sync).observe(track);
  sync();

  return sync;
}
