// Builds the static site: reads ../site.json and writes the pages into ../dist, next to a copy of ../public.
//
//   node build/build.mjs
//
// No dependencies. The markup here is the one the site used to render on the server (Razor Pages); site.json is the
// old Site section of appsettings.json.

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = resolve(root, 'public');
const outDir = resolve(root, 'dist');

const site = JSON.parse(readFileSync(resolve(root, 'site.json'), 'utf8'));

/* ----- content, with the defaults the old models had ------------------------------------------------------------ */
const owner = {
  FirstName: '', LastName: '', Role: '', Status: '', Pitch: '', Bio: '', ResumeUrl: '', ShowPhoto: true,
  ...site.Owner,
};
const contact = {
  Subtitle: '', Intro: '', Email: '', Phone: '', Location: '', Availability: '', AvailabilityBadge: 'Available',
  ...site.Contact,
};
const socials = (site.Social ?? []).map((link) => ({ Name: '', Icon: '', Url: '#', Show: [], ...link }));
const skills = (site.Skills ?? []).map((skill) => ({ Name: '', Level: 0, Icon: '', Description: '', ...skill }));
const filters = site.ProjectFilters ?? [];
const projects = (site.Projects ?? []).map((project) => ({
  Id: '', Title: '', Summary: '', Categories: [], Tags: [], Cover: '', Images: [], Period: '', LiveUrl: '', SourceUrl: '', ...project,
}));

// Visitor stats (GoatCounter, free, no cookies): the site code is the first part of <code>.goatcounter.com. Empty means off.
const goatCounter = (site.Analytics?.GoatCounter ?? '').trim();

const fullName = `${owner.FirstName} ${owner.LastName}`.trim();
const slides = (project) => (project.Images.length > 0 ? project.Images : [project.Cover]);
const showsOn = (link, page) => link.Show.length === 0 || link.Show.some((p) => p.toLowerCase() === page);

/* ----- helpers -------------------------------------------------------------------------------------------------- */
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ENTITIES[char]);

/** A path under public/ with a content hash, so a changed file is never served stale from the browser cache. */
const hashes = new Map();
function v(path) {
  if (!path.startsWith('/')) return path;
  if (!hashes.has(path)) {
    const file = resolve(publicDir, `.${path}`);
    hashes.set(path, existsSync(file) ? createHash('sha256').update(readFileSync(file)).digest('base64url').slice(0, 12) : '');
  }
  const hash = hashes.get(path);
  return hash ? `${path}?v=${hash}` : path;
}

const FILLED = new Set(['github', 'telegram', 'linkedin', 'instagram', 'fire']);
const KNOWN = new Set([
  'home', 'user', 'grid', 'call', 'chevron-left', 'chevron-right', 'arrow-up-right', 'check', 'mail', 'phone', 'pin',
  'clock', 'copy', 'download', 'send', 'python', 'css3', 'java', 'code', 'github', 'telegram', 'linkedin', 'instagram',
  'fire', 'terminal', 'git-branch', 'layers', 'database', 'sparkles', 'shield', 'server',
]);

/** An inline SVG that points at a symbol of the sprite; an unknown name falls back to "code". */
function icon(name, cssClass = '') {
  const id = KNOWN.has((name ?? '').toLowerCase()) ? name.toLowerCase() : 'code';
  const classes = `icon${FILLED.has(id) ? ' icon--fill' : ''}${cssClass ? ` ${cssClass}` : ''}`;
  return `<svg class="${classes}" aria-hidden="true" focusable="false"><use href="#i-${id}"></use></svg>`;
}

const attr = (name, value) => (value == null || value === false ? '' : ` ${name}="${esc(value)}"`);
const hasLink = (url) => Boolean(url) && url.trim() !== '' && url !== '#';

const SECTIONS = ['home', 'profile', 'projects', 'contact'];
const titleFor = (section) =>
  ({
    profile: `Profile · ${fullName}`,
    projects: `Projects · ${fullName}`,
    contact: `Contact · ${fullName}`,
  })[section] ?? `${fullName} · ${owner.Role}`;

const hiddenAttrs = (active) => (active ? '' : ' hidden="hidden" inert="inert"');

/* ----- pieces --------------------------------------------------------------------------------------------------- */
function sidebar(active) {
  const items = [
    ['home', '/', 'Home', 'home'],
    ['profile', '/profile', 'Profile', 'user'],
    ['projects', '/projects', 'projects', 'grid'],
    ['contact', '/contact', 'Contact', 'call'],
  ];
  const links = items
    .map(([key, href, label, iconName]) => {
      const on = active === key;
      return `
                <li>
                    <a class="nav__link${on ? ' is-active' : ''}" href="${href}" data-page="${key}"
                       data-title="${esc(titleFor(key))}"${on ? ' aria-current="page"' : ''}>
                        ${icon(iconName, 'nav__icon')}
                        <span class="nav__label">${label}</span>
                    </a>
                </li>`;
    })
    .join('');

  return `<aside class="sidebar glass-host" data-glass="sidebar">
    <p class="sidebar__brand">Explore</p>

    <nav class="nav" aria-label="Primary">
        <span class="nav__pill" aria-hidden="true"></span>
        <ul class="nav__list">${links}
        </ul>
    </nav>

    <p class="sidebar__copy">Copyright © ${new Date().getFullYear()} - ${esc(fullName)}</p>
</aside>`;
}

function socialList(page, extraClass, linkClass) {
  return socials
    .filter((link) => showsOn(link, page))
    .map(
      (link) => `
                    <li>
                        <a class="${linkClass}" href="${esc(link.Url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(link.Name)}">
                            ${icon(link.Icon)}
                        </a>
                    </li>`,
    )
    .join('');
}

function pageHome(active) {
  const latest = projects[0];
  const top = [...skills].sort((a, b) => b.Level - a.Level).slice(0, 3);
  const bars = top
    .map(
      (skill) => `
                <li class="bar" style="--level:${skill.Level}">
                    <span class="bar__fill" aria-hidden="true"></span>
                    ${icon(skill.Icon, 'bar__icon')}
                    <span class="bar__name">${esc(skill.Name)}</span>
                    <span class="bar__pct">${skill.Level} %</span>
                </li>`,
    )
    .join('');

  return `<section class="page page--home" id="page-home" data-page="home" aria-labelledby="home-title"${hiddenAttrs(active)}>

    <h1 class="page__title" id="home-title">Home</h1>

    <div class="hero hero--home glass-host${owner.ShowPhoto ? '' : ' hero--no-photo'}" data-glass="card">
        <div class="hero__text">
            <h2 class="hero__name">${esc(owner.FirstName)}</h2>
            <p class="hero__role">${esc(owner.Role)}</p>
            <p class="hero__status"><span class="dot" aria-hidden="true"></span>${esc(owner.Status)}</p>
        </div>${
          owner.ShowPhoto
            ? `
        <img class="hero__portrait" src="${v('/assets/img/portrait-side.webp')}"
             alt="Portrait of ${esc(fullName)}" width="187" height="217" decoding="async" />`
            : ''
        }
    </div>

    <div class="home-row">
        <p class="pitch glass-host" data-glass="pill"><span>${esc(owner.Pitch)}</span></p>
        <a class="btn btn--primary btn--xl" href="/contact" data-page="contact"><span>Hire Me</span></a>
        <a class="btn btn--glass btn--xl glass-host" data-glass="button" href="/projects" data-page="projects"><span>Projects</span></a>
    </div>

    <div class="home-skills">
        <h2 class="label">Main Skills</h2>
        <ul class="bars">${bars}
        </ul>
    </div>
${
  latest
    ? `
    <a class="latest" href="/projects" data-page="projects" data-project="${esc(latest.Id)}">
        <img class="latest__img" src="${v(latest.Cover)}"
             alt="" width="1406" height="889" loading="lazy" decoding="async" />
        <span class="latest__title">My Latest Project ${icon('fire', 'latest__fire')}</span>
    </a>
`
    : ''
}
    <ul class="socials socials--column" aria-label="Social links">${socialList('home', '', 'social')}
    </ul>
</section>`;
}

function pageProfile(active) {
  const resumeExists =
    owner.ResumeUrl.trim() !== '' && existsSync(resolve(publicDir, `.${owner.ResumeUrl}`));
  const resume = resumeExists
    ? `<a class="btn btn--primary btn--md" href="${esc(owner.ResumeUrl)}" download><span>Download Resume</span></a>`
    : `<button class="btn btn--primary btn--md" type="button" data-toast="The resume file hasn’t been added yet."><span>Download Resume</span></button>`;

  const tiles = skills
    .map((skill, i) => {
      const hasTip = skill.Description.trim() !== '';
      return `
                <li class="${hasTip ? 'tile tile--info glass-host' : 'tile glass-host'}" data-glass="tile" style="--level:${skill.Level}"${hasTip ? ' tabindex="0"' : ''}>
                    <svg class="tile__liquid" viewBox="0 0 156 154" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                        <defs>
                            <linearGradient id="liquid-fill-${i}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="156" y2="0">
                                <stop class="liquid__from" offset="0.0265" />
                                <stop class="liquid__to" offset="1" />
                            </linearGradient>
                            <clipPath id="liquid-wave-${i}">
                                <path d="M0 12Q50.7 0 101.4 12T202.8 12T304.2 12T405.6 12V200H0Z" />
                            </clipPath>
                        </defs>
                        <g class="liquid__level">
                            <g class="liquid__wave" clip-path="url(#liquid-wave-${i})">
                                <rect class="liquid__fill" width="156" height="200" fill="url(#liquid-fill-${i})" />
                            </g>
                        </g>
                    </svg>
                    <span class="tile__name">${esc(skill.Name)}</span>
                    <span class="tile__pct">${skill.Level} %</span>${hasTip ? `
                    <span class="tile__desc">${esc(skill.Description)}</span>` : ''}
                </li>`;
    })
    .join('');

  return `<section class="page page--profile" id="page-profile" data-page="profile" aria-labelledby="profile-title"${hiddenAttrs(active)}>

    <h1 class="page__title" id="profile-title">Profile</h1>

    <div class="hero hero--profile glass-host${owner.ShowPhoto ? '' : ' hero--no-photo'}" data-glass="card">
        <div class="hero__text">
            <h2 class="hero__name">
                <span class="hero__first">${esc(owner.FirstName)}</span>
                <span class="hero__last">${esc(owner.LastName)}</span>
            </h2>
            <p class="hero__role">${esc(owner.Role)}</p>
            <p class="hero__bio">${esc(owner.Bio)}</p>
            ${resume}
        </div>${
          owner.ShowPhoto
            ? `
        <img class="hero__portrait" src="${v('/assets/img/portrait-front.webp')}"
             alt="Portrait of ${esc(fullName)}" width="356" height="406" decoding="async" />`
            : ''
        }
    </div>

    <h2 class="label label--skills">Skills</h2>

    <div class="tray glass-host" data-glass="tray">
        <button class="tray__nav tray__nav--prev" type="button" aria-label="Scroll skills left" disabled>${icon('chevron-left')}</button>
        <ul class="tiles">${tiles}
        </ul>
        <button class="tray__nav tray__nav--next" type="button" aria-label="Scroll skills right" disabled>${icon('chevron-right')}</button>
    </div>
</section>`;
}

function pageProjects(active) {
  const featured = projects[0];
  const used = new Set(projects.flatMap((p) => p.Categories.map((c) => c.toLowerCase())));
  const data = projects.map((p) => ({
    id: p.Id,
    title: p.Title,
    summary: p.Summary,
    categories: p.Categories,
    tags: p.Tags,
    images: slides(p).map(v),
    period: p.Period,
    liveUrl: p.LiveUrl,
    sourceUrl: p.SourceUrl,
  }));
  // the data sits inside a <script>: keep any "</script>" or "<!--" in the text from ending it
  const json = JSON.stringify(data).replace(/[<>&']/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

  const link = (url) => `${hasLink(url) ? attr('href', url) : ''}${hasLink(url) ? '' : ' aria-disabled="true" tabindex="-1"'}`;

  const featuredBlock = featured
    ? `
    <h2 class="label label--featured">Featured Project</h2>

    <article class="featured glass-host" data-glass="card" data-featured="${esc(featured.Id)}">
        <div class="featured__info">
            <div class="featured__head">
                <h3 class="featured__title">${esc(featured.Title)}</h3>
                <span class="featured__period"${featured.Period ? '' : ' hidden'}>${esc(featured.Period)}</span>
            </div>
            <p class="featured__text">${esc(featured.Summary)}</p>
            <ul class="tags">${featured.Tags.map((tag) => `
                <li class="tag">${esc(tag)}</li>`).join('')}
            </ul>
            <div class="featured__actions">
                <a class="btn btn--primary btn--sm" data-role="live"${hasLink(featured.LiveUrl) ? '' : ' hidden'}${link(featured.LiveUrl)}
                   target="_blank" rel="noopener noreferrer">Visit Website</a>
                <a class="btn btn--white btn--sm" data-role="source"${link(featured.SourceUrl)}
                   target="_blank" rel="noopener noreferrer">
                    source code ${icon('github', 'btn__icon')}
                </a>
            </div>
        </div>

        <div class="featured__media carousel" data-carousel aria-roledescription="carousel" aria-label="Project screenshots">
            <ul class="carousel__track">${slides(featured).map((slide, i, all) => `
                <li class="carousel__slide" aria-roledescription="slide" aria-label="${i + 1} of ${all.length}">
                    <img src="${v(slide)}" alt="${esc(featured.Title)} screenshot ${i + 1}" width="1586" height="889"
                         loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async" draggable="false" />
                </li>`).join('')}
            </ul>
            <button class="carousel__nav carousel__nav--prev" type="button" aria-label="Previous image">${icon('chevron-left')}</button>
            <button class="carousel__nav carousel__nav--next" type="button" aria-label="Next image">${icon('chevron-right')}</button>
            <div class="carousel__dots" role="group" aria-label="Choose image"></div>
        </div>
    </article>
`
    : '';

  const chips = filters
    .filter((f) => f.toLowerCase() === 'all' || used.has(f.toLowerCase())) // a filter nobody uses gets no chip
    .map((f) => {
      const all = f.toLowerCase() === 'all';
      return `
            <button class="chip${all ? ' is-active' : ''}" type="button" data-filter="${esc(f)}" aria-pressed="${all}">${esc(f)}</button>`;
    })
    .join('');

  const cards = projects
    .map((p) => {
      const isFeatured = featured && p.Id === featured.Id;
      return `
            <li class="plist__item" data-category="${esc(p.Categories.join('|'))}">
                <button class="pcard${isFeatured ? ' is-selected' : ''}" type="button" data-project="${esc(p.Id)}"
                        aria-pressed="${Boolean(isFeatured)}">
                    <img class="pcard__img" src="${v(p.Cover)}" alt="" width="763" height="580"
                         loading="lazy" decoding="async" draggable="false" />
                    <span class="pcard__title">${esc(p.Title)}</span>
                    ${icon('arrow-up-right', 'pcard__arrow')}
                </button>
            </li>`;
    })
    .join('');

  return `<section class="page page--projects" id="page-projects" data-page="projects" aria-labelledby="projects-title"${hiddenAttrs(active)}>

    <h1 class="page__title" id="projects-title">Projects</h1>
    <p class="page__sub">selected work that solve problems and deliver impact</p>
${featuredBlock}
    <div class="plist-head">
        <h2 class="label label--all">All Projects</h2>
        <div class="chips" role="group" aria-label="Filter projects">${chips}
        </div>
    </div>

    <div class="plist" data-plist>
        <button class="plist__nav plist__nav--prev" type="button" aria-label="Scroll projects left">${icon('chevron-left')}</button>
        <ul class="plist__track">${cards}
        </ul>
        <button class="plist__nav plist__nav--next" type="button" aria-label="Scroll projects right">${icon('chevron-right')}</button>
    </div>

    <script type="application/json" id="projects-data">${json}</script>
</section>`;
}

function pageContact(active) {
  const details = [
    ['mail', 'E-Mail', contact.Email, 'mailto:', 'Copy e-mail address'],
    ['phone', 'Phone', contact.Phone, 'tel:', 'Copy phone number'],
    ['pin', 'Location', contact.Location, null, 'Copy location'],
  ];
  // A detail left empty in site.json shows as a dimmed "Not available yet" row, with its copy button off.
  const rows = details
    .map(([iconName, label, value, prefix, copyLabel]) => {
      const filled = value.trim() !== '';
      const shown = !filled
        ? '<span class="info__value">Not available yet</span>'
        : prefix
          ? `<a class="info__value" href="${prefix}${esc(value)}">${esc(value)}</a>`
          : `<span class="info__value">${esc(value)}</span>`;
      const copy = filled
        ? `<button class="copy" type="button" data-copy="${esc(value)}" aria-label="${copyLabel}">${icon('copy')}</button>`
        : `<button class="copy" type="button" disabled aria-label="${copyLabel} (not available yet)">${icon('copy')}</button>`;
      return `
            <li class="info__row${filled ? '' : ' info__row--off'}">
                <span class="info__badge">${icon(iconName)}</span>
                <span class="info__text">
                    <span class="info__label">${label}</span>
                    ${shown}
                </span>
                ${copy}
            </li>`;
    })
    .join('');

  return `<section class="page page--contact" id="page-contact" data-page="contact" aria-labelledby="contact-title"${hiddenAttrs(active)}>

    <h1 class="page__title" id="contact-title">Contact</h1>
    <p class="page__sub">${esc(contact.Subtitle)}</p>

    <div class="card card--info glass-host" data-glass="card">
        <h2 class="card__title">Let’s Connect</h2>
        <p class="card__lead">${esc(contact.Intro)}</p>

        <ul class="info">${rows}
            <li class="info__row">
                <span class="info__badge">${icon('clock')}</span>
                <span class="info__text">
                    <span class="info__label">Availability</span>
                    <span class="info__value">${esc(contact.Availability)}</span>
                </span>
                <span class="info__status"><span class="dot" aria-hidden="true"></span>${esc(contact.AvailabilityBadge)}</span>
            </li>
        </ul>

        <div class="follow">
            <h3 class="follow__title">Follow Me On Socials</h3>
            <ul class="socials socials--row" aria-label="Social links">${socialList('contact', '', 'social social--glass')}
            </ul>
        </div>
    </div>

    <form class="card card--form glass-host" data-glass="card" data-contact-form action="/api/contact" method="post" novalidate>
        <h2 class="card__title">Send a Message</h2>

        <div class="field">
            <label class="field__label" for="cf-name">Your Name</label>
            <input class="field__input" id="cf-name" name="name" type="text" placeholder="Write Your Name" autocomplete="name" maxlength="100" required />
            <p class="field__error" id="cf-name-error" hidden></p>
        </div>
        <div class="field">
            <label class="field__label" for="cf-email">Your E-Mail</label>
            <input class="field__input" id="cf-email" name="email" type="email" placeholder="Write Your E-Mail" autocomplete="email" maxlength="200" required />
            <p class="field__error" id="cf-email-error" hidden></p>
        </div>
        <div class="field">
            <label class="field__label" for="cf-subject">Subject</label>
            <input class="field__input" id="cf-subject" name="subject" type="text" placeholder="What’s This About" maxlength="150" required />
            <p class="field__error" id="cf-subject-error" hidden></p>
        </div>
        <div class="field field--area">
            <label class="field__label" for="cf-message">Message</label>
            <textarea class="field__input field__input--area" id="cf-message" name="message" placeholder="Tell Me About Your Project" maxlength="5000" required></textarea>
            <p class="field__error" id="cf-message-error" hidden></p>
        </div>

        <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />

        <button class="btn btn--primary btn--send" type="submit"><span class="btn__label">Send Message</span></button>
        <p class="form__status" role="status" aria-live="polite" hidden></p>
    </form>
</section>`;
}

/* ----- documents ------------------------------------------------------------------------------------------------ */
const sprite = readFileSync(resolve(root, 'build/icons.html'), 'utf8').trimEnd();

/**
 * GoatCounter counts the page that was loaded. The site swaps pages without a reload, so every swap is counted here
 * too (the router announces it with "portfolio:page-shown"), with the same trailing-slash path a direct visit has.
 */
function analyticsSnippet() {
  if (!goatCounter) return '';
  return `
    <script data-goatcounter="https://${esc(goatCounter)}.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
    <script>document.addEventListener('portfolio:page-shown', function () { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: location.pathname.endsWith('/') ? location.pathname : location.pathname + '/' }); });</script>`;
}

function document_(title, description, body) {
  const css = ['tokens', 'base', 'glass', 'shell', 'components', 'home', 'profile', 'projects', 'contact', 'motion']
    .map((name) => `    <link rel="stylesheet" href="${v(`/css/${name}.css`)}" />`)
    .join('\n');
  return `<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="theme-color" content="#4a4d55" />
    <meta name="color-scheme" content="dark" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:type" content="website" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="preload" href="/assets/fonts/outfit-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin />

${css}

    <script>document.documentElement.className = 'js';</script>
    <script type="module" src="${v('/js/main.js')}"></script>${analyticsSnippet()}
</head>
<body>
    ${body}
</body>
</html>
`;
}

function indexPage(active) {
  const body = `${sprite}

<div class="bg" aria-hidden="true">
    <img src="${v('/assets/img/bg.webp')}" alt="" width="1926" height="872" decoding="async" fetchpriority="high" />
</div>

<a class="skip-link" href="#main">Skip to content</a>

<div class="stage">
    <div class="canvas">
        <div class="app" data-page="${active}">
            ${sidebar(active)}

            <main id="main" class="main glass-host" tabindex="-1" data-glass="main">
                <button class="sound" type="button" aria-pressed="true" aria-label="Turn sound effects off">
                    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M10.2 6a.7.7 0 0 1 1.1-.6l5.8 3.8H20a.8.8 0 0 1 .8.8v4a.8.8 0 0 1-.8.8h-2.9l-5.8 3.8a.7.7 0 0 1-1.1-.6z" />
                        <path class="sound__wave" d="M7.6 9.2a4 4 0 0 0 0 5.6" />
                        <path class="sound__wave sound__wave--far" d="M5 6.8a7.4 7.4 0 0 0 0 10.4" />
                        <path class="sound__slash" d="M3.6 3.6l16.8 16.8" pathLength="1" />
                    </svg>
                </button>

                ${pageHome(active === 'home')}
                ${pageProfile(active === 'profile')}
                ${pageProjects(active === 'projects')}
                ${pageContact(active === 'contact')}
            </main>
        </div>
    </div>
</div>

<div class="toast" role="status" aria-live="polite"></div>`;
  return document_(titleFor(active), owner.Pitch, body);
}

function notFoundPage() {
  const body = `<div class="bg" aria-hidden="true">
    <img src="${v('/assets/img/bg.webp')}" alt="" width="1926" height="872" decoding="async" />
</div>

<main class="error-page">
    <div class="error-card glass-host" data-glass="card">
        <p class="error-card__code">404</p>
        <h1 class="error-card__title">This page drifted away</h1>
        <p class="error-card__text">
            The page you were looking for doesn’t exist or has moved.
        </p>
        <a class="btn btn--primary btn--md" href="/"><span>Back to Home</span></a>
    </div>
</main>`;
  return document_('Page not found', '', body);
}

/* ----- write ---------------------------------------------------------------------------------------------------- */
rmSync(outDir, { recursive: true, force: true });
cpSync(publicDir, outDir, { recursive: true });

const write = (file, html) => {
  const target = resolve(outDir, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
};

for (const section of SECTIONS) write(section === 'home' ? 'index.html' : `${section}/index.html`, indexPage(section));
write('404.html', notFoundPage());

console.log(`Built ${SECTIONS.length} pages and 404.html into dist/`);
