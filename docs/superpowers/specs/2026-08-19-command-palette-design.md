# Command palette — phase 7 design

Date: 2026-08-19. One PR against `main` off branch `phase-7-command-palette`
(also carries an unrelated `docs:` commit updating CLAUDE.md's Context7
section). No dependency on the writeups submodule. Scope set by `SPEC.md`'s
"Command palette" section and the Phase 7 checklist in `TASKS.md`; the one
departure from SPEC's literal wording (command list = nav only) is the
approved "nav + site actions" scope, so SPEC gets a one-line amendment in
the same PR.

## What exists today

Every page navigates by real `<a href>` links in a real `<nav>` — the site is
fully usable with JS off and must stay that way. The palette is a layer on
top, not a replacement. The only hand-written JS so far is `theme.js` and
`codecopy.js`; this phase adds the third and final script, `commands.js`.

`src/_data/site.json` today holds `title`, `url`, and `nav` (4 entries:
Home, About, Writeups, Blog). The design doc called it the "nav/command
registry", but no command list exists yet — this phase creates it.

## Ground rules (existing conventions this must not break)

- **JS-off**: site fully usable; the palette and its discoverability hint
  simply do not exist without JS (progressive enhancement, like
  `codecopy.js`'s buttons).
- **Scripts**: plain `<script>` (not ESM), `defer` from `base.njk`, IIFE +
  `"use strict"`, feature-guarded no-ops, one delegated listener per event
  type (`codecopy.js` pattern).
- **Two-theme token system**: every theme-varying value is a custom property
  in the `:root` / `[data-theme="light"]` blocks; no rule outside those
  blocks carries a theme selector.
- **Contrast floor**: ≥4.5:1 text, ≥3:1 UI. Palette reuses existing tokens
  (`--color-bg`, `--color-fg`, `--color-muted`, `--color-accent`,
  `--color-border`); the only new pairing is the active-option selection
  (`--color-bg` text on `--color-accent` background), verified per theme in
  the browser check — Lighthouse's a11y audit can't see a JS-only overlay.
- **Touch floor**: option rows ≥44px tall, same floor as nav links, even
  though the palette is keyboard-first.
- **No drift**: palette commands derive from the same `site.json` data as
  the real `<nav>`; nothing about pages is re-typed in JS.
- **Touch-primary devices**: the palette's entry point (the hint) is hidden;
  key handlers stay live (an iPad with a keyboard is touch-primary but has
  real keys). TASKS says "hide palette entry point", and that is all that
  hides.
- **Firefox quick-find**: `/` is intercepted only when the palette actually
  opens (guarded), `Esc` always restores normal browsing, focus is never
  trapped permanently.

## Data model

`site.json` gains an `actions` array; `nav` is untouched and stays the
single source for page links:

```json
"actions": [
  { "label": "Toggle theme", "action": "toggle-theme" },
  { "label": "Copy page URL", "action": "copy-url" },
  { "label": "RSS feed", "url": "/feed.xml", "external": true },
  { "label": "Email", "url": "mailto:kpinlac@keemail.me" },
  { "label": "GitHub", "url": "https://github.com/reimo22", "external": true }
]
```

An entry is either an `"action"` (JS-dispatched, no URL) or a `"url"`;
`"external": true` means open in a new tab. `mailto:` carries no flag —
mailto in a new tab strands a blank tab, so it navigates same-tab.

`base.njk` renders one data island before the script tags:

```html
<script type="application/json" id="site-commands">
  {{ { nav: site.nav, actions: site.actions } | dump | safe }}
</script>
```

Nunjucks' `dump` is `JSON.stringify`; `| safe` skips HTML-escaping, which is
correct inside a `<script>` island (JSON is not HTML). Only the data
`commands.js` needs crosses the boundary; `title`/`url` stay server-side.

`commands.js` reads the island at load and builds the command list once:
`nav` entries become `{ label, run: () => location.href = url }` commands,
action entries dispatch by their `action` string through a plain object
map (no switch), url entries `window.open` or `location.href` per the
scheme branch above. Filtering operates on this array, not the DOM.

Rejected: scraping the rendered `<nav>` + footer icons for the command
list (no data island) — action commands still need a data source anyway,
labels couldn't carry anything the DOM doesn't show, and it contradicts
SPEC's "built from site.json" by building from rendered HTML instead.

## Visual design

The dialog and help overlay are JS-built at runtime (`codecopy.js`
precedent): zero markup cost with JS off, nothing to gate. The
discoverability hint is static markup (it must be visible without a click),
gated like the theme toggle: `.palette-hint { display: none }` +
`.js .palette-hint { display: block }`.

- **Dialog**: fixed, centered horizontally, ~18vh from the top;
  `width: min(92vw, 30rem); max-height: 60vh`; column flex with the filter
  input on top and the listbox scrolling below (`overflow-y: auto`).
  Framed like `main pre`: `--color-bg` background, 1px `--color-border`,
  matching radius. One `z-index` value above banner and skip-link.
- **Backdrop**: full-viewport fixed underlay, single literal
  `rgba(0,0,0,.45)`. It reads correctly in both themes, so it is not a
  theme-varying value and does not become a token (project rule). The
  browser check confirms; if dark mode reads flat, it promotes to a token
  then.
- **Active option**: `--color-bg` text on `--color-accent` background —
  selection-style invert that works in both themes (dark: dark text on
  purple; light: off-white on near-black) using existing tokens only.
- **Rows**: ≥44px tall (touch floor), label left in `--color-fg`. Labels
  come straight from `site.json` ("Home", "About", "Toggle theme",
  "RSS feed") — no "Go to" prefix, substring filter still matches.
- **Hint**: a second footer line after the contact line:
  `press / for commands · ? for help`, plain text in `--color-muted`. No
  `<kbd>` component — two usages don't justify a new styled element.
- **Help overlay** (`?`): second JS-built dialog, same frame, labelled
  "Keyboard shortcuts", static rows: `/ or Ctrl+K — open palette`,
  `Esc — close`, `↑/↓ — move`, `Enter — run`, `? — help`.
- **Touch hiding**: `@media (hover: none) and (pointer: coarse) {
.palette-hint { display: none } }` — CSS only, first `pointer: coarse`
  query on the site.
- **No motion at all**: no fade, blink, or type-on, so no
  `prefers-reduced-motion` gate is needed (SPEC's gate requirement is met
  by having nothing to gate).
- **Focus ring**: input and rows inherit the site's existing
  `:focus-visible` ring.

## Interaction

`document` `keydown` handler (delegation, one listener):

- **Open**: bare `/` (no Ctrl/Meta/Alt), or `?` (Shift+`/` for help), only
  when focus is not in `input`/`textarea`/`[contenteditable]` and the
  target overlay is closed → open + `preventDefault`. The preventDefault
  is what intercepts Firefox quick-find — and it happens only when the
  palette actually opens, so a guarded `/` (focus in an input) types a
  literal slash untouched.
- **Toggle**: `Ctrl+K` / `Cmd+K` → open if closed, close if open; works
  regardless of focus (it's not a typed character); always
  `preventDefault` (Firefox caret-browsing search). While the palette is
  open, `/` and `?` type literally into the filter input — the guard
  handles recursion uniformly, no special cases.
- **Single-overlay rule**: at most one overlay open; opening one closes
  the other. (Reaching help from the palette means `Esc` then `?` — the
  guard makes `?` literal while the input has focus.)
- **Close**: `Esc` closes the topmost overlay; backdrop click closes the
  palette; running any command closes (navigation unloads the page anyway;
  actions close after running). Our `Esc` preventDefaults only when an
  overlay is actually open — the next `Esc` is the browser's own, so
  quick-find users are never stuck.
- **Focus**: open stashes `document.activeElement`, moves focus to the
  filter input; close restores it (fall back to `document.body` if the
  element left the DOM). Only the input is focusable inside the dialog —
  options are reached via `aria-activedescendant`, so the Tab "trap" is
  one element and trivially correct.
- **Filter**: `input` event → case-insensitive substring match on labels
  across the merged list; empty filter shows all; active index resets to
  the first match. No matches → one inert "No commands" row (not an
  option; arrows/Enter no-op).
- **Navigation**: `ArrowDown`/`ArrowUp` move the active index with wrap;
  `Home`/`End` jump to the ends; the active option scrolls into view;
  `Enter` runs the active command; clicking an option runs it (one
  delegated listener on the listbox).
- **ARIA** (WAI-ARIA combobox + listbox, exactly what SPEC pins):
  dialog `role="dialog" aria-modal="true" aria-label="Command palette"`;
  input `role="combobox" aria-expanded="true" aria-controls=…
aria-activedescendant="palette-opt-{i}"`; list `role="listbox"
aria-label="Commands"`; rows `role="option"` with `aria-selected`. Help
  overlay: `role="dialog" aria-modal="true" aria-label="Keyboard
shortcuts"`, plain rows, no listbox.
- **Scroll-through**: the backdrop covers the viewport, so no body scroll
  lock is added. The browser check watches for background scrolling; if
  it appears, `overflow: hidden` on `<html>` while open is the fix.

## Action commands

- **`toggle-theme`**: `document.getElementById("theme-toggle").click()` —
  all theme logic (data-theme, localStorage, label sync) stays in
  `theme.js`, exercised through its own button. Missing button → no-op.
- **`copy-url`**: `navigator.clipboard.writeText(location.href)`. No
  `execCommand` fallback: the site is only ever served from GitHub Pages
  (HTTPS) or `localhost:8080`, both secure contexts where the Clipboard
  API is guaranteed — a fallback would be 15 lines duplicating
  `codecopy.js` for an unreachable case. ~~Feedback: the active row's label
  flips to "Copied", then the palette closes after ~700ms; on rejection
  the label shows "Copy failed" and the palette **stays open** so the
  failure is visible, `Esc` releases.~~ **Descoped**: copies silently and
  closes immediately, same as all other commands. The feedback/delayed-close
  flow would require restructuring the shared `run() → close()` path for
  one command's UX; not worth the complexity for a 9-command palette.
- **`RSS feed` / `GitHub`**: `window.open(url, "_blank", "noopener")`
  (Phase 6.2 convention for externals; the feed is same-origin but
  opening raw XML same-tab navigates away from the site).
- **`Email`**: `location.href = "mailto:…"` — same-tab, per the mailto
  reasoning in Data model.

## Files

- `src/_data/site.json` — add `actions`.
- `src/_includes/base.njk` — JSON island; footer hint markup;
  `<script src="/assets/js/commands.js" defer>`.
- `src/assets/js/commands.js` — new, `theme.js`-pattern IIFE (~150 lines,
  per the site design doc's budget).
- `src/assets/css/main.css` — `.palette-hint` (+ `.js` gate + coarse
  query), `.palette` dialog/backdrop/listbox/option rules, help overlay
  rules. No new tokens.
- `test/commands.test.js` — jsdom suite mirroring `theme.test.js`.
- `SPEC.md` — one-line amendment: command list = `nav` + `actions` from
  `site.json`, not nav only.
- `TASKS.md` — check off the Phase 7 items; append sub-notes for anything
  that diverges in implementation (house convention).
- `docs/build-log-reference.md` — Phase 7 entry in the same PR (protocol);
  narrative summary in `src/blog/building-this-site.md` if it earns one.

## Verification

1. `npm run test` — new `test/commands.test.js`, all suites green:
   builds the list from a fixture island (nav + actions, labels, count);
   `/` opens with focus moved and `aria-activedescendant` set; `/` inside
   an input does not open; `Ctrl+K` toggles; arrows wrap and update
   `aria-selected`; `Home`/`End` jump; filter narrows and shows the
   no-match row; `Esc` closes and restores focus; backdrop click closes;
   `?` opens help and `Esc` closes it; single-overlay rule; `toggle-theme`
   clicks the button (spy); `copy-url` stubs the clipboard, asserts the
   URL, the "Copied" flip, and the delayed close (fake timers); failure
   keeps the palette open. Nav-command `Enter` asserts navigation intent
   via jsdom's virtual console (jsdom implements no navigation; the
   "not implemented" error is the signal it fired).
2. `npm run lint`, `npm run build`, `npx html-validate _site` — static
   HTML changes are the island + hint; the palette itself is JS-built and
   invisible to html-validate, same as the copy buttons were.
3. Manual (`npm run serve` + human browser check — the step CI can't
   cover, per protocol): full keyboard pass on every page type — `/`,
   `Ctrl+K`, `?`, `Esc`, arrows, `Enter`; `/` types literally in the
   palette's own filter input; palette announces as a dialog (Orca spot
   check); contrast of the active-option selection in both themes;
   backdrop reads in both themes; no background scroll-through; hint
   hidden at touch-primary emulation and at 360/390/430px widths;
   JS-off pass — no hint, no palette, everything reachable by click+Tab.
4. Firefox specifically: quick-find (`/`) opens the palette, `Esc`
   returns to normal browsing, and a second `Esc` after close is the
   browser's own.
