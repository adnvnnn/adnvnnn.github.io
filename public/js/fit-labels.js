// Skill names (the Home bars and the Profile tiles): when a name does not fit its box, the font gets smaller.

import { qsa } from './util.js';

/**
 * Selector → what to try, in order: stay on `lines` lines and shrink down to `min` px; if that is not enough,
 * move on to the next try. A bar keeps its name on one line. A tile tries one line first (like a bar) and only
 * a name too long even at 12px, such as "Self-Documenting Code", goes to two.
 */
const LABELS = [
  ['.bar__name', [{ lines: 1, min: 10 }]],
  ['.tile__name', [{ lines: 1, min: 12 }, { lines: 2, min: 10 }]],
];

function fit(label, tries) {
  label.style.fontSize = '';
  const range = document.createRange();
  range.selectNodeContents(label);

  const room = () => {
    const style = getComputedStyle(label);
    return label.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  };
  const tooBig = (lines) =>
    // a text node gives one client rect per line, which is more reliable than its height (taller than line-height)
    range.getBoundingClientRect().width > room() + 0.5 || range.getClientRects().length > lines;

  if (room() <= 0) return; // on a page that is not shown
  const base = parseFloat(getComputedStyle(label).fontSize);

  for (const { lines, min } of tries) {
    // one line is forced with nowrap while it is tried; a wrapped name would otherwise count as "too big"
    label.style.whiteSpace = lines === 1 ? 'nowrap' : '';
    let size = base;
    label.style.fontSize = '';
    // measured after every step (not worked out from one measurement): a flex box can change width with the font
    while (tooBig(lines) && size > min) {
      size = Math.max(min, size - 0.5);
      label.style.fontSize = `${size}px`;
    }
    if (!tooBig(lines)) return;
  }
}

export function initFitLabels() {
  const items = LABELS.flatMap(([selector, tries]) => qsa(selector).map((label) => ({ label, tries, width: -1 })));
  if (!items.length) return;

  // Each label is only measured again when its box changed width (or the font arrived). A label on a page that
  // is not shown has no width yet and waits for its box to open. The observer already batches a frame's changes
  // and runs before paint, so fitting right inside it never shows an unfitted frame.
  const byBox = new Map(items.map((item) => [item.label.parentElement, item]));

  function fitChanged(list) {
    for (const item of list) {
      const width = item.label.parentElement.clientWidth;
      if (width === item.width) continue;
      fit(item.label, item.tries);
      item.width = width;
    }
  }

  // the box changes size with the window (and from hidden to shown when its page opens)
  const observer = new ResizeObserver((entries) => fitChanged(entries.map(({ target }) => byBox.get(target))));
  for (const { label } of items) observer.observe(label.parentElement);
  document.fonts?.ready.then(() => {
    for (const item of items) item.width = -1;
    fitChanged(items);
  });
}
