# Adnan's portfolio

A static portfolio site: Home, Profile, Projects and Contact pages. The content lives in one file, `site.json`, and a small script turns it into plain HTML pages. No framework, no server.

Design: a glass window floating over a photo of a quiet room, rebuilt from a Figma file.

## Edit the content

Everything you read on the site is in [`site.json`](site.json):

| Section | What it holds |
| --- | --- |
| `Owner` | name, role, status, pitch, bio, resume path, `ShowPhoto` (false hides the portrait) |
| `Contact` | subtitle, intro, e-mail, phone, location, availability. A detail left empty shows as a dimmed "Not available yet" row |
| `Social` | links and the pages that show them (`Show`: `home`, `contact`; empty means all) |
| `Skills` | name, level (0-100), icon, description (shown when the tile is hovered or focused). The top three by level appear on Home |
| `ProjectFilters`, `Projects` | the filter chips (a chip with no project is not shown) and the project list. The first project is the featured one. An empty `SourceUrl` shows a disabled "source code" button |

Images are WebP under `public/assets/img/`, one folder per project (`public/assets/img/projects/<id>/`).

## Build and preview

Needs Node 18 or newer (no packages to install):

```bash
node build/build.mjs
python -m http.server 8000 --directory dist
```

Then open http://localhost:8000. The pages are written to `dist/` (not committed).

## Structure

```
site.json            content
build/build.mjs      turns site.json into the pages (markup lives here)
build/icons.html     the SVG icon sprite
public/              copied as is: css/, js/, assets/, favicon.svg
dist/                the built site
.github/workflows/   deploys dist/ to GitHub Pages on every push to master
```

## Deploy (GitHub Pages)

1. Name the repository `adnvnnn.github.io` (the site is served from the root of the domain, which the absolute paths rely on).
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Push to `master`. The workflow builds the pages and publishes them.

### Visitor stats

To see whether the site is visited, sign up for a free account at [goatcounter.com](https://www.goatcounter.com) (no cookies, so no banner is needed), pick a site code and put it in `site.json`:

```json
"Analytics": { "GoatCounter": "your-code" }
```

The next build adds the counter to every page and counts each page change. With an empty value nothing is added.

### Uptime

A second workflow (`uptime.yml`) loads the live site every 30 minutes and fails when it is down; GitHub emails the owner about a failed run, which makes it a free uptime alert. GitHub pauses scheduled workflows after 60 days without any push, so the check needs an occasional commit.

The contact form has no server: it opens the visitor's mail app with the message filled in.

## History

The site started as an ASP.NET Core (Razor Pages) app that rendered the same pages from `appsettings.json`. That version is kept in the git history under the tag `aspnet-version`.
