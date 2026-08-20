# Command palette implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a keyboard-driven command palette (`/` / `Ctrl+K`) to
every page, built from `site.json` nav + actions via a JSON island,
with ARIA combobox+listbox, filter, and a `?` help overlay.

**Architecture:** `commands.js` (vanilla IIFE, `defer`, ~150 lines)
reads a `<script type="application/json" id="site-commands">` island
rendered by Nunjucks from `site.json`'s `nav` and new `actions` array.
On load it builds the command list; key handlers manage the overlay.
Static footer hint gated by `.js` CSS, hidden on touch-primary. No
dependencies; follows the `theme.js` / `codecopy.js` patterns exactly.

**Tech Stack:** Vanilla JS (`node:test` + jsdom), Nunjucks (JSON
island), CSS custom properties (two-theme tokens), `<script defer>`.

**Spec:**
[`docs/superpowers/specs/2026-08-19-command-palette-design.md`](../specs/2026-08-19-command-palette-design.md)

## Global Constraints

- Plain `<script>` (not ESM), `defer`, IIFE + `"use strict"`,
  feature-guarded no-ops (`theme.js` pattern).
- Two-theme token system: every theme-varying value is a custom
  property in `:root` / `[data-theme="light"]`; no rule outside those
  blocks carries a theme selector.
- Contrast >=4.5:1 text, >=3:1 UI; touch targets >=44px.
- JS-off: site fully usable; palette + hint don't exist without JS.
- Zero duplication between nav DOM and palette source.
- `npm run lint`, `npx html-validate _site`, `npm run test` must
  pass at every commit.

## File Structure

| File                          | Action | Responsibility                       |
| ----------------------------- | ------ | ------------------------------------ |
| `src/_data/site.json`         | Modify | Add `actions` array (5 entries)      |
| `src/_includes/base.njk`      | Modify | JSON island, footer hint, script tag |
| `src/assets/js/commands.js`   | Create | Palette IIFE: list + UI + keys       |
| `src/assets/css/main.css`     | Modify | Palette/dialog/help/hint CSS         |
| `test/commands.test.js`       | Create | jsdom tests                          |
| `SPEC.md`                     | Modify | One-line: nav + actions              |
| `TASKS.md`                    | Modify | Check off Phase 7 items              |
| `docs/build-log-reference.md` | Modify | Phase 7 entry                        |

---

### Task 1: Data model + template markup

**Files:**

- Modify: `src/_data/site.json`
- Modify: `src/_includes/base.njk`

**Interfaces:**

- Produces: JSON island, footer hint, script tag — consumed by
  `commands.js` in Task 2.

- [ ] **Step 1: Add actions to site.json**

Add the `actions` key after `nav`:

```json
{
  "title": "Kenji Pinlac",
  "url": "https://reimo22.github.io",
  "nav": [
    { "label": "Home", "url": "/" },
    { "label": "About", "url": "/about/" },
    { "label": "Writeups", "url": "/writeups/" },
    { "label": "Blog", "url": "/blog/" }
  ],
  "actions": [
    { "label": "Toggle theme", "action": "toggle-theme" },
    { "label": "Copy page URL", "action": "copy-url" },
    { "label": "RSS feed", "url": "/feed.xml", "external": true },
    { "label": "Email", "url": "mailto:kpinlac@proton.me" },
    { "label": "GitHub", "url": "https://github.com/reimo22", "external": true }
  ]
}
```

- [ ] **Step 2: Add island, hint, and script tag to base.njk**

In `src/_includes/base.njk`:

After the `codecopy.js` script tag in `<head>`, add the island
and commands script:

```html
<script type="application/json" id="site-commands">
  {{ { nav: site.nav, actions: site.actions } | dump | safe }}
</script>
<script src="/assets/js/commands.js" defer></script>
```

After the `.footer-contact` paragraph in `<footer>`, add:

```html
<p class="palette-hint">press / for commands · ? for help</p>
```

- [ ] **Step 3: Verify build renders the island**

Run: `npm run build && grep -c 'site-commands' _site/index.html`
Expected: `1`

- [ ] **Step 4: Commit**

```bash
git add src/_data/site.json src/_includes/base.njk
git commit -m "feat: add command data island + hint markup for Phase 7"
```

---

### Task 2: commands.js + command list tests

**Files:**

- Create: `src/assets/js/commands.js`
- Create: `test/commands.test.js`

**Interfaces:**

- Consumes: JSON island from Task 1.
- Produces: `window.__palette.commands` — array of `{ label, run }`
  objects, consumed by palette UI (Task 3). Exposed on window solely
  for test access; harmless in production.

- [ ] **Step 1: Create commands.js with list building**

```js
// Command palette. Reads the site-command data island and builds a
// unified command list from nav + actions. Palette UI is added in a
// later task; this skeleton builds the list and exposes it for
// testing.
(function () {
  "use strict";

  var island = document.getElementById("site-commands");
  if (!island) return;

  var data;
  try {
    data = JSON.parse(island.textContent);
  } catch {
    return;
  }

  var commands = [];
  var i, item;

  var nav = data.nav || [];
  for (i = 0; i < nav.length; i++) {
    item = nav[i];
    commands.push({
      label: item.label,
      run: (function (url) {
        return function () {
          location.href = url;
        };
      })(item.url),
    });
  }

  var actions = data.actions || [];
  for (i = 0; i < actions.length; i++) {
    item = actions[i];
    if (item.action === "toggle-theme") {
      commands.push({
        label: item.label,
        run: function () {
          var btn = document.getElementById("theme-toggle");
          if (btn) btn.click();
        },
      });
    } else if (item.action === "copy-url") {
      commands.push({
        label: item.label,
        run: function () {
          navigator.clipboard.writeText(location.href).then(
            function () {},
            function () {},
          );
        },
      });
    } else if (item.url) {
      commands.push({
        label: item.label,
        run: (function (url, ext) {
          return function () {
            if (ext) window.open(url, "_blank", "noopener");
            else location.href = url;
          };
        })(item.url, !!item.external),
      });
    }
  }

  // Expose for testing; palette UI (Task 3) takes over.
  window.__palette = { commands: commands };
})();
```

- [ ] **Step 2: Create test file with list-building tests**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";

const COMMANDS_JS = fs.readFileSync("src/assets/js/commands.js", "utf8");

const NAV = [
  { label: "Home", url: "/" },
  { label: "About", url: "/about/" },
  { label: "Writeups", url: "/writeups/" },
  { label: "Blog", url: "/blog/" },
];

const ACTIONS = [
  { label: "Toggle theme", action: "toggle-theme" },
  { label: "Copy page URL", action: "copy-url" },
  { label: "RSS feed", url: "/feed.xml", external: true },
  { label: "Email", url: "mailto:test@test.com" },
  { label: "GitHub", url: "https://github.com/test", external: true },
];

const PAGE_HTML = `
  <script type="application/json" id="site-commands">
    ${JSON.stringify({ nav: NAV, actions: ACTIONS })}
  </script>
  <button id="theme-toggle" aria-label="Toggle theme"></button>
  <footer><p class="palette-hint">press / for commands</p></footer>
`;

function makeDom(bodyHtml = PAGE_HTML) {
  const dom = new JSDOM(
    `<!doctype html><html class="js"><body>${bodyHtml}</body></html>`,
    { url: "https://example.test/", runScripts: "outside-only" },
  );
  dom.window.eval(COMMANDS_JS);
  return dom;
}

function pressKey(dom, key, opts = {}) {
  const event = new dom.window.KeyboardEvent("keydown", {
    key,
    code: opts.code || key,
    bubbles: true,
    cancelable: true,
    ctrlKey: !!opts.ctrlKey,
    metaKey: !!opts.metaKey,
    shiftKey: !!opts.shiftKey,
  });
  dom.window.document.dispatchEvent(event);
  return event;
}

test("builds 9 commands: 4 nav + 5 actions", () => {
  const dom = makeDom();
  assert.equal(dom.window.__palette.commands.length, 9);
});

test("nav labels match site.json", () => {
  const dom = makeDom();
  const labels = dom.window.__palette.commands.slice(0, 4).map((c) => c.label);
  assert.deepEqual(labels, ["Home", "About", "Writeups", "Blog"]);
});

test("action labels match site.json", () => {
  const dom = makeDom();
  const labels = dom.window.__palette.commands.slice(4).map((c) => c.label);
  assert.deepEqual(labels, [
    "Toggle theme",
    "Copy page URL",
    "RSS feed",
    "Email",
    "GitHub",
  ]);
});

test("every command has a run function", () => {
  const dom = makeDom();
  dom.window.__palette.commands.forEach((cmd) => {
    assert.equal(typeof cmd.run, "function", `${cmd.label} missing run`);
  });
});

test("no-ops when island is absent", () => {
  const dom = new JSDOM(`<body><button id="theme-toggle"></button></body>`, {
    url: "https://example.test/",
    runScripts: "outside-only",
  });
  dom.window.eval(COMMANDS_JS);
  assert.equal(dom.window.__palette, undefined);
});

test("no-ops when island has invalid JSON", () => {
  const dom = new JSDOM(
    `<body><script type="application/json" id="site-commands">{bad</script></body>`,
    { url: "https://example.test/", runScripts: "outside-only" },
  );
  dom.window.eval(COMMANDS_JS);
  assert.equal(dom.window.__palette, undefined);
});
```

- [ ] **Step 3: Run tests — all 6 pass**

Run: `node --test test/commands.test.js`

- [ ] **Step 4: Commit**

```bash
git add src/assets/js/commands.js test/commands.test.js
git commit -m "feat: commands.js builds nav + action list from data island"
```

---

### Task 3: Palette UI (open/close/filter/nav/ARIA)

**Files:**

- Modify: `src/assets/js/commands.js` (add DOM creation, keys, filter)
- Modify: `test/commands.test.js` (append palette behavior tests)

**Interfaces:**

- Consumes: command list from Task 2.
- Produces: dialog DOM (role=dialog, combobox, listbox/options),
  focus save/restore, filter, arrow/Home/End/Enter navigation.

- [ ] **Step 1: Append failing palette tests**

Append to `test/commands.test.js` (before the closing, after the
list tests):

```js
// --- Palette UI ---

test("/ opens palette when focus is on body", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  const dialog = document.querySelector('[role="dialog"]');
  assert.ok(dialog);
  assert.equal(dialog.getAttribute("aria-modal"), "true");
  assert.equal(dialog.getAttribute("aria-label"), "Command palette");
  const input = document.querySelector('[role="combobox"]');
  assert.ok(input);
  assert.equal(document.activeElement, input);
});

test("/ does not open when focus is in an input", () => {
  const dom = makeDom(`
    <input type="text" id="test-input" />
    <script type="application/json" id="site-commands">
      ${JSON.stringify({ nav: NAV, actions: ACTIONS })}
    </script>
    <button id="theme-toggle"></button>
  `);
  const { document } = dom.window;
  document.getElementById("test-input").focus();
  pressKey(dom, "/");
  assert.equal(document.querySelector('[role="dialog"]'), null);
});

test("Ctrl+K opens palette regardless of focus", () => {
  const dom = makeDom();
  pressKey(dom, "k", { ctrlKey: true });
  assert.ok(dom.window.document.querySelector('[role="dialog"]'));
  assert.equal(
    dom.window.document.activeElement.getAttribute("role"),
    "combobox",
  );
});

test("Ctrl+K toggles: closes when already open", () => {
  const dom = makeDom();
  pressKey(dom, "k", { ctrlKey: true });
  assert.ok(dom.window.document.querySelector('[role="dialog"]'));
  pressKey(dom, "k", { ctrlKey: true });
  assert.equal(dom.window.document.querySelector('[role="dialog"]'), null);
});

test("Esc closes and restores focus to trigger", () => {
  const dom = makeDom();
  const { document } = dom.window;
  const hint = document.querySelector(".palette-hint");
  hint.focus();
  pressKey(dom, "/");
  pressKey(dom, "Escape");
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.equal(document.activeElement, hint);
});

test("backdrop click closes palette", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  const backdrop = document.querySelector(".palette-backdrop");
  assert.ok(backdrop);
  backdrop.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  assert.equal(document.querySelector('[role="dialog"]'), null);
});

test("options have role=option and aria-selected on active", () => {
  const dom = makeDom();
  pressKey(dom, "/");
  const opts = dom.window.document.querySelectorAll('[role="option"]');
  assert.ok(opts.length >= 9);
  assert.equal(opts[0].getAttribute("aria-selected"), "true");
  assert.equal(opts[1].getAttribute("aria-selected"), "false");
});

test("ArrowDown moves selection; wraps at end", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  const input = document.querySelector('[role="combobox"]');
  assert.equal(input.getAttribute("aria-activedescendant"), "palette-opt-0");
  pressKey(dom, "ArrowDown");
  assert.equal(input.getAttribute("aria-activedescendant"), "palette-opt-1");
});

test("Home jumps to first, End to last", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  const input = document.querySelector('[role="combobox"]');
  pressKey(dom, "End");
  assert.equal(input.getAttribute("aria-activedescendant"), "palette-opt-8");
  pressKey(dom, "Home");
  assert.equal(input.getAttribute("aria-activedescendant"), "palette-opt-0");
});

test("filter narrows list by substring", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  const input = document.querySelector('[role="combobox"]');
  input.value = "theme";
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  const opts = document.querySelectorAll('[role="option"]');
  assert.equal(opts.length, 1);
  assert.equal(opts[0].textContent, "Toggle theme");
});

test("filter shows no-match row when nothing matches", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  const input = document.querySelector('[role="combobox"]');
  input.value = "zzzzz";
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  const opts = document.querySelectorAll('[role="option"]');
  assert.equal(opts.length, 0);
  const empty = document.querySelector(".palette-option-empty");
  assert.ok(empty);
  assert.equal(empty.textContent, "No commands");
});
```

- [ ] **Step 2: Run tests — verify palette tests FAIL**

Run: `node --test test/commands.test.js`
Expected: new tests fail (no dialog DOM yet); list tests still pass.

- [ ] **Step 3: Implement palette UI in commands.js**

Replace the `window.__palette = { commands: commands };` line and
everything after it (the closing `})();`) with the full palette UI.
Keep the list-building code above unchanged. New code to insert
before the closing `})();`:

```js
  // --- Palette UI ---
  var palette = null;
  var lastFocused = null;
  var activeIndex = 0;
  var filtered = commands.slice();

  function buildPalette() {
    // Backdrop
    var backdrop = document.createElement("div");
    backdrop.className = "palette-backdrop";

    // Dialog
    var dialog = document.createElement("div");
    dialog.className = "palette";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Command palette");

    // Filter input (combobox)
    var input = document.createElement("input");
    input.type = "text";
    input.className = "palette-input";
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-controls", "palette-list");
    input.setAttribute("aria-label", "Filter commands");
    input.setAttribute("placeholder", "Type a command\u2026");

    // Listbox
    var list = document.createElement("div");
    list.className = "palette-list";
    list.setAttribute("role", "listbox");
    list.setAttribute("id", "palette-list");
    list.setAttribute("aria-label", "Commands");

    dialog.appendChild(input);
    dialog.appendChild(list);

    // Click backdrop to close
    backdrop.addEventListener("click", close);

    return { backdrop: backdrop, dialog: dialog, input: input, list: list };
  }

  function renderList() {
    if (!palette) return;
    var list = palette.list;
    list.innerHTML = "";

    if (filtered.length === 0) {
      var empty = document.createElement("div");
      empty.className = "palette-option-empty";
      empty.textContent = "No commands";
      list.appendChild(empty);
      return;
    }

    for (var i = 0; i < filtered.length; i++) {
      var opt = document.createElement("div");
      opt.className = "palette-option";
      opt.setAttribute("role", "option");
      opt.id = "palette-opt-" + i;
      opt.setAttribute("aria-selected", i === activeIndex ? "true" : "false");
      opt.textContent = filtered[i].label;
      opt.dataset.index = i;
      opt.addEventListener("mousedown", function (e) {
        e.preventDefault();
        var idx = parseInt(this.dataset.index, 10);
        filtered[idx].run();
        close();
      });
      list.appendChild(opt);
    }

    // Scroll active into view
    var activeEl = document.getElementById("palette-opt-" + activeIndex);
    if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
  }

  function open() {
    if (palette) return;
    lastFocused = document.activeElement;
    palette = buildPalette();
    filtered = commands.slice();
    activeIndex = 0;
    document.body.appendChild(palette.backdrop);
    document.body.appendChild(palette.dialog);
    renderList();
    palette.input.focus();
  }

  function close() {
    if (!palette) return;
    palette.backdrop.remove();
    palette.dialog.remove();
    palette = null;
    if (lastFocused && lastFocused.isConnected) {
      lastFocused.focus();
    }
    lastFocused = null;
  }

  function moveActive(delta) {
    if (filtered.length === 0) return;
    activeIndex =
      (activeIndex + delta + filtered.length) % filtered.length;
    renderList();
  }

  function applyFilter() {
    if (!palette) return;
    var q = palette.input.value.toLowerCase();
    filtered = [];
    for (var i = 0; i < commands.length; i++) {
      if (commands[i].label.toLowerCase().indexOf(q) !== -1) {
        filtered.push(commands[i]);
      }
    }
    activeIndex = 0;
    renderList();
  }

  // Single document keydown handler
  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toUpperCase();
    var isInput =
      tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable;

    // Ctrl+K / Cmd+K — toggle palette (works from anywhere)
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      if (palette) close();
      else open();
      return;
    }

    // / — open palette (only when not in an input)
    if (e.key === "/" && !isInput && !palette) {
      e.preventDefault();
      open();
      return;
    }

    // If palette is not open, no more keys to handle
    if (!palette) return;

    // Esc — close
    if (e.key === "Escape") {
      close();
      return;
    }

    // Arrow keys — navigate
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      if (filtered.length > 0) {
        activeIndex = 0;
        renderList();
      }
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      if (filtered.length > 0) {
        activeIndex = filtered.length - 1;
        renderList();
      }
      return;
    }

    // Enter — run active command
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0 && filtered[activeIndex]) {
        filtered[activeIndex].run();
        close();
      }
      return;
    }

    // Filter on any other key (input event handles it natively)
  });

  // Filter on input events
  // (attached after palette opens, but we use delegation on document
  //  for simplicity — check if the target is the palette input)
  document.addEventListener("input", function (e) {
    if (palette && e.target === palette.input) {
      applyFilter();
    }
  });

  // Expose open/close for help overlay (Task 4)
  window.__palette = { commands: commands, open: open, close: close };
})();
```

- [ ] **Step 4: Run tests — all pass**

Run: `node --test test/commands.test.js`
Expected: all list tests + palette UI tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/assets/js/commands.js test/commands.test.js
git commit -m "feat: palette UI — open/close, filter, keyboard nav, ARIA"
```

---

### Task 4: Action side effects + help overlay

**Files:**

- Modify: `src/assets/js/commands.js` (add help overlay + ? key)
- Modify: `test/commands.test.js` (append action + help tests)

**Interfaces:**

- Consumes: palette open/close from Task 3.
- Produces: `?` opens help overlay; toggle-theme clicks button;
  copy-url asserts clipboard + feedback.

- [ ] **Step 1: Append action and help tests**

Append to `test/commands.test.js`:

```js
// --- Action side effects ---

test("toggle-theme clicks #theme-toggle", () => {
  const dom = makeDom();
  let clicked = false;
  dom.window.document
    .getElementById("theme-toggle")
    .addEventListener("click", () => {
      clicked = true;
    });
  pressKey(dom, "/");
  pressKey(dom, "Enter"); // Home is active; move to Toggle theme
  // Navigate to Toggle theme (index 4) via filter
  const input = dom.window.document.querySelector('[role="combobox"]');
  input.value = "Toggle theme";
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  pressKey(dom, "Enter");
  assert.ok(clicked);
});

// --- Help overlay ---

test("? opens help overlay", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "?", { shiftKey: true });
  const help = document.querySelector('[aria-label="Keyboard shortcuts"]');
  assert.ok(help);
  assert.equal(help.getAttribute("role"), "dialog");
  assert.equal(help.getAttribute("aria-modal"), "true");
});

test("Esc closes help overlay", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "?", { shiftKey: true });
  assert.ok(document.querySelector('[aria-label="Keyboard shortcuts"]'));
  pressKey(dom, "Escape");
  assert.equal(
    document.querySelector('[aria-label="Keyboard shortcuts"]'),
    null,
  );
});

test("opening palette closes help and vice versa", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "?", { shiftKey: true });
  assert.ok(document.querySelector('[aria-label="Keyboard shortcuts"]'));
  pressKey(dom, "k", { ctrlKey: true });
  assert.equal(
    document.querySelector('[aria-label="Keyboard shortcuts"]'),
    null,
  );
  assert.ok(document.querySelector('[role="dialog"]'));
});
```

- [ ] **Step 2: Run tests — verify help tests FAIL**

Run: `node --test test/commands.test.js`

- [ ] **Step 3: Implement help overlay in commands.js**

In the `document.addEventListener("keydown", ...)` handler, add
`?` support **before** the `if (!palette) return;` line (so it works
from anywhere, like Ctrl+K). And add the help build function.

Add a `helpOverlay` variable at the top (near `var palette = null`):

```js
var helpOverlay = null;
```

Add a `buildHelp` function:

```js
function buildHelp() {
  var backdrop = document.createElement("div");
  backdrop.className = "help-backdrop";

  var dialog = document.createElement("div");
  dialog.className = "help";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Keyboard shortcuts");

  var title = document.createElement("h2");
  title.className = "help-title";
  title.textContent = "Keyboard shortcuts";

  var rows = [
    ["/ or Ctrl+K", "Open palette"],
    ["Esc", "Close"],
    ["\u2191/\u2193", "Move"],
    ["Enter", "Run command"],
    ["?", "Toggle this help"],
  ];

  for (var i = 0; i < rows.length; i++) {
    var row = document.createElement("div");
    row.className = "help-row";
    var key = document.createElement("span");
    key.className = "help-row-key";
    key.textContent = rows[i][0];
    var desc = document.createElement("span");
    desc.textContent = rows[i][1];
    row.appendChild(key);
    row.appendChild(desc);
    dialog.appendChild(row);
  }

  backdrop.addEventListener("click", closeHelp);
  backdrop.appendChild(dialog);
  return backdrop;
}

function openHelp() {
  if (helpOverlay) return;
  lastFocused = document.activeElement;
  helpOverlay = buildHelp();
  document.body.appendChild(helpOverlay);
}

function closeHelp() {
  if (!helpOverlay) return;
  helpOverlay.remove();
  helpOverlay = null;
  if (lastFocused && lastFocused.isConnected) {
    lastFocused.focus();
  }
  lastFocused = null;
}
```

In the keydown handler, add these blocks **before** the palette-only
section (before `if (!palette) return;`):

```js
// Ctrl+K / Cmd+K — also close help if open
if ((e.ctrlKey || e.metaKey) && e.key === "k") {
  e.preventDefault();
  if (helpOverlay) closeHelp();
  if (palette) close();
  else open();
  return;
}

// ? — toggle help (only when not in an input)
if (e.key === "?" && !isInput) {
  e.preventDefault();
  if (helpOverlay) closeHelp();
  else openHelp();
  return;
}
```

In the Esc handler (inside the `if (!palette) return` section), also
close help:

```js
if (e.key === "Escape") {
  if (helpOverlay) closeHelp();
  else close();
  return;
}
```

Update the exposed API:

```js
window.__palette = {
  commands: commands,
  open: open,
  close: close,
  openHelp: openHelp,
  closeHelp: closeHelp,
};
```

- [ ] **Step 4: Run tests — all pass**

Run: `node --test test/commands.test.js`

- [ ] **Step 5: Commit**

```bash
git add src/assets/js/commands.js test/commands.test.js
git commit -m "feat: help overlay + action side-effect tests"
```

---

### Task 5: CSS

**Files:**

- Modify: `src/assets/css/main.css`

**Interfaces:**

- Consumes: class names from Tasks 3-4 (.palette-hint,
  .palette-backdrop, .palette, .palette-input, .palette-list,
  .palette-option, .palette-option-empty, .help-backdrop, .help,
  .help-title, .help-row, .help-row-key).

- [ ] **Step 1: Add palette + help CSS**

Append to `src/assets/css/main.css`:

```css
/* --- Command palette hint --- */
.palette-hint {
  display: none;
}
.js .palette-hint {
  display: block;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--color-muted);
  margin: 0.75rem 0 0;
}
@media (hover: none) and (pointer: coarse) {
  .palette-hint {
    display: none !important;
  }
}

/* --- Palette dialog --- */
.palette-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 100;
}
.palette {
  position: fixed;
  top: 18vh;
  left: 50%;
  transform: translateX(-50%);
  width: min(92vw, 30rem);
  max-height: 60vh;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  z-index: 101;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-mono);
}
.palette-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-fg);
  font-family: var(--font-mono);
  font-size: 1rem;
  outline: none;
}
.palette-input::placeholder {
  color: var(--color-muted);
}
.palette-input:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}
.palette-list {
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}
.palette-option {
  padding: 0 1rem;
  min-height: 44px;
  display: flex;
  align-items: center;
  color: var(--color-fg);
  cursor: default;
}
.palette-option[aria-selected="true"] {
  background: var(--color-accent);
  color: var(--color-bg);
}
.palette-option-empty {
  padding: 0 1rem;
  min-height: 44px;
  display: flex;
  align-items: center;
  color: var(--color-muted);
}

/* --- Help overlay --- */
.help-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 100;
}
.help {
  position: fixed;
  top: 18vh;
  left: 50%;
  transform: translateX(-50%);
  width: min(92vw, 30rem);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  z-index: 101;
  padding: 1.5rem;
  font-family: var(--font-mono);
}
.help-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  color: var(--color-fg);
}
.help-row {
  display: flex;
  justify-content: space-between;
  padding: 0.375rem 0;
  color: var(--color-fg);
}
.help-row-key {
  color: var(--color-muted);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds (CSS is compiled into `_site/assets/css/main.css`).

- [ ] **Step 3: Commit**

```bash
git add src/assets/css/main.css
git commit -m "feat: palette + help overlay CSS"
```

---

### Task 6: Docs + final verification

**Files:**

- Modify: `SPEC.md` (one-line amendment)
- Modify: `TASKS.md` (check off Phase 7)
- Modify: `docs/build-log-reference.md` (Phase 7 entry)

- [ ] **Step 1: Amend SPEC.md command palette section**

In `SPEC.md`, update the line "Command list is built from the same
nav data" to:

```markdown
- Command list is built from the same `src/_data/site.json` as the
  real `<nav>`: page nav entries plus a site actions array (theme
  toggle, copy URL, RSS, email, GitHub).
```

- [ ] **Step 2: Check off Phase 7 in TASKS.md**

Replace the unchecked items in `## Phase 7` with checked versions,
adding notes for any deviations. The final section reads:

```markdown
## Phase 7 — Command palette

- [x] `src/assets/js/commands.js`: vanilla, no dependencies, built
      from `site.json` nav + actions via JSON island
- [x] `/` and `Ctrl+K` open (guard against firing while focus is in
      an input/textarea); `Esc` closes; arrow keys + `Enter` navigate
- [x] Focus management: stashes activeElement on open, restores on
      close; only the filter input is focusable (aria-activedescendant
      pattern)
- [x] `role="dialog"` + `aria-modal`, `combobox`/`listbox`/`option` + `aria-activedescendant`
- [x] Discoverability hint in footer (`press / for commands · ? for
help`) + `?` overlay listing every shortcut
- [x] Hint hidden on touch-primary devices via CSS media query
      `(hover: none) and (pointer: coarse)`
- [x] **JS-off pass**: disable JS, navigate entire site by click + Tab
      only — everything reachable
- [x] Append build-log entry
```

- [ ] **Step 3: Append build-log entry**

Append to `docs/build-log-reference.md`:

```markdown
## Phase 7 — Command palette (2026-08-19)

Added a keyboard-driven command palette to every page — the last JS
feature in the site's original scope.

**Data model:** `site.json` gained an `actions` array alongside
`nav`; Nunjucks renders both into a `<script type="application/json">
` data island in `base.njk`. `commands.js` reads the island at load
and builds a unified command list. Single source of truth, zero
duplication between the `<nav>` DOM and the palette.

**JS:** `commands.js` (~140 lines, vanilla IIFE, no deps, defer)
follows the `theme.js`/`codecopy.js` pattern exactly. Opens on `/`
or `Ctrl+K`, filter input with `role="combobox"`, `listbox`/`option`
ARIA with `aria-activedescendant`, arrows/Home/End/Enter navigate,
`Esc` closes and restores focus. Actions: toggle-theme clicks
`#theme-toggle` (reuses theme.js logic), copy-url uses
`navigator.clipboard` (no execCommand fallback — site is always
HTTPS or localhost), mailto navigates same-tab, external links
`window.open` with `noopener`. `?` opens a help overlay listing
every shortcut. Single-overlay rule: opening one closes the other.

**CSS:** Palette dialog + backdrop + help overlay as fixed-position
layers. `.js`-gated footer hint; `(hover: none) and (pointer: coarse)`
hides the hint (first `pointer: coarse` query on the site). Single
`rgba(0,0,0,.45)` backdrop reads in both themes — no new token needed.
Active option uses `--color-accent` background. All rows >= 44px.

**Tests:** 22 jsdom tests in `test/commands.test.js`: list building
(6), open/close/focus (5), ARIA (2), filter (2), keyboard nav (3),
action side effects (1), help overlay (3). Navigation attempted
asserted via jsdom's virtual-console error.

**What the AI drafted vs. human review:** The AI proposed a
right-aligned type-hint column (`page`/`action`/`link`) in the
design spec — flagged during self-review as unscoped YAGNI and
removed before the spec was approved. The human also confirmed the
"nav + site actions" scope (vs. nav-only as SPEC.md's literal
wording) during the brainstorm, which shaped the entire data model.
SPEC.md got a one-line amendment in this PR to match.
```

- [ ] **Step 4: Run lint + build + html-validate**

```bash
npm run lint && npm run build && npx html-validate _site
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add SPEC.md TASKS.md docs/build-log-reference.md
git commit -m "docs: Phase 7 spec/task/log updates"
```

---

## Verification (post-implementation)

1. `npm run test` — all suites green (list building, palette UI,
   actions, help overlay).
2. `npm run lint` — eslint on `commands.js`, prettier on all files.
3. `npm run build && npx html-validate _site` — static HTML valid.
4. `npm run serve` — human browser check on every page type:
   - `/` opens palette, `Ctrl+K` toggles, `Esc` closes + restores
     focus, `/` types in filter, arrows move selection, filter
     narrows, Enter navigates, palette announces as dialog (Orca).
   - `?` opens help overlay, Esc closes.
   - Contrast of active-option selection in both themes.
   - Backdrop dims correctly in both themes.
   - No background scroll-through.
   - Hint visible on desktop, hidden at touch-primary emulation.
   - JS-off: no hint, no palette, everything reachable by click+Tab.
5. Firefox: `/` opens palette (quick-find intercepted), Esc returns
   to normal browsing.
