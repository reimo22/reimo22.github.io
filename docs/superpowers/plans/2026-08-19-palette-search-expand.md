# Palette Search + Expandable Blog/Writeups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scoped title/tag search and right-arrow expandable Blog/Writeups nav items to the existing command palette.

**Architecture:** The existing data island (`<script type="application/json" id="site-commands">`) gets two new arrays: `posts` (blog collection) and `writeups` (box + CTF collections, merged). The Blog and Writeups nav entries become expandable — pressing Right-arrow on either swaps the palette's list to its children (sorted newest-first), the filter input resets, and typing filters by title or tag. Left-arrow collapses back to the root nav list. The existing root-level filter (nav + actions) is unchanged; only the expanded context gains tag matching.

**Tech Stack:** Eleventy 3, Nunjucks, plain JS (IIFE), node:test + jsdom.

**Spec:** `docs/superpowers/specs/2026-08-19-command-palette-design.md` (existing Phase 7 spec — this plan extends it).

## Global Constraints

- Plain `<script>` tag, not ESM; IIFE with `"use strict"`; loaded with `defer` from `<head>`.
- `src/writeups/boxes/` is a git submodule — never edit it. Frontmatter is read-only at build time.
- `site.json` is hand-edited (nav + actions); `posts` and `writeups` data comes from Eleventy collections at build time, rendered into the data island via a Nunjucks filter.
- Existing tests (24 in `test/commands.test.js`) must keep passing.
- `npm run lint`, `npm test`, `npm run build`, `npx html-validate _site` must all pass before push.
- No new dependencies. No Lunr.js, no FlexSearch. Naive substring filter over small arrays.
- Writeups have two collections (`writeups-box` filtered by `data.os`, `writeups-ctf` filtered by `data.event`). Both are merged into a single `writeups` array in the data island, sorted newest-first.
- Blog posts have `data.title`, `data.date`, and optionally `data.tags`. Writeups have `data.title`, `data.date`, and optionally `data.tags`. The filter searches `label` and `tags` (case-insensitive substring).
- `scrollIntoView` is not implemented in jsdom — all new code that calls it must guard with `if (el && el.scrollIntoView)`.
- JSDOM cross-realm strings fail `deepStrictEqual` — use `JSON.stringify` comparison for array-of-string assertions.

---

## File Structure

| File                          | Action | Responsibility                                                                                |
| ----------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| `.eleventy.js`                | Modify | Add `postsToCommands` filter — maps Eleventy collection items to `{ label, url, date, tags }` |
| `src/_includes/base.njk`      | Modify | Add `posts` and `writeups` to the JSON data island                                            |
| `src/assets/js/commands.js`   | Modify | Add expand/collapse state, right/left arrow handling, scoped filter with tag matching         |
| `src/assets/css/main.css`     | Modify | Add `.palette-breadcrumb` style for expanded-context indicator                                |
| `test/commands.test.js`       | Modify | Add tests for expand/collapse, scoped filter, tag matching, Enter navigation                  |
| `SPEC.md`                     | Modify | Amend palette section to mention expandable nav + scoped search                               |
| `TASKS.md`                    | Modify | Add Phase 7.1 checkboxes                                                                      |
| `docs/build-log-reference.md` | Modify | Append build-log entry                                                                        |

---

## Task 1: Eleventy Filter + Data Island

**Files:**

- Modify: `.eleventy.js` (after existing `addCollection` calls, ~line 344)
- Modify: `src/_includes/base.njk:30`
- Test: `npm run build` + verify `_site/index.html` contains `posts` and `writeups` in the data island

**Interfaces:**

- Produces: `postsToCommands` Nunjucks filter — accepts an array of Eleventy collection items, returns `[{ label, url, date, tags }]`
- Produces: data island now contains `{ nav, actions, posts, writeups }`

- [ ] **Step 1: Add the `postsToCommands` filter to `.eleventy.js`**

Add after the existing `addFilter("isoDate", ...)` and `addFilter("rfc822Date", ...)` calls (around line 322):

```js
eleventyConfig.addFilter("postsToCommands", (items) =>
  items.map((item) => ({
    label: item.data.title,
    url: item.url,
    date: isoDate(item.data.date),
    tags: (item.data.tags || []).filter(
      (t) => t !== "post" && t !== "writeups-box" && t !== "writeups-ctf",
    ),
  })),
);
```

This reuses the existing `isoDate` function (already defined and used by `isoDate` filter). The tag filter strips Eleventy's automatic collection tags so only human-authored tags remain.

- [ ] **Step 2: Update the data island in `base.njk`**

Change line 30 from:

```njk
{{ { nav: site.nav, actions: site.actions } | dump | safe }}
```

to:

```njk
{{ { nav: site.nav, actions: site.actions, posts: collections.blog | postsToCommands, writeups: collections["writeups-box"] | concat(collections["writeups-ctf"]) | sort(false, false, "date") | reverse | postsToCommands } | dump | safe }}
```

Wait — Nunjucks `concat` and `sort` with a property key won't work on plain objects. The collections are already sorted by date in `.eleventy.js` (`writeups-box` ascending, `writeups-ctf` ascending). We need them merged and reversed (newest-first). Safest approach: add a second filter that merges + sorts.

Replace Step 1 filter with two filters:

```js
eleventyConfig.addFilter("postsToCommands", (items) =>
  items.map((item) => ({
    label: item.data.title,
    url: item.url,
    date: isoDate(item.data.date),
    tags: (item.data.tags || []).filter(
      (t) => t !== "post" && t !== "writeups-box" && t !== "writeups-ctf",
    ),
  })),
);

eleventyConfig.addFilter("mergeNewestFirst", (a, b) => {
  var merged = (a || []).concat(b || []);
  merged.sort(function (x, y) {
    return new Date(y.date) - new Date(x.date);
  });
  return merged;
});
```

Then the data island becomes:

```njk
{{ {
  nav: site.nav,
  actions: site.actions,
  posts: collections.blog | postsToCommands,
  writeups: collections["writeups-box"] | mergeNewestFirst(collections["writeups-ctf"]) | postsToCommands
} | dump | safe }}
```

Actually — `mergeNewestFirst` operates on Eleventy collection items (which have `.data.date`), not on the mapped command objects. The sort must happen before `postsToCommands`. So `mergeNewestFirst` receives raw collection items and sorts by `item.data.date`:

```js
eleventyConfig.addFilter("mergeNewestFirst", (a, b) => {
  var merged = (a || []).concat(b || []);
  merged.sort(function (x, y) {
    return new Date(y.data.date) - new Date(x.data.date);
  });
  return merged;
});
```

And the template chains `mergeNewestFirst` before `postsToCommands`:

```njk
writeups: collections["writeups-box"] | mergeNewestFirst(collections["writeups-ctf"]) | postsToCommands
```

Blog posts are already reversed (newest-first) in the `blog` collection, so `posts` needs no merge:

```njk
posts: collections.blog | postsToCommands
```

- [ ] **Step 3: Run build and verify the data island**

Run: `npm run build`
Expected: Build succeeds, no errors.

Then verify the island contains `posts` and `writeups`:

```bash
grep -o '"posts":\[' _site/index.html | head -1
grep -o '"writeups":\[' _site/index.html | head -1
```

Expected: both print one match.

- [ ] **Step 4: Verify the data shapes manually**

```bash
node -e "var d = JSON.parse(require('fs').readFileSync('_site/index.html','utf8').match(/<script type=\"application\/json\" id=\"site-commands\">([\s\S]*?)<\/script>/)[1].trim()); console.log('posts:', d.posts.length, d.posts[0]); console.log('writeups:', d.writeups.length, d.writeups[0]);"
```

Expected: `posts` has 2 items (building-this-site, token-saving-tools), `writeups` has 11 items (7 boxes + 4 CTF), each with `label`, `url`, `date`, `tags`.

- [ ] **Step 5: Run existing tests to confirm nothing broke**

Run: `npm test`
Expected: All 60 tests pass (the existing palette tests use a local fixture, not the real data island, so they're unaffected).

- [ ] **Step 6: Commit**

```bash
git add .eleventy.js src/_includes/base.njk
git commit -m "feat: add posts + writeups to command data island"
```

---

## Task 2: Expandable Nav Items + Right/Left Arrow

**Files:**

- Modify: `src/assets/js/commands.js` (command-building loop ~line 19-30, state ~line 67-71, keydown handler ~line 256-336)
- Modify: `test/commands.test.js` (append new tests)

**Interfaces:**

- Consumes: `data.posts` and `data.writeups` arrays from the data island (Task 1)
- Produces: commands with `expandable: true` and `children: [...]` on Blog and Writeups nav entries
- Produces: `expandTo(parentCmd)` and `collapseToRoot()` functions used by Task 3's scoped filter

- [ ] **Step 1: Write failing tests for expandable nav items**

Append to `test/commands.test.js`:

```js
// --- Expandable nav ---

test("Blog and Writeups commands are expandable", () => {
  const dom = makeDom();
  var cmds = dom.window.__palette.commands;
  var blog = cmds.find(function (c) {
    return c.label === "Blog";
  });
  var writeups = cmds.find(function (c) {
    return c.label === "Writeups";
  });
  assert.ok(blog.expandable, "Blog should be expandable");
  assert.ok(writeups.expandable, "Writeups should be expandable");
  assert.ok(Array.isArray(blog.children), "Blog should have children array");
  assert.ok(
    Array.isArray(writeups.children),
    "Writeups should have children array",
  );
});

test("Home and About are not expandable", () => {
  const dom = makeDom();
  var cmds = dom.window.__palette.commands;
  var home = cmds.find(function (c) {
    return c.label === "Home";
  });
  var about = cmds.find(function (c) {
    return c.label === "About";
  });
  assert.equal(home.expandable, undefined);
  assert.equal(about.expandable, undefined);
});

test("Blog children have label, url, date, tags", () => {
  const dom = makeDom();
  var cmds = dom.window.__palette.commands;
  var blog = cmds.find(function (c) {
    return c.label === "Blog";
  });
  assert.ok(blog.children.length > 0);
  var child = blog.children[0];
  assert.equal(typeof child.label, "string");
  assert.equal(typeof child.url, "string");
  assert.equal(typeof child.date, "string");
  assert.ok(Array.isArray(child.tags));
  assert.equal(typeof child.run, "function");
});
```

Update the `makeDom` fixture to include `posts` and `writeups` in the data island. Change `PAGE_HTML`:

```js
const POSTS = [
  {
    label: "Building This Site",
    url: "/blog/building-this-site/",
    date: "2026-08-10",
    tags: ["meta", "web"],
  },
  {
    label: "Token Saving Tools",
    url: "/blog/token-saving-tools/",
    date: "2026-08-15",
    tags: ["tools", "ai"],
  },
];

const WRITEUPS = [
  {
    label: "Sequel",
    url: "/writeups/sequel/",
    date: "2026-08-05",
    tags: ["linux", "sql"],
  },
  {
    label: "Crocodile",
    url: "/writeups/crocodile/",
    date: "2026-08-01",
    tags: ["windows"],
  },
];

const PAGE_HTML = `
  <script type="application/json" id="site-commands">
    ${JSON.stringify({ nav: NAV, actions: ACTIONS, posts: POSTS, writeups: WRITEUPS })}
  </script>
  <button id="theme-toggle" aria-label="Toggle theme"></button>
  <footer><p class="palette-hint" tabindex="-1">press / for commands</p></footer>
`;
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/commands.test.js`
Expected: The 3 new tests FAIL — `blog.expandable` is `undefined`, `blog.children` is `undefined`.

- [ ] **Step 3: Add expandable flag + children to nav command building**

In `src/assets/js/commands.js`, replace the nav loop (lines 19-30) with:

```js
var posts = data.posts || [];
var writeups = data.writeups || [];

var nav = data.nav || [];
for (i = 0; i < nav.length; i++) {
  item = nav[i];
  var isBlog = item.label === "Blog";
  var isWriteups = item.label === "Writeups";
  var isExpandable = isBlog || isWriteups;
  commands.push({
    label: item.label,
    run: (function (url) {
      return function () {
        location.href = url;
      };
    })(item.url),
    expandable: isExpandable,
    children: isExpandable ? buildChildren(isBlog ? posts : writeups) : null,
  });
}
```

Add the `buildChildren` helper before the nav loop (after the `var commands = []` line):

```js
function buildChildren(items) {
  var children = [];
  for (var j = 0; j < items.length; j++) {
    var child = items[j];
    children.push({
      label: child.label,
      url: child.url,
      date: child.date,
      tags: child.tags || [],
      run: (function (url) {
        return function () {
          location.href = url;
        };
      })(child.url),
    });
  }
  return children;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/commands.test.js`
Expected: All tests pass (24 existing + 3 new = 27).

- [ ] **Step 5: Write failing tests for right-arrow expand and left-arrow collapse**

Append to `test/commands.test.js`:

```js
test("Right-arrow on Blog expands to post list", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  var input = document.querySelector('[role="combobox"]');
  // Navigate to Blog (index 3: Home=0, About=1, Writeups=2, Blog=3)
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  assert.equal(input.getAttribute("aria-activedescendant"), "palette-opt-3");
  // Press Right to expand
  pressKey(dom, "ArrowRight");
  var opts = document.querySelectorAll('[role="option"]');
  assert.ok(opts.length > 0);
  assert.equal(opts[0].textContent, "Building This Site");
});

test("Left-arrow collapses back to root nav", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowRight");
  assert.ok(document.querySelectorAll('[role="option"]').length > 0);
  pressKey(dom, "ArrowLeft");
  var opts = document.querySelectorAll('[role="option"]');
  assert.equal(opts.length, 9); // 4 nav + 5 actions = 9 root commands
  assert.equal(opts[0].textContent, "Home");
});

test("Right-arrow on non-expandable item does nothing", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  pressKey(dom, "ArrowRight");
  var opts = document.querySelectorAll('[role="option"]');
  assert.equal(opts.length, 9); // still root list
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `node --test test/commands.test.js`
Expected: The 3 new expand/collapse tests FAIL — ArrowRight is not handled, list doesn't change.

- [ ] **Step 7: Add expand/collapse state and right/left arrow handling**

In `src/assets/js/commands.js`, add new state variables after line 71 (`var filtered = commands.slice();`):

```js
var navRoot = commands.slice();
var currentList = navRoot;
var parentLabel = null;
```

Add `expandTo` and `collapseToRoot` functions after `close()` (around line 172):

```js
function expandTo(cmd) {
  if (!cmd || !cmd.expandable || !cmd.children) return;
  currentList = cmd.children;
  parentLabel = cmd.label;
  filtered = currentList.slice();
  activeIndex = 0;
  if (palette) {
    palette.input.value = "";
    renderList();
  }
}

function collapseToRoot() {
  currentList = navRoot;
  parentLabel = null;
  filtered = currentList.slice();
  activeIndex = 0;
  if (palette) {
    palette.input.value = "";
    renderList();
  }
}
```

In the keydown handler, after the `End` block (around line 325) and before the `Enter` block, add:

```js
// ArrowRight — expand if active item is expandable
if (e.key === "ArrowRight") {
  e.preventDefault();
  if (
    filtered.length > 0 &&
    filtered[activeIndex] &&
    filtered[activeIndex].expandable
  ) {
    expandTo(filtered[activeIndex]);
  }
  return;
}

// ArrowLeft — collapse to root if in expanded context
if (e.key === "ArrowLeft") {
  e.preventDefault();
  if (currentList !== navRoot) {
    collapseToRoot();
  }
  return;
}
```

Update `open()` to reset to root:

```js
function open() {
  if (palette) return;
  lastFocused = document.activeElement;
  palette = buildPalette();
  currentList = navRoot;
  parentLabel = null;
  filtered = currentList.slice();
  activeIndex = 0;
  document.body.appendChild(palette.backdrop);
  document.body.appendChild(palette.dialog);
  renderList();
  palette.input.focus();
}
```

Update `applyFilter()` to filter `currentList` instead of `commands`:

```js
function applyFilter() {
  if (!palette) return;
  var q = palette.input.value.toLowerCase();
  filtered = [];
  for (var i = 0; i < currentList.length; i++) {
    var cmd = currentList[i];
    if (cmd.label.toLowerCase().indexOf(q) !== -1) {
      filtered.push(cmd);
      continue;
    }
    if (cmd.tags) {
      for (var t = 0; t < cmd.tags.length; t++) {
        if (cmd.tags[t].toLowerCase().indexOf(q) !== -1) {
          filtered.push(cmd);
          break;
        }
      }
    }
  }
  activeIndex = 0;
  renderList();
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `node --test test/commands.test.js`
Expected: All 30 tests pass (24 existing + 3 expandable + 3 expand/collapse).

- [ ] **Step 9: Commit**

```bash
git add src/assets/js/commands.js test/commands.test.js
git commit -m "feat: expandable Blog/Writeups with right/left arrow navigation"
```

---

## Task 3: Scoped Filter with Tag Matching

**Files:**

- Modify: `test/commands.test.js` (append new tests)

**Interfaces:**

- Consumes: `expandTo()` / `collapseToRoot()` from Task 2
- Produces: verified tag-matching filter behavior in expanded context

- [ ] **Step 1: Write failing tests for scoped tag filtering**

Append to `test/commands.test.js`:

```js
// --- Scoped filter ---

test("filter in expanded context matches by title", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowRight");
  var input = document.querySelector('[role="combobox"]');
  input.value = "building";
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  var opts = document.querySelectorAll('[role="option"]');
  assert.equal(opts.length, 1);
  assert.equal(opts[0].textContent, "Building This Site");
});

test("filter in expanded context matches by tag", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowRight");
  var input = document.querySelector('[role="combobox"]');
  input.value = "web";
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  var opts = document.querySelectorAll('[role="option"]');
  assert.equal(opts.length, 1);
  assert.equal(opts[0].textContent, "Building This Site");
});

test("filter in expanded context shows no-match row", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowRight");
  var input = document.querySelector('[role="combobox"]');
  input.value = "zzzzz";
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  var opts = document.querySelectorAll('[role="option"]');
  assert.equal(opts.length, 0);
  assert.ok(document.querySelector(".palette-option-empty"));
});

test("Enter in expanded context navigates to child URL", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowRight");
  pressKey(dom, "Enter");
  // location.href should be set to the first child's URL
  assert.equal(
    dom.window.location.href,
    "https://example.test/blog/building-this-site/",
  );
});

test("root filter still works after collapse", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowRight");
  pressKey(dom, "ArrowLeft");
  var input = document.querySelector('[role="combobox"]');
  input.value = "github";
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  var opts = document.querySelectorAll('[role="option"]');
  assert.equal(opts.length, 1);
  assert.equal(opts[0].textContent, "GitHub");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/commands.test.js`
Expected: Title-match and no-match tests may pass (filter already works on `label`). Tag-match test FAILS — the root filter only checks `label`, not `tags`. The Enter-navigation test may fail if `location.href` doesn't update in jsdom.

Actually — the `applyFilter` update in Task 2 Step 7 already added tag matching. So the tag test should PASS. The Enter test needs `location.href` to actually navigate in jsdom, which it does (jsdom updates `location.href` on assignment).

Let me check: the existing `close()` after `run()` removes the dialog, but `location.href` is already set. The test checks `dom.window.location.href` after `Enter` → `run()` → `close()`. In jsdom, `location.href = "/blog/building-this-site/"` sets the URL relative to the base URL (`https://example.test/`), so the result is `https://example.test/blog/building-this-site/`.

Run the tests and see what actually fails, then fix accordingly.

- [ ] **Step 3: Fix any failures**

If the tag-match test fails, verify that `applyFilter` (updated in Task 2) is checking `cmd.tags` in the `currentList` context.

If the Enter-navigation test fails, check that `filtered[activeIndex].run()` is calling `location.href = url` correctly. The child's `run` function was built by `buildChildren` which closes over `child.url`.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All tests pass (60 existing + new tests).

- [ ] **Step 5: Commit**

```bash
git add test/commands.test.js
git commit -m "test: scoped filter with tag matching in expanded context"
```

---

## Task 4: Breadcrumb + CSS

**Files:**

- Modify: `src/assets/js/commands.js` (add breadcrumb element to `buildPalette`, update `renderList` or `expandTo`/`collapseToRoot` to show/hide it)
- Modify: `src/assets/css/main.css` (append breadcrumb styles)
- Modify: `test/commands.test.js` (add breadcrumb tests)

**Interfaces:**

- Consumes: `parentLabel` from Task 2
- Produces: visible breadcrumb showing "Blog" or "Writeups" when expanded

- [ ] **Step 1: Write failing test for breadcrumb**

Append to `test/commands.test.js`:

```js
test("breadcrumb shows parent label when expanded", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowRight");
  var breadcrumb = document.querySelector(".palette-breadcrumb");
  assert.ok(breadcrumb);
  assert.equal(breadcrumb.textContent, "Blog");
});

test("breadcrumb absent at root level", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  assert.equal(document.querySelector(".palette-breadcrumb"), null);
});

test("breadcrumb hides after collapse", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowDown");
  pressKey(dom, "ArrowRight");
  assert.ok(document.querySelector(".palette-breadcrumb"));
  pressKey(dom, "ArrowLeft");
  assert.equal(document.querySelector(".palette-breadcrumb"), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/commands.test.js`
Expected: 3 breadcrumb tests FAIL — no `.palette-breadcrumb` element exists.

- [ ] **Step 3: Add breadcrumb to palette DOM**

In `buildPalette()`, after the `input` creation and before the `list` creation, add:

```js
var breadcrumb = document.createElement("div");
breadcrumb.className = "palette-breadcrumb";
breadcrumb.setAttribute("aria-hidden", "true");
```

Append it to `dialog` before the input:

```js
dialog.appendChild(breadcrumb);
dialog.appendChild(input);
dialog.appendChild(list);
```

Update the return to include `breadcrumb`:

```js
return {
  backdrop: backdrop,
  dialog: dialog,
  input: input,
  list: list,
  breadcrumb: breadcrumb,
};
```

In `expandTo()`, after setting `parentLabel`, show the breadcrumb:

```js
function expandTo(cmd) {
  if (!cmd || !cmd.expandable || !cmd.children) return;
  currentList = cmd.children;
  parentLabel = cmd.label;
  filtered = currentList.slice();
  activeIndex = 0;
  if (palette) {
    palette.input.value = "";
    palette.breadcrumb.textContent = parentLabel;
    palette.breadcrumb.style.display = "block";
    renderList();
  }
}
```

In `collapseToRoot()`, hide the breadcrumb:

```js
function collapseToRoot() {
  currentList = navRoot;
  parentLabel = null;
  filtered = currentList.slice();
  activeIndex = 0;
  if (palette) {
    palette.input.value = "";
    palette.breadcrumb.textContent = "";
    palette.breadcrumb.style.display = "none";
    renderList();
  }
}
```

In `open()`, hide the breadcrumb initially:

```js
function open() {
  if (palette) return;
  lastFocused = document.activeElement;
  palette = buildPalette();
  currentList = navRoot;
  parentLabel = null;
  filtered = currentList.slice();
  activeIndex = 0;
  palette.breadcrumb.style.display = "none";
  document.body.appendChild(palette.backdrop);
  document.body.appendChild(palette.dialog);
  renderList();
  palette.input.focus();
}
```

- [ ] **Step 4: Add CSS for breadcrumb**

Append to `src/assets/css/main.css` (after the existing `.palette-input` rules):

```css
.palette-breadcrumb {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  color: var(--color-muted);
  border-bottom: 1px solid var(--color-border);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test test/commands.test.js`
Expected: All tests pass including 3 new breadcrumb tests.

- [ ] **Step 6: Run lint + build + html-validate**

Run: `npm run lint && npm run build && npx html-validate _site`
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/assets/js/commands.js src/assets/css/main.css test/commands.test.js
git commit -m "feat: breadcrumb indicator for expanded palette context"
```

---

## Task 5: Update Help Overlay

**Files:**

- Modify: `src/assets/js/commands.js` (`buildHelp` function, ~line 188-194)
- Modify: `test/commands.test.js` (verify help lists new keys)

- [ ] **Step 1: Add right/left arrow to help rows**

In `buildHelp()`, update the `rows` array to include the new keys:

```js
var rows = [
  ["/ or Ctrl+K", "Open palette"],
  ["Esc", "Close"],
  ["\u2191/\u2193", "Move"],
  ["\u2192", "Expand section"],
  ["\u2190", "Back to root"],
  ["Enter", "Run command"],
  ["?", "Toggle this help"],
];
```

- [ ] **Step 2: Write test verifying help lists expand/collapse keys**

Append to `test/commands.test.js`:

```js
test("help overlay lists expand and collapse keys", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "?", { shiftKey: true });
  var keys = document.querySelectorAll(".help-row-key");
  var keyTexts = Array.from(keys).map(function (k) {
    return k.textContent;
  });
  assert.ok(keyTexts.indexOf("\u2192") !== -1, "should list right arrow");
  assert.ok(keyTexts.indexOf("\u2190") !== -1, "should list left arrow");
});
```

- [ ] **Step 3: Run tests and commit**

Run: `node --test test/commands.test.js`
Expected: All tests pass.

```bash
git add src/assets/js/commands.js test/commands.test.js
git commit -m "feat: add expand/collapse keys to help overlay"
```

---

## Task 6: Docs + Final Verification

**Files:**

- Modify: `SPEC.md` (amend palette section)
- Modify: `TASKS.md` (add Phase 7.1 checkboxes)
- Modify: `docs/build-log-reference.md` (append build-log entry)

- [ ] **Step 1: Amend SPEC.md**

Find the palette section (around line 111-121) and add after the existing palette description:

```
Blog and Writeups nav entries are expandable: pressing Right-arrow on either
swaps the palette list to that section's posts/writeups (sorted newest-first),
with title/tag search scoped to that list. Left-arrow returns to the root
command list.
```

- [ ] **Step 2: Update TASKS.md**

Add a Phase 7.1 section after the Phase 7 section:

```markdown
## Phase 7.1 — Palette search + expandable nav

- [x] Add `posts` + `writeups` to data island via `postsToCommands` filter
- [x] Mark Blog/Writeups as expandable with children arrays
- [x] Right-arrow expands, left-arrow collapses
- [x] Scoped filter matches by title and tag in expanded context
- [x] Breadcrumb indicator shows parent label when expanded
- [x] Help overlay lists expand/collapse keys
- [x] `npm run lint` / `npm test` / `npm run build` / `npx html-validate` pass
```

- [ ] **Step 3: Append build-log entry**

Append to `docs/build-log-reference.md`:

```markdown
### Phase 7.1 — Palette search + expandable Blog/Writeups

**What changed:** The command palette's data island gains `posts` (blog
collection) and `writeups` (merged `writeups-box` + `writeups-ctf`,
newest-first) arrays via two new Nunjucks filters in `.eleventy.js`:
`postsToCommands` (maps collection items to `{ label, url, date, tags }`,
stripping Eleventy's automatic collection tags) and `mergeNewestFirst`
(concatenates two collections, sorts by `data.date` descending). The Blog
and Writeups nav entries are marked `expandable: true` with `children`
arrays. Right-arrow on an expandable entry swaps the palette list to its
children; left-arrow returns to root. The filter now matches against both
`label` and `tags` (case-insensitive substring). A breadcrumb element
(`.palette-breadcrumb`) shows the parent label when expanded.

**Tests:** N jsdom tests in `test/commands.test.js` (up from 24): added
expandable flag (3), expand/collapse navigation (3), scoped tag filtering
(4), breadcrumb (3), help overlay keys (1).

**What the AI drafted vs. human review:** The human chose scoped search
(Option B — search only inside expanded Blog/Writeups) over global search
(Option A — all posts visible at root level). This keeps the data island
small and the `/` affordance focused on navigation.

**What CI is expected to check (not yet pushed):** Same as Phase 7 — lint,
test, build, html-validate, Lighthouse a11y. The new breadcrumb and
expanded list markup must pass html-validate and Lighthouse's a11y audit.
```

- [ ] **Step 4: Run full verification**

Run: `npm run lint && npm test && npm run build && npx html-validate _site`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add SPEC.md TASKS.md docs/build-log-reference.md
git commit -m "docs: Phase 7.1 spec/task/log updates for palette search"
```

---

## Self-Review Notes

- **Spec coverage:** Scoped search (Task 3), expandable nav (Task 2), right/left arrow (Task 2), title/tag filter (Task 3), breadcrumb (Task 4), help update (Task 5), docs (Task 6). All requirements covered.
- **Placeholder scan:** No TBDs, no "implement later", no "similar to Task N". All code blocks contain actual implementation.
- **Type consistency:** `buildChildren` returns `[{ label, url, date, tags, run }]` — consumed by `expandTo` which sets `currentList = cmd.children`, then `applyFilter` reads `cmd.tags` on `currentList` items. `parentLabel` is a string or null, used by breadcrumb. Consistent.
- **JSDOM guards:** `scrollIntoView` guard already in `renderList` (unchanged). `JSON.stringify` comparison for label arrays (existing pattern). `pressKey` dispatches on `activeElement` (existing pattern).
- **Writeup submodule:** Only read at build time via Eleventy collections. Never edited. The `postsToCommands` filter reads `item.data.title`, `item.data.date`, `item.data.tags` — all read-only.
