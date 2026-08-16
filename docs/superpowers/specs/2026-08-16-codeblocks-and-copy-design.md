# Code blocks with a copy button — phase 5.1 design

Date: 2026-08-16. Rides on the (unshipped) Phase 5 PR: same branch, same
review, one commit. No dependency on the submodule, so no upstream change.

Several sections below describe the first-pass design; a human browser check
found four real layout bugs a plain read of this doc and the automated suite
both missed. Superseded passages are struck through and replaced inline,
same convention as the Phase 3.5 build log — see
`src/blog/building-this-site.md`'s Phase 5.1 entry for the full account.

## What is wrong today

Writeup READMEs render many `<pre><code>` blocks, yet `main.css` has no rule
for content code — only the `.banner pre` ASCII art. Body text already runs
`--font-mono`, so a fenced block is visually indistinguishable from prose:
same color, same background, no frame, no affordance, and long lines overflow
the page (Phase 4's "no horizontal scroll" applies to the viewport, not the
block). There is no copy affordance at all.

The writeup content is a **git submodule** — upstream markdown cannot be
edited from this repo (guardrail). So no classes can be added per block; every
hint derives from the rendered `<pre>`/`code` structure on the site side.

## Ground rules (existing conventions this must not break)

- **JS-off**: the site is fully usable without JS; a highlighter or a
  JS-painted background would regress that. Styling must be pure CSS (works
  with JS off); the copy button is a progressive enhancement that simply does
  not exist when JS is off.
- **Banner art is `<pre>`s too.** `cactusStrip`, `moonAboveHorizon`,
  `starField` render `<pre class=…>` inside `<header>`. Any styling keyed on
  `pre` must not reach them. They live outside `<main>`, which is the whole
  reason the rule below targets `main pre` — deterministic today (none of the
  current pages put a banner in `main`) and correct once the blog lands in
  Phase 6.
- **Two-theme token system**: every theme-varying value is a custom property
  set in the `:root` / `:root[data-theme="light"]` blocks. Code-block colors
  join that pattern; no rule carries a theme selector.
- **Contrast floor**: ≥4.5:1 for text (code `<code>` text keeps `--color-fg`,
  so the new background must keep that ratio), ≥3:1 for UI (button glyphs).
- **Touch floor**: all interactive targets ≥44px (enforced since Phase 4).
  The copy button is a touch target.
- Scripts in `src/assets/js/` are plain `<script>` (not ESM), loaded `defer`
  from `base.njk`, IIFE + `"use strict"`, feature-guarded no-ops (the `theme.js`
  pattern), and DOM tests go through real jsdom loads in `test/*.test.js`.

## The layout model

The `html: true` markdown-it config means nothing upstream can be changed, and
a `<pre>` over-scrolls on its own, so the copy button cannot live inside the
`<pre>` (it would ride the text and break what gets selected/copied). The
button gets its own wrapper, created by JS at load time:

```
<pre><code class="language-bash">…</code></pre>
  ── wrapped into ────────────────────────────────
<div class="codeblock">
  <button type="button" class="codecopy" aria-label="Copy code">Copy</button>
  <pre><code class="language-bash">…</code></pre>
</div>
```

- ~~The wrapper carries `position: relative` (button anchor) and
  `overflow-x: auto` (wide lines scroll inside the block, never the page).~~
  — **superseded**: an absolutely-positioned descendant (the button) counts
  toward its nearest _scrolling_ ancestor's scrollable area. Stacking a
  second `overflow-x: auto` on the wrapper on top of `main pre`'s own made
  the button itself trigger a phantom horizontal scrollbar unrelated to code
  width. The wrapper carries `position: relative` only; `main pre` alone
  owns horizontal scroll.
- The button is `position: absolute; top: 0.5rem; right: 0.5rem`, floating
  over the code rather than reserving space in flow — the `pre` keeps
  exactly the size it would have without the button, so wrapping a block
  never changes its height. No border (a semi-opaque `--code-bg` tint
  separates it from the code underneath instead), and always visible (no
  hover-only reveal — keyboard and screen-reader users can't hover).
- ~~44px min hit area kept via padding, not a visible box~~ — **superseded**:
  padding alone still rendered as a visibly oversized box stamped over
  scrolling code. The button element stays the full 44px hit area
  (accessibility floor, invisible — no background/border of its own); the
  visible look moved to a `.codecopy-label` `<span>` inside it, a small
  (~50×26px) pill, 14px text. `button.textContent` still reads through to
  the child span, so no test needed to change.
- **New**: a 44px button floating `0.5rem` from the top needs the block to be
  at least ~60px tall to stay contained. A one- or two-line block is
  naturally shorter than that once the block isn't artificially padded (see
  Files/Colors below), so `.codeblock pre { min-height: 3.75rem }` — a floor
  that only bites blocks that would otherwise be shorter than the button
  needs; anything with more content is already taller and unaffected.
  Verified against all 97 code blocks across all 11 writeups (zero overflow),
  not just the block that surfaced the bug.
- **New**: `<pre>` is a plain block box, so the extra height from that floor
  sat below the code instead of around it on a one-liner. `.codeblock pre`
  is `display: flex; align-items: center` so the stretched block centers its
  content instead of just padding beneath it.
- With JS off there is no `.codeblock` at all: the `pre` is still framed and
  tinted by the base rule, still horizontally scrollable inside its own width.

## Colors

New token pair per theme, one notch off the page background:

|       | page `--color-bg` | `--code-bg` | `--color-fg` on it    |
| ----- | ----------------- | ----------- | --------------------- |
| dark  | `#14111c`         | `#1e1b2c`   | `#e8e3f5` — ≈13.9:1 ✓ |
| light | `#f7f5f0`         | `#efece5`   | `#201e1a` — ≈14.4:1 ✓ |

Border/frame: `--color-border` (no new token). Inline `code` (not blocks)
gets a translucent tint so it reads as code even mid-sentence:
`color-mix(in srgb, var(--color-fg) 6%, var(--color-bg))` on
`main code:not(pre code)` — translatable per theme for free, no second
token, and stays above the contrast floor since the tint is overwhelmingly
the page background. (`color-mix` is fine: the site already uses `round()`
from Phase 3.5.) **The `:not(pre code)` was added after shipping without
it**: `main code` with no exclusion applied the same tint to the `<code>`
inside every fenced block too, stacking on top of `main pre`'s own
background and showing as a mismatched gray patch — caught in the human
browser check, not by the rendered-HTML diff (which only proves the markup
is stable, not that the computed colors are right).

No title bar, no language chip: only `language-bash` occurs today, so a chip
would be a constant label — noise per block for a grid of "BASH". If upstream
ever adds another language the markdown just renders it; nothing here cares.

## Behavior

- **Setup**: on load, `document.querySelectorAll("main pre")` are each wrapped
  in a `.codeblock` div and a button inserted first. (Delegation, not
  per-block listeners — `vaccine` alone has 20 blocks.)
- **Copy**: one click listener on `document`; if `target.closest(".codecopy")`,
  find the sibling `pre`, read its `textContent`, and copy via
  `navigator.clipboard.writeText`, falling back to a temp `textarea` +
  `execCommand("copy")` when the Clipboard API is unavailable, then removing
  the textarea. Failure surfaces as a brief "Copy failed" state rather than
  silent nothing.
- **Feedback**: the button's text and `aria-label` swap to "Copied" for ~2s
  then revert. One re-entrant guard + timer per button; a rapid second copy
  clears the prior timer so labels never desync. The button inherits the
  site's focus-visible ring; `event.preventDefault` is **not** needed since
  the button has no default action.

## Files

- `src/assets/css/main.css` — `--code-bg` in both token blocks; `main pre`
  (background, 1px `--color-border` frame, small radius, `0.75rem 1rem`
  padding, `overflow-x: auto`), `main code:not(pre code)` inline tint, and
  `.codeblock` / `.codeblock pre` / `.codecopy` / `.codecopy-label` rules.
- `src/assets/js/codecopy.js` — new, `theme.js`-pattern IIFE.
- `src/_includes/base.njk` — `<script src="/assets/js/codecopy.js" defer>`.
- `test/codecopy.test.js` — jsdom tests reading the real file, mirroring
  `theme.test.js`; see Verification.
- `TASKS.md` — add a "Phase 5.1" checklist section for this work.
- `src/blog/building-this-site.md` — build-log entry appended in the same PR
  (protocol).

## Verification

1. `npm run test` — `test/codecopy.test.js` added, all suites green:
   - wraps every `main pre`, skips any `pre` outside `main` (banner),
   - button has `aria-label="Copy code"`,
   - click calls `writeText` with the exact sibling `pre` text (clipboard API
     stubbed),
   - fallback path copies via `execCommand` when `navigator.clipboard` is
     absent,
   - label flips to "Copied" then reverts (fake timers),
   - no `main pre` → no-op,
   - absence of `document.querySelectorAll`? — irrelevant, jsdom has it.
2. `npm run lint`, `npm run build`, `npx html-validate _site` (static HTML is
   unchanged; validation sees plain `<pre>`).
3. Manual (`npm run serve` + human): a writeup with several blocks and long
   lines — frame visible in both themes, inline code tinted mid-sentence,
   wide line scrolls inside the block not the page, copy-paste lands in a
   terminal as raw text, button hit area ≥44px, focus ring visible, banner
   scenes unchanged, JS-off (devtools) shows framed blocks and no buttons.
   **This step is the one that actually found bugs** (block-size inflation,
   a phantom scrollbar, button spillover on short blocks, an oversized
   visible button, off-center one-liners, and the leaked inline-code tint —
   see the Layout model and Colors sections above) — none of them visible
   from source, DOM-structure tests, or a rendered-HTML diff, which only
   prove markup is present and stable, not that computed layout/geometry is
   correct.
4. Once a human-reported layout bug is suspected, prefer measuring over
   guessing: a throwaway `puppeteer-core` script against the live dev server
   (same `CHROME_PATH`/`LD_PRELOAD` handling as `audit:banner`), reading
   `getBoundingClientRect()` on the actual elements, swept across every
   writeup page rather than just the one block reported — that's what
   surfaced the exact pixel overflow in bug #3 and confirmed each fix against
   all 97 code blocks, not just the one in front of the human.
