# Adnan's Portfolio

A portfolio site rebuilt from scratch from the **"Figma basics"** design: a glass window floating over a photo of a quiet room, with Home, Profile, Projects and Contact pages.

* **Host:** ASP.NET Core (Razor Pages), same `Portfolio.csproj` / Dockerfile as before — nothing to change in deployment.
* **Front end:** hand-written modern CSS (custom properties, `@property`, `color-mix`, `linear()` springs) and small vanilla ES modules. No Node, no bundler, no framework to install or build.
* **Content:** edit `Portfolio/appsettings.json` → `Site` section. Copy, skills, links, projects and contact details all live there.

## Run

```bash
cd Portfolio
dotnet run --launch-profile http     # http://localhost:5172
```

`dotnet watch` hot-reloads the `.cshtml` files; CSS/JS are plain static files.

## Where things are

```
Portfolio/
  Program.cs                    host, security headers, caching, /api/contact
  appsettings.json              all editable content ("Site") + optional SMTP ("Mail")
  Models/SiteOptions.cs         shape of that content
  Services/ContactMailer.cs     contact-form validation + SMTP delivery
  Pages/
    Index.cshtml(.cs)           one page, four sections; /, /profile, /projects, /contact deep-link to each
    Shared/_Sidebar, _PageHome, _PageProfile, _PageProjects, _PageContact, _Icons (SVG sprite)
  wwwroot/
    css/   tokens → base → glass → shell → components → pages → motion
    js/    main, router, glass (lens engine), projects (carousel/filters), contact, sound
    assets/img, assets/fonts    room photo, portraits, project covers (WebP), Outfit (variable woff2)
```

### Editing content

| To change… | Edit |
| --- | --- |
| Name, role, bio, "Ready for freelancing", pitch line | `Site:Owner` |
| E-mail, phone, location, availability | `Site:Contact` |
| Social links (and which page shows them) | `Site:Social` |
| Skill bars on Home / liquid tiles on Profile | `Site:HomeSkills` / `Site:Skills` (`Level` 0-100) |
| Projects, filters, featured project | `Site:Projects`, `Site:ProjectFilters`, `Site:FeaturedProject` |
| Resume | drop the file at `wwwroot/assets/resume.pdf` (path in `Site:Owner:ResumeUrl`) |

The sample projects, skills and links are the placeholders that appear in the Figma file. Replace the project images in `wwwroot/assets/img/projects/` and the URLs in `appsettings.json`.

### Project images

**Policy (every project follows it):**

1. **English.** Screenshots of a live site are taken with its English UI, never the local-language one.
2. **WebP only**, quality 80, no metadata, one folder per project: `wwwroot/assets/img/projects/<id>/`.
3. **Every image is a different page or section of the site.** No screenshot is used twice, in any template, so the set shows the whole project.
4. **Ordered by purpose**, as a rhythm (see the table): hero first, then the key pages, a device template, more pages, a second device template, and the palette last.
5. **Looks come from the site's CSS, not from pixels.** Banners are **transparent** WebP over `--media-bg` in `css/tokens.css` (only soft, blurred gradients, no photo; hue ~218° from the measured palette, lighter than the glass; the mint accent stays for actions), so a theme change never means re-exporting project images. Full-bleed screenshots are opaque.

**Templates and their order** (`tools/images/devices.mjs`):

| Slide | Template | Purpose | TSMA example |
| --- | --- | --- | --- |
| `01` | `browser` | **the hero first**: the first thing a visitor sees | Hero |
| `02`–`03` | `browser` | the most important pages | Products, Product details |
| `04` | `overview` | a break: the project on every screen size (landscape tablet, portrait tablet, phone in a light three-quarter view, all turned 22° toward the title; no laptop base) | tablet + tablet + phone |
| `05`–`07` | `browser` | the supporting pages | Company news, Blog, About the company |
| `08` | `mobile` | a second break: the phone experience (three equal, flat phones on one line) | three phones |
| `09` | `style` | **always last**: the colour palette and typography, read from the live page | Palette & type |
| `cover` | plain picture | the card in the project list and on Home | the project's most recognisable screen, full bleed, **no device frame, no title** (see below) |

The rhythm is *hero → key pages → template → pages → template → palette*: the two device templates are spread between the page runs instead of being bunched, and the palette closes the tour. `browser` slides are one big flat window each; the name and the section label sit **inside** its toolbar, next to the address, so nothing shrinks the screenshot.

The device templates (`overview`, `mobile`) keep their title outside the devices.

The **`style` board is not guessed**: `style.mjs` opens the live page, reads its design tokens (`--color-primary`, `--color-secondary`, `--color-accent` with `-dark` / `-light`, `--color-text-main`, `--color-text-sub`, `--gray`, `--font-family-title`, `--font-family-main`, the gradient its buttons use) and draws the board inside that page, so the typefaces are the ones the page already loaded (no font file is fetched or saved). It needs the palette exposed as custom properties on `:root` named like that; a project without them needs its tokens added by hand to the script.

The **cover has no devices**: it is only ever seen small, so a device frame only costs space. It is a clean, full-bleed picture of the project's most recognisable screen (for TSMA: the home hero with its mascot), at the list card's exact proportions (1170 × 889). Two things shape it, both visible in the real cards: the lower half is frosted and darkened and the project title is printed over the bottom left, and the wider Home card shows only the middle ~60 % of the height (y 173-715). So the subject must sit between ~19 % and ~50 % of the height, the bottom left stays empty, and the text must not run into the title. To get that picture, capture the live page at 1170 × 889 with the fixed navigation and every section below the one you want hidden (a capture-time style only, the site is untouched) and shift it up with a `transform` rather than scrolling, then run `project-image.mjs`. The screenshot used for the cover is not reused in any slide.

| File | Size | Used by (`appsettings.json`) |
| --- | --- | --- |
| `cover.webp` | 1170 × 889 | `Cover`: card in the project list and the "My Latest Project" card on Home |
| `01.webp` … `NN.webp` | 1586 × 889 (16:9) | `Images`: slides of the featured carousel (the first one is eager-loaded) |

Every `<img>` is `object-fit: cover`, so a frame that doesn't match its box is cropped centrally. `Cover` is required; `Images` may be left empty, in which case the cover is the only slide. Budget: cover ≤ 150 KB, slide ≤ 200 KB. The carousel draws arrows at the sides and dots over the bottom ~8 %, so the tool keeps every group clear of both.

**Capturing.** Use these viewports (device scale factor 2 for tablet and phone) and a real mobile emulation, not a narrow desktop window, which has a minimum width and clips the page. To get a section instead of a page, scroll it to the top of the viewport before the shot. Never save a file the site offers as a download (a catalogue PDF, say) as a screenshot.

| Device | Viewport |
| --- | --- |
| Desktop (browser template) | 1586 × 889 |
| Cover (plain picture) | 1170 × 889 |
| Landscape tablet (overview) | 1180 × 664 |
| Portrait tablet (overview) | 820 × 1180 |
| Phone (overview, mobile) | 390 × 844 (mobile emulation) |

**Producing the files.** `tools/images` (dev-only, not part of the site build) turns the screenshots into exactly this format:

```bash
cd tools/images && npm install                                   # once
node devices.mjs my-project browser --shot hero.png --label "Hero" --url host --name 01                      # one per page: 01-03, 05-07
node devices.mjs my-project overview --landscape a.png --tablet b.png --phone c.png --name 04                # first device break
node devices.mjs my-project mobile --phone a.png --phone b.png --phone c.png --name 08                      # second device break
node style.mjs my-project --url "https://host/?culture=en" --name 09                                        # palette & type (last), from the live page
node project-image.mjs hero.png my-project cover                                                          # cover.webp: a plain picture, no devices
```

The title comes from the project's `Title` in `appsettings.json` (`--title "…"` overrides, `--no-title` drops it) and shrinks to fit; `--label` adds the small line under it. `--angle <deg>` turns the devices (defaults: 22 for `overview` and `cover`, 0 = straight on for `browser` and `mobile`). `devices.mjs` needs Edge or Chrome installed. `project-image.mjs` converts a plain full-bleed screenshot (`--crop l,t,w,h`, `--focus left|right|top|bottom`). Each command prints the path to paste into `Cover` / `Images`. A page without CSS colour tokens can still get its `style` slide: read its real colours and pass `--palette "primary=#…,secondary=#…,accent=#…"` (more keys in the script header).

**Ready-made prompts** for building a project's images from scratch, with screenshots attached or from the site link alone: [tools/images/PROMPT.md](tools/images/PROMPT.md).

### Contact form

`POST /api/contact` validates the message (honeypot field + rate limit of 5/min per IP) and sends it through SMTP when `Mail:Host`, `Mail:To` and a sender (`Mail:From` or `Mail:User`) are set — use user-secrets / environment variables (`Mail__Password`) for credentials. With no mail account configured the endpoint answers `501` and the page falls back to opening the visitor's mail app, so a message is never silently lost.

## How the design is built

* **Artboard scale.** The Figma artboard is 1926 × 872. From 1100 px up the whole window is that artboard, scaled with one variable: `--u` (= one Figma pixel, `min(100vw/1926, 100dvh/872)`). Every size in the desktop CSS is written in design pixels as `calc(N * var(--u))`, so the proportions match Figma at every screen size. Small text has a legibility floor (`--fs-*`).
* **Below 1100 px** the layout flows: a single scrolling glass panel with a floating glass tab bar (tablet: two-column sections, mobile: stacked cards).
* **Glass.** Figma's *Glass* effect (light, refraction, depth, dispersion, frost) is built from three layers — see `css/glass.css` and `js/glass.js`:
  1. a frosted, tinted surface (`::before`) and a specular rim (`::after`) on every `.glass-host`;
  2. the big sidebar and main panel are ordinary `backdrop-filter` surfaces over the photo;
  3. on the desktop stage the cards, tray, tiles and buttons paint their **own copy of the photo** instead of using `backdrop-filter`, because Figma's glass samples the room itself (that is why the skill tiles show the chair almost sharp) — an SVG displacement map then bends and colour-splits the background at the rim (refraction + dispersion).
  Touch devices and small screens keep the plain blur version. The per-element Figma settings are in `KINDS` in `glass.js`.
* **Motion.** Pages never fade with `opacity` (it would stop nested glass from seeing the photo); they animate `--appear` instead. Springs are `linear()` curves sampled from damped-spring equations. `prefers-reduced-motion` is respected.
* **Sound.** The speaker icon toggles tiny interface sounds synthesised with Web Audio (no audio files). It starts after the first click/keypress and remembers the choice.

## Notes on the Figma file

* The file contains four desktop frames only; the tablet and phone layouts are derived from the same design language.
* Typos in the file were corrected: *Abdollahzadet* (clipped "h") → *Abdollahzadeh*, *Messaage* → *Message*, and the missing space in *code.Currently*. The bio paragraph in Figma is the same two sentences twice (placeholder) and is kept as the default text — trim it in `appsettings.json`.
* Skill percentages on Home are drawn proportionally (70 % fills 70 % of the bar); the bars in Figma were drawn by eye.
* In Figma the first project card is highlighted while the featured card shows a different project; here the highlight always marks the project shown in the featured card.

## Browsers

Evergreen Chrome / Edge (full effect), Firefox and Safari (same layout and glass, refraction rim is Chromium/Firefox-only). Everything works without JavaScript except the transitions and the interactive widgets; the server renders complete pages.
