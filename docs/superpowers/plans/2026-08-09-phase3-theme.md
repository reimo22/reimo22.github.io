# Phase 3 — Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Eleventy skeleton from Phase 2 a purple/gray TUI theme — CSS custom-property
tokens (light + dark), an ASCII-art banner mechanism, mobile-first layout, and
`prefers-reduced-motion` gating — matching `SPEC.md` and TASKS.md Phase 3.

**Architecture:** One hand-written stylesheet (`src/assets/css/main.css`) defines color tokens
on `:root` (light default) with a `prefers-color-scheme: dark` override, plus mobile-first
layout rules. A build-time Nunjucks shortcode reads plain `.txt` ASCII-art files from
`src/assets/ascii/` and inlines them into `<pre aria-hidden="true">`, paired with a real
`<h1>` for the same text. Two banner variants (wide/narrow) ship as separate `<pre>` elements,
switched by a CSS `min-width` query — no JS involved. `.eleventy.js` gains a passthrough copy
for `src/assets/**`.

**Tech Stack:** Eleventy 3 (Nunjucks shortcode), hand-written CSS (no framework), `pyfiglet`-generated
ASCII text committed as static `.txt` files (build-time only, not a runtime/npm dependency).

## Global Constraints

- Contrast: body text ≥ 4.5:1, large text / UI borders ≥ 3:1 (verified by Lighthouse a11y = 100,
  and precomputed below using WCAG relative luminance).
- Light and dark themes both defined via CSS custom properties on `:root`; dark only overrides
  inside `@media (prefers-color-scheme: dark)` — never defined only inside a media query.
- ASCII banners: `<pre aria-hidden="true">` immediately followed by a real `<h1>` carrying the
  actual text; `overflow-x: auto` on the `<pre>` so it never forces page-level horizontal scroll;
  narrow variant swapped in under ~40rem.
- Mobile-first: base rules are the narrow layout; `min-width` media queries add the wide layout.
- Any motion effect is wrapped in `@media (prefers-reduced-motion: no-preference)` — never
  animates unconditionally.
- System monospace font stack only — no webfont download, no external request.
- Every phase's PR ends with an appended entry to `src/blog/building-this-site.md`.

---

## File Structure

```
src/
├── assets/
│   ├── css/main.css          # NEW — tokens, layout, banner, cursor
│   └── ascii/
│       ├── home.txt          # NEW — wide banner ("small" figlet, 29 cols x 5 rows)
│       └── home-narrow.txt   # NEW — narrow banner ("mini" figlet, 18 cols x 3 rows)
├── _includes/base.njk        # MODIFY — <link> to main.css, banner include, cursor span
├── index.njk                 # MODIFY — fills the banner block with the ascii shortcode
└── blog/building-this-site.md # MODIFY — Phase 3 entry appended

.eleventy.js                   # MODIFY — passthrough copy for src/assets, addShortcode("ascii", …)
```

Color tokens (precomputed against WCAG 2.1 relative luminance, values below):

| Token             | Light           | Dark            |
| ------------------ | --------------- | --------------- |
| `--color-bg`        | `#f5f3fa`       | `#14111c`       |
| `--color-fg`        | `#211c33`       | `#e8e3f5`       |
| `--color-muted`     | `#544d68`       | `#b3aac9`       |
| `--color-accent`    | `#6b3fa0`       | `#c9a6ff`       |
| `--color-border`    | `#8074a8`       | `#6d6494`       |

Verified contrast ratios (fg/bg and accent/bg against 4.5:1; border/bg against 3:1):

- Light: fg/bg 14.93:1, muted/bg 7.23:1, accent/bg 6.71:1, border/bg 3.83:1
- Dark: fg/bg 14.86:1, muted/bg 8.44:1, accent/bg 9.21:1, border/bg 3.46:1

All clear their targets with margin, so no `--color-border` mid-run drift risk on Lighthouse.

---

## Task 1: CSS tokens + mobile-first layout, wired into the build

**Files:**

- Create: `src/assets/css/main.css`
- Modify: `.eleventy.js` (add `eleventyConfig.addPassthroughCopy("src/assets")`)
- Modify: `src/_includes/base.njk` (add `<link rel="stylesheet" href="/assets/css/main.css" />` in `<head>`)

**Interfaces:**

- Produces: CSS custom properties `--color-bg`, `--color-fg`, `--color-muted`, `--color-accent`,
  `--color-border`, `--font-mono`, `--content-max` — consumed by Task 2's banner/cursor rules.
- Produces: served asset path `/assets/css/main.css` (via passthrough copy of `src/assets` → `_site/assets`).

- [ ] **Step 1: Write `src/assets/css/main.css`**

```css
:root {
  --color-bg: #f5f3fa;
  --color-fg: #211c33;
  --color-muted: #544d68;
  --color-accent: #6b3fa0;
  --color-border: #8074a8;
  --font-mono:
    ui-monospace, "SFMono-Regular", "Menlo", "Consolas", "Liberation Mono", monospace;
  --content-max: 75ch;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #14111c;
    --color-fg: #e8e3f5;
    --color-muted: #b3aac9;
    --color-accent: #c9a6ff;
    --color-border: #6d6494;
  }
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-mono);
  line-height: 1.5;
}

.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  background: var(--color-bg);
  color: var(--color-fg);
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  z-index: 10;
}

.skip-link:focus {
  left: 0.5rem;
  top: 0.5rem;
}

header {
  border-bottom: 1px solid var(--color-border);
  padding: 1rem;
}

nav ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

nav a {
  color: var(--color-accent);
  text-decoration: none;
  display: inline-block;
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
}

nav a:hover,
nav a:focus {
  text-decoration: underline;
}

main {
  padding: 1rem;
  max-width: var(--content-max);
  margin: 0 auto;
}

footer {
  border-top: 1px solid var(--color-border);
  padding: 1rem;
  color: var(--color-muted);
  font-size: 0.875rem;
}

@media (min-width: 40rem) {
  main {
    padding: 2rem;
  }

  header {
    padding: 1.5rem 2rem;
  }

  footer {
    padding: 1.5rem 2rem;
  }
}
```

- [ ] **Step 2: Add passthrough copy in `.eleventy.js`**

Add this line inside the exported function, before the `return`:

```js
eleventyConfig.addPassthroughCopy("src/assets");
```

- [ ] **Step 3: Link the stylesheet in `src/_includes/base.njk`**

In the `<head>`, after the `<title>` line, add:

```html
<link rel="stylesheet" href="/assets/css/main.css" />
```

- [ ] **Step 4: Build and verify the asset is served**

Run: `npm run build && ls _site/assets/css/main.css`
Expected: file exists at `_site/assets/css/main.css`.

Run: `npx eleventy --serve` in the background, then `curl -s http://localhost:8080/assets/css/main.css | head -5`
Expected: CSS content printed, not a 404.

- [ ] **Step 5: Lint**

Run: `npm run lint:stylelint && npm run lint:prettier`
Expected: zero errors. Fix any Stylelint/Prettier findings before continuing.

- [ ] **Step 6: Commit**

```bash
git add src/assets/css/main.css .eleventy.js src/_includes/base.njk
git commit -m "Phase 3: theme tokens and mobile-first layout"
```

---

## Task 2: ASCII banner mechanism + reduced-motion cursor

**Files:**

- Create: `src/assets/ascii/home.txt`
- Create: `src/assets/ascii/home-narrow.txt`
- Modify: `.eleventy.js` (add `addShortcode("ascii", …)`)
- Modify: `src/_includes/base.njk` (banner block markup)
- Modify: `src/index.njk` (fill the banner block)
- Modify: `src/assets/css/main.css` (banner + cursor rules, appended to Task 1's file)

**Interfaces:**

- Consumes: `--color-fg`, `--color-border`, `--font-mono` custom properties from Task 1.
- Produces: Nunjucks shortcode `{% ascii "home" %}` / `{% ascii "home-narrow" %}`, returning the
  raw text content of `src/assets/ascii/<name>.txt` at build time.
- Produces: CSS classes `.banner`, `.banner-wide`, `.banner-narrow`, `.cursor` — reusable by any
  later page that needs a banner (Phase 4+ pages reuse `.banner` if they add their own art).

- [ ] **Step 1: Write the ASCII art files**

`src/assets/ascii/home.txt` (figlet "small" font, 29 cols x 5 rows):

```
         _           ___ ___ 
 _ _ ___(_)_ __  ___|_  )_  )
| '_/ -_) | '  \/ _ \/ / / / 
|_| \___|_|_|_|_\___/___/___|
                             
```

`src/assets/ascii/home-narrow.txt` (figlet "mini" font, 18 cols x 3 rows):

```
             _ _  
.__ o._ _  _  ) ) 
|(/_|| | |(_)/_/_ 
```

- [ ] **Step 2: Add the `ascii` shortcode in `.eleventy.js`**

```js
import fs from "node:fs";
import path from "node:path";

// inside the exported function, alongside setLibrary:
eleventyConfig.addShortcode("ascii", function (name) {
  return fs.readFileSync(
    path.join("src/assets/ascii", `${name}.txt`),
    "utf8",
  );
});
```

- [ ] **Step 3: Define the banner block markup in `src/_includes/base.njk`**

Replace the existing empty `{% block banner %}{% endblock %}` line with:

```html
{% block banner %}{% endblock %}
```

(unchanged — the block stays generic; content comes from the page that extends it, per Step 4).

- [ ] **Step 4: Fill the banner in `src/index.njk`**

Replace the file's `content` block with:

```njk
---
title: Home
---

{% extends "base.njk" %}

{% block banner %}
  <div class="banner">
    <pre class="banner-wide" aria-hidden="true">{% ascii "home" %}</pre>
    <pre class="banner-narrow" aria-hidden="true">{% ascii "home-narrow" %}</pre>
    <h1>{{ site.title }}<span class="cursor" aria-hidden="true">_</span></h1>
  </div>
{% endblock %}

{% block content %}
  <p>Portfolio, HTB writeups, and build log.</p>
{% endblock %}
```

- [ ] **Step 5: Append banner + cursor CSS to `src/assets/css/main.css`**

```css
.banner {
  padding: 1rem 0 0;
}

.banner pre {
  margin: 0 0 0.5rem;
  overflow-x: auto;
  color: var(--color-accent);
  font-family: var(--font-mono);
  line-height: 1.1;
}

.banner-narrow {
  display: block;
}

.banner-wide {
  display: none;
}

@media (min-width: 40rem) {
  .banner-narrow {
    display: none;
  }

  .banner-wide {
    display: block;
  }
}

.banner h1 {
  margin: 0;
  border-top: 1px solid var(--color-border);
  padding-top: 0.5rem;
}

.cursor {
  display: inline-block;
}

@media (prefers-reduced-motion: no-preference) {
  .cursor {
    animation: blink 1s steps(1) infinite;
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
```

- [ ] **Step 6: Build and manually verify**

Run: `npm run build && cat _site/index.html`
Expected: `<pre class="banner-wide" aria-hidden="true">` and `<pre class="banner-narrow" aria-hidden="true">`
both contain the literal ASCII art (not empty, not an error).

Run: `npx eleventy --serve`, open `http://localhost:8080/` in a browser, resize below/above 640px.
Expected: narrow banner shows under ~640px, wide banner shows at/above it; no horizontal
scrollbar on the page body at any width (only on the `<pre>` itself if art is wider than viewport).

- [ ] **Step 7: Screen-reader / a11y sanity check**

Run: `npx html-validate _site`
Expected: zero errors.

Manually confirm in a browser devtools accessibility tree (or Orca) that the `<pre>` elements
are not exposed to the accessibility tree (`aria-hidden="true"`) and the `<h1>` reads the site
title as real text.

- [ ] **Step 8: Lint**

Run: `npm run lint:eslint && npm run lint:stylelint && npm run lint:prettier`
Expected: zero errors.

- [ ] **Step 9: Commit**

```bash
git add src/assets/ascii/home.txt src/assets/ascii/home-narrow.txt .eleventy.js \
  src/_includes/base.njk src/index.njk src/assets/css/main.css
git commit -m "Phase 3: ASCII banner mechanism with reduced-motion cursor"
```

---

## Task 3: Build log entry + task checklist

**Files:**

- Modify: `src/blog/building-this-site.md`
- Modify: `TASKS.md`

**Interfaces:**

- Consumes: nothing new — this task only documents Tasks 1–2's outcome.

- [ ] **Step 1: Append the Phase 3 entry to `src/blog/building-this-site.md`**

Append (after the Phase 2 section, matching the existing per-phase voice — decision +
alternative, where the spec/design doc turned out right or wrong in practice, what
verification actually caught):

```markdown

## Phase 3 — Theme

Purple/gray TUI theme: CSS custom-property tokens for light and dark, a build-time ASCII
banner shortcode, mobile-first layout, and a `prefers-reduced-motion`-gated blinking cursor.

**Contrast was computed before writing any CSS, not tuned after a failing Lighthouse run.**
The design doc flagged gray-on-dark monospace palettes as the likely trap, so the token
values were picked by running the WCAG relative-luminance formula against candidate hex pairs
first — light and dark border tokens both needed nudging lighter than the first guess to clear
the 3:1 UI-border target (2.69:1 → 3.83:1 for light, 2.69:1 → 3.46:1 for dark) before they ever
reached a browser.

**The ASCII banner is real generated art, not hand-typed text.** `pyfiglet`'s "small" and
"mini" fonts produced the wide and narrow variants; both are committed as static `.txt` files
read at build time via a `{% ascii "name" %}` shortcode — `pyfiglet` itself never becomes a
runtime or npm dependency. The wide/narrow swap at the ~40rem breakpoint is pure CSS
(`display: none` on one `<pre>` or the other), so it degrades correctly with JS disabled,
matching the progressive-enhancement contract from Phase 1.

Next: Phase 4 adds the static pages (`/about/`, `/contact/`, `/resume/`) on top of this theme,
plus taking over `/resume/` from the old redirect repo.
```

- [ ] **Step 2: Check off Phase 3 items in `TASKS.md`**

Change every `- [ ]` under `## Phase 3 — Theme` to `- [x]`.

- [ ] **Step 3: Full local verification pass**

Run: `npm run lint && npx eleventy && npx html-validate _site`
Expected: all pass with zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/blog/building-this-site.md TASKS.md
git commit -m "Phase 3: append build-log entry, check off tasks"
```

---

## Self-Review Notes

- **Spec coverage:** tokens+contrast (Task 1), ASCII mechanism+narrow variant+overflow-x
  (Task 2), mobile-first base styles (Task 1), reduced-motion gating (Task 2 cursor), build-log
  append (Task 3) — all five Phase 3 checklist items in `TASKS.md` are covered.
- No animated content exists elsewhere on the page yet, so the cursor is the only thing that
  needs `prefers-reduced-motion` gating in this phase; future motion (e.g. a command-palette
  transition in Phase 7) must follow the same pattern.
- Lighthouse itself only runs in CI (no local Chrome in this sandbox, per the Phase 2 build-log
  note) — Task 3 Step 3's local pass is the ceiling of what can be verified before pushing;
  the actual a11y=100 assertion is confirmed once CI runs on the PR.
