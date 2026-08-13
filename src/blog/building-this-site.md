---
title: Building this site
date: 2026-08-09
tags: [meta]
draft: true
permalink: false
eleventyExcludeFromCollections: true
---

<!--
This post accumulates one entry per implementation phase, appended in the same
PR as the work it describes — not written afterward from memory. It starts
rendering as a real /blog page in Phase 6, once the blog collection exists.
`draft: true` is removed then.
-->

I'm building this portfolio using a trimmed-down version of
[Chris Titus's AI-assisted dev workflow](https://christitus.com/my-ai-workflow/):
agree a spec and task list before any code gets written, run a few CI checks
that can genuinely fail, and review every diff by hand before it merges. Full
docs: [`SPEC.md`](https://github.com/reimo22/reimo22.github.io/blob/main/SPEC.md),
[`TASKS.md`](https://github.com/reimo22/reimo22.github.io/blob/main/TASKS.md), and the
[design doc](https://github.com/reimo22/reimo22.github.io/blob/main/docs/superpowers/specs/2026-08-09-portfolio-site-design.md)
this was built from.

## Phase 1 — Spec & tasks

No site code yet — this phase is entirely planning. Before writing anything,
Claude and I went through a brainstorming pass (one clarifying question at a
time) to pin down scope: what sections the site needs, what already exists
that the design has to account for, and where the tradeoffs actually are.

**What existed already, and how it changed the design.** I don't have a blank
slate — two live GitHub repos shape this build:

- `htb-writeups`, a separate repo of markdown HTB box writeups with images.
  I wanted these on the portfolio but didn't want to duplicate content or
  maintain two copies. That single constraint decided the tech stack: it rules
  out plain HTML (need a markdown pipeline) and rules out Astro (its islands
  architecture buys nothing when the only client JS on the whole site is one
  small command palette). Eleventy, pulling the writeups repo in as a git
  submodule at build time, was the option that didn't fight the constraint.
- `resume`, a repo whose entire content is a one-line meta-refresh redirect to
  a PDF, currently serving `reimo22.github.io/resume/`. This wasn't mentioned
  in the plan until I caught it myself and told Claude directly — a project
  repo named after a path this site wants will _silently_ shadow that path.
  Worth calling out as exactly the kind of thing a spec-first process is
  supposed to catch before code, not after a confusing deploy.

**Where AI helped, and where I had to redirect it.** The initial plan drafted
a Lighthouse gate with all four categories (accessibility, performance,
best-practices, SEO) hard-asserted at ≥95. A review pass caught that this is
close to useless on shared CI runners — performance/SEO scores wobble a few
points run to run, and a gate that fails randomly gets ignored, which is the
same as not having a gate. Revised to: accessibility hard-locked at 100,
everything else at ≥90 with real margin for a static, near-zero-JS site to
clear.

The writeups pipeline went through a correction too, worth recording
accurately rather than glossing over. The decision I'd actually made was
"single source of truth, no drift" between this site and the separate
`htb-writeups` repo — I never said the _upstream_ repo couldn't change, only
that writeup content shouldn't be duplicated. An early draft of the plan
turned that into a stronger, unstated rule — "never touch `htb-writeups`" —
and built a bespoke parser for the upstream root README's summary table to
work around it. On review that constraint didn't hold up: adding YAML
frontmatter to each box's `README.md` isn't duplicating its content, and it's
strictly less code than a parser that has to fail the build on every table
mismatch. So the plan changed — frontmatter now lives on each writeup
upstream and is the site's one metadata source, the summary table stays as
plain GitHub navigation nobody parses, and the parser came out of the design
entirely. Recording the correction here rather than quietly redoing it, since
that's the whole point of writing this log as I go rather than after the
fact.

Next: Phase 2 stands up the Eleventy skeleton and the CI pipeline itself,
before there's any real content to debug alongside it.

## Phase 2 — Skeleton + CI

Eleventy 3, a minimal `base.njk` shell (skip-link, nav from `site.json`, empty
banner slot for Phase 3, footer), and a placeholder home page — plus the full
five-tool lint suite and the six-job CI workflow from the SPEC, all wired
before there's any real content to break them on.

**This file almost broke its own build.** The moment `.eleventy.js` existed,
Eleventy started treating this markdown file as a real page and wrote it to
`_site/blog/building-this-site/index.html` — as a bare fragment with no
`<html>`/`<head>`/`<body>`, since it has no layout yet. `html-validate` would
have failed on it immediately. The SPEC already says this file "starts
rendering as a real `/blog` post once the blog collection exists (Phase 6)",
so the fix was to make the build match what was already decided:
`permalink: false` and `eleventyExcludeFromCollections: true` in its front
matter, both removed in Phase 6 alongside `draft: true`.

**Prettier and html-validate disagreed on HTML style, not substance.**
`html-validate:recommended` wants `<!DOCTYPE html>` uppercase and explicit
self-closing `<meta />` tags expanded to omitted end tags; Prettier's own HTML
conventions (and hand-written templates following them) do the opposite.
Neither is a real defect, so `.htmlvalidate.json` turns off `doctype-style`,
`void-style`, and `no-trailing-whitespace` — style-only rules — while leaving
every substantive and accessibility rule from the recommended set enforced.

**Lychee's `fail` input is all-or-nothing per step, not per link.** The SPEC
wants broken internal links to fail the build and broken external links to
only warn. The action itself doesn't distinguish the two in one run, so the
`lychee` job runs it twice against the same build output: once with
`--offline` (which only resolves local file links, so external URLs can't
even be attempted) and `fail: true`, then again without `--offline` and
`fail: false` for the external-link pass.

**What I couldn't verify locally.** This sandboxed dev environment has no
Chrome/Chromium binary and no way to install one, so `@lhci/cli`'s own
healthcheck fails before it can launch anything — the Lighthouse assertions
in `lighthouserc.json` are unverified until the `lighthouse` job actually
runs in Actions, which does provision its own Chrome. Everything else — the
Eleventy build, all four lint tools, and `html-validate` — passed locally
first.

Next: push, watch CI go green (or fix what it catches that this environment
couldn't), and confirm the placeholder is actually live at
`reimo22.github.io` before starting Phase 3's theme work.

## Phase 3 — Theme

Purple/gray TUI theme: CSS custom-property tokens for light and dark, a build-time ASCII
banner shortcode, mobile-first layout, and a `prefers-reduced-motion`-gated blinking cursor.

**Contrast was computed before writing any CSS, not tuned after a failing Lighthouse run.**
The design doc flagged gray-on-dark monospace palettes as the likely trap, so the token
values were picked by running the WCAG relative-luminance formula against candidate hex pairs
first — both border tokens needed lightening from an initial guess to clear the 3:1
UI-border target before they ever reached a browser.

**The ASCII banner is real generated art, not hand-typed text.** `pyfiglet`'s "small" and
"mini" fonts produced the wide and narrow variants; both are committed as static `.txt` files
read at build time via an `{% raw %}{% ascii "name" %}{% endraw %}` shortcode — `pyfiglet` itself never becomes a
runtime or npm dependency. The wide/narrow swap at the ~40rem breakpoint is pure CSS
(`display: none` on one `<pre>` or the other), so it degrades correctly with JS disabled,
matching the progressive-enhancement contract from Phase 1.

**Eleventy's Liquid preprocessor parsed the shortcode name inside this very file.** Writing
the literal text `{% raw %}{% ascii "name" %}{% endraw %}` in a Markdown code span above was
enough for Eleventy to try to invoke it as a real shortcode call, even inside the code span —
Liquid preprocessing runs before Markdown rendering strips fenced/inline code from
consideration. That broke the build with a shortcode-not-found error until the literal text
was itself wrapped in `{% raw %}...{% endraw %}`, which is why that tag shows up verbatim in
the prose above instead of being invisible markup.

Next: Phase 4 adds the static pages (`/about/`, `/contact/`, `/resume/`) on top of this theme,
plus taking over `/resume/` from the old redirect repo.

## Phase 3 follow-up — Banner redesign

Visual review of the shipped purple/gray theme surfaced a problem the WCAG math didn't catch:
light mode's palette passed every contrast ratio numerically but still read as washed-out —
pale purple-on-lavender looks worse than its ratio suggests. Several rounds of mockup
iteration in a shared Artifact (not itself part of the repo) landed on a different split:
light mode drops the purple accent entirely for an off-white/monochrome look
(`#f7f5f0`/`#201e1a`, 21.6:1, underlined links standing in for a color accent), while dark mode
keeps its original palette untouched and instead gets a new banner composition — the existing
ASCII dino at the left, a cratered moon at the right, a static star field between them, and four
animated shooting stars layered over the scene.

**The moon art is a real photo, not hand-drawn.** A small Pillow script cropped a public-domain
NASA/JPL/USGS Galileo photo of the full moon (Dec 7, 1992) to its content bounding box and
mapped luminance to a 10-character density ramp, so the crater shading in `moon.txt` is
measured from the source image rather than eyeballed. The dino silhouette was left as-is from
the original Phase 3 implementation — an SVG-traced alternative was drafted during mockup
review but the plain ASCII version was preferred and kept.

**The two banners are both always in the DOM.** Nunjucks builds are static — there's no
`prefers-color-scheme` at template-render time, only in the browser. So `index.njk` renders a
`.banner-light` block and a `.banner-dark` block unconditionally, and `main.css`'s existing
`@media (prefers-color-scheme: dark)` override toggles which one is `display: none`, the same
pattern already used for the `.banner-wide`/`.banner-narrow` swap.

**The shooting stars' per-instance offsets moved from inline `style` to `:nth-of-type` CSS.**
The first pass wrote each star's position/timing as inline custom properties
(`style="top: ...; --dx: ...`), which is how the mockup did it — but `html-validate`'s
`no-inline-style` rule (part of the recommended set already enforced since Phase 2, see above)
rejected it. Four `.shooting-star:nth-of-type(n)` rules carry the same four sets of values
instead; the markup is just four identical `<span class="shooting-star">✦</span>` tags.

**Still unverified: real browser rendering.** Same constraint as Phase 2 — no Chrome/Chromium
binary in this sandbox, and `npx playwright install` needs a network fetch this environment
doesn't have staged. Verification here is `npm run build` + `html-validate` + the WCAG formula
recomputed for the new light pair, all passing; the actual rendered layout (narrow-viewport
stacking of the dark banner row, shooting-star animation, moon/star sizing against the real
`.banner pre` styles rather than the mockup's card width) is unconfirmed until it's checked in
an actual browser or CI's Lighthouse run.

Not built: a cactus companion to the dino, explored in mockups but never landing on an
approved shape — left for a future round if wanted.

## Phase 3 follow-up — Real browser verification, cactus, mobile scope

A Chromium binary and Playwright became available this session, so the banner redesign above
got its first real-browser check instead of relying on `npm run build` + `html-validate` +
hand-computed contrast. It caught two bugs neither of those tools could see:

**The light-mode banner's dino rendered twice in dark mode.** `.banner-light`'s wrapper `<div>`
carried both `.banner-row` and `.banner-light`. `.banner-row { display: flex }` and the
dark-mode override `.banner-light { display: none }` are both single-class selectors of equal
specificity, so source order decided the winner — and `.banner-row` was declared later in the
file, so `display: flex` won regardless of theme. Fix: `.banner-light`'s wrapper doesn't need
flex layout (it only ever holds one `<pre>`), so the stray `.banner-row` class was just removed
from it.

**The star field forced real page-level horizontal scroll on narrow viewports**, not just
scroll within its own `<pre>` as intended. `.banner-row`'s `display: flex` gives its children
`min-width: auto` by default, so the `stars.txt` `<pre>` refused to shrink below its intrinsic
content width and pushed the whole page wide instead of triggering its own `overflow-x: auto`.
`min-width: 0` alone wasn't enough — with `flex-direction: column`, cross-axis sizing is
fit-content unless capped — so `.banner-row > *` also needed `max-width: 100%`. Confirmed via
`document.documentElement.scrollWidth` at a 375px viewport before (727px, overflowing) and
after (375px, clean) in both themes.

**The muted color for the star field and (new) cactus never actually applied**, in either
theme — `.banner pre` (an element+class selector) outranks a bare `.stargap`/`.cactus` class on
specificity regardless of source order, so both rendered in the banner's accent color instead
of the intended muted tone. Merged into a single `.banner pre.cactus, .banner pre.stargap`
rule to win on specificity rather than depending on cascade order.

**Cactus companion, previously paused, got built.** `src/assets/ascii/cactus.txt` pairs with
the dino in light mode's `.banner-row`, colored `--color-muted` like the dark banner's star
field. The source art carried a `by Blac...@wsb.freinet.de` credit baked into the last line of
the ASCII itself — first pass left it there and it rendered visibly in the banner; moved to an
HTML comment above the `<pre>` instead, matching the moon photo's existing attribution pattern,
so credit stays in source without appearing on the page.

**Mobile now shows dino-only in both themes.** The star field, moon, and shooting stars added
real height to an already-tall banner on narrow viewports where space is tighter; a new
`.banner-extra` class (`display: none` by default, `display: block`/`inline-block` from the
existing `width >= 40rem` breakpoint) hides everything except each theme's dino below that
width, rather than introducing a second breakpoint.

**Banner height normalized between themes.** Light mode's row (dino + cactus, 12-line cactus)
and dark mode's row (dino + stars + moon, 17-line moon) naturally rendered at different
heights since `.banner-row`'s height simply follows its tallest child. Gave `.banner-row` a
`min-height` at the wide breakpoint sized to dark mode's rendered height (its moon is the
tallest asset among all banner content), so light mode reserves the same vertical space and
`align-items: flex-end` keeps the shorter cactus/dino sitting flush at the bottom — page content
below the banner now lines up at the same y-position regardless of theme.

Verification this round: `npm run lint`, `npx eleventy`, `npx html-validate _site` (all clean),
plus real Chromium screenshots via Playwright at both color schemes and both the wide
(1280px) and narrow (375px) breakpoints, `document.getAnimations().length === 0` under
`prefers-reduced-motion: reduce`, and computed-style checks confirming the color/display/
overflow fixes above actually took effect in a rendered page rather than just parsing clean.

## Phase 3.5 — Theme toggle + continuous-crop banner

Two changes shipped together because they depend on each other: a header theme toggle, and a
banner that crops continuously instead of collapsing at a breakpoint. The toggle is what makes
the banner work reviewable — before it, the light-mode scene was only visible to someone whose
OS was set to light, so light-mode regressions were effectively invisible during review.

**The banner's "sliders" were never a breakpoint problem.** Phase 3 gave `.banner pre` an
`overflow-x: auto` and hid everything below 40rem, which meant intermediate widths showed
horizontal scrollbars inside the banner. The actual cause is that flex items default to
`min-width: auto` and refuse to shrink below their content width. Setting `min-width: 0` on a
crop zone with `overflow: hidden` makes overflow **impossible by construction** rather than by
choosing correct breakpoints — so the whole staged-collapse design from the earlier nitpicks
doc became moot, and the narrowest state is no longer dino-only. `justify-content: flex-end`
pins the art right so it overflows leftward and clips there, which is what keeps the light
scene's ground line welded to the row's right edge.

**A `direction: rtl` + `display: inline-block` crop was tried first and rejected.** An
inline-block sits on its parent's text baseline, which reserves descender space beneath it and
lifts the art a few pixels off the row's bottom edge, misaligning it against the dino. Flex
alignment has no baseline to sit on.

**The verification I wrote first proved nothing, twice.** The obvious assertion —
`row.scrollWidth <= row.clientWidth` — passes unconditionally under this design, for two
compounding reasons: content clipped by `overflow: hidden` never reaches an ancestor's
`scrollWidth` at all, and `scrollWidth` only measures overflow in the _end_ direction while
this layout overflows leftward by construction. It reported a clean green while measuring
nothing. The replacement sums the row's non-absolute children's widths against
`row.clientWidth`, and adds a **negative control** — `crop.left - art.left > 0` — without which
the whole suite would pass on content that simply fits and never crops. That control is what
makes the other assertions mean anything; it holds from 280px to 1248px in light and 1312px in
dark.

**Human review caught a rewritten asset.** An early mockup embedded the ASCII art as JavaScript
string literals, hand-transcribed rather than read from `src/assets/ascii/*.txt`. It looked
plausible and was wrong; the human spotted it immediately ("i can tell you rewrote the ascii
because its botched"). The fix was to generate the mockup's data from the real files and assert
byte equality. That rule carried into production: `cactus.txt` stays the single source of truth
and the wide strip is derived at build time by a `cactusStrip` shortcode (trim at column 15,
repeat twice concatenated _per line_, cut at column 104), never committed as a second art file.
Concatenating per line rather than butting two `<pre>` elements together is what keeps the
ground line an unbroken character run across the join — two elements are two independent text
layouts.

**A misalignment I "fixed" wasn't mine to fix.** Chasing a reported nitpick I found and
corrected a real baseline bug in the harness — but the human then checked the source and
corrected me: the cactus trunk and branches genuinely aren't aligned in `cactus.txt`, and that
is simply how the art looks. Recorded in the design doc as _must not be fixed_, so a future
round doesn't "correct" the artwork.

**Design review by a stronger model caught three bugs the build couldn't see**, all of which
would have passed `npm run build` and `html-validate` cleanly:

- `.banner pre { margin: 0 0 0.5rem }` — in a flex row a child's cross size is its _margin_
  box, so the moon's 8px bottom margin would have made the dark row 307.2px against a 299.2px
  `min-height`. That is an 8px shift on theme toggle and an 8px reflow exactly at the moon-pop
  threshold: the specific jump this phase exists to remove. The margin went to zero and the
  breathing room moved to `.banner`'s padding.
- `.banner-light` had no `overflow: hidden` while `.banner-dark` did — an asymmetry inherited
  from Phase 3, and page-level horizontal scroll waiting to happen.
- `.banner-crop > pre` needed `flex: 0 0 auto`. Paired with `overflow: hidden` on the `<pre>`,
  a shrinkable art element clips its own _right_ edge, inverting the crop direction.

**The moon-pop threshold is a container query, and that isn't cosmetic.** The moon can't crop —
a sliced moon reads as broken rather than off-frame — so it's hidden below a threshold instead,
with the row holding its height either way so the pop costs no reflow. The threshold is
`@container banner (width < 66ch)`: `ch` because both art widths are character-defined, and a
container query because the header's padding grows from 1rem to 2rem at a 40rem viewport, which
shrinks the banner's inline size by 32px right where this threshold sits. A viewport-based
value near the mockup's 602px would have made the moon appear at ~608px, **vanish again** at
640px when the padding grew, and reappear at ~672px. The sweep script now asserts the moon
changes visibility at most once across the whole range.

**Theme tokens restructured so nothing outside them carries a theme selector.** Dark values
live in two blocks — `@media (prefers-color-scheme: dark) :root:not([data-theme])` for the
no-choice path, and `:root[data-theme="dark"]` for a stored choice. There is deliberately no
`[data-theme="light"]` block: `:root` already holds the light values, and scoping the media
query to `:not([data-theme])` is what makes a stored _light_ choice stick on a dark-OS machine.
Everything that varies by theme — the banner swap, the nav underline, the toggle's glyph — is
expressed as a custom property, so the rules that consume them are written once.

**The toggle is gated on JS twice over.** An inline blocking script in `<head>` adds a `.js`
class and applies the stored theme before first paint; without it a deferred script paints the
wrong theme and then corrects it, which is a visible flash. CSS hides the button unless
`html.js`, following the command-palette precedent — a dead control is worse than no control.
The glyph comes from CSS `::before` keyed to the same token, so it's correct before the
handler script runs; only the `aria-label` is narrowed by JS, from a generic "Toggle color
theme" that is accurate in either state.

**Height normalized across themes at the human's explicit instruction.** 18.7rem in both, at
every width, outside any media query — light carries 5.5rem of dead space unconditionally. That
was the accepted trade: a banner that changes height when you hit the toggle would undercut the
point of the toggle, which is comparing the two scenes at one viewport width.

Verification this round: `npm run lint` and `npx html-validate _site` clean; the new
`npm run audit:banner` sweep (280→1500px, 2px steps, both themes) reporting a single height of
299.19px in both, zero page overflow, zero right-edge gap, the crop genuinely engaging, and one
moon transition; plus headless checks that the toggle persists across reload, that page content
below the banner doesn't move on toggle, that shooting stars render 2/3/4 by band, that
`document.getAnimations().length === 0` under `prefers-reduced-motion: reduce`, and that with
JS disabled the toggle is hidden while the site still themes from `prefers-color-scheme`.
Contrast recomputed for the new toggle's border in both themes (3.79:1 light, 3.46:1 dark
against a 3:1 UI target). Everything above was done unattended — the browser check is the
human's, on the PR.

**Correction — the moon was never behind the hills, and CSS could not put it there.** The
first pass at the dark scene tried to make the cactus ridge a horizon that the moon rises
behind. It stacked a `.banner-ground` layer over `.banner-sky` at `z-index: 1` and a comment
claimed the ground "hides the moon's clipped lower half." It does not, and cannot: a `<pre>`
has no background, so the ground layer paints its glyphs on top of the moon and hides nothing
behind them. Occlusion between two text layers is not a paint-order problem.

The workaround at the time was to hand-crop `moon.txt` — delete its bottom nine rows and pad
the rest with trailing spaces. That is the failure mode the `cactusStrip` rule already exists
to prevent: a derived asset committed as a second source of truth. It also had a second-order
cost that made the botch obvious on screen. The padding widened the moon from 34 columns to
49, which pushed the sky row's fixed items past the banner below ~900px, so the moon hung off
the right edge and the dino collided with a cactus.

**The fix is subtraction from the art, computed at build time.** A `moonAboveHorizon`
shortcode reads the cactus strip's silhouette — the topmost non-space row per column — and
blanks every moon cell at or below it. What makes this exact rather than approximate is that
the moon `<pre>` and the strip `<pre>` share an edge: both are flush right and both
bottom-aligned, at the same font size and line-height. A browser probe confirmed it before
any of it was written — `0.000` columns of right-edge offset and `0.0px` of bottom offset at
900/1200/1500px. Sharing an edge means the offset is zero columns in _any_ monospace font, so
nothing depends on resolving `ch` to pixels. `moon.txt` went back to being unmodified source.

The star field deliberately does _not_ get the same treatment. It sits in the elastic crop
zone, one 1.5rem gap from the moon — an offset of ~2.5 columns that moves with whichever
monospace font the browser resolves, so per-column occlusion would land a fraction of a cell
off. Only the row grid is shared exactly, so `starField` uses a row-only rule: keep the rows
that clear the desert floor, pad below to hold bottom alignment. Both shortcodes derive the
floor and the silhouette from `cactus.txt`, so no constant records where the horizon is.

**Screenshots caught a bug the sweep structurally could not.** Comparing dark against light at
380px showed the cactus strip running underneath the dino in dark only. `.banner-ground` is
its own absolutely-positioned layer, so it spanned the full banner width instead of starting
after the dino the way light's strip does inside `.banner-row` — fixed with
`left: calc(17ch + 1.5rem)`.

**The acceptance gate had been silently dead.** `audit:banner` still queried `.banner-row`
inside the dark scene, which this phase renamed to `.banner-sky`, so the sweep crashed on a
null rather than reporting anything. Worse, its child-overflow sum omitted the flex gaps —
48px unaccounted for in the dark row — which is exactly the margin by which the over-wide moon
was escaping. Both were repaired in the same change: select the height-setting row per theme,
select the crop under test by its content (`.banner-crop:has(pre.cactus)`) so it measures the
ground line in both themes, and count the gaps. It now passes honestly: 299.19px in both
themes across 280→1500px, zero overflow, moon appearing at 698px — the 66ch container-query
threshold, restored after the first pass deleted it.

The AI split this round: the AI diagnosed the transparent-`<pre>` cause, verified the shared-edge
assumption by measurement instead of assuming it, and wrote the shortcodes and the sweep repair.
The human supplied the design intent the first pass had failed to reach, and chose to ship the
moon at its natural bottom-alignment and adjust from what the browser showed.

**Then the pop was removed entirely, on human instruction.** With the moon finally sitting
behind the ridge, the reason it vanished below 66ch stopped being persuasive — "a sliced moon
reads as broken" was a judgement made about a moon that floated free in the sky. The fix was
structural rather than a threshold tweak: the moon moved _inside_ the crop zone, next to the
star field, instead of being a fixed item in the sky row. That single move is what makes it
safe. A fixed item cannot shrink, so below a threshold the row overflowed rightward and pushed
the moon off the banner — which is what the container query was really papering over. A crop
zone child loses columns from its left like every other piece of art, so no width overflows.
The right edge is untouched, so the horizon composite still lines up.

The sweep changed with it, rather than being left asserting a rule that no longer exists: the
`moonPop` / `moonFlips` pair went, replaced by the new invariant — the moon is never hidden, at
any width — plus a moon-right-edge check that now runs across the whole 280→1500px range
instead of only where the moon happened to be visible. That check was itself given a negative
control before being trusted: perturbing the moon by `3ch` produces `FAIL — 28.80px`, exactly
3 × 9.602. The first attempt at that control asserted nothing, because `.banner pre { margin: 0 }`
outranked the `.moon` selector it was written against — the third time in this project's history
that a green result turned out to be measuring nothing.

The cost is honest and visible at phone widths: below ~480px the moon is cut by a hard vertical
line, and by 320px it is a sliver of half-glyphs. That is the trade the pop used to buy, now
taken deliberately rather than by default.

**The desert now runs edge to edge, and the dino stands in front of it.** Reserving a
full-height column for the dino — `left: calc(17ch + 1.5rem)` on the ground layer — kept the
two from colliding, but it bought that by cutting a hole through the entire sky and leaving the
horizon stopping short of the banner's left edge. The horizon is the one line in the scene that
should be unbroken, so the layer went back to full width and the collision got solved where it
actually lives: at the dino.

A `background-color` on the dino would knock out its whole box, sky included — the same
rectangle problem one level down. A `text-shadow` in the background colour knocks out only a
halo hugging each glyph's strokes, so the cactus behind stays visible in the gaps. The shape of
that shadow matters more than its presence: a blurred halo fades across the cell and leaves a
cactus stroke passing directly behind the dino showing through at half strength, which reads as
a smudge rather than as depth. Eight hard 3px offsets cut a clean ring that visibly breaks the
cactus trunk where it crosses. Only the dino is lifted above the ground layer, not the whole
sky — the cactus painting over the moon silhouettes it against the disc, which is worth keeping.

Three different mechanisms now carry depth in one scene, and they are not interchangeable: the
moon is subtracted from the art at build time (paint order can't help — no backgrounds), the
dino is haloed at render time (a build-time composite can't help — the strip crops leftward, so
the dino's column offset against it changes with viewport width), and everything else is plain
paint order. Each is the only option available at its layer.

**Removing the dino's reserved column only fixed half of it.** The horizon still hung in empty
sky above ~1060px, because the strip was two tiles wide — 104 columns, about 1000px — so any
banner wider than that left the desert starting mid-frame. The tiling was reworked to grow
_leftward_: tiles are added on the left and the cut is measured into the last one rather than
as an absolute column, so the strip now reaches ~2700px while its right edge stays
byte-identical at any tile count. That last property is load-bearing rather than tidy —
`moonAboveHorizon` composites against the strip's right edge, so a retile that moved it would
silently deform the moon. It was checked rather than assumed: the generated moon block is
identical before and after, byte for byte. The cost is a hill that repeats more visibly on a
wide display.

**The crop zone turned out to be the thing causing the damage.** Every fix so far had been
working around a constraint the crop zone imposed: the moon popped because a fixed sibling
couldn't shrink, then it got sliced because as a crop-zone child it only ever received the
width left over after the dino, and the ground layer needed a reserved lane carved out of the
sky so the strip wouldn't run under the dino. Removing the crop zone dissolved all three at
once. There is no `.banner-row` and no `.banner-crop` now — each scene is a stack of
full-width absolutely-positioned layers (`.banner-sky`, `.banner-ground`, the dino) pinned to
the same bottom edge, right-anchored, overflowing leftward and clipped by the scene. At 371px
the entire moon fits, because it has the whole banner rather than a share of it. The dino
stops being a flex sibling and becomes its own left-pinned layer; the halo already handles the
overlap that the reserved lane used to prevent.

**A clip on a character grid has to land on a cell boundary.** Clipping at an arbitrary pixel
cuts glyphs down the middle, and the art ends in a column of mangled half-characters that reads
as a rendering bug rather than as a frame edge. `width: round(down, 100%, 1ch)` on each layer
snaps it to a whole number of character cells, so the leftmost visible column is always a whole
glyph. The price is up to one cell of empty background at the far left — a sliver of nothing,
against a column of broken characters. The sweep asserts it, because if `round()` is ever
unsupported the width silently falls back and the mangled column returns with no other symptom:
off-grid measures 0.01px with the snap and 4.76px — half a cell, the worst case — without it.

The light scene moved to the same model rather than being left on the old one. Two scenes built
on different layout mechanisms would drift, and the toggle exists precisely to compare them at
one viewport width. The sweep simplified with them: `childOverflow` measured a crop model that
no longer exists and was dropped in favour of the page-overflow check it was always a proxy for.
