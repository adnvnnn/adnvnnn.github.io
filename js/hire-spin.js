// Hire Me button: its gradient turns forever (hire-spin in components.css). Hovering gives the
// turn a short burst of speed that settles back to normal. Only the playback rate changes, so the
// angle is never reset: on leave the turn simply carries on from wherever it is.

import { clamp, isCoarsePointer, prefersReducedMotion, qsa } from './util.js';

const BURST_RATE = 7;     // playback rate right after the pointer enters
const SETTLE_MS = 1000;   // time to ease back down to 1

const easeOut = (t) => 1 - (1 - t) ** 3;

function bindSpin(button) {
  const spin = () => button.getAnimations().find((a) => a.animationName === 'hire-spin');
  let frame = 0;

  const burst = () => {
    const animation = spin();
    if (!animation) return;

    cancelAnimationFrame(frame);
    const start = performance.now();
    const tick = (now) => {
      const t = clamp((now - start) / SETTLE_MS, 0, 1);
      animation.updatePlaybackRate(BURST_RATE + (1 - BURST_RATE) * easeOut(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  };

  button.addEventListener('pointerenter', burst);
}

export function initHireSpin() {
  if (prefersReducedMotion() || isCoarsePointer()) return;
  qsa('.btn--xl.btn--primary').forEach(bindSpin);
}
