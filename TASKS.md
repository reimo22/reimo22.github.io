# TASKS — reimo22.github.io

Each phase is one small, reviewable PR against `main`. Every phase from 1 onward
ends by appending a build-log entry to `docs/build-log-reference.md` in the same PR.
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
- [x] Confirm CI goes green and the site is live at `reimo22.github.io`
- [x] Append build-log entry

## Phase 3 — Theme

- [x] `src/assets/css/main.css`: custom-property tokens (light + dark) — light mode retheme to off-white/monochrome (`#f7f5f0`/`#201e1a`) after a post-ship contrast complaint; dark mode keeps the original purple/gray palette
- [x] Verify contrast: ≥4.5:1 body text, ≥3:1 large text/UI borders — recomputed for the new light-mode pair (21.6:1 fg/bg)
- [x] ASCII banner mechanism: `.txt` files in `src/assets/ascii/`, `<pre aria-hidden="true">` + real `<h1>` — banner redesigned as dino+cactus (light) / dino+stars+moon+shooting-stars (dark) at ≥40rem, dino-only below it in both themes (was: swapping wordmark art)
- [x] Mobile-first layout: base = narrow, `min-width` queries add wide layout
- [x] `prefers-reduced-motion` gating for any motion effects
- [x] Append build-log entry

## Phase 3.5 — Theme toggle + banner continuous crop

Design approved 2026-08-12:
[`docs/superpowers/specs/2026-08-12-theme-toggle-and-banner-crop-design.md`](docs/superpowers/specs/2026-08-12-theme-toggle-and-banner-crop-design.md).
Supersedes `docs/superpowers/plans/2026-08-10-banner-responsive-nits.md`.
Numbered 3.5 because it reworks Phase 3's banner rather than adding a section.

- [x] Blocking inline script in `<head>`: `.js` class on `<html>` + `data-theme`
      from `localStorage` before first paint (no flash of wrong theme)
- [x] Restructure theme tokens: dark is the default on bare `:root`,
      `[data-theme="light"]` is the only override — every theme-varying rule
      (banner swap, nav underline, toggle glyph) is a custom property, so no
      rule outside the two token blocks carries a theme selector
- [x] Sun/moon toggle `<button>` top right in `<header>`, `aria-label` updated on
      toggle, icon `aria-hidden`, hidden entirely without JS
- [x] Same treatment for the `.banner-light` / `.banner-dark` swap (currently
      driven by the same media query)
- [x] Build-time cactus strip from `cactus.txt`: trim col 15 → repeat
      contiguous (concatenated per line, one `<pre>`) → cut into the last tile
      at column 45; generated, never committed as a second art file —
      `cactusStrip` shortcode. Tiles grow the strip **leftward** (the cut is
      measured into the last tile), so the right edge is byte-identical at any
      tile count — load-bearing, because `moonAboveHorizon` composites against
      that edge. Now 5 tiles (~2700px) so the ground line reaches the banner's
      left edge on a 2560px display rather than starting mid-frame
- [x] ~~Crop zone: `flex:1 1 auto; min-width:0; overflow:hidden;
justify-content:flex-end` — `min-width:0` is the actual slider fix~~
      — **superseded on human instruction:** there is no crop-zone element at
      all. Both scenes are a stack of full-width absolutely-positioned layers
      (`.banner-sky`, `.banner-ground`, and the dino) that overflow leftward and
      clip; `.banner-row` / `.banner-crop` are gone. Reserving an elastic lane
      for the art was what sliced the moon at narrow widths — it only ever got
      the width left over after the dino
- [x] Delete `.banner-extra` (7 usages in `index.njk` + `main.css` rules),
      `.moon { margin-right }`, and change `.banner pre` `overflow-x: auto` →
      `hidden`
- [x] `.banner pre { margin: 0 }` — the old `0 0 0.5rem` joined the flex row's
      cross size and would have broken height normalization by 8px; the
      breathing room moved to `.banner`'s padding (not in the design doc — see
      the build log)
- [x] ~~Moon pinned right, hidden below a **measured** threshold:
      `@container banner (width < 66ch)`; the moon appears at a 698px viewport~~
      — **superseded on human instruction:** the moon no longer disappears at
      any width, and the container query is gone. Under the layered model it
      has the full banner width to sit in, so at 371px the whole disc fits;
      only past that does it lose columns from the left, cut on a cell
      boundary, like every other piece of art
- [x] Banner `min-height` 18.7rem, outside any media query, identical in both
      themes so toggling never moves the page — measured 299.19px, a single
      value across 280→1500px in both themes
- [x] Shooting stars at every width, count 4 / 3 / 2, travel distance scaled with
      count; keep the `prefers-reduced-motion` gate
- [x] Port the width sweep into the repo as a script (see the design doc's
      Verification section for the assertions that can actually fail — **not**
      `scrollWidth <= clientWidth`, which passes unconditionally here) —
      `scripts/sweep-banner.mjs`, `npm run audit:banner`
- [x] Contrast re-check in both themes, now that both are reachable on one machine
- [x] JS-off pass: toggle absent, site still themes dark (the CSS default)
- [x] Dark scene horizon: the moon rises **behind** the cactus ridge. Occlusion
      is subtraction from the art at build time (`moonAboveHorizon` shortcode
      blanks every moon cell at or below the strip's per-column silhouette), not
      paint order — a `<pre>` has no background and hides nothing behind it.
      Exact because the moon and the strip share the banner's right edge and its
      bottom, so the offset is zero columns in any monospace font. `moon.txt`
      stays unmodified source; an earlier hand-crop of it is recorded in the
      build log
- [x] `starField` shortcode holds the stars above the desert floor by a row-only
      rule — the field sits a 1.5rem gap (~2.5 columns) off the moon, so its
      column alignment is font-dependent and can't be composited
- [x] `starField` tiles to the cactus strip's full width through the same
      pad → repeat → cut pipeline, so stars reach the banner's left edge instead
      of leaving the left third of the sky empty (verified to 2560px). Padding
      before tiling is load-bearing: right-trimming first shears the field, each
      row by a different amount. Each tile rotates the band's rows one step, so
      the pattern repeats every `tiles × skyRows` columns rather than every tile
- [x] ~~`.banner-ground` starts at `calc(17ch + 1.5rem)`, not the banner edge~~
      — **superseded on human instruction:** every layer spans the full width,
      so the desert floor reaches the banner's left edge at every width.
      Reserving a column for the dino cut a full-height hole in the sky and
      left the horizon stopping short
- [x] Layers snap to whole character cells (`width: round(down, 100%, 1ch)`)
      so the left-hand clip lands on a cell boundary instead of slicing glyphs
      in half down the edge; asserted by the sweep, which fails at 4.76px off
      grid without it
- [x] Light scene restructured to the same layered model, so the two scenes
      differ only in content and the toggle no longer changes composition
- [x] ~~The dino wears a background-coloured `text-shadow` halo (eight hard 3px
      offsets, not a blur) and sits above the ground layer, so the cactus
      behind it stays visible between its strokes instead of being knocked out
      by a rectangle~~ — **superseded on human instruction:** the halo hugs
      strokes and so does nothing about cactus landing in the dino's _hollow_,
      which read as a tangled mesh at some widths. Occlusion is now an opaque
      `::before` patch, and the halo has been **deleted** — the patch is opaque
      across his whole box and a cell beyond it, so no cactus reached him to be
      haloed against. Removal verified at 320/440/853/1060/1100/1140/1180/2560
      in both themes (the widths where a cactus sits nearest him): no change
- [x] Dino knockout: `.dino::before`, the 7 sub-horizon scene rows (10-16), so
      it erases cactus trunks and touches neither the ground line nor the sky.
      7 rows not the dino's 5, or a cut trunk leaves its crown floating.
      Requires `.banner pre.dino { overflow: visible }` — the plain `.dino`
      selector loses specificity to `.banner pre`, and that rule's
      `overflow: hidden` silently clips the overhang away
- [x] The knockout's right edge fades over six cells rather than ending hard.
      A hard edge bisects whatever cactus straddles it (amputated half at 440px,
      trunk clipped against the dino's nose at 853px); snapping to a gap between
      cacti needs the strip's phase, which is viewport-dependent and knowable
      only at runtime. Verified across a full 58ch phase period (700→1260px)
- [x] Rejected: build-time subtraction (`moonAboveHorizon`-style) for the dino.
      Exact only for right-anchored art; the dino is left-anchored against a
      right-anchored strip, so the offset is a function of viewport width. And
      per-glyph subtraction would not read as depth anyway — area does, coverage
      does not. Also rejected: a cut-out transparent PNG of the dino
- [x] Repair `audit:banner`, which had been dead: it queried `.banner-row` in the
      dark scene (renamed `.banner-sky`) and crashed, and its child-overflow sum
      omitted the flex gaps that the over-wide moon was escaping through
- [x] Append build-log entry (same PR as the work)
- [x] Human browser check before merge (the one item CI can't cover) — confirmed
      2026-08-13; the two failing widths CI missed (853, 440) came out of it

## Phase 4 — Static pages

- [x] `/resume/`: combined profile and HTML resume; shared footer email; commit `_sec` PDF as `/resume/Kenji_Pinlac_Resume.pdf` (same filename as the old repo, new content)
- [x] Disable Pages on `reimo22/resume`
- [x] Verify `/resume/` serves the new page and the PDF URL still resolves (hard-refresh — old redirect caches aggressively)
- [x] Mobile pass on all pages so far: real phone viewport, no horizontal scroll, touch targets ≥44px —
      swept `/`, `/about/`, `/resume/` at 360/390/430px in both themes via a headless-Chrome script
      (same `puppeteer-core` + `CHROME_PATH` setup as `audit:banner`); found and fixed two touch-target
      bugs: `.footer-contact .icon-link`'s `min-width/height: auto` override shrank the footer's email/
      GitHub icons to 20×20, and `.skip-link` measured 42px tall against the 44px floor
- [x] Append build-log entry

## Phase 4.1 — Rename `/resume/` to `/about/`

- [x] Discovered post-merge: `reimo22/resume`'s Pages was still live and public
      despite the repo going private, shadowing this site's `/resume/` with a
      stale 404 — `gh api -X DELETE repos/reimo22/resume/pages` unpublished it
- [x] Move the combined profile/resume page from `/resume/` to `/about/`;
      commit PDF now at `/about/Kenji_Pinlac_Resume.pdf`
- [x] `/resume/` becomes a same-site meta-refresh stub to `/about/`, so old
      links and bookmarks still land somewhere
- [x] Update nav (`site.json`), `SPEC.md`, this file
- [x] Append build-log entry
- [x] Human browser check before merge: `/about/`, `/resume/` redirect, PDF
      link from both

## Phase 4.2 — About page contact icons

- [x] Move email (currently footer-only) to the top of `/about/`, alongside
      the existing GitHub link
- [x] Replace both the email and GitHub link with icons instead of raw text/URL
- [x] Apply the same icon treatment to the shared footer (email and GitHub
      links on every page)

## Phase 4.3 — Testing infrastructure

- [x] No test framework or convention exists yet — introduce one (Node's
      built-in `node:test` + `jsdom` for DOM cases), an `npm run test` script,
      and CI wiring, rather than scoping tests to only the code one phase
      touched
- [x] Unit tests for `.eleventy.js`'s pure banner/ascii-art helpers
      (`rightTrim`, `withNonEmptyLastLine`, `escapeHtml`, `toGrid`,
      `horizonByColumn`, `groundRow`, `toSceneGrid`) and the `ascii`,
      `cactusStrip`, `moonAboveHorizon`, `starField` shortcodes end-to-end
      against the real committed ascii assets
- [x] DOM tests for `theme.js`: defaults to dark, toggle click sets
      `data-theme` + `localStorage` + swaps the `aria-label`, a second click
      reverts, respects a `data-theme` already set on `<html>`, no-ops when
      the toggle button is absent
- [x] Icon markup check: every `icons.iconLink(...)` call site resolves to a
      `_dark.png`/`_light.png` pair that actually exists in
      `src/assets/img/icons/`, and always passes a non-empty label
- [x] Document `npm run test` in `CLAUDE.md`'s Commands section

## Phase 5 — Writeups

- [x] Add `htb-writeups` as a git submodule at `src/writeups/boxes/` (HTTPS URL) — added at
      `eeb0d72` (2026-08-09), which already includes the CTF frontmatter. Verified all 11
      READMEs carry complete frontmatter (`title`/`os`/`difficulty`/`technique`/`date` for
      boxes; `title`/`event`/`category`/`difficulty`/`technique`/`date` for CTF). The "4 CTF
      challenges still don't" note below was stale by then — no upstream PR needed
- [x] Get CTF-challenge frontmatter added upstream — already landed in `eeb0d72`, see above
- [x] `src/writeups/writeups.11tydata.js`: cascade `layout: writeup.njk` and a computed
      `permalink` of `/writeups/<slug>/` (from `data.page.filePathStem`'s parent dir, not
      `fileSlug` — that reads "README"). **Do NOT** set `tags` via `eleventyComputed` — this
      was tried and empirically fails: Eleventy 3.1.6 builds collections from `tags` before
      computed data resolves, so computed-tag collections come out empty. Build the two
      collections (`writeups-box` / `writeups-ctf`) in `.eleventy.js` instead via
      `eleventyConfig.addCollection` + `getFilteredByGlob("src/writeups/boxes/*/README.md")`,
      filtered per item on `data.os` presence — matches the design doc's "derived from which
      frontmatter shape the item has", just configured at install time, not in the cascade
- [x] `addPassthroughCopy` for images — **the design doc's glob is wrong**: a scratch build
      proved `"src/writeups/boxes/**/images/**"` keeps the `boxes/` segment in output
      (`_site/writeups/boxes/<slug>/images/…`), so relative `images/…` links in the READMEs
      404; and object-form `{ glob: "writeups" }` flattens files into `_site/writeups/`
      (collides on boxes sharing a filename, e.g. login.png). Working mechanism (verified):
      loop `src/writeups/boxes/*/images` at config time and
      `addPassthroughCopy({ [dir]: "writeups/<slug>/images" })` per box. Note: passthrough
      copy does **not** respect `.eleventyignore` — but the per-box object form only touches
      image dirs, so `.git/`, root `README.md`, and `TEMPLATE*.md` never get copied
- [x] `.eleventyignore` (new file) — `src/writeups/boxes/*.md` and `src/writeups/boxes/.git/**`
      (the submodule root's README + the two frontmatter templates are not writeups; verified
      the ignore is respected and `.git` stays out)
- [x] Build check in `.eleventy.js`: **fail build** if any box README is missing
      `title`/`os`/`difficulty`/`technique`/`date`, or any CTF README is missing
      `title`/`event`/`category`/`difficulty`/`technique`/`date`. Pure validator the tests can
      call should be a small exported function (e.g. `missingFrontmatterKeys(frontmatter)` in
      `.eleventy.js`); wire it into an `eleventyConfig.on("eleventy.before", …)` hook. Use
      `gray-matter` (already a transitive dep of 11ty, present in node_modules at 4.0.3) so
      the check parses frontmatter exactly as Eleventy does
- [x] `/writeups/` generated index page — **file must live at `src/writeups.njk` (site root),
      not `src/writeups/index.njk`**: a parent-directory data file cascades into a sibling
      `index.njk` too, which would inherit `writeup.njk`'s layout and permalink. `src/writeups.njk`
      with `permalink: /writeups/` sits outside the cascade. Two sections (boxes, CTF
      challenges), each reading the collections above, each sorted by `date` incl. nav entry
      in `src/_data/site.json`; the same per-item data feeds each writeup's header in `writeup.njk`
- [x] `writeup.njk` layout: `{% extends "base.njk" %}`, header meta from per-item frontmatter,
      then `{{ content | safe }}`. All 11 READMEs already start their body with a `# Title`
      H1 — so do **not** emit a second `<h1>` from frontmatter (duplicate H1); either rely on
      the markdown's own H1 or strip the leading one. OK for fonts/images to resolve relative
- [x] Verify all 11 writeups render with images intact, correct metadata,
      `collections["writeups-box"].length === 7`, `collections["writeups-ctf"].length === 4`
- [x] No writeup content duplicated between the two repos
- [x] Weekly Action bumps the submodule pointer via PR; merge is a manual human step
- [x] Append build-log entry

## Phase 5.1 — Code blocks + copy button

Design: [`docs/superpowers/specs/2026-08-16-codeblocks-and-copy-design.md`](docs/superpowers/specs/2026-08-16-codeblocks-and-copy-design.md).
Rides on the Phase 5 PR: writeup `<pre>` blocks were completely unstyled
(same color/background as prose), with no copy affordance.

- [x] `--code-bg` token in both theme blocks; `main pre` framed (background,
      border, radius, its own `overflow-x: auto` so wide lines scroll inside
      the block, not the page); `main code:not(pre code)` gets a translucent
      inline tint (excludes fenced-block code, which already has `main pre`'s
      background — an earlier version without the exclusion doubled up into a
      mismatched gray patch). Scoped to `main` so the banner's ASCII-art
      `<pre>`s (which live in `<header>`) are untouched
- [x] `.codeblock` wrapper + `.codecopy` button, 44px touch target (floating,
      not reserved-space — an earlier `padding-top` approach inflated every
      wrapped block's height): the button element is the full 44px hit area,
      kept invisible; `.codecopy-label` is the small visible pill inside it.
      `.codeblock pre { min-height: 3.75rem; display: flex; align-items: center }`
      keeps the button contained on short blocks and keeps a one-liner's code
      vertically centered instead of top-pinned with dead space below
- [x] `src/assets/js/codecopy.js`: wraps every `main pre` in a `.codeblock`
      with a Copy button at load time (progressive enhancement — JS-off pages
      still get the framed, scrollable block from CSS alone, just no button).
      One delegated `document` click listener, not per-block, since a single
      writeup can have 20 blocks. `navigator.clipboard.writeText` with a
      temp-`textarea` + `execCommand("copy")` fallback; label flips
      Copy → Copied/Copy failed for ~2s with a re-entrant timer guard
- [x] `test/codecopy.test.js`: wraps main pre only (not the banner), no-ops
      with none present, copies exact block text via both the Clipboard API
      and the fallback path, label timeout, failure state
- [x] `npm run test`, `npm run lint`, `npm run build`, `npx html-validate _site`
- [x] Append build-log entry
- [x] Resolve header/body metadata overlap: `writeup.njk`'s `resume-header`
      now renders only `technique` and `Completed {{ date }}` —
      `os`/`event`/`category`/`difficulty` dropped, since every README body
      already states them in its own bold block right under the `# Title` H1
      (upstream submodule content, can't be edited from here). Verified across
      all 11 READMEs that only those two fields aren't already duplicated in
      the body. `/writeups/` index page keeps all four fields in its list
      rows, unaffected — this only trims the per-writeup page header

## Phase 6 — Blog

- [x] Split the build log: `src/blog/building-this-site.md` (1000+ lines
      across 15+ entries) is too long for anyone to actually read as a post.
      Rewrite it as a narrative essay covering the full build process and
      decisions, and move the verbose version (every fix, every rejected
      approach, every human-vs-AI correction) to a new
      `docs/build-log-reference.md`, not built by Eleventy, alongside the
      other `docs/superpowers/` planning docs. Migrate all existing entries
      into both files rather than starting the split from Phase 6 onward.
      Update `SPEC.md`'s "Build log" section and `CLAUDE.md`'s doc pointers
      to describe the two-tier convention
- [x] Blog collection config (`src/blog/*.md`) — `src/blog/blog.11tydata.js`
      cascades `layout: post.njk`; `addCollection("blog", ...)` in
      `.eleventy.js` (same `getFilteredByGlob` pattern as the writeups
      collections, not `tags`, for the same computed-data-ordering reason)
- [x] `/blog/` index (`src/blog.njk`), per-post layout (`src/_includes/post.njk`)
- [x] RSS feed — hand-rolled `src/feed.njk` at `/feed.xml`, no new dependency;
      `rfc822Date` filter added alongside the existing `isoDate` for `<pubDate>`
- [x] Confirm `building-this-site.md` now renders as a real post — `draft`,
      `permalink: false`, and `eleventyExcludeFromCollections` removed;
      verified `_site/blog/building-this-site/index.html` renders with nav,
      footer, and the trimmed content, and appears in `/blog/`'s list
- [x] Append build-log entry (narrative essay in the post; detail in the
      reference doc, per the new convention above)

### Post-merge: convert blog symlinks to real files

Both `src/blog/*.md` files are currently symlinks into the Obsidian vault.
CI (and any clone without the vault) silently skips them — the posts vanish
from `/blog/` with no error. Copy the real files into the repo and remove the
symlinks. A vault→repo sync script can follow as a separate concern.

## Phase 6.1 — Finalize pending blog posts

- [x] `testing-a-bunch-of-tools-to-stretch-my-claude-code-subscription.md`:
      already `status: evergreen` with no TODOs — post is publish-ready
- [x] Verify `/blog/testing-a-bunch-of-tools-to-stretch-my-claude-code-subscription/`
      builds and renders (default permalink from filename, same convention as
      `building-this-site.md`)
- [x] `npm run build` + spot check both posts render correctly in `/blog/`
      and the RSS feed
- [x] Convert blog symlinks to real files (post-merge note in TASKS.md)

## Phase 6.2 — External links open in a new tab

- [x] Audit every external link (footer/about GitHub + email icons, resume
      PDF, writeup upstream links, blog post links) and open them in a new
      tab (`target="_blank" rel="noopener noreferrer"`) instead of replacing
      the current page; internal site links stay same-tab
- [x] Append build-log entry

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

- [ ] Write `README.md` — what the site is, tech stack, how to run locally
- [ ] Create `robots.txt` — standard crawl directives
- [ ] Create site-level `llms.txt` — structured metadata for AI agents (useful for scrapers to understand site content and navigation; value is limited for a static site but costs nothing)

- [ ] `npx @11ty/eleventy --serve` full click-through, all writeups + images
- [ ] Keyboard pass: `/`, `Ctrl+K`, `Esc`, arrows, `Enter`; confirm `/` still types a literal slash in real inputs
- [ ] Screen reader spot check (Orca) on home + one writeup
- [ ] `npm run lint`, `npx html-validate _site`; with the site served on :8080, `npm run audit:lighthouse` writes a local report to `.lighthouseci/report.html` and opens it (CI gates stay authoritative)
- [ ] With the site served on :8080, `npm run audit:banner` runs the 280→1500px
      banner sweep in both themes (see Phase 3.5); same `CHROME_PATH` +
      `LD_PRELOAD` handling as the Lighthouse script
- Local Lighthouse bootstrap (one-time, per machine): `npx @puppeteer/browsers install chrome-headless-shell@stable`, point `CHROME_PATH` at the binary in `.claude/settings.local.json`, and always audit via the npm script — it clears `LD_PRELOAD` (hardened_malloc on secureblue crashes Chromium's allocator) and passes `--no-sandbox` (the shell can't set up its sandbox here)
- [ ] Post-deploy check of `https://reimo22.github.io/` incl. writeup images
