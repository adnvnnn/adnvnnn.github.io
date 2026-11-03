// Profile page: the skill tiles. The desktop tray holds six at design size, so a longer list scrolls sideways.

import { qs } from './util.js';
import { bindRowArrows } from './row-arrows.js';

export function initProfile() {
  const tray = qs('.page--profile .tray');
  if (!tray) return;

  const track = qs('.tiles', tray);
  const prevButton = qs('.tray__nav--prev', tray);
  const nextButton = qs('.tray__nav--next', tray);
  if (track && prevButton && nextButton) bindRowArrows(track, prevButton, nextButton);
}
