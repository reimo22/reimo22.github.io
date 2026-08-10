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
- Every phase appends a build-log entry to `src/blog/building-this-site.md`
  **in the same PR** as the work — never retrospectively.
- Each build-log entry records what CI actually caught and the AI-vs-human
  split: what the AI drafted, where human review redirected it. Corrections
  get recorded, not quietly redone.

## Commands

- `npm run serve` — dev server · `npm run build` — build `_site/`
- `npm run lint` / `npm run lint:fix` — the five-tool lint suite (CI runs it)
- `npx html-validate _site` — CI's HTML check, run locally before push

## Operational guardrails (enforced here)

- `package-lock.json` is npm-managed — a PreToolUse hook blocks hand-edits.
- `src/writeups/boxes/` is a **git submodule**; never edit it from this repo.
  Frontmatter and content live upstream in `htb-writeups` — don't duplicate.
- `.claude/settings.json` hooks auto-format on edit and rebuild on template /
  config / data / ascii changes.
