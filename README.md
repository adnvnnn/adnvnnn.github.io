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
