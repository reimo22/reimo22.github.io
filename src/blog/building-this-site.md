---
title: Building this site
date: 2026-08-09
tags: [meta]
draft: true
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
docs: [`SPEC.md`](/SPEC.md), [`TASKS.md`](/TASKS.md), and the
[design doc](/docs/superpowers/specs/2026-08-09-portfolio-site-design.md) this
was built from.

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
  repo named after a path this site wants will *silently* shadow that path.
  Worth calling out as exactly the kind of thing a spec-first process is
  supposed to catch before code, not after a confusing deploy.

**Where AI helped, and where I had to redirect it.** The initial plan drafted
a Lighthouse gate with all four categories (accessibility, performance,
best-practices, SEO) hard-asserted at ≥95. An advisor pass caught that this is
close to useless on shared CI runners — performance/SEO scores wobble a few
points run to run, and a gate that fails randomly gets ignored, which is the
same as not having a gate. Revised to: accessibility hard-locked at 100,
everything else at ≥90 with real margin for a static, near-zero-JS site to
clear. Also caught and fixed before this phase closed: the writeups index was
originally going to require adding YAML front matter to the *upstream*
`htb-writeups` repo — which contradicted the "keep writing writeups exactly as
now, single source of truth" decision I'd already made. Fixed by parsing the
existing `README.md` table instead, with the build failing loudly on a
mismatch rather than degrading silently.

I also asked, separately, for this build-log to demonstrate the AI-assisted
workflow itself, spec-before-code discipline, and what CI actually catches —
not a general accessibility/mobile essay (those stay as SPEC.md requirements
and only show up here when a phase actually collides with them).

Next: Phase 2 stands up the Eleventy skeleton and the CI pipeline itself,
before there's any real content to debug alongside it.
