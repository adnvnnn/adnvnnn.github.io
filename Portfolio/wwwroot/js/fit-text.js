// Home page: a skill name that is too long for its bar gets a smaller font instead of running into the percentage.

import { qsa } from './util.js';

const MIN_SIZE = 11;

/**
 * Back to the stylesheet's size, then shrink in small steps until the text fits its box. Measured after every
 * step (not worked out from one measurement), because the box itself can change width with the font size.
 */
function fit(label) {
  label.style.fontSize = '';
  if (!label.clientWidth) return; // on a page that is not shown
  let size = parseFloat(getComputedStyle(label).fontSize);
  while (label.scrollWidth > label.clientWidth && size > MIN_SIZE) {
    size = Math.max(MIN_SIZE, size - 0.5);
    label.style.fontSize = `${size}px`;
  }
}

export function initFitText() {
  const labels = qsa('.bar__name');
  if (!labels.length) return;

  const fitAll = () => labels.forEach(fit);
  // the bar changes size with the window (and from hidden to shown when the page opens)
  const observer = new ResizeObserver(fitAll);
  for (const label of labels) observer.observe(label.parentElement);
  document.fonts?.ready.then(fitAll);
  fitAll();
}
