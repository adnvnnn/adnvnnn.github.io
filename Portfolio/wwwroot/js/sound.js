// Interface sounds + the speaker toggle in the corner.
//
// There are no audio files: every sound is synthesised with the Web Audio API (a few
// milliseconds of oscillator / filtered noise), so it costs nothing to load. Sounds are
// deliberately quiet, start only after the first user gesture (browser autoplay policy) and
// the preference is remembered.

import { qs, safeStorage, prefersReducedMotion } from './util.js';

const storage = safeStorage();
const KEY = 'portfolio.sound';

let context = null;
let enabled = storage.getItem(KEY) !== 'off';
let lastHover = 0;

function audio() {
  if (!context) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    context = new Context();
  }
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

function envelope(ctx, { start = 0, attack = 0.004, hold = 0.02, release = 0.08, peak = 0.03 } = {}) {
  const gain = ctx.createGain();
  const t = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.setValueAtTime(peak, t + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  gain.connect(ctx.destination);
  return { gain, t, end: t + attack + hold + release + 0.02 };
}

function tone({ from, to = from, type = 'sine', peak = 0.03, hold = 0.02, release = 0.09, start = 0 }) {
  const ctx = audio();
  if (!ctx || !enabled || document.hidden) return;
  const { gain, t, end } = envelope(ctx, { peak, hold, release, start });
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, end - 0.02);
  osc.connect(gain);
  osc.start(t);
  osc.stop(end);
}

const sounds = {
  hover: () => tone({ from: 1500, to: 1100, peak: 0.008, hold: 0.004, release: 0.04 }),
  press: () => tone({ from: 520, to: 880, type: 'triangle', peak: 0.03, hold: 0.012, release: 0.08 }),
  page() {
    tone({ from: 392, to: 523, type: 'sine', peak: 0.026, hold: 0.03, release: 0.12 });
    tone({ from: 587, to: 784, type: 'sine', peak: 0.018, hold: 0.03, release: 0.14, start: 0.06 });
  },
  on: () => tone({ from: 660, to: 990, type: 'triangle', peak: 0.03, release: 0.12 }),
  copy: () => tone({ from: 880, to: 1320, type: 'sine', peak: 0.026, release: 0.1 }),
};

export const playSound = (name) => sounds[name]?.();

export function initSound() {
  const button = qs('.sound');
  if (!button) return;

  const reflect = () => {
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Turn sound effects off' : 'Turn sound effects on');
  };
  reflect();

  button.addEventListener('click', () => {
    enabled = !enabled;
    storage.setItem(KEY, enabled ? 'on' : 'off');
    reflect();
    if (enabled) sounds.on();
  });

  // Browsers keep audio locked until the first gesture.
  addEventListener('pointerdown', audio, { once: true, passive: true });
  addEventListener('keydown', audio, { once: true, passive: true });

  const INTERACTIVE = '.nav__link, .btn, .chip, .pcard, .social, .copy, .carousel__nav, .plist__nav, .carousel__dot';

  document.addEventListener(
    'pointerover',
    (event) => {
      if (event.pointerType === 'touch' || prefersReducedMotion()) return;
      const target = event.target.closest?.(INTERACTIVE);
      if (!target || target.contains(event.relatedTarget)) return;
      const now = performance.now();
      if (now - lastHover < 70) return;
      lastHover = now;
      sounds.hover();
    },
    { passive: true },
  );

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target.closest?.(INTERACTIVE);
      if (!target) return;
      if (target.matches('.nav__link')) sounds.page();
      else if (target.matches('.copy')) sounds.copy();
      else sounds.press();
    },
    { passive: true },
  );
}
