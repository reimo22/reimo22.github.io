# CLAUDE.md

Personal portfolio site (reimo22.github.io): Eleventy 3, Nunjucks, hand-written
CSS, one small JS script (command palette). This file is the working protocol
for this repo. For what the site _is_ and what's left to do, read the docs it
points to — don't expect them echoed here.

## Authority lives in these docs — read them, don't restate them

- **`SPEC.md`** — product decisions, requirements, CI thresholds.
- **`TASKS.md`** — the phase checklist and current status.
- **`docs/superpowers/specs/2026-08-09-portfolio-site-design.md`** — design rationale.
- **`src/blog/building-this-site.md`** — the per-phase build log.

## Working protocol

- One small, human-reviewed PR per phase, against `main`. Brainstorm first
  (one clarifying question at a time); spec + tasks approved before code.
- Review `git diff` before every commit and push — confirm only intended
  changes ship, spot secrets or stray files.
- **Before pushing to `main`** (which triggers CI and deploys): start the
  local server (`npm run serve`), hand it to the human for a manual check of
  the site in a browser, and don't proceed until they confirm. Only then
  commit and wrap up the phase.
- Every phase appends a build-log entry to `src/blog/building-this-site.md`
  **in the same PR** as the work — never retrospectively.
- Each build-log entry records what CI actually caught and the AI-vs-human
  split: what the AI drafted, where human review redirected it. Corrections
  get recorded, not quietly redone.

## Commands

- `npm run serve` — dev server · `npm run build` — build `_site/`
- `npm run lint` / `npm run lint:fix` — the five-tool lint suite (CI runs it)
- `npm run test` — `node:test` suite (helpers, shortcodes, theme.js DOM
  tests, icon markup check); CI runs it as its own job gating deploy
- `npx html-validate _site` — CI's HTML check, run locally before push
- `npm run audit:banner` — visual-layout sweep (needs `npm run serve` up in
  another terminal + `CHROME_PATH` set)

## Operational guardrails (enforced here)

- `package-lock.json` is npm-managed — a PreToolUse hook blocks hand-edits.
- `src/writeups/boxes/` is a **git submodule**; never edit it from this repo.
  Frontmatter and content live upstream in `htb-writeups` — don't duplicate.
- `.claude/settings.json` hooks auto-format on edit and rebuild on template /
  config / data / ascii changes.

## Non-obvious architecture

- `.eleventy.js` derives ASCII art at build time: `cactus.txt` is the single
  source of truth, tiled and cut into a strip at build; `moon`/`stars`/`dino`
  are composited by column/row arithmetic against that strip. Several magic
  numbers are coupled across `.eleventy.js` and `src/assets/css/main.css`
  (e.g. `SCENE_ROWS` ↔ `min-height`, banner crop constants) — change one and
  the other must move with it.
- `clientWidth`/`scrollWidth` measurements are unreliable for this banner's
  leftward-overflowing crop; `scripts/sweep-banner.mjs` documents why.
- `src/assets/js/` scripts are plain `<script>` (not ESM); `scripts/*.mjs` run
  in Node but serialize callbacks into the browser (see `eslint.config.js`).

## Environment quirks

- Node version is pinned in `.nvmrc` (26.7.0).
- Headless Chrome dies under secureblue's hardened malloc. The audit scripts
  clear `LD_PRELOAD` (`env -u LD_PRELOAD`) and need `CHROME_PATH` pointing at a
  headless shell (install: `npx @puppeteer/browsers install chrome-headless-shell@stable`).
- CI first `npm run build`s and uploads `_site` as an artifact, then lint,
  html-validate, lighthouse (assertions in `lighthouserc.json`), and lychee
  all run against that single build; deploy is gated on all of them.
