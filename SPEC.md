# SPEC — reimo22.github.io

Status: approved 2026-08-09. Source design doc:
[`docs/superpowers/specs/2026-08-09-portfolio-site-design.md`](docs/superpowers/specs/2026-08-09-portfolio-site-design.md).

## Purpose

A personal portfolio site: who I am, what I've built, HTB writeups, and a resume —
fast, accessible, and genuinely static. Built with a trimmed-down version of the
[Chris Titus AI-assisted dev workflow](https://christitus.com/my-ai-workflow/):
spec and task list agreed before code, real CI checkpoints, human review of every
diff before merge. Explicitly out of scope: CodeRabbit, Dependabot/CodeQL,
multi-phase roadmap docs, PM/PR-readiness bots — overkill for a solo static site.

## Hosting

- Repo: `reimo22/reimo22.github.io`
- URL: `https://reimo22.github.io/` (user site, no base path)
- Pages source: **GitHub Actions** (not "deploy from branch" — required so the
  workflow's `submodules: recursive` checkout actually runs; branch-deploy would
  ship the writeups section empty)
- `reimo22/resume` (currently a meta-refresh redirect to a PDF, serving `/resume/`)
  has its Pages disabled once this site's `/resume/` ships. The old PDF filename
  is preserved at the same URL so existing links keep working.

## Pages / sections

| Path                        | Content                                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                         | Home — ASCII banner, short intro, entry points to the other sections                                                                                                                                                      |
| `/about/`                   | Bio                                                                                                                                                                                                                       |
| `/resume/`                  | HTML resume; links to committed PDF at `/resume/Kenji_Pinlac_Resume.pdf`                                                                                                                                                  |
| `/contact/`                 | Contact info — mailto to `reimo14@proton.me`, GitHub, LinkedIn                                                                                                                                                            |
| `/writeups/`                | Index of HTB writeups, split into two sections — retired boxes (box, OS, difficulty, technique) and CTF challenges (event, category, difficulty, technique) — pulled at build time from `github.com/reimo22/htb-writeups` |
| `/writeups/<box>/`          | One page per writeup, rendered from that repo's `README.md`                                                                                                                                                               |
| `/blog/`                    | Blog index, including a build log for this site itself                                                                                                                                                                    |
| `/blog/building-this-site/` | Per-phase log of this project: decisions, what CI caught, what the spec got wrong, where AI helped vs. where human review caught something                                                                                |

Blog and writeups are separate sections/collections — not merged under shared tags.

## Tech stack

- **Eleventy 3** (Node, static output). Chosen over Astro and over plain HTML: the
  writeups section requires a markdown pipeline (rules out plain HTML), and this
  site needs at most one small hand-written script (rules out Astro's island
  overhead for no benefit). Eleventy ships zero client JS by default.
- No CSS framework — hand-written CSS with custom-property tokens.
- No client JS beyond one command-palette script; everything else works with
  JS disabled.

## HTB writeups pipeline

- `github.com/reimo22/htb-writeups` is mounted as a **git submodule** at
  `src/writeups/boxes/` (inside Eleventy's input dir, so pages are discovered
  with no glue code). The submodule root has two kinds of subdirectory —
  retired boxes and CTF event challenges — with genuinely different metadata
  shapes (`TEMPLATE.md` vs `TEMPLATE-ctf.md` upstream), not one schema.
- `src/writeups/writeups.11tydata.js` cascades `layout` and a computed
  `/writeups/<slug>/` permalink into every submodule subdirectory, plus a
  `tags` value **derived per-item from that item's own frontmatter kind**
  (`"writeups-box"` or `"writeups-ctf"`) rather than a single flat
  `"writeups"` tag — this is what builds two distinct Eleventy collections,
  `collections["writeups-box"]` and `collections["writeups-ctf"]`.
- Images pass through via `addPassthroughCopy` so the existing relative
  `./images/...` links in each `README.md` resolve unchanged.
- Each box `README.md` carries YAML frontmatter (`title`, `os`, `difficulty`,
  `technique`, `date`); each CTF challenge `README.md` carries its own shape
  (`title`, `event`, `category`, `difficulty`, `technique`, `date`) — this is
  the site's metadata source for both. The `/writeups/` index renders two
  sections, one per collection, each sorted by `date`; each writeup's header
  reads its own frontmatter. The root `README.md`'s two tables in that repo
  stay as human-facing GitHub navigation only; the site never parses them.
  Frontmatter deliberately avoids Eleventy's reserved keys (`tags`, `layout`,
  `permalink`, `eleventyExcludeFromCollections`) so it can't fight the
  cascade set by `writeups.11tydata.js`.
- The build **fails** if any box or CTF README is missing a required
  frontmatter key for its kind, rather than silently rendering with blank
  metadata.
- A scheduled weekly Action opens a PR bumping the submodule pointer; merging
  it is a manual, human step (keeps the human merge gate).

## Accessibility & progressive enhancement

- The site is fully usable with **JavaScript disabled** and with a **screen
  reader**. Every section is a real `<a href>` in a real `<nav>`; a skip-link is
  first in the DOM.
- Contrast targets: **≥4.5:1** body text, **≥3:1** large text/UI borders —
  verified by Lighthouse a11y assertion (must score 100).
- ASCII-art banners are decorative: `<pre aria-hidden="true">` next to a real
  `<h1>` carrying the site's actual title (`site.title`) as text — the art
  itself may be a stylized handle/wordmark rather than a literal rendering of
  the title. Never read aloud by a screen reader.
- Light/dark themes both defined as CSS custom properties on `:root`, with a
  `prefers-color-scheme` override — never defined only inside a media query.
- A header theme toggle overrides the OS preference and persists in
  `localStorage`. Precedence: stored choice → `prefers-color-scheme` → light.
  The toggle is JS-only, so it must not render at all without JS (same
  progressive-enhancement rule as the command palette), and the theme is
  applied by a **blocking inline script** in `<head>` so there is no flash of
  the wrong theme.
- Motion (cursor blink, etc.) gated behind `prefers-reduced-motion: no-preference`.
- System monospace font stack only — no webfont download.

## Command palette (`/` and `Ctrl+K`)

A layer on top of the working link-based site, not a replacement for it.

- Opens on `/` or `Ctrl+K` (not while focus is in an input/textarea); closes on
  `Esc`; `↑`/`↓` selects; `Enter` navigates.
- Focus moves into the palette on open, returns to the trigger element on close.
- `role="dialog"` + `aria-modal`; results as a `listbox`/`option` pattern with
  `aria-activedescendant`.
- Command list is built from the same nav data (`src/_data/site.json`) as the
  real `<nav>`, so the two can't drift apart.
- Discoverability: a persistent `press / for commands · ? for help` hint, plus a
  `?` shortcuts overlay.
- **Hidden on touch-primary devices** — a keyboard-only affordance is dead
  weight without a keyboard, and nav links already cover full capability.

## Mobile (primary target, not a resize afterthought)

- Mobile-first CSS: base styles are the narrow layout; `min-width` queries add
  the wide layout.
- No horizontal page scroll, ever — and no in-element scrollbar in the banner
  either. The writeups index table and long command output in writeups each get
  their own `overflow-x: auto` container, never on `body`. **The ASCII banner is
  the exception:** it uses `overflow: hidden` and crops, because an
  `overflow-x: auto` banner produced visible "sliders" at intermediate widths.
  See the continuous-crop design doc.
- Touch targets ≥ 44×44px.
- Content capped around 70–80ch.
- Lighthouse CI uses its default **mobile emulation preset**.
- Verified on a real phone viewport before the static-pages phase closes.

## CI (four checkpoints, on every PR and on push to `main`)

Checkout uses `submodules: recursive`.

| Check           | Tool                                                              | Pass condition                                                              |
| --------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Lint            | ESLint (flat config), Stylelint, Prettier `--check`, markdownlint | zero errors                                                                 |
| HTML validation | `html-validate` over built output                                 | zero errors                                                                 |
| Lighthouse      | `treosh/lighthouse-ci-action` with `assert`                       | accessibility **= 100** (hard); performance / best-practices / SEO **≥ 90** |
| Link check      | `lycheeverse/lychee-action`                                       | zero broken internal links; external links warn-only                        |

Lint scope: ESLint on `commands.js`/`.eleventy.js` only; Stylelint on our CSS;
Prettier `--check` on CSS/JS/JSON/Nunjucks (submodule excluded via
`.prettierignore`); markdownlint on `src/blog/`, `SPEC.md`, `TASKS.md` only —
never on the `htb-writeups` submodule. All four also run locally via
`npm run lint`.

Node version pinned in `.nvmrc`, read by `actions/setup-node`.

Deploy (`actions/deploy-pages`) runs only after all four checks pass on `main`.

## Build log

`src/blog/building-this-site.md` is created in phase 1, before any site code,
and gets an entry appended in the **same PR** as each subsequent phase's work —
not written retrospectively. Each entry: the decision made and its alternative,
where the spec turned out wrong, what CI actually caught (with specifics), and
where AI assistance helped vs. where human review caught something. It starts
rendering as a real `/blog` post once the blog collection exists (phase 6).

## Non-goals

- No CMS, no server, no database, no analytics/third-party scripts.
- No shared tag vocabulary between blog and writeups (kept separate).
- No CodeRabbit, Dependabot, CodeQL, or roadmap docs beyond this SPEC + TASKS.
