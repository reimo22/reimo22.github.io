# Banner Responsive Nitpicks — Definition (no solution yet)

> **SUPERSEDED 2026-08-12** by
> `docs/superpowers/specs/2026-08-12-theme-toggle-and-banner-crop-design.md`.
> All three open decisions below are closed there, and the staged-collapse
> approach in Nitpick 2 was replaced by a continuous crop. In particular the
> "finally only the dino remains" narrowest state was **overruled by the
> human**. Kept for the requirements and the record of what was observed.

**Status:** Requirements only. Three nitpicks from visual review of the shipped
Phase 3 banner. This doc records what was observed and what is wanted.
Solution design (breakpoint values, how to stage the collapse, how to extend
the cactus) is deliberately deferred to the session that actions this.

**Parent doc:** `docs/superpowers/plans/2026-08-09-phase3-theme-handoff.md`

## Current implementation facts (what the nitpicks are about)

- Single responsive breakpoint at `width >= 40rem` (`src/assets/css/main.css`):
  - Below it: the banner shows the dino only — `.banner-extra` (star field,
    moon, shooting stars, cactus) is `display: none`.
  - At/above it: `.banner-row` becomes a row (`justify-content: space-between`)
    and all extras appear.
- Dark banner row: dino + star field (`pre.stargap`) + moon (`pre.moon`) +
  four absolutely-positioned shooting stars (`span.shooting-star`).
- Light banner row: dino + cactus (`pre.cactus`, 12-line art) only.
- `.banner pre { overflow-x: auto }` — a `<pre>` wider than its flex container
  gets a horizontal scrollbar. This is the "slider".

## Nitpick 1 — Sliders at intermediate widths

- **Observed:** between phone width and full screen there is a range of
  viewport widths where the banner content does not fit the row, and
  horizontal scrollbars ("sliders") appear in the banner (via
  `overflow-x: auto` on `.banner pre`).
- **Wanted:** no sliders at any viewport width. Content must collapse (hide)
  before it would overflow, at every width.

## Nitpick 2 — Dark-mode collapse order

- **Observed:** today the star field, moon, and shooting stars all vanish
  together at the 40rem breakpoint; below it only the dino remains.
- **Wanted:** as the view narrows, a staged collapse:
  1. The star field collapses first (shooting stars travel with the star
     area — exact grouping is for the implementer to decide).
  2. Then the moon collapses.
  3. Finally only the dino remains.
  - No sliders at any stage (Nitpick 1 applies throughout).
  - Exact stage widths are solution design, not decided here.

## Nitpick 3 — Light-mode cactus coverage

- **Observed:** at wide widths the light banner row is `space-between` with
  two children: dino far left, cactus far right. That leaves a large empty
  gap in the middle — the dark row reads as filled because the star field
  and moon span the width; the light row does not.
- **Wanted:** the cactus scene should cover more ground. Two options were
  named by the user, both open: **extend** the existing scene, or **repeat**
  it across the width.
- **Constraint:** whatever is chosen must not reintroduce the slider problem
  (Nitpick 1) at any viewport width.

## Open decisions (recorded here so the next session knows they are open)

1. Extend vs. repeat the cactus scene — user explicitly undecided.
2. Stage widths for the dark-mode collapse, and exactly which elements
   disappear at each stage (e.g., do shooting stars follow the star field?).
3. Whether the (extended) light row gets its own staged collapse or keeps the
   current two-state behavior (full scene at wide, dino-only at narrow).

## Acceptance criteria (definitions only)

- At no viewport width does a horizontal scrollbar appear in the banner.
- Dark mode: narrowing shows stars, then moon, then dino-only — in that
  order, without sliders at any intermediate width.
- Light mode: the cactus scene covers the row width at wide sizes with no
  sliders at any width.
