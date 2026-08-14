# Theme toggle + continuous-crop banner — design

**Status:** Design approved by human review in the brainstorming session of
2026-08-12. Implemented in the Phase 3.5 PR; see `TASKS.md` for the checklist
and `src/blog/building-this-site.md` for what the implementation changed. Three
things this doc got wrong are corrected inline below, marked
**Corrected at implementation**.

**Supersedes:** `docs/superpowers/plans/2026-08-10-banner-responsive-nits.md`.
That doc recorded requirements only and left three decisions open; this doc
closes all three, and overrides its "narrowest state is dino-only" assumption.

**Parent docs:** `docs/superpowers/specs/2026-08-09-portfolio-site-design.md`,
`docs/superpowers/plans/2026-08-09-phase3-theme-handoff.md`

---

## Two changes, one phase

1. A **dark/light mode toggle** (sun/moon icon) in the header, top right.
2. A **continuous-crop banner** replacing the current all-or-nothing collapse,
   for both themes.

They ship together because the toggle makes both banner scenes reachable on one
machine at one viewport width. Today the light scene is only visible to someone
whose OS is set to light, so light-mode banner regressions are effectively
invisible during review. The toggle is what makes the banner work testable.

---

## Part 1 — Theme toggle

### Behavior

- A single button in `<header>`, top right, showing a sun in dark mode and a
  moon in light mode (the icon shows the theme you would switch _to_).
- Clicking swaps the theme and persists the choice in `localStorage`.
- With no stored choice, the OS preference (`prefers-color-scheme`) wins.

### Progressive enhancement (hard requirement)

`SPEC.md` requires the site stay fully usable with JS disabled. The toggle is a
JS-only affordance, so it must not render at all without JS — a dead button is
worse than no button. This follows the existing command-palette precedent:

- An inline blocking script in `<head>` adds a `.js` class to `<html>`.
- CSS gates the toggle on `html.js .theme-toggle { display: … }`; default is
  `display: none`.

### Avoiding the flash of wrong theme

The same inline blocking script reads `localStorage` and sets
`data-theme="light" | "dark"` on `<html>` **before first paint**. It must be
inline and blocking — an external or deferred script paints the wrong theme
first and then corrects it, which is a visible flash.

### CSS token restructure

Today dark-mode tokens live in a bare `@media (prefers-color-scheme: dark)`
block (`src/assets/css/main.css`). That media query cannot be overridden by a
toggle, so it must become:

- `:root` — light tokens (unchanged default).
- `@media (prefers-color-scheme: dark)` — dark tokens, applied only when
  `html` has no `data-theme` attribute (the no-JS / no-choice path).
- `[data-theme="dark"]` — dark tokens, applied unconditionally.
- `[data-theme="light"]` — light tokens, applied unconditionally.

The same restructure applies to the `.banner-light` / `.banner-dark` swap,
which is currently driven by the same media query.

### Accessibility

- Real `<button type="button">`, not a styled `<div>` — keyboard and screen
  reader support for free.
- `aria-label` describing the action ("Switch to light theme"), updated on
  toggle. The icon itself is `aria-hidden`.
- Must meet the contrast requirements already in `SPEC.md` in both themes.

---

## Part 2 — Banner: continuous crop

### The model

Three zones in the banner row, both themes:

| Zone            | Dark       | Light                               | Behavior                             |
| --------------- | ---------- | ----------------------------------- | ------------------------------------ |
| Left, pinned    | dino       | dino                                | never shrinks, never crops           |
| Middle, elastic | star field | cactus strip                        | absorbs all width change by cropping |
| Right, pinned   | moon       | (none — the strip runs to the edge) | fixed until it pops                  |

As the viewport narrows, the middle zone loses columns **from its left edge**.
Nothing else moves. There are no stage swaps and no elements appearing or
disappearing mid-range.

Left-edge cropping is not stylistic: the light strip's ground line has to stay
welded to the right edge of the row, or the horizon visibly detaches.

### The mechanic

```css
.crop-zone {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
}
```

Two of these lines are load-bearing and easy to lose in a refactor:

- **`min-width: 0`** is the actual fix for the "slider" bug in Nitpick 1. Flex
  items default to `min-width: auto`, which refuses to shrink below content
  width — that is what forced the overflow. With this set, **overflow becomes
  impossible by construction**, not by choosing correct breakpoints.
- **`justify-content: flex-end`** pins content right; an over-wide flex child
  then overflows leftward, which `overflow: hidden` clips. This replaces an
  earlier `direction: rtl` + `display: inline-block` approach that was tried
  and rejected — an inline-block sits on its parent's text baseline, which
  reserves descender space below it and lifts the art a few pixels off the
  row's bottom edge, misaligning it against the dino.

### Existing CSS that must be removed, not adjusted

- **`.banner pre { overflow-x: auto }` → `hidden`.** Left as `auto`, every crop
  turns into a per-element scrollbar — reintroducing exactly the bug being
  fixed.
- **`.moon { margin-right: 1.75rem }` — delete.** It fights
  `justify-content: flex-end` and the moon's pinned position.
- **`.banner pre { margin: 0 0 0.5rem }` → `margin: 0`.**
  **Corrected at implementation** — this doc originally missed it. In a flex
  row a child's cross size is its _margin_ box, so the moon's 8px bottom margin
  made the dark row 307.2px against a 299.2px `min-height`: an 8px shift on
  theme toggle and an 8px reflow at the moon-pop threshold, i.e. exactly the
  jump criteria 2 and 3 forbid. The bottom breathing room moved to
  `.banner { padding: 1rem 0 0.5rem }`, where it can't feed the row's height.
- **`.banner-light` needs `overflow: hidden` too.**
  **Corrected at implementation** — only `.banner-dark` had it, and an
  unclipped light scene means page-level horizontal scroll, the bug the Phase 3
  follow-up already fixed once.
- **`.banner-crop > pre` needs `flex: 0 0 auto`.**
  **Corrected at implementation** — the doc's snippet omitted it. Paired with
  `overflow: hidden` on the `<pre>`, a shrinkable art element clips its own
  _right_ edge, inverting the crop direction and detaching the ground line
  (criterion 5).
- **`.banner-extra` — delete the class entirely** (7 usages in `index.njk`,
  plus its rules in `main.css`). It lumps star field, moon, shooting stars and
  cactus into one on/off switch, which is incoherent under this model: those
  four elements now have three different behaviors. An implementer who keeps
  the class will gate the crop zone on it and undo the design. Replacement per
  usage:

  | Current `.banner-extra` usage | Becomes                                                    |
  | ----------------------------- | ---------------------------------------------------------- |
  | `pre.cactus`                  | the cactus strip, inside the crop zone, always rendered    |
  | `pre.stargap`                 | the star field, inside the crop zone, always rendered      |
  | `pre.moon`                    | pinned right; hidden only below the measured pop threshold |
  | `span.shooting-star` ×4       | always rendered; count varies 4 / 3 / 2 by band            |

### Light: the cactus strip

Derived from `src/assets/ascii/cactus.txt` by three operations:

1. **Trim** every line at column 15, removing the left hill and small cactus
   glyph. The tile is then 59 columns wide, set by its ground line.
2. **Repeat** the trimmed tile twice, concatenated **per line** into one
   contiguous block — not two `<pre>` elements butted together. A single text
   layout is what keeps the ground line an unbroken character run across the
   join.
3. **Cut** the result at column 104. This keeps the second hill's rise and its
   top plateau and drops the right descent plus trailing ground, so the scene
   runs off the right edge of the frame rather than resolving inside it.

The "repeat" option was chosen over "extend" (drawing new art) after the human
compared both in a live mockup.

**Constraint:** the strip must be generated at build time from `cactus.txt`,
not committed as a second art file. `cactus.txt` stays the single source of
truth; a committed derivative would drift. `CUT_RIGHT = 104` and the trim
column are named constants, not inline magic numbers.

**Known and accepted:** the cut removes the ground line from roughly column 90
rightward, because that stretch is the hill's blank interior. The bottom-right
of the banner therefore has no horizon under the plateau. Reviewed and accepted
as reading like depth.

**Also known and accepted:** the source art's cactus trunk and branches are not
perfectly aligned. That is how `cactus.txt` looks; it is not a tiling artifact
and must not be "fixed."

### Dark: the moon pops, the height does not

The moon cannot crop — a sliced moon reads as broken, not as off-frame. So it
is pinned and hidden below a threshold. Of the three options put in front of
the human, **A was chosen**: the moon disappears, and the row keeps reserving
its full height.

This costs dead vertical space at phone widths, and that was the accepted
trade. The alternative (letting the row shrink) puts an 88px reflow at a single
threshold, which is the height jump this work exists to remove.

Consequence: **there is no separate "fewer stars at medium width" stage.** When
the moon goes, the star field simply keeps cropping. The staged dark-mode
collapse described in the superseded plan doc is replaced by this.

**The threshold must be measured, not copied.** The harness measured 602px, but
its padding is not production's. Derive it during implementation from the real
rendered widths of dino + gaps + moon + a minimum sliver of star field. A
container query on the banner is worth considering over a viewport media query,
since the banner's own padding is what actually constrains the fit.

### Shooting stars

Present at **every** viewport width — they are not tied to the moon or the star
field. Only the count varies: **4 → 3 → 2** as the viewport narrows. Travel
distance shortens with the count so they do not animate mostly off-screen at
phone width. The existing `prefers-reduced-motion: no-preference` gate stays.

### Banner height

One reserved height, **18.7rem**, in both themes at all widths where the row is
horizontal. It comes from the measured render of `moon.txt` (299px), the
tallest asset in either scene.

Light's tallest asset is only 13.2rem, so light carries **5.5rem of dead space
at every width** — not just at phone widths. This is unconditional, and the
`min-height` must therefore sit outside any media query. Putting it inside one
reintroduces exactly the height jump this work exists to remove.
**That is the accepted trade — the human ruled explicitly that the two themes
must be normalized.** A banner that changes height when you hit the toggle
would undercut the whole point of the toggle, which is comparing the two
scenes at a fixed viewport width.

---

## What this overrides in the superseded plan doc

| Open decision (2026-08-10)               | Resolution                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Extend vs. repeat the cactus             | **Repeat** — two trimmed tiles, contiguous, cut at column 104                                    |
| Dark stage widths and per-stage elements | **No stages.** Continuous crop; only the moon pops, at a measured threshold                      |
| Does light get its own staged collapse?  | **Yes, the same continuous crop** — light and dark share one mechanic                            |
| Narrowest state is dino-only             | **Overruled by the human.** Narrowest dark state is dino + cropped star field + 2 shooting stars |

The 82rem / 87rem breakpoints considered earlier are **moot**. Continuous
cropping means there is no width at which the wide scene is all-or-nothing, so
the "these are desktop-monitor-only" concern disappears by construction. The
separate phone-width "lone cactus" glyph is likewise no longer needed — the
strip just keeps cropping.

---

## Acceptance criteria

1. No horizontal scrollbar in the banner at any viewport width, either theme.
2. Banner height is constant — across every width, and identical between the
   two themes, so toggling never moves the page.
3. The moon's disappearance causes no reflow.
4. Shooting stars are present at every width, at 4 / 3 / 2 by band.
5. The light ground line reaches the right edge of the row at every width.
6. Toggle is absent from the DOM's rendered output with JS disabled, and the
   site still themes itself from `prefers-color-scheme`.
7. No flash of wrong theme on load with a stored preference.
8. Toggle is keyboard reachable and labelled; contrast holds in both themes.

## Verification

Criteria 1–5 are mechanically checkable and should be, not eyeballed: sweep
280→1500px in 2px steps, in both themes, via headless Chrome. Worth porting
into the repo as a script alongside `audit:lighthouse`.

**Do not assert `scrollWidth <= clientWidth` on the banner row.** It passes
unconditionally and is worthless as a check, for two compounding reasons:

- The crop zone is `overflow: hidden`, so clipped content never reaches an
  ancestor's `scrollWidth` at all.
- `scrollWidth` only measures overflow in the **end** direction. This design
  overflows leftward by construction, which it never counts.

Both of those produced a clean green result during design while measuring
nothing. Assert these instead:

| Criterion                     | Assertion                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| 1 (no scrollbar)              | sum of the row's non-absolute children's widths ≤ `row.clientWidth`                              |
| 2 (constant height)           | the set of measured row heights has exactly one member, and it is the same member in both themes |
| 3 (pop costs no reflow)       | falls out of 2 — the height set does not gain a member at the pop threshold                      |
| 5 (ground line at right edge) | `crop.getBoundingClientRect().right - art.getBoundingClientRect().right === 0` at every width    |

Plus one **negative control**, without which the whole suite can pass on
content that simply fits and never crops: assert the crop genuinely engages,
via `crop.left - art.left > 0` (the art is clipped on its left) across the
narrow end of the range. At design time this held from 280px to 1248px in
light and 1310px in dark.

Three traps this suite hit during design, all of which passed casual visual
inspection:

- Measuring an element's fit **after** hiding it reads `scrollWidth` as 0,
  which makes the fit test oscillate every 2px. Cache natural widths while the
  element is visible.
- Sampling height immediately after a width change catches the CSS transition
  mid-flight and reports jumps that do not exist. Let it settle.
- The two `scrollWidth` blind spots above.

**Environment note:** headless Chrome will not launch on secureBlue under
`hardened_malloc` — it dies with `fatal allocator error: invalid uninitialized
allocator usage`. The sweep script must be run with `LD_PRELOAD=` cleared for
that subprocess. Record this next to the script or it fails on first run.

Criteria 5–8 need human review at the browser, per the `CLAUDE.md` pre-push
protocol.

## Open items — both closed at implementation

1. **Moon-pop threshold: `@container banner (width < 66ch)`.** Measured against
   production, not copied from the harness's 602px. 66ch = dino (17ch) + two
   1.5rem gaps (~5ch) + moon (34ch) + a ~10ch minimum sliver of star field. In
   the sweep the moon appears at a 698px viewport.
2. **Container query, not a viewport media query** — and the threshold has to
   be checked for _flicker_, not just placement. The header's padding grows
   from 1rem to 2rem at a 40rem viewport, which shrinks the banner's inline
   size by 32px right where this threshold sits. A viewport-based value near
   602px would make the moon appear at ~608px, vanish again at 640px when the
   padding grows, and reappear at ~672px. The sweep script now asserts the moon
   changes visibility at most once across 280→1500px.
