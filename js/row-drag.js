// Drag a row that scrolls sideways with the mouse (the project list, the skill tiles). A finger already
// scrolls it natively, so only a mouse or pen is handled here.

import { prefersReducedMotion } from './util.js';

const DRAG_START = 6;
const FLICK_MS = 160;

/**
 * The row follows the pointer once it has moved a few pixels, so a plain click on a card or tile still
 * works. On release it settles on the nearest item, leaning toward the direction of a flick.
 */
export function bindRowDrag(track) {
  let press = null;
  let justDragged = false;
  let settleTimer = 0;

  const items = () => [...track.children].filter((child) => !child.hidden);

  function snapPoints() {
    const trackLeft = track.getBoundingClientRect().left;
    const padding = parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;
    const max = track.scrollWidth - track.clientWidth;
    return items().map((item) =>
      Math.min(max, Math.max(0, item.getBoundingClientRect().left - trackLeft + track.scrollLeft - padding)),
    );
  }

  function settle(velocity) {
    const points = snapPoints();
    if (!points.length) return;
    const aim = track.scrollLeft + velocity * FLICK_MS;
    const left = points.reduce((best, point) => (Math.abs(point - aim) < Math.abs(best - aim) ? point : best));
    // snapping stays off until the glide ends: switching it on first would jump to the nearest item
    track.classList.add('is-settling-row');
    clearTimeout(settleTimer);
    const done = () => {
      clearTimeout(settleTimer);
      track.classList.remove('is-settling-row');
    };
    track.addEventListener('scrollend', done, { once: true });
    settleTimer = setTimeout(done, 1200); // browsers without scrollend
    track.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  // grab cursor only while there is something to drag
  const syncCursor = () => track.classList.toggle('row--draggable', track.scrollWidth > track.clientWidth + 2);
  new ResizeObserver(syncCursor).observe(track);
  syncCursor();

  track.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || event.pointerType === 'touch') return;
    if (track.scrollWidth <= track.clientWidth + 2) return;
    press = {
      id: event.pointerId,
      startX: event.clientX,
      startScroll: track.scrollLeft,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
      dragging: false,
    };
  });

  track.addEventListener('pointermove', (event) => {
    if (!press || event.pointerId !== press.id) return;
    if (event.buttons === 0) return endDrag(event);
    const delta = event.clientX - press.startX;
    if (!press.dragging) {
      if (Math.abs(delta) < DRAG_START) return;
      press.dragging = true;
      track.classList.add('is-dragging-row');
      try {
        track.setPointerCapture(event.pointerId);
      } catch {
        // the pointer is already gone; the buttons check above ends the press
      }
    }
    const dt = event.timeStamp - press.lastT;
    if (dt > 0) press.velocity = (press.lastX - event.clientX) / dt; // px per ms, positive = toward the end
    press.lastX = event.clientX;
    press.lastT = event.timeStamp;
    track.scrollLeft = press.startScroll - delta;
  });

  function endDrag(event) {
    if (!press || event.pointerId !== press.id) return;
    const { dragging, velocity } = press;
    press = null;
    if (!dragging) return;
    track.classList.remove('is-dragging-row');
    // the click that ends a drag must not open the card or tile under the pointer
    justDragged = true;
    setTimeout(() => (justDragged = false));
    settle(velocity);
  }

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('lostpointercapture', endDrag);

  track.addEventListener(
    'click',
    (event) => {
      if (!justDragged) return;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );
  // a dragged image or link would start the browser's own drag and take the pointer away
  track.addEventListener('dragstart', (event) => event.preventDefault());
}
