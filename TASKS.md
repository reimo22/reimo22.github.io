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
- [ ] Disable Pages on `reimo22/resume` (archive, don't delete)
- [ ] Verify `/resume/` serves the new page and the PDF URL still resolves (hard-refresh — old redirect caches aggressively)
- [ ] Mobile pass on all pages so far: real phone viewport, no horizontal scroll, touch targets ≥44px
- [x] Append build-log entry

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
- [ ] `npm run lint`, `npx html-validate _site`; with the site served on :8080, `npm run audit:lighthouse` writes a local report to `.lighthouseci/report.html` and opens it (CI gates stay authoritative)
- [ ] With the site served on :8080, `npm run audit:banner` runs the 280→1500px
      banner sweep in both themes (see Phase 3.5); same `CHROME_PATH` +
      `LD_PRELOAD` handling as the Lighthouse script
- Local Lighthouse bootstrap (one-time, per machine): `npx @puppeteer/browsers install chrome-headless-shell@stable`, point `CHROME_PATH` at the binary in `.claude/settings.local.json`, and always audit via the npm script — it clears `LD_PRELOAD` (hardened_malloc on secureblue crashes Chromium's allocator) and passes `--no-sandbox` (the shell can't set up its sandbox here)
- [ ] Post-deploy check of `https://reimo22.github.io/` incl. writeup images
