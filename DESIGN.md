# Design — reimo22.github.io

A design context file so any future agent/harness (opencode, Claude Code,
Cursor) can restyle or extend this site without re-deriving the brand from
scratch or drifting into generic "AI slop" styling.

## Brand / lane

Personal portfolio for **Kenji Pinlac** (reimo22). Reads as a **terminal / TUI
session**: monospace, ASCII-art banners, keyboard-first, terse. Personality is
"hacker-adjacent but clean" — no glowing gradients, no game-dev gimmicks, no
centered hero blobs. Genuinely static, fast, accessible, usable with JS off.

## Audience / voice

- Audience: hiring / security peers who want to see who reimo is, what's built,
  and HTB writeups.
- Voice in copy: first-person, confident, understated. The 404 page is plain and
  helpful ("The page you are looking for does not exist. Go home."), not flippant.

## Anti-references (what this site deliberately is NOT)

- No Inter/Arial/system-default font — everything is monospace (`--font-mono`).
- No purple-to-blue gradients (the near-universal AI tell). Purple here is a
  flat accent on a near-black/lavender background, not a gradient.
- No pure black or pure white backgrounds / text — always tinted.
- No cards nested in cards; content max-width is a single column `--content-max: 75ch`.
- No bounce/elastic easing, no scroll-jacking, no artificial "wow" animation
  (banners are static ASCII art, not animated).

## Color tokens (authoritative — mirror `src/assets/css/main.css`)

Dark is the **default** regardless of OS preference; light is opt-in via the
toggle, persisted in `localStorage` as `[data-theme="light"]`.

| Token                   | Dark (`:root`)                | Light (`[data-theme="light"]`) |
| ----------------------- | ----------------------------- | ------------------------------ |
| `--color-bg`            | `#14111c` near-black lavender | `#f7f5f0` off-white            |
| `--color-fg`            | `#e8e3f5` lavender-ish        | `#201e1a` near-black           |
| `--color-muted`         | `#b3aac9`                     | `#5a554a`                      |
| `--color-accent`        | `#c9a6ff` lavender            | `#201e1a`                      |
| `--color-border`        | `#6d6494`                     | `#847c6e`                      |
| `--code-bg`             | `#1e1b2c`                     | `#efece5`                      |
| `--palette-expand-hint` | `#8a7db8`                     | `#8a8478`                      |

`color-scheme` is declared in both blocks so native UA widgets (scrollbars,
form controls, focus rings) track page theme, not OS.

## Typography

- Font: `--font-mono` = `ui-monospace, "SFMono-Regular", "Menlo", "Consolas",
"Liberation Mono", monospace`.
- Body: `line-height: 1.5`. Content column: `--content-max: 75ch`.

## Type / components

- **Banners**: static **ASCII art** on the home page (cactus, moon/stars/dino),
  tiled/cut from a single `cactus.txt` source at build time by `.eleventy.js`.
- **Nav**: click **and** keyboard. A command palette + theme toggle + code-copy
  are the only JS (plain `<script>` IIFEs, deferred, progressive enhancement).
- **keyboard-first**: the command palette jumps sections; skip-link, 44px min touch
  targets (see `.skip-link`).
- Everything else works with **JavaScript disabled**.

## Must-not-drift (coupled magic numbers — change one, move the other)

- `SCENE_ROWS` in `.eleventy.js` ↔ `min-height` in `src/assets/css/main.css` and
  banner crop constants.
- Do not restyle banners as if they were decoupled; read `docs/build-log-reference.md`
  and `scripts/sweep-banner.mjs` before touching banner layout.

## Source of truth

- Design rationale: `docs/superpowers/specs/2026-08-09-portfolio-site-design.md`
- Brand tokens: `src/assets/css/main.css` (this file mirrors them — if you change
  one, update the other).
- Build/history: `docs/build-log-reference.md`.
