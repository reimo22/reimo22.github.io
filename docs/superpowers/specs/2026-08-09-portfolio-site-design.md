# Personal portfolio site — design & implementation plan

## Context

You need a personal portfolio at `https://reimo22.github.io/`, built with a trimmed-down
version of the Chris Titus AI-assisted workflow: spec and task list approved before any
code, a few _real_ CI checkpoints (HTML validation, Lighthouse, link checking), and human
review of diffs before merge. Deliberately excluded: CodeRabbit, Dependabot/CodeQL,
multi-phase roadmap docs, PM bots.

Starting from a blank slate, but not from zero content — two existing assets shape the design:

- `github.com/reimo22/htb-writeups` — a live repo of per-box markdown writeups with images
- `github.com/reimo22/resume` — a Pages project repo whose entire content is a one-line
  meta-refresh redirect to `Kenji_Pinlac_Resume.pdf`, currently serving `/resume/`
- `~/Documents/Resume/` — tailored resume variants (`_dev`, `_sysadmin`, `_sec`)

Decisions already made in brainstorming:

| Decision     | Choice                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Repo / URL   | `reimo22/reimo22.github.io` → `https://reimo22.github.io/` (no base path)                                              |
| HTB writeups | Build-time pull from the existing repo; single source of truth, no drift                                               |
| Blog         | Section at `/blog`, separate from writeups                                                                             |
| Build log    | A per-phase "building this site" post in `/blog`, written as we go                                                     |
| Resume       | One variant (`_sec`) as committed PDF **plus** an HTML version; portfolio takes over `/resume/` from the existing repo |
| Theme        | Purple + gray, TUI aesthetic, **ASCII-art** banners (static art, not animation)                                        |
| Navigation   | Works by clicking links **and** by keyboard, plus `/commands` to jump sections                                         |

Intended outcome: a fast, accessible, genuinely static site that reads as a terminal
session, where the writeups section stays current just by pushing to `htb-writeups`.

---

## Architecture

### Stack: Eleventy 3 (Node 26 already installed)

Chosen over Astro and over plain HTML/CSS/JS. The build-time-pull decision requires a
markdown pipeline, which rules out plain HTML. Between the two SSGs: Eleventy ships **zero
client JS by default**, and the only JS this site needs is one small hand-written command
palette — Astro's islands architecture would be config overhead buying nothing. Eleventy's
directory data cascade also solves the submodule problem cleanly (below).

### Repo layout

```
reimo22.github.io/
├── SPEC.md                      # the approved spec (per your workflow)
├── TASKS.md                     # the approved task list
├── .eleventy.js                 # config: passthrough, collections, markdown
├── .gitmodules                  # htb-writeups pinned as a submodule
├── src/
│   ├── _includes/
│   │   ├── base.njk             # shell: skip-link, nav, ASCII banner slot, footer
│   │   ├── writeup.njk          # per-box layout
│   │   └── post.njk             # per-post layout
│   ├── _data/site.json          # title, URLs, nav/command registry (single source)
│   ├── assets/
│   │   ├── css/main.css         # hand-written; tokens + layout, no framework
│   │   ├── js/commands.js       # command palette + keyboard nav (progressive enhancement)
│   │   └── ascii/*.txt          # ASCII-art banners, included as text
│   ├── index.njk                # home: banner + short intro + entry points
│   ├── about.njk
│   ├── resume.njk               # HTML resume + link to committed PDF
│   ├── resume/kenji-pinlac-security.pdf
│   ├── contact.njk
│   ├── blog/                    # one .md per post, incl. the build log
│   └── writeups/
│       ├── writeups.11tydata.js # cascades layout/permalink/tags into the submodule
│       ├── index.njk            # generated index table (box, OS, difficulty, technique)
│       └── boxes/               # ← git submodule: reimo22/htb-writeups
└── .github/workflows/ci.yml     # validate → lighthouse → links → deploy
```

### The writeups pipeline (the one non-obvious piece)

The submodule is mounted **inside** Eleventy's input directory at `src/writeups/boxes/`, so
Eleventy discovers each `<slug>/README.md` as a template with no glue code. The submodule
itself is never modified — instead `src/writeups/writeups.11tydata.js` sits one level _above_
it and cascades `layout: writeup.njk` and a computed `permalink` of `/writeups/<slug>/` into
every subdirectory.

Images fall out for free: `eleventyConfig.addPassthroughCopy("src/writeups/boxes/**/images/**")`
copies `vaccine/images/dashboard.png` to `/writeups/vaccine/images/dashboard.png`, so the
existing `./images/…` relative links in the markdown resolve unchanged — **no path rewriting
needed.** This is why the submodule goes inside `src/` rather than a `vendor/` folder.

**Two kinds of writeup, not one.** The upstream repo turned out to hold two genuinely
different things: 7 retired-box writeups and 4 CTF-event-challenge writeups, each with its
own template upstream (`TEMPLATE.md` vs `TEMPLATE-ctf.md`) and its own metadata shape — boxes
have `os`, CTF challenges have `event`/`category` instead. An earlier version of this plan
assumed a single flat `tags: "writeups"` collection; that doesn't hold once the CTF
directories are in scope, since their fields don't fit the box schema. So `tags` is computed
per item (`"writeups-box"` vs `"writeups-ctf"`, based on which frontmatter shape the item's
README has), producing two Eleventy collections — `collections["writeups-box"]` and
`collections["writeups-ctf"]` — that the `/writeups/` index renders as two separate sections,
each sorted by its own `date`.

Each box `README.md` carries YAML frontmatter (`title`, `os`, `difficulty`, `technique`,
`date`); each CTF challenge `README.md` carries (`title`, `event`, `category`, `difficulty`,
`technique`, `date`) — added upstream in `htb-writeups`. GitHub hides frontmatter when
rendering, so the READMEs still display cleanly there. This is the site's metadata source for
both kinds — the index sections and each writeup's header read it directly via the relevant
collection; no separate parser or global data object. The root `README.md`'s two tables in
that repo are unaffected and stay as human-facing GitHub navigation — the site never parses
them, so there's no risk of drifting out of sync. The frontmatter schema deliberately avoids
Eleventy's reserved keys (`tags`, `layout`, `permalink`, `eleventyExcludeFromCollections`),
which would otherwise fight the cascade set by `writeups.11tydata.js`.

This does mean touching `htb-writeups` — the original plan called for zero changes there, on
the reasoning that the two repos should have a single source of truth for writeup content.
Adding metadata isn't duplicating content, though, and the alternative (a bespoke table
parser) is more code for the same result. The build **fails** if a box or CTF README is
missing a required frontmatter key for its kind, rather than degrading quietly and shipping a
writeup with blank metadata behind a green check. As of this writing, only the 7 box READMEs
have frontmatter — the 4 CTF READMEs still need it added upstream before this build check can
be turned on, or the build breaks immediately on those four.

Freshness: a submodule pins a commit, so new writeups do **not** appear until the pointer is
bumped. A scheduled weekly GitHub Action opens a PR bumping the submodule — you merge it.
This keeps the human merge gate you asked for instead of silently auto-deploying.

### Navigation contract (the part most likely to go wrong)

Non-negotiable: **the site is fully usable with JavaScript disabled and with a screen reader.**

1. **Layer 1 — real links.** Every section is a real `<a href>` in a real `<nav>`. Tab order
   follows document order. A skip-to-content link is first in the DOM. With JS off, nothing
   is lost except the palette.
2. **Layer 2 — command palette.** `commands.js` (vanilla, ~150 lines, no dependencies) builds
   its command list from the _same_ `site.json` nav registry, so links and commands can't
   drift apart.
   - Opens on `/` or `Ctrl+K`; `Esc` closes; `↑`/`↓` select; `Enter` navigates.
   - **`/` must not fire while focus is in an input/textarea** — otherwise typing a slash
     anywhere is broken.
   - `/` is Firefox's own quick-find key. Intercepting it is fine, but `Esc` must always
     restore normal browsing, and the palette must never trap focus permanently.
   - Focus is moved into the palette on open and **returned to the trigger element** on close.
   - Implemented as `role="dialog"` + `aria-modal`, with results in a `listbox`/`option`
     pattern and `aria-activedescendant` — not a div soup.
3. **Discoverability.** A persistent hint line in the footer/header — `press / for commands ·
? for help` — plus a `?` overlay listing every shortcut. An undiscoverable palette is dead
   weight.
4. **Reduced motion.** Any cursor blink or type-on effect is wrapped in
   `@media (prefers-reduced-motion: no-preference)`.

### Theme: purple/gray TUI + ASCII art

- **Contrast is the trap here.** Gray-on-dark monospace palettes routinely land under 4.5:1.
  The spec states explicit targets: **≥4.5:1 for body text, ≥3:1 for large text and UI
  borders**, verified by the Lighthouse a11y assertion. Purple accents are chosen to clear
  the bar rather than picked by eye.
- Light and dark are both defined via CSS custom properties on `:root` with a
  `prefers-color-scheme` override — no theme is defined _only_ inside a media query.
- **ASCII art is decorative and must not be read aloud.** Each banner block is
  `<pre aria-hidden="true">` immediately followed by a real `<h1>` carrying the text. Banners
  are plain `.txt` files included at build time, `overflow-x: auto` so they never force the
  page to scroll sideways on mobile — with a narrow variant swapped in under ~40rem.
- Monospace stack uses **system fonts only** — no webfont download, no external request.

### Taking over `/resume/` from the existing repo

A repo named `resume` serves `reimo22.github.io/resume/`, and a project repo **shadows that
path on the user site** — so the portfolio's resume page will 404 (or serve the old redirect)
until Pages is disabled on `reimo22/resume`. This is a settings change on that repo, not a
code change, and it must happen as part of phase 4 or the page silently never appears.

**Checked for other collisions:** no repos named `blog`, `about`, `contact`, `writeups`,
`notes`, `cv`, or `projects` exist under `reimo22`, and `reimo22.github.io` doesn't exist yet
— so `resume` is the only path that needs taking over. (`htb-writeups` is safe: the repo name
doesn't match the `/writeups` path.) Worth remembering as a standing rule — creating a repo
named after a top-level path on this site will silently shadow that page.

The migration is designed so **no existing link breaks**:

- `/resume/` → the new HTML resume page (was: a redirect to a PDF)
- `/resume/Kenji_Pinlac_Resume.pdf` → **the exact same URL as today**, now serving the newer
  `_sec` build. Any link on a printed CV, in an email, or in an application form still works.

Keeping the old filename verbatim is deliberate; renaming it to something tidier would break
links you can't recall or recall. The repo itself can be archived rather than deleted, so the
history and the old PDF stay recoverable.

### Mobile

Treated as the primary target, not a resize afterthought — a recruiter opening a link from a
phone is the most likely first visit, and TUI aesthetics are exactly where mobile breaks.

- **Layout is built mobile-first**: base CSS is the narrow layout, `min-width` media queries
  add the wide one. Nothing is designed at desktop and squeezed down.
- **Horizontal overflow is a build-breaking bug, not a nit.** The three things that cause it
  here are all pre-empted: ASCII banners (`overflow-x: auto`, narrow variant under ~40rem),
  the writeups index table (wrapped in its own scroll container, not the page), and long
  command/code lines in writeups (`overflow-x: auto` on `pre`, never on `body`).
- **Touch targets ≥ 44×44px** for every nav link and command-palette row.
- The command palette is a keyboard affordance and is **hidden on touch-primary devices** —
  the `press / for commands` hint is pointless without a keyboard. Nav links remain the
  full-capability path, which the progressive-enhancement contract already guarantees.
- Content is capped around 70–80ch for readability rather than filling ultrawide screens.
- Lighthouse CI runs its **default mobile emulation preset** — so the asserted scores are
  mobile scores. A desktop-only audit would hide exactly the problems worth catching.
- Verified on a real phone-width viewport, not just devtools, before phase 4 closes.

### The build log

The site documents its own construction. `src/blog/building-this-site.md` is created in
**phase 1** — before any site code — and every subsequent phase appends its entry **in the
same PR as the work it describes**. Writing it at the end from memory would produce a
sanitised retrospective; writing it per phase produces a record, and the file's own git
history becomes corroborating evidence that the process actually ran in that order.

It renders as a normal `/blog` post from phase 6 onward. Before that it's just a markdown file
accumulating in the repo — which is fine, and is why it doesn't need the blog machinery to
exist first.

Each entry covers, in three or four short paragraphs:

- **The decision and its alternative.** Not "chose Eleventy" but what Astro would have cost
  and why the writeups pipeline settled it.
- **What the spec said, and where the spec was wrong.** The spec-before-code gate is only
  interesting if it's honest about the cases where reality overruled it. Those are the
  entries worth reading.
- **What CI actually caught.** Concrete red builds and their fixes — a contrast ratio that
  missed by 0.3, an empty writeups section from a missing `submodules: recursive`. "I have CI"
  is a claim; a failed run with a diff is proof.
- **Where AI helped and where the human gate caught it.** The Chris Titus workflow scaled down
  for one person: what the assistant accelerated, what it got wrong, and what only surfaced in
  review. This is the differentiator, and it's the part most build logs are too flattering
  about.

A scope note, not a priority note: the log doesn't stop to write a standalone essay on
accessibility and mobile. Those remain hard requirements of the build and are specified in
`SPEC.md`; they show up in the log when a phase actually collided with them — a failed
contrast check, an overflow bug on a real phone — which is the more convincing form anyway.

The three phase-1 planning documents (`SPEC.md`, `TASKS.md`, the design doc) stay in the repo
and are linked from the post, so a reader can check the claims against the artefacts rather
than taking the narrative's word for it.

---

## CI: four checkpoints with thresholds that can actually fail

One workflow, `.github/workflows/ci.yml`, on PR and on push to `main`. Checkout uses
`submodules: recursive` (the classic failure: an empty writeups section in CI).

| Check           | Tool                                                                 | Pass condition                                                              |
| --------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Lint            | ESLint (flat config) + Stylelint + Prettier `--check` + markdownlint | zero errors                                                                 |
| HTML validation | `html-validate` over `_site/**/*.html`                               | zero errors                                                                 |
| Lighthouse      | `treosh/lighthouse-ci-action` with `assert`                          | **accessibility = 100** (hard), performance / best-practices / SEO **≥ 90** |
| Link checking   | `lycheeverse/lychee-action`                                          | zero broken internal links; external links warn only                        |

**Linting** runs first and fastest, so a formatting nit fails in seconds rather than after a
full build and audit. Scope:

- **ESLint** on `commands.js` and `.eleventy.js` — flat config, `eslint:recommended` plus
  `no-unused-vars` as an error. The palette is the only hand-written JS on the site; it's
  small, security-adjacent (it handles key events and navigates), and worth linting properly.
- **Stylelint** with `stylelint-config-standard` — catches the invalid-property and
  bad-media-query mistakes that fail silently in CSS. `declaration-property-value-no-unknown`
  is on, since a typo'd custom-property fallback is otherwise invisible.
- **Prettier** in `--check` mode over CSS/JS/JSON/Nunjucks so formatting never appears in a
  review diff. `htb-writeups/` is in `.prettierignore` — the submodule is not ours to format.
- **markdownlint** on our own `blog/`, `SPEC.md`, `TASKS.md` only, explicitly **not** on the
  submodule.

All four are also available as `npm run lint` locally, so CI is a backstop rather than the
place you discover problems. A `lint:fix` script covers the auto-fixable subset.

Lighthouse is configured with **assertions, not just a report upload** — a check that cannot
fail is not a checkpoint. But accessibility is the only category asserted at 100: category
scores for performance and SEO wobble by a few points on throttled shared CI runners, and a
gate that fails randomly gets ignored, which is the same as having no gate. A static,
zero-webfont, near-zero-JS site should clear 90 with enormous margin, so a real regression
still trips it.

External links are warn-only on purpose: third-party sites go down or rate-limit CI, and a
red build caused by someone else's outage trains you to ignore red builds. Internal links —
the ones a code change can actually break — are hard-failed.

Node is pinned to a single version in `.nvmrc` and read by `actions/setup-node`, so local and
CI don't diverge on Eleventy 3's requirements.

Deploy to Pages (`actions/deploy-pages`) runs only after all four pass on `main`.

---

## Implementation order

Each phase is a small reviewable PR against `main`, which is protected.

1. **Spec & tasks.** Write `SPEC.md` and `TASKS.md`, plus the brainstorming design doc at
   `docs/superpowers/specs/2026-08-09-portfolio-site-design.md`, and create
   `src/blog/building-this-site.md` with its phase-1 entry. `git init`, first commit.
   _No site code in this PR._
2. **Skeleton + CI.** Eleventy config, base layout, one placeholder page, lint configs, the
   full CI workflow, Pages deploy. Prove the pipeline goes green and the site is live before
   there is any content to debug alongside it.
   **Pages source must be set to "GitHub Actions", not "Deploy from a branch"** — branch
   deploys never run the workflow, so the submodule is never fetched and `/writeups/` would
   ship empty from an apparently healthy repo. The submodule URL stays HTTPS so CI checkout
   needs no deploy key.
3. **Theme.** CSS tokens, purple/gray palette with contrast verified, ASCII banner mechanism,
   mobile-first layout.
4. **Static pages.** Home, About, Contact, Resume (HTML + `_sec` PDF committed as
   `/resume/Kenji_Pinlac_Resume.pdf`). Includes disabling Pages on `reimo22/resume` — do this
   at the same time the portfolio's `/resume/` ships, and verify the takeover immediately.
5. **Writeups.** Add the submodule, the data cascade (two collections: boxes, CTF), image
   passthrough, frontmatter-key build check, generated two-section index. Requires the CTF
   READMEs to get frontmatter upstream first (only the 7 box READMEs have it so far).
6. **Blog.** Blog collection, `/blog` index, per-post layout, RSS feed. This is the phase that
   makes the already-accumulating build log actually render.
7. **Command palette.** Built last, on top of a site that already works without it — which is
   the only way to be sure it's genuinely an enhancement.

**Every phase from 1 onward ends by appending its entry to `src/blog/building-this-site.md`
in the same PR** — see below.

## Verification

- `npx @11ty/eleventy --serve` — click every nav link; confirm each writeup renders with its
  images; confirm the index lists all 7 boxes and all 4 CTF challenges, in their own sections.
- **JS-off pass:** disable JavaScript in Firefox and navigate the entire site by clicking and
  by Tab alone. Everything reachable. This is a hard gate on phase 7.
- **Keyboard pass:** `/`, `Ctrl+K`, `Esc`, arrows, `Enter`; then confirm `/` types a literal
  slash inside the contact form / any input.
- **Screen reader spot check** (Orca) on home + one writeup: banner silent, heading announced,
  palette announced as a dialog.
- **Mobile pass:** load the deployed site on an actual phone, not just devtools. Every page
  gets scrolled top to bottom checking for _any_ horizontal scroll — home banner, writeups
  index table, and a writeup with long command output are the three likely offenders. Tap
  every nav link and confirm nothing needs a precise tap.
- `npm run lint`, `npx html-validate _site`, and `npx lighthouse http://localhost:8080 --view`
  locally before pushing; CI re-runs all of them plus lychee.
- Post-deploy: load `https://reimo22.github.io/` and re-check one writeup's images (catches
  passthrough mistakes that only appear in production).
- **Resume takeover:** after disabling Pages on `reimo22/resume`, confirm `/resume/` serves
  the new HTML page and `/resume/Kenji_Pinlac_Resume.pdf` still downloads. Hard-refresh —
  the old meta-refresh redirect caches aggressively.

## Open items (non-blocking, decide during implementation)

- Exact purple/gray hex values — chosen in phase 3 against the stated contrast targets.
- Contact method: mailto to `reimo14@proton.me` vs. a form service. Default is mailto plus
  GitHub/LinkedIn links — no third-party JS, nothing to break.
- Whether blog posts and writeups share a tag vocabulary. Default: they don't; keep them
  separate as decided.
