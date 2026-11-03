// Glass, part two: what the CSS alone cannot do.
//
// Figma's "Glass" effect samples the room photo *itself* — each card, tray, tile and button
// frosts and bends the original background, not the already-blurred stack of panels beneath it.
// That is why the skill tiles show the chair behind them almost sharp while the big main panel
// is a heavy blur. A CSS backdrop-filter cannot do that (it always sees the layers below), so on
// the desktop stage every child surface paints its own copy of the photo:
//
//   1. the photo is positioned inside the surface so it lines up with the real background;
//   2. a filter frosts it (blur) and bends it near the rim (displacement map, one pass per colour
//      channel so the rim also disperses into a faint rainbow);
//   3. glass.css lays the tint and the specular rim on top.
//
// The sidebar and the main panel stay ordinary backdrop-filter surfaces — they sit directly on
// the photo, so that is exactly what Figma does there too. Touch devices and narrow screens keep
// the plain backdrop-filter version for everything (it scrolls and costs less).

import { qs, qsa, debounce, STAGE_QUERY } from './util.js';

const SVG = 'http://www.w3.org/2000/svg';
const PHOTO = { width: 1926, height: 872 };

/** Figma Glass settings of each kind of surface (refraction / depth / dispersion, 0-100). */
const KINDS = {
  tile: { refraction: 100, depth: 45.69, dispersion: 100 },
  tray: { refraction: 100, depth: 100, dispersion: 100 },
  card: { refraction: 100, depth: 100, dispersion: 100 },
  button: { refraction: 100, depth: 100, dispersion: 100 },
  pill: { refraction: 70, depth: 100, dispersion: 70 },
};

const MAX_BEVEL = 34; // px: stops large cards from warping far inwards

const desktopStage = matchMedia(`${STAGE_QUERY} and (hover: hover) and (pointer: fine)`);

const supportsLens = () => {
  const gecko = /\bFirefox\//.test(navigator.userAgent);
  const chromium = navigator.userAgentData?.brands?.some(({ brand }) => /Chromium/i.test(brand)) ?? /\bChrome\//.test(navigator.userAgent);
  return (gecko || chromium) && CSS.supports('filter', 'url(#x)');
};

/* ==========================================================================================
   Displacement map
   ========================================================================================== */

/** Signed displacement field of a rounded rect (R = dx, G = dy) on a canvas of size total × total. */
function paintMap({ width, height, radius, pad, bevel, strength }) {
  const totalW = width + pad * 2;
  const totalH = height + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(totalW, totalH);
  const px = image.data;
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw, hh);
  const scale = 2 * strength; // feDisplacementMap: offset = scale * (value - 0.5)

  for (let y = 0; y < totalH; y++) {
    for (let x = 0; x < totalW; x++) {
      const i = (y * totalW + x) * 4;
      const cx = x + 0.5 - totalW / 2;
      const cy = y + 0.5 - totalH / 2;
      const qx = Math.abs(cx) - (hw - r);
      const qy = Math.abs(cy) - (hh - r);

      // signed distance to the outline (negative inside) and the outward direction
      let dist;
      let nx;
      let ny;
      if (qx > 0 && qy > 0) {
        const len = Math.hypot(qx, qy);
        dist = len - r;
        nx = (Math.sign(cx) * qx) / len;
        ny = (Math.sign(cy) * qy) / len;
      } else if (qx > qy) {
        dist = qx - r;
        nx = Math.sign(cx);
        ny = 0;
      } else {
        dist = qy - r;
        nx = 0;
        ny = Math.sign(cy);
      }

      const inside = -dist;
      let ox = 0;
      let oy = 0;
      if (inside >= 0 && inside < bevel) {
        const t = 1 - inside / bevel;      // 0 at the inner edge of the bevel → 1 on the rim
        const push = strength * t * t;     // convex lens: strongest at the rim
        ox = -nx * push;                   // sample from further inside
        oy = -ny * push;
      }

      px[i] = Math.round(255 * (0.5 + ox / scale));
      px[i + 1] = Math.round(255 * (0.5 + oy / scale));
      px[i + 2] = 128;
      px[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return { url: canvas.toDataURL('image/png'), scale, totalW, totalH };
}

const svgEl = (name, attrs = {}) => {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
};

const CHANNELS = [
  ['r', 1, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'],
  ['g', 0, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'],
  ['b', -1, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'],
];

/* ==========================================================================================
   Engine
   ========================================================================================== */

export function initGlass() {
  const root = document.documentElement;
  const photo = qs('.bg');
  const lensAllowed = supportsLens();
  const defs = svgEl('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' });
  defs.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
  document.body.append(defs);

  const filters = new Map(); // "kind:w:h:r:pad" → filter id
  let serial = 0;
  let active = false;

  const hosts = qsa('.glass-host[data-glass]').filter((host) => KINDS[host.dataset.glass]);

  /** Where the photo sits on screen (it is object-fit: cover over the viewport). */
  function placePhoto() {
    const box = photo.getBoundingClientRect();
    const scale = Math.max(box.width / PHOTO.width, box.height / PHOTO.height);
    const width = PHOTO.width * scale;
    const height = PHOTO.height * scale;
    root.style.setProperty('--bg-w', `${width}px`);
    root.style.setProperty('--bg-h', `${height}px`);
    root.style.setProperty('--bg-ox', `${(box.width - width) / 2}px`);
    root.style.setProperty('--bg-oy', `${(box.height - height) / 2}px`);
    // reuse the <img>'s URL (content-hashed) so the photo is only downloaded once
    const source = qs('img', photo)?.currentSrc;
    if (source) root.style.setProperty('--bg-url', `url("${source}")`);
  }

  /** Layout position of an element in the viewport, ignoring transforms (animations, hover) but not scrolling. */
  function layoutPosition(node) {
    let x = 0;
    let y = 0;
    for (let current = node; current; current = current.offsetParent) {
      x += current.offsetLeft;
      y += current.offsetTop;
      // offsetLeft/Top count from the start of the parent's scrollable content
      if (current.offsetParent) {
        x -= current.offsetParent.scrollLeft;
        y -= current.offsetParent.scrollTop;
      }
    }
    return { x, y };
  }

  /** Line the copy of the photo up with where the surface is now. */
  function place(host) {
    const { x, y } = layoutPosition(host);
    host.style.setProperty('--hx', `${x}px`);
    host.style.setProperty('--hy', `${y}px`);
  }

  function filterFor(host, settings, { width, height, radius, pad }) {
    const key = `${host.dataset.glass}:${width}:${height}:${radius}:${pad}`;
    let id = filters.get(key);
    if (id) return id;

    id = `lens-${++serial}`;
    const bevel = Math.min(Math.min(width, height) * (settings.depth / 100) * 0.15, MAX_BEVEL);
    const strength = (settings.refraction / 100) * bevel * 0.6;
    const spread = (settings.dispersion / 100) * 0.28;
    const { url, scale, totalW, totalH } = paintMap({ width, height, radius, pad, bevel, strength });

    const filter = svgEl('filter', {
      id,
      x: 0,
      y: 0,
      width: totalW,
      height: totalH,
      filterUnits: 'userSpaceOnUse',
      primitiveUnits: 'userSpaceOnUse',
      'color-interpolation-filters': 'sRGB',
    });
    filter.append(svgEl('feImage', { href: url, x: 0, y: 0, width: totalW, height: totalH, preserveAspectRatio: 'none', result: 'map' }));
    for (const [name, direction, matrix] of CHANNELS) {
      filter.append(
        svgEl('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: scale * (1 + direction * spread), xChannelSelector: 'R', yChannelSelector: 'G', result: `d${name}` }),
        svgEl('feColorMatrix', { in: `d${name}`, type: 'matrix', values: matrix, result: name }),
      );
    }
    filter.append(svgEl('feBlend', { in: 'r', in2: 'g', mode: 'screen', result: 'rg' }), svgEl('feBlend', { in: 'rg', in2: 'b', mode: 'screen' }));
    defs.append(filter);
    filters.set(key, id);
    return id;
  }

  function paint(host) {
    const settings = KINDS[host.dataset.glass];
    const width = host.offsetWidth;
    const height = host.offsetHeight;
    if (!settings || width < 24 || height < 24 || host.closest('[hidden]')) return;

    const style = getComputedStyle(host);
    const radius = Math.round(parseFloat(style.borderTopLeftRadius) || 0);
    const blur = parseFloat(style.getPropertyValue('--blur')) || 0;
    const pad = Math.ceil(blur * 2 + 8);

    place(host);
    host.style.setProperty('--pad', `${pad}px`);
    host.style.setProperty('--r', `${radius}px`);
    if (lensAllowed) host.style.setProperty('--lens', `url(#${filterFor(host, settings, { width, height, radius, pad })})`);
    host.dataset.replica = '';
  }

  function release(host) {
    host.removeAttribute('data-replica');
    for (const name of ['--hx', '--hy', '--pad', '--r', '--lens']) host.style.removeProperty(name);
  }

  const refresh = debounce(() => {
    if (!desktopStage.matches) {
      if (active) hosts.forEach(release);
      active = false;
      return;
    }
    active = true;
    placePhoto();
    hosts.forEach(paint);
  }, 60);

  const resize = new ResizeObserver(refresh);
  resize.observe(document.body);
  for (const host of hosts) resize.observe(host);
  desktopStage.addEventListener('change', refresh);
  addEventListener('resize', refresh);

  // a surface inside a row that scrolls (the skill tiles) slides across the photo: keep its copy in step
  document.addEventListener(
    'scroll',
    ({ target }) => {
      if (!active || !(target instanceof Element)) return;
      for (const host of hosts) if (target.contains(host)) place(host);
    },
    { capture: true, passive: true },
  );

  // pages are revealed by removing [hidden]; measure again once the new page has laid out
  document.addEventListener('portfolio:page-shown', () => requestAnimationFrame(refresh));
  document.fonts?.ready.then(refresh);
  refresh();
}
