# Adnan's portfolio

A static portfolio site: Home, Profile, Projects and Contact pages, plain HTML, CSS and JavaScript. No build step and no server code.

Design: a glass window floating over a photo of a quiet room, rebuilt from a Figma file.

## Run it locally

Any static file server works, for example:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Structure

```
index.html            Home       (/)
profile/index.html    Profile    (/profile)
projects/index.html   Projects   (/projects)
contact/index.html    Contact    (/contact)
404.html              Not-found page
css/                  one file per area (tokens, base, glass, shell, components, pages, motion)
js/                   router, glass effect, carousel, contact form, small helpers
assets/               fonts and images (project images live in assets/img/projects/<project>/)
```

Every page contains the full site (all four sections) and shows the one that matches its address, so deep links and reloads work and the pages open without JavaScript. The sidebar, the section markup and the project data are repeated in each of the four files: a change to shared content has to be made in all of them.

## Editing content

* Text, links, skills and projects are plain HTML inside the four page files.
* The contact form has no server: it opens the visitor's mail app with the message filled in.
* Images are WebP, one folder per project under `assets/img/projects/`.

## Deploy (GitHub Pages)

Name the repository `adnvnnn.github.io`, then in Settings → Pages choose **Deploy from a branch**, branch `master`, folder `/ (root)`. The site is served from the root of the repository, which the absolute paths (`/css/...`, `/assets/...`) rely on.

## History

The site started as an ASP.NET Core (Razor Pages) app that rendered these pages from `appsettings.json`. That version is kept in the git history under the tag `aspnet-version`.
