// Small DOM helpers shared by every module.

export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True when the primary input is a finger: no hover, no refraction, lighter effects. */
export const isCoarsePointer = () => matchMedia('(hover: none), (pointer: coarse)').matches;

/** Create an element: el('a', { class: 'x', href: '/' }, 'text', childNode). */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (name === 'class') node.className = value;
    else node.setAttribute(name, value === true ? '' : value);
  }
  node.append(...children);
  return node;
}

export function debounce(fn, ms = 120) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let toastTimer = 0;

/** Brief status message at the bottom of the screen. */
export function toast(message, { error = false, ms = 2600 } = {}) {
  const node = qs('.toast');
  if (!node) return;
  node.textContent = message;
  node.classList.toggle('is-error', error);
  node.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('is-visible'), ms);
}

export function safeStorage() {
  try {
    const probe = '__portfolio__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    const memory = new Map();
    return {
      getItem: (key) => (memory.has(key) ? memory.get(key) : null),
      setItem: (key, value) => void memory.set(key, String(value)),
      removeItem: (key) => void memory.delete(key),
    };
  }
}
