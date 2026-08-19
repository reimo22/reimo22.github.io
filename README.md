# reimo22.github.io

Personal portfolio site for Kenji Pinlac, built with Eleventy 3.

## What's here

- **Home** (`/`) — landing page with recent blog posts and HTB writeups
- **About** (`/about/`) — profile, resume, and contact
- **Writeups** (`/writeups/`) — retired HackTheBox machines and CTF challenges, pulled from [`htb-writeups`](https://github.com/reimo22/htb-writeups) at build time via git submodule
- **Blog** (`/blog/`) — posts about building this site and other topics
- **RSS** (`/feed.xml`) — blog feed
- **Sitemap** (`/sitemap.xml`) — auto-generated XML sitemap

## Tech stack

- **Eleventy 3** (Node, static output)
- **Hand-written CSS** with custom-property tokens for light/dark themes
- **Plain JS** (IIFE, deferred) — command palette, theme toggle, code-copy buttons
- **No CSS framework**, no analytics, no CMS, no database
- Fully usable with JavaScript disabled

## Running locally

```bash
npm install          # install deps
npm run build        # build _site/
npm run serve        # dev server on :8080 (background it)
```

## Testing

```bash
npm test             # node:test unit + DOM tests
npm run lint         # ESLint, Stylelint, Prettier, markdownlint
npm run build        # must pass first
npx html-validate _site
```

## CI / deploy

GitHub Actions runs lint → html-validate → Lighthouse → lychee on every PR and on `main`. Deploy only happens after all four pass.

## Notes

- The `src/writeups/boxes/` directory is a git submodule. Clone with `--recursive`, or run `git submodule update --init --recursive` after clone.
- `docs/build-log-reference.md` records every phase, every fix, and every rejected approach.
- `src/blog/building-this-site.md` is the narrative essay about the build process (renders as a real blog post).
