# TASKS — reimo22.github.io

Each phase is one small, reviewable PR against `main`. Every phase from 1 onward
ends by appending an entry to `src/blog/building-this-site.md` in the same PR.
See [`SPEC.md`](SPEC.md) for the full rationale behind each decision below.

## Phase 1 — Spec & tasks (this PR)

- [x] Write `SPEC.md`
- [x] Write `TASKS.md`
- [x] Write design doc to `docs/superpowers/specs/2026-08-09-portfolio-site-design.md`
- [x] Create `src/blog/building-this-site.md` with its phase-1 entry
- [x] `git init`, first commit
- [x] No site code in this PR

## Phase 2 — Skeleton + CI

- [x] `.eleventy.js`: input/output dirs, passthrough copy config, markdown settings
- [x] `src/_includes/base.njk`: skip-link, `<nav>`, ASCII banner slot, footer
- [x] `src/_data/site.json`: title, URLs, nav/command registry
- [x] One placeholder home page (`src/index.njk`) to prove the build
- [x] `.nvmrc` pinning Node version
- [x] Lint configs: ESLint (flat), Stylelint, Prettier, markdownlint + `npm run lint` / `lint:fix`
- [x] `.github/workflows/ci.yml`: lint → html-validate → lighthouse (assert) → lychee → deploy, checkout with `submodules: recursive`
- [x] Set repo Pages source to **GitHub Actions** (not branch deploy)
- [ ] Confirm CI goes green and the site is live at `reimo22.github.io`
- [ ] Append build-log entry

## Phase 3 — Theme

- [ ] `src/assets/css/main.css`: custom-property tokens (light + dark), purple/gray palette
- [ ] Verify contrast: ≥4.5:1 body text, ≥3:1 large text/UI borders
- [ ] ASCII banner mechanism: `.txt` files in `src/assets/ascii/`, `<pre aria-hidden="true">` + real `<h1>`, narrow variant under ~40rem
- [ ] Mobile-first layout: base = narrow, `min-width` queries add wide layout
- [ ] `prefers-reduced-motion` gating for any motion effects
- [ ] Append build-log entry

## Phase 4 — Static pages

- [ ] `/about/`
- [ ] `/contact/` (mailto + GitHub/LinkedIn links)
- [ ] `/resume/`: HTML resume page + commit `_sec` PDF as `/resume/Kenji_Pinlac_Resume.pdf` (same filename as the old repo, new content)
- [ ] Disable Pages on `reimo22/resume` (archive, don't delete)
- [ ] Verify `/resume/` serves the new page and the PDF URL still resolves (hard-refresh — old redirect caches aggressively)
- [ ] Mobile pass on all pages so far: real phone viewport, no horizontal scroll, touch targets ≥44px
- [ ] Append build-log entry

## Phase 5 — Writeups

- [ ] Add `htb-writeups` as a git submodule at `src/writeups/boxes/` (HTTPS URL) — pull the
      commit with frontmatter already added upstream (currently: 7 boxes have it, 4 CTF
      challenges — gatery, jailbreak, massagold, timekorp — still don't)
- [ ] Get CTF-challenge frontmatter added upstream too (`title`/`event`/`category`/
      `difficulty`/`technique`/`date`, per `TEMPLATE-ctf.md`'s field set) before wiring the
      build check below, or those 4 directories will fail the build on first run
- [ ] `src/writeups/writeups.11tydata.js`: cascade layout, computed permalink, and a per-item
      `tags` (`"writeups-box"` vs `"writeups-ctf"`, derived from which frontmatter shape the
      item has) — building two collections, not one
- [ ] `addPassthroughCopy` for `src/writeups/boxes/**/images/**`
- [ ] Build check in `.eleventy.js`: **fail build** if any box README is missing
      `title`/`os`/`difficulty`/`technique`/`date`, or any CTF README is missing
      `title`/`event`/`category`/`difficulty`/`technique`/`date`
- [ ] `/writeups/` generated index page — two sections (boxes, CTF challenges), each reading
      its own frontmatter via `collections["writeups-box"]` / `collections["writeups-ctf"]`,
      each sorted by `date` (no separate parser/global data object; the same per-item data
      also feeds each writeup's header in `writeup.njk`)
- [ ] Verify all 11 writeups render with images intact, correct metadata,
      `collections["writeups-box"].length === 7`, `collections["writeups-ctf"].length === 4`
- [ ] No writeup content duplicated between the two repos
- [ ] Weekly Action bumps the submodule pointer via PR; merge is a manual human step
- [ ] Append build-log entry

## Phase 6 — Blog

- [ ] Blog collection config (`src/blog/*.md`)
- [ ] `/blog/` index, per-post layout (`post.njk`)
- [ ] RSS feed
- [ ] Confirm `building-this-site.md` now renders as a real post
- [ ] Append build-log entry

## Phase 7 — Command palette

- [ ] `src/assets/js/commands.js`: vanilla, no dependencies, built from `site.json`
- [ ] `/` and `Ctrl+K` open (guard against firing while focus is in an input/textarea); `Esc` closes; arrow keys + `Enter` navigate
- [ ] Focus management: moves in on open, returns to trigger on close
- [ ] `role="dialog"` + `aria-modal`, `listbox`/`option` + `aria-activedescendant`
- [ ] Discoverability hint (`press / for commands · ? for help`) + `?` overlay
- [ ] Hide palette entry point on touch-primary devices
- [ ] **JS-off pass**: disable JS, navigate entire site by click + Tab only — everything reachable
- [ ] Append final build-log entry

## Cross-cutting verification (run at the end, and spot-checked per phase)

- [ ] `npx @11ty/eleventy --serve` full click-through, all writeups + images
- [ ] Keyboard pass: `/`, `Ctrl+K`, `Esc`, arrows, `Enter`; confirm `/` still types a literal slash in real inputs
- [ ] Screen reader spot check (Orca) on home + one writeup
- [ ] `npm run lint`, `npx html-validate _site`, `npx lighthouse http://localhost:8080 --view` locally
- [ ] Post-deploy check of `https://reimo22.github.io/` incl. writeup images
