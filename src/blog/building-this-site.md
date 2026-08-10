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
