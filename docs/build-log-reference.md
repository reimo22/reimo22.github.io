# Build log reference — reimo22.github.io

Full, unabridged build log for this site's own construction. Every entry from
every phase, including every fix, every rejected approach, and every human-vs-AI
correction recorded as it happened — not written retrospectively. The short,
publishable version lives at [`src/blog/building-this-site.md`](../src/blog/building-this-site.md),
which renders as a real `/blog` post; this file is planning-doc reference only
and is not built by Eleventy.

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

Next: Phase 4 adds the profile/resume page on top of this theme,
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

**The stars now tile, and the dino stands on his own patch of ground.** The star field was a
single 74-column block held at the right edge, so on anything wider than a phone the left third
of the sky was empty while the desert below it ran edge to edge. It now goes through the same
trim → pad → repeat → cut pipeline as the cactus strip, sized to the strip's full width — wider
than the field's own lane, deliberately, because matching the strip is what guarantees stars
reach the left edge at every viewport and the surplus overflows into `overflow: hidden` for
free. Computing the exact lane would mean resolving `ch` and `rem` to pixels at build time,
which nothing else in the generator does.

The ordering inside that pipeline is the part that bites. The old shortcode right-trimmed its
rows, which was harmless for one tile and wrong for five: ragged rows concatenate early, so
every star after a join slides left by a different amount on each row and the field shears.
Padding to a rectangle first and trimming last is the fix, and it is the same shape
`cactusStripGrid` already had. Each tile also takes the band's rows rotated one step further,
so the pattern repeats every `tiles × skyRows` columns rather than every tile — stars are
sparse enough that a row shift is all it takes to hide the seam.

**The halo was never going to be enough, and neither was the moon's trick.** The dino wears a
knocked-out halo hugging each glyph's strokes, which handles a cactus stroke crossing his
outline and does nothing at all about one landing in his hollow — between his legs, inside his
body — where there are no strokes to hug. At some widths that read as one tangled mesh.

The obvious reach is for `moonAboveHorizon`: subtract the strip from the dino's art at build
time, per cell, the way the moon is subtracted from the ridge. It cannot be done, for a reason
worth writing down because it will come up again. The moon composite is exact only because the
moon and the strip are both welded to the banner's right edge — the offset between them is zero
columns in any monospace font, at any width. The dino is welded to the _left_ edge while the
strip is right-anchored and cut leftward, so the strip column standing under him is
`stripWidth − floor(viewportWidth / ch)`, which changes with every pixel of resize. There is no
fixed offset to subtract against. That is also exactly why the collision showed up at 853px and
440px and not at 700px.

And granting the impossible would not have helped. Per-glyph subtraction erases the back art
where the front art's _glyphs_ are, not where its _shape_ is. That reads as depth for the moon
because the moon is a solid disc. The dino is open line art: subtract his cells and cactus
strokes still run through his hollows, tangle intact, edges tidier. What makes something read
as in front is erasing an **area** — so the answer was an opaque area, not a smarter subtraction.

**Sizing that area is all row arithmetic, and the rows are already fixed.** `.eleventy.js`
bottom-aligns a 12-row cactus into a 17-row scene with its ground line on row 9, so scene rows
10-16 below it are trunks and arms only. An opaque patch over those rows touches neither the
horizon nor the sky — which retires the objection recorded in the last entry, that a background
colour on the dino would knock out his whole box, sky included. That was true of the old
model; under the layered one his box is five rows at the bottom of the scene.

Seven rows, though, not five. A patch sized to the dino cuts a trunk and leaves its crown
floating two rows above him, which is worse than the tangle it replaced. The two extra rows are
`2.2em` at the 1.1 line-height on `.banner pre`, and 7, 5 and 1.1 are all downstream of
`SCENE_ROWS` and `groundRow()` in the generator.

Two things went wrong on the way and both were invisible in the rendered pixels until measured.
The patch is a `::before`, and `.banner pre { overflow: hidden }` — there to clip art
deliberately wider than its layer — clipped its overhang, silently shrinking it back to the
dino's own box and leaving the floating crown the extra rows existed to prevent. The opt-out
then had to be written as `.banner pre.dino`, because `.dino` alone loses the specificity
contest to `.banner pre`. That is the second time in this project a `.banner pre` rule has
quietly outranked a selector written against the art it applies to. Painting the patch red and
screenshotting it is what found both; the computed style said `-35.2px` while the render
started a clean two rows lower.

**A hard edge on a character grid is a bug wherever it lands.** The rectangle fixed the tangle
and introduced its own defect: its right edge falls wherever the leftward crop happens to put
it, so at 440px it bisected a cactus and left an amputated half standing next to the dino, and
at 853px it clipped a trunk off flush against his nose. Snapping the edge to a gap between
cacti would be exact — the trimmed tile is empty for its first 13 columns on every sub-horizon
row, so the gaps are real and generous — but _which_ gap is nearest is the same viewport-width
function as before, knowable only at runtime. It could be done in JavaScript. It is a detail on
a banner, and this site ships one small script on purpose.

So the edge fades instead of ending, over the last six cells. That turns the cut from an
amputation into a recession: the bisected cactus thins out behind the dino rather than stopping
mid-stroke, and at 853px the debris on his nose is a ghost. The patch runs 7ch past the dino so
the fade finishes clear of his own glyphs — a fade crossing them would let cactus surface at
half strength _inside_ his outline, and half-strength art behind line art reads as a smudge
rather than as depth. Solid through the dino, fading only beyond him.

Which left the halo doing nothing, so the halo is gone. The patch is opaque across the dino's
whole box and stays opaque for a cell past his rightmost glyph, so no cactus ever reaches him
to be haloed against — ten `text-shadow` offsets were painting a ring against a background that
had already erased everything the ring existed to hide. The first instinct was to keep it as a
safety net and annotate it as redundant; that is how a codebase accumulates rules nobody dares
delete, each with a comment explaining why it does nothing. It was deleted instead, and the
knockout's comment now carries the one fact the halo used to imply: the fade's 7ch margin past
the dino is load-bearing, because narrowing the box below his own width puts cactus straight
back into his hollow with nothing behind it to catch them.

Deleting it was verified rather than assumed — both themes at 320, 440, 853, 1060, 1100, 1140,
1180 and 2560, the widths where the phase sweep puts a cactus nearest to him. No change at any
of them, which is the evidence that the halo had genuinely stopped contributing.

The alternative on the table was screenshotting the dino and cutting him out as a transparent
PNG. It was rejected, and not narrowly: it trades text for an image that needs a light and a
dark variant, stops scaling with font size and zoom, and still leaves a rectangular bounding box
with the same edge problem. It solves nothing the patch does not.

CI caught none of the visual defects. `audit:banner` passed before and after every one of these
states,
including both defective ones — it asserts scene height, grid snapping, right-edge weld and moon
visibility, and none of those move when a cactus is sliced in half next to the dino. `stylelint`
did catch one thing, `comment-empty-line-before`, and the attempted fix merged two comment blocks
into one broken selector, which `stylelint` then also caught. Every real defect in this entry was
found by rendering the page and looking at it.

The AI drafted the tiling, the knockout and all of the above reasoning. Human review supplied
the failing widths — 853 and 440, neither of which was in the 320/380/700/1400 set the AI was
checking — and pushed back on the rectangle when the AI had already called it done, which is
what produced the fade. The AI's first answer to "can we use the moon technique" was the right
one; its first answer to "is the box good enough" was not.

## Phase 3.5 follow-up — Code review fixes, dark default, moon overlap

A `/code-review` pass on the phase 3.5 diff found a real defect that the sweep script had never
been able to see: the moon and star-field `<pre>`s were rendering one row short of `SCENE_ROWS`.
A `<pre>` generates no line box for a truly empty final line, and both shortcodes' last emitted
row was `""` — the moon's from occlusion blanking its lowest visible row, the star field's from
the bottom-padding array. Both blocks are bottom-anchored by flexbox, so the missing row didn't
move the bottom edge, it sank the top edge one row closer to the ground — which is exactly the
"moon bleeding into the hills" and "stars on the desert floor" the review measured in a real
render. The fix is a shared `withNonEmptyLastLine` helper that forces the final line to a single
space instead of `""`, applied to all three shortcodes (`cactusStrip` was accidentally safe —
its last row happens to be the non-blank desert floor).

**The sweep script's blind spot was the more important find.** `audit:banner` asserted right-edge
alignment, grid snapping, and total banner height, but nothing checked that the moon and star
`<pre>`s actually rendered their full row count — so it passed clean on both defective states.
Added an assertion that measures rendered height against `SCENE_ROWS * lineHeight` for both
elements. Verified backwards, not just forwards: reverting the row fix and rebuilding made the
new assertion fail with a 17.70px gap (one full line-height) on both the moon and the star field;
restoring the fix brought it back to 0.11px of sub-pixel noise and a clean pass.

**Dark is now the default theme, not `prefers-color-scheme`.** A direct request, not a bug —
`:root` now holds the dark palette and `[data-theme="light"]` is the only override, persisted in
`localStorage`. The OS-preference media query and its change listener in `theme.js` are gone;
there's nothing left for them to react to. `color-scheme: dark` / `light` was added to both
token blocks so native UA widgets (scrollbars, form controls, focus rings) track the toggle
state instead of the OS's, which they had silently stopped doing the moment the toggle could
diverge from `prefers-color-scheme`. `SPEC.md` and `TASKS.md` are updated to state the new
precedence rather than the old one.

**The moon-overlap correction.** Fixing the row math moved the moon's visible disc one row away
from the ridge — geometrically correct, since the occlusion math had always assumed a full
17-row render, but it also closed a gap that the old bug had, by accident, been rendering as a
pleasant partial overlap between the moon and the hill. The AI's recommendation was a small
positive `MOON_GROUND_OVERLAP` (a named, tunable constant added specifically for this) that
brings the disc into clean contact with the ridge without letting the two layers' glyphs
interleave; screenshots at both `-1`/`-2` showed real interleaving — cactus and hill strokes
cutting through the moon's texture, in one case a whole cactus glyph stamped inside the disc —
which is the same defect class the row-math fix had just removed, only reintroduced on purpose.
Human review chose `-1` anyway, for how it looks, overriding the correctness-first
recommendation. The constant and its comment now say so plainly, so the interleaving reads as a
deliberate choice to the next person who finds it rather than as a bug nobody caught.

Also fixed while in the area, none of it visible: `...globals.browser` had leaked from
`scripts/**/*.mjs` into the shared Node ESLint block covering `.eleventy.js` and `src/**/*.js`,
silently disabling `no-undef` for browser globals there too — split into its own scoped block.
`readAscii` and `cactusStripGrid` read and re-tile the same fixed build-time assets on every
call — up to four times per page render — and are now memoized. The `.banner-ground` markup was
duplicated verbatim between the light and dark scenes in `index.njk`; it's now a Nunjucks macro.

The AI drafted every fix and verified each one against a real render or a real assertion before
calling it done. The one place human review overrode the AI outright was the moon overlap — the
AI's read of "correct" and the human's read of "right" were different things, and the constant
exists so that choice stays visible instead of getting re-litigated as a bug report next time
someone reads the code.

## Phase 4 — Static pages

The site now has one combined profile/resume page. It extends the existing base
layout rather than duplicating its navigation, theme toggle, skip link, or
footer. Navigation remains in `site.json`, so the visible links have one source
of truth for the command palette planned in Phase 7.

The resume is available in two forms: a semantic HTML page for searchability and
accessibility, and the `_sec` PDF copied to the exact legacy URL
`/resume/Kenji_Pinlac_Resume.pdf`. The PDF is passed through from `src/resume/`
instead of being embedded in the HTML page, keeping the page usable when a PDF
viewer is unavailable. The shared footer exposes the contact mailto on every
page, while the resume header links to GitHub. There is no LinkedIn account to
link yet, so the site does not invent or reserve a placeholder URL.

The local build, lint suite, and `html-validate` all passed. Stylelint initially
caught a specificity-ordering issue in the new contact-link selector; increasing
that selector's scope fixed the issue without changing the visual design. The
remaining verification is deployment-specific: after the old `resume` Pages
site is disabled, hard-refresh the live URLs and confirm the new HTML page and
PDF are served instead of the cached redirect.

The AI implemented the templates, shared navigation, PDF passthrough, and
mobile-first styles. Human input supplied the decision to defer LinkedIn and the
existing `_sec` resume source; the live takeover and mobile browser check remain
human verification steps.

**Human review caught a width problem after the first render.** The global
`75ch` content cap made the resume look too narrow on a desktop and especially in
a split tab. The page now opts into a `90ch` main width while the global cap stays
in place for prose-oriented pages. This preserves readable profile paragraphs
without making the resume feel like a centered excerpt.

## Phase 4.1 — Renaming `/resume/` to `/about/`

Phase 4 shipped `/resume/` on the assumption that disabling Pages on the old
`resume` repo (private, not archived) would fully unpublish it. It didn't: this
GitHub account can keep a private repo's Pages site set to public visibility,
which is a separate toggle from repo visibility, and that toggle was still on.
The old site kept intercepting `/resume/*` at GitHub's edge — including the
PDF — and serving its own cached 404, ahead of the new deployment. CI had no
way to catch this: the shadowing only exists at GitHub's routing layer, outside
anything `npm run build` or `html-validate` touches. `gh api -X DELETE
repos/reimo22/resume/pages` unpublished it directly.

Rather than re-verify the same `/resume/` URL and risk the same shadowing
problem resurfacing on any future `resume` repo, the page moved to `/about/`
permanently. `/resume/` is now a same-site meta-refresh stub this site owns
outright, so old bookmarks and links still resolve without depending on a
second repo's Pages state ever again. The PDF moved with the page, to
`/about/Kenji_Pinlac_Resume.pdf`.

The AI diagnosed the shadowing by comparing GitHub's Pages API response for
each repo against a live `curl`, confirmed it wasn't a CDN cache (fresh
`x-cache: MISS`, matching content-length across requests) before touching
anything, and proposed the `/about/` rename with two options for the PDF URL
once the shadowing was understood. The human picked the option that fully
retires the old repo's URL surface rather than the one that mirrors the old
SPEC wording exactly — confirming the PDF and stub should move together rather
than leaving `/resume/` half-owned by the old repo's now-dead Pages config.

## Phase 4.2 — About page contact icons

The email and GitHub contacts moved from plain text/URL to icons, sourced as
pre-colored PNG pairs (one tint per theme) rather than single-color SVGs. The
site already had a dark/light asset-swap technique for the homepage banner —
two elements rendered together, a `[data-theme]`-scoped CSS custom property
picking which one displays — so the icon links reuse that same pattern instead
of inventing a second one. A shared `icon-link.njk` macro keeps the pair-of-
`<img>`-tags markup in one place rather than duplicated across `about.njk` and
the shared footer.

The same asset pack also carried a PDF-download icon and dedicated sun/moon
PNGs, so the resume's "Download PDF" text link and the header's CSS-glyph
theme-toggle button were switched to the icon treatment too, and the
now-unused `--theme-toggle-icon` custom property and glyph rule were removed.

The local build, lint suite, and `html-validate` all passed on each iteration.
Stylelint's `no-descending-specificity` caught a selector-ordering issue when a
footer-specific icon-sizing override was added below the general `.icon-link`
rule in source order but not in specificity — moving the override immediately
after the rule it narrows fixed it without changing the CSS's behavior.

The AI proposed the dark/light PNG-pair technique and built the macro,
passthrough copy, and every page's markup. Human browser review corrected the
scope twice: it caught that the footer was missing the GitHub icon entirely
(the earlier plan restated the footer as email-only, following an ambiguous
line in the phase's task list) and confirmed adding it once asked. Both rounds
of feedback were caught by looking at the rendered page, not by any local
check — none of the tooling here validates icon _presence_, only that markup
and CSS are well-formed.

## Phase 4.3 — Testing infrastructure

Every prior phase's checks stopped at lint, `html-validate`, Lighthouse, and
link-checking — none of them assert what the site's own JavaScript or build
logic actually does. This phase introduced a test convention rather than
scoping tests narrowly to whatever the previous phase touched: Node's built-in
`node:test` runner plus `node:assert/strict`, with `jsdom` added as the one
new devDependency for the theme-toggle's DOM behavior. No third-party test
framework — `node:test` has been stable since long before this repo's
`.nvmrc`-pinned Node version, and the site has no need for a runner with more
surface area than that.

`.eleventy.js`'s seven pure banner/ascii-art helpers (`rightTrim` through
`toSceneGrid`) and its four ascii shortcodes (`ascii`, `cactusStrip`,
`moonAboveHorizon`, `starField`) were previously unexported closures reachable
only through a full Eleventy build. They gained `export` and, for the
shortcodes, moved from inline `addShortcode` closures to named top-level
functions referenced by the registration call — a zero-behavior-change
refactor, confirmed by running `npm run build` before and after and comparing
the rendered banner markup. The shortcode tests reconstruct the cactus-strip,
moon-occlusion, and star-tiling pipelines independently from the raw
`.txt` assets rather than asserting against the module's own constants, so a
test can't pass by coincidentally re-deriving the same numbers the
implementation already hardcodes.

`theme.js` stayed untouched — no refactor for testability — because its
DOM tests load the real file into a `jsdom` window via `eval` and drive it
with actual click events, the same interface a browser uses. A deliberate,
reverted one-line break (`currentTheme()`'s fallback flipped from `"dark"` to
`"light"`) confirmed the harness fails when the underlying script actually
misbehaves, not just when the test file's own assumptions change.

The icon-markup check is a static scan, not a rendered-DOM check: it regex-matches
every `icons.iconLink(...)` call site across `.njk` templates and confirms each
one resolves to an existing `_dark.png`/`_light.png` pair with a non-empty
label. A rendered check would need a full Eleventy build plus DOM parsing to
assert the same thing a plain-text scan already answers directly from source,
so the static route was chosen once the plan's own review confirmed the scan
finds every real call site (see below). Every test file runs in CI as its own
job (`npm run test`), gating `deploy` alongside the existing `lint`,
`html-validate`, `lighthouse`, and `lychee` jobs.

The AI drafted the full plan and implementation across ten tasks in a single
sitting, largely unprompted between tasks. Self-review (not human review)
caught one real gap before this entry was written: the icon-link scanner's
regex is lazy up to the first `)`, so a call site containing a nested paren
(a Nunjucks filter, a `)` inside a string) would truncate mid-argument-list
and silently drop that call from coverage while `allCalls.length > 0` still
passed — the failure mode a static-scan test is actually supposed to guard
against. Checking the scanner's output against a plain `grep -rn
"iconLink(" src --include=*.njk` confirmed no such case exists in the current
templates (5 real call sites — `email` and `github` each appear twice, once
in the shared footer and once on `/about/`, plus `export_pdf` — not the three
the plan's own draft narration claimed while describing Step 2's expected
output). No code changed as a result, but the discrepancy is recorded here
rather than left for the next person to rediscover.

## Phase 4 follow-up — Mobile pass

Phase 4 shipped with one checklist item unresolved: a real-device mobile pass
across `/`, `/about/`, and `/resume/` for horizontal scroll and touch targets
≥44px. No browser automation was available in this session (the Claude-in-Chrome
extension wasn't connected), so this used the same headless-Chrome approach as
`audit:banner` instead of a hand-driven device check — a throwaway
`puppeteer-core` script, swept at 360/390/430px in both themes, checking
`document.documentElement.scrollWidth` against `clientWidth` and every
`a`/`button`/`input`/`select`/`textarea`'s bounding box.

It found two real bugs, not zero: `.footer-contact .icon-link` overrode the
`.icon-link` base rule's `min-width`/`min-height: 44px` down to `auto`,
shrinking the footer's email and GitHub links to their 20×20 icon image with
no padding around it — under the touch-target floor. The override is gone;
footer icons now match the same 44px minimum as every other icon link,
`nav a`, and `.resume-download`. Separately, `.skip-link` measured 42px tall
against its own text and padding, 2px under the floor — given
`display: inline-flex; align-items: center; min-height: 44px`, the same
pattern already used by `nav a` and `footer a`.

This is a script sweep, not the real-device pass the checklist item asks for —
it catches the CSS-computable failure modes (overflow, box size) but not
odd viewport quirks, actual thumb-reach, or on-device rendering. Recorded as
what it is rather than claiming full parity with a phone-in-hand check.

## Phase 5 — Writeups

Phase 5 mounts `htb-writeups` as a git submodule at `src/writeups/boxes/` and
renders all 11 writeups — 7 retired-machine + 4 CTF-event — as
`/writeups/<slug>/` pages behind a `/writeups/` index. Upstream frontmatter
work already landed at `eeb0d72`, so the peer-repo half of the plan was
already done when this phase started and the PR is portfolio-site-only. The
submodule pointer was pinned there unchanged.

Two mechanisms in the original design doc were wrong, and both were corrected
from scratch builds before any permanent code was written:

- `eleventyComputed.tags` does **not** feed Eleventy collections — collections
  resolve from `tags` before computed data runs, so the computed-tag
  writeups-box / writeups-ctf split came out empty. Both collections are
  instead registered with `addCollection` + `getFilteredByGlob`, split on
  `data.os` presence.
- `addPassthroughCopy("src/writeups/boxes/**/images/**")` keeps the `boxes/`
  segment in the output (`_site/writeups/boxes/<slug>/images/…`), which breaks
  every relative `images/…` link in the READMEs; the object-form
  `{ glob: "writeups" }` flattens and collides (two `login.png`). The working
  mechanism is a per-slug object-form copy looped over the box directories at
  config time, mapping `<slug>/images` → `writeups/<slug>/images`.

Notes that shaped the diff: `src/writeups/boxes/` is a submodule and was never
edited from this repo. Passthrough copy ignores `.eleventyignore`, but the
per-box object form touches only image dirs, so `.git/`, the repo-root
`README.md`, and `TEMPLATE*.md` never reach `_site` (confirmed). Frontmatter
is parsed with `gray-matter` — the same parser Eleventy uses — so the build
gate (`missingFrontmatterKeys`) sees exactly what 11ty sees. The index lives at
`src/writeups.njk` (site root), not `src/writeups/index.njk`: a parent-directory
data file cascades into a sibling `index.njk` and would have handed it
`writeup.njk`'s layout and permalink.

The build gate in action: intentional stubbing would have been a test against a
stub. Instead the gate's failure path is covered by unit tests on the pure
`missingFrontmatterKeys` validator (box vs CTF key sets, real missing-key cases)
with fixture data — CI's `test` job doesn't fetch submodules, so tests can't
depend on one. The weekly submodule-bump Action opens a PR (never merges);
the human merge gate stays.

CI-signal ledger: the local `lint` run caught three `no-unused-vars` errors in
`test/writeups.test.js` (a destructuring-`rest` idiom that leaves a named
binding unused) and Prettier diffs across the four files the phase touched —
all fixed before this entry. One surprise unrelated to Phase 5: the local
`node_modules` was missing `jsdom`, making `theme.test.js` fail before any
Phase 5 code existed; restored from the lockfile, no test modified.

The AI drafted the implementation (cascade data file, two collections, per-box
image passthrough, frontmatter-gate validator, writeup layout, index template,
fixture tests, bump workflow) after re-verifying the empirical corrections
against the submodule's real contents — only gatery/massagold/vaccine carry
images, and all 11 READMEs open with their own `# Title`, so the layout emits
no second H1. The standing human gate then applied: browser check before merge
(CI with `submodules: recursive` runs after push), with this entry shipping in
the same PR as the work.

## Phase 5.1 — Code blocks + copy button

Writeup `<pre>` blocks had zero styling — same color, same background as
prose, since the whole site already runs `--font-mono`. There was also no
copy affordance, and one writeup (`vaccine`) has 20 separate blocks. Design:
[`docs/superpowers/specs/2026-08-16-codeblocks-and-copy-design.md`](docs/superpowers/specs/2026-08-16-codeblocks-and-copy-design.md).

The banner ASCII art is also rendered as `<pre>` (`cactusStrip`,
`moonAboveHorizon`, `starField`), so a bare `pre { background }` rule would
have painted a box behind the dino. Everything here is scoped to `main pre`
instead — the banner lives in `<header>`, outside `main`, on every current
page — with one new token pair (`--code-bg`, one step off the page
background in each theme) joining the existing `:root` /
`:root[data-theme="light"]` blocks rather than a new selector carrying its
own theme logic.

The copy button couldn't be baked into markdown — `src/writeups/boxes/` is a
submodule, never edited from this repo — so it's built entirely from the
rendered `<pre>` structure on load: `codecopy.js` wraps each `main pre` in a
`.codeblock` div and inserts a button, matching `theme.js`'s existing
pattern (plain IIFE `<script defer>`, feature-detected, a no-op if nothing to
wrap). Framing and the horizontal scroll are pure CSS, so a JS-off page still
gets a bordered, scrollable block — only the button itself is the
progressive-enhancement part. One `document`-level click listener handles
every button (delegation, not 20 separate listeners on `vaccine`); the copy
path tries `navigator.clipboard.writeText` first and falls back to a
temporary off-screen `textarea` + `execCommand("copy")`, since Clipboard API
availability isn't guaranteed insecure-context-wide. A failed copy surfaces
as "Copy failed" on the button rather than doing nothing.

`test/codecopy.test.js` follows `theme.test.js`'s convention (real file
`eval`'d into a `jsdom` window, driven with real click events) plus one thing
that file didn't need: the copy path resolves through a promise, so clicks in
tests await a microtask flush before asserting. One test bug surfaced during
this: an initial assertion looked for the fallback's temporary `textarea`
inside `.codeblock`, but `codecopy.js` appends it to `document.body` — caught
by the test itself failing, not by inspection, and fixed by asserting through
`execCommand`'s callback instead of after the (synchronous) cleanup already
removed the element. Confirmed `npm run test` (36 total), `npm run lint`,
`npm run build`, and `npx html-validate _site` all green, and that
`.codeblock`/`.codecopy` styling never reaches the header banner via a
direct build check of the rendered HTML.

The AI drafted the full design doc and implementation from a brainstorm
(scope question: writeups-only vs. site-wide styling — resolved to site-wide,
since the token/JS cost is identical either way and Phase 6's blog posts will
hit the same fenced-code gap otherwise).

The human browser check this entry originally claimed as "standing" instead
found four real problems the automated suite couldn't have — none of them
caught by `npm run test`, `npm run lint`, `html-validate`, or the AI's own
self-review, because all four are rendering/layout defects that only show up
on a real page:

1. **Button size vs. block size.** The first `.codecopy` used a reserved
   `padding-top: 3rem` on every wrapped `pre`, so a one-line code block grew
   taller just to make room for the button — visible height inflation the
   human caught immediately. Replaced with a floating, absolutely-positioned
   button that doesn't participate in the block's own flow.
2. **Phantom horizontal scrollbar.** Floating the button introduced a second
   `overflow-x: auto` on the `.codeblock` wrapper (on top of `main pre`'s
   own). An absolutely-positioned descendant counts toward its nearest
   _scrolling_ ancestor's scrollable area — so the button itself became the
   thing triggering a scrollbar that had nothing to do with code width.
   Removed the wrapper's overflow; `main pre` alone owns horizontal scroll.
3. **Button spilling off short blocks.** Once the block was allowed to be as
   short as its content (fix for #1), a 44px button offset `0.5rem` from the
   top needs ~60px of block height to stay contained — a one- or two-line
   block is naturally shorter than that. Verified with real
   `getBoundingClientRect()` measurements via a throwaway `puppeteer-core`
   script (same `CHROME_PATH`/`LD_PRELOAD` setup as `audit:banner`) before
   guessing at a fix: added `.codeblock pre { min-height: 3.75rem }`, which
   only bites blocks that would otherwise be shorter than the button needs —
   swept all 97 code blocks across all 11 writeups afterward to confirm zero
   overflow, not just the one block in the screenshot.
4. **Oversized visible button, then off-center one-liners.** The 44px touch
   target (Phase 4's own accessibility floor) read as a big box stamped over
   scrolling code. Fixed by keeping the button's real hit area at the full
   44px — required, invisible — and moving the visible look to a small
   `.codecopy-label` `<span>` inside it, so only a ~50×26px pill is what the
   eye sees while the click/tap target stays compliant. That, in turn,
   revealed a second issue: `<pre>` is a plain block box, so the extra height
   from `min-height` (fix #3) sat below the code instead of around it —
   `display: flex; align-items: center` on `.codeblock pre` was needed to
   actually center a one-liner instead of just making room beneath it.
5. **Inline-code tint leaking onto fenced blocks.** `main code`'s
   background (meant only for `` `inline code` `` mid-sentence) had no
   exclusion for `pre code`, so every fenced block showed a mismatched gray
   patch stacked on top of `main pre`'s own background. Scoped to
   `main code:not(pre code)`.

None of AI self-review's earlier passes ("verified across 4 pages", "36/36
tests") caught these because the test suite asserts DOM structure and copy
behavior, not rendered geometry — the gap a screenshot-driven human pass
exists to close. Each fix here was re-verified the same way: real
`getBoundingClientRect()` numbers from headless Chrome against the live dev
server, swept across all 11 writeups (97 code blocks total, zero overflow),
not just the one block that prompted the report — plus `npm run test`
(still 36/36, unmodified), `npm run lint`, and `npm run build` after every
round.

## Phase 5.1 follow-up — Resolving the header/body metadata overlap

Phase 5.1 shipped with one open item: `writeup.njk`'s `resume-header` block
rendered `os`/`difficulty` (or `event`/`category`/`difficulty`) plus
`technique` and `date` from frontmatter, but every README's own body — also
upstream content in the `htb-writeups` submodule, unreachable from this repo
— opens with its own bold metadata block (`**Difficulty:**`, `**OS:**`, etc.)
directly under the `# Title` H1. Two metadata blocks stacked back to back on
every one of the 11 pages.

Checked all 11 READMEs directly rather than assuming the pattern held
site-wide: every box body states `**OS:**` and `**Difficulty:**`; every CTF
body states `**Event:**`, `**Category:**`, and `**Difficulty:**`. Neither
`technique` nor `date` appears in any body — those are frontmatter-only,
authored for this site's rendering, not restated in the writeup prose. So the
overlap was exactly `os`/`difficulty`/`event`/`category`, and only those.

Fix: trimmed `resume-header` to just `technique` and `Completed {{ date }}`,
deleting the `os`/`event`/`category`/`difficulty` branch entirely — the two
fields that carry information the body doesn't already state, nothing more.
The `/writeups/` index page (`writeups.njk`) keeps rendering `os`/
`difficulty`/`event`/`category` in its list rows, since that's a summary
view with no adjacent body text to duplicate against — only the per-page
header changed.

Re-verified `npm run test` (36/36), `npm run lint`, `npm run build`, and
`npx html-validate _site`, all clean; confirmed the rendered header on `cap`
now shows only technique + date, with the body's own `**Difficulty:**
Easy` / `**OS:** Linux` line immediately following, unduplicated.

The AI surveyed all 11 bodies via grep before proposing a fix, rather than
generalizing from one writeup, since box and CTF frontmatter shapes differ.
The human made the actual call on which fields to drop versus which side to
edit — dropping from the header was the only option available anyway, since
the submodule content can't be touched from this repo.

The human browser check that followed found two more rendering gaps neither
`npm run test` nor `html-validate` could see, both from markdown elements
that had never been styled before this phase surfaced them:

1. **Bare `blockquote`.** Writeup asides (e.g. `cap`'s "I've since realized
   10000 is too aggressive...") rendered as plain browser-default indent —
   no left rule, nothing distinguishing it from an indented paragraph. No
   `blockquote` rule existed anywhere in `main.css`. Added one scoped to
   `main blockquote`, following the same convention as the code-block rules
   just above it: a `--color-border` left rule and `--color-muted` text,
   plus first/last-child margin resets so it doesn't add extra space against
   its own padding.
2. **`<h1>` flush against the header's border.** Every writeup's title
   landed with zero gap under `.resume-header`'s `border-bottom`. Cause:
   `.page h1 { margin-top: 0 }` — written for `about.njk`, where `<h1>` is
   nested _inside_ `.resume-header`, and reused by `writeups.njk`, where
   `<h1>` is the article's first child either way. `writeup.njk` is neither:
   its `<h1>` comes from the markdown body, a sibling _after_
   `.resume-header` closes, so the same blanket rule zeroed a margin that
   was supposed to exist. Fixed with a narrower selector,
   `.resume-header + h1 { margin-top: 1rem }`, that only fires for that one
   sibling relationship — `about.njk`'s nested h1 and `writeups.njk`'s
   first-child h1 are unaffected.

Both fixes re-verified with `npm run build` and `npx stylelint` clean; no
existing test covers rendered spacing or blockquote markup, so this stayed a
visual check against the dev server rather than an assertion.

## Phase 5.1 follow-up #2 — Metadata line squish and unbounded images

A human read of the rendered `writeup.njk` pages caught two more gaps the
automated checks didn't cover: the body's own metadata block (`**Event:**
... **Category:** ... **Difficulty:** ...`, upstream content in the
`htb-writeups` submodule) rendered as one squished line instead of one line
per field, and embedded screenshots had no max-width, so a large source
image could overflow a narrow viewport.

Root cause of the squish: each README writes that block as a single markdown
paragraph, with a bare `\n` (no blank line) between `**Label:**` entries.
`.eleventy.js` configures markdown-it with `breaks: false`, so those single
newlines aren't converted to `<br>` — and HTML collapses literal newlines to
a single space, flattening the whole block onto one visual line regardless
of the source formatting. Confirmed across all 11 READMEs that this
metadata paragraph is always the first `<p>` immediately following the
markdown body's own `<h1>`.

Fix, CSS-only (the source READMEs live upstream and can't be edited from
this repo): `.resume-header + h1 + p { white-space: pre-line }` restores the
line breaks the source markdown already has, and `column-count: 2` at the
existing `40rem` breakpoint splits the block across two columns on wider
viewports. A real grid/two-column layout built from parsed label/value pairs
was considered and rejected — the content is free-form markdown, not
structured data, so `column-count` on the existing paragraph is the smallest
change that doesn't risk mis-parsing a field value that itself contains a
colon or newline. Separately, `main img { max-width: 100%; height: auto }`
caps embedded screenshots to the container width.

Re-verified `npm run build`, `npm run test` (36/36), and `npm run lint`
(catching and fixing a `stylelint no-duplicate-selectors` regression and a
`no-descending-specificity` ordering issue introduced while placing the new
rules), all clean.

The human caught both issues from an actual rendered page — this class of
bug (correct HTML, wrong visual layout) isn't something the automated
build/test/lint suite catches at all, so it depended entirely on the manual
browser-check step in the working protocol. The human also proposed the
initial fix direction (two columns, capped image width); the AI investigated
the root cause (`breaks: false` plus HTML's newline collapsing) and picked
`white-space: pre-line` plus `column-count` over restructuring the template,
since the metadata text is upstream submodule content this repo can't edit.

## Phase 6.1 — Finalize pending blog posts

The tools-testing post (`testing-a-bunch-of-tools-to-stretch-my-claude-code-subscription.md`)
was already `status: evergreen` with no TODOs, so the work here was verification
and a cleanup that had been deferred since Phase 6 shipped.

`npm run build` confirmed both posts render: the tools-testing post builds to
`_site/blog/testing-a-bunch-of-tools-to-stretch-my-claude-code-subscription/`
and `building-this-site` to `_site/blog/building-this-site/`. Both appear in
the `/blog/` index and in the RSS feed (`feed.xml`). All 5 images referenced
by the tools-testing post exist in `src/assets/img/blog/`.

**Blog symlinks converted to real files.** Both `src/blog/*.md` files were
symlinks into the Obsidian vault (`../../../second_brain/80_Blog/...`). The
post-merge note in TASKS.md flagged this: CI clones without the vault silently
skip symlinked files, so the posts vanish from `/blog/` with no error. Copied
the real content into the repo and removed the symlinks. The build output is
unchanged — same 19 files, same content — but the repo is now self-contained.

No design doc, no new features, no CSS or template changes. This was the
smallest phase yet: verify, convert, confirm the build still passes.

## Phase 6.2 — External links open in a new tab

Mechanical phase: every external link on the site was missing
`target="_blank" rel="noopener noreferrer"`. Three change sites covered all 26
external `<a href>` links:

1. **`icon-link.njk` macro** (line 6): added `target="_blank" rel="noopener
   noreferrer"` directly to the `<a>` tag. The macro is only ever called with
   external URLs (email, GitHub), so a conditional parameter wasn't justified.
   Covers 5 icon links across every page's footer and `/about/`.

2. **`writeups.njk`** (line 9): added the same attributes to the raw `<a>` for
   the htb-writeups repo link. The only external `<a>` outside the macro.

3. **`.eleventy.js` markdown-it plugin**: a `link_open` renderer rule that
   injects `target="_blank" rel="noopener noreferrer"` on any `href` matching
   `/^https?:\/\//`. Covers all 20+ links in the two blog `.md` files and is
   future-proof for any new markdown content. Internal links (`/writeups/...`,
   `/about/`, etc.) are unaffected.

The initial attempt used `md.renderer.rules.link_open.bind(...)`, which crashed
at build time — markdown-it doesn't define `link_open` as an own-property rule
(it falls through to `self.renderToken`). Fixed by calling `self.renderToken`
directly.

A second bug appeared on the first build: `attrPush("target", "_blank")` with
two string arguments produced `t="a" r="e"` in the output instead of
`target="_blank" rel="noopener noreferrer"`. In markdown-it v15, `attrPush`
takes a single `[name, value]` array, not two separate arguments — the old
two-argument form pushes bare strings into the attrs array, which
`renderToken` then renders as single-character attribute names/values. Fixed
by changing to `attrPush(["target", "_blank"])`.

**AI-vs-human split**: AI identified all external links via a codebase search,
proposed the markdown-it plugin approach, and made all three edits. The
`attrPush` bug was caught by the human during a live browser check — the
markdown links opened in the same tab with mangled attributes. AI diagnosed
the markdown-it v15 API change and fixed it. Human approved the resume PDF
opening in a new tab (the macro hardcodes the attributes, so the local PDF
link also gets them — a deliberate simplification, not an oversight).
