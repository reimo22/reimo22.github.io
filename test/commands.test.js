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
  <footer><p class="palette-hint" tabindex="-1">press / for commands</p></footer>
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
  var target = dom.window.document.activeElement || dom.window.document;
  target.dispatchEvent(event);
  return event;
}

test("builds 9 commands: 4 nav + 5 actions", () => {
  const dom = makeDom();
  assert.equal(dom.window.__palette.commands.length, 9);
});

test("nav labels match site.json", () => {
  const dom = makeDom();
  const labels = dom.window.__palette.commands.slice(0, 4).map((c) => c.label);
  assert.equal(
    JSON.stringify(labels),
    JSON.stringify(["Home", "About", "Writeups", "Blog"]),
  );
});

test("action labels match site.json", () => {
  const dom = makeDom();
  const labels = dom.window.__palette.commands.slice(4).map((c) => c.label);
  assert.equal(
    JSON.stringify(labels),
    JSON.stringify([
      "Toggle theme",
      "Copy page URL",
      "RSS feed",
      "Email",
      "GitHub",
    ]),
  );
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

test("help backdrop click closes, dialog click does not", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "?", { shiftKey: true });
  var dialog = document.querySelector('[aria-label="Keyboard shortcuts"]');
  dialog.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  assert.ok(document.querySelector('[aria-label="Keyboard shortcuts"]'));
  var backdrop = document.querySelector(".help-backdrop");
  backdrop.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  assert.equal(
    document.querySelector('[aria-label="Keyboard shortcuts"]'),
    null,
  );
});

test("help dialog receives focus on open", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "?", { shiftKey: true });
  var dialog = document.querySelector('[aria-label="Keyboard shortcuts"]');
  assert.equal(document.activeElement, dialog);
});

test("ArrowDown wraps from last to first", () => {
  const dom = makeDom();
  const { document } = dom.window;
  pressKey(dom, "/");
  var input = document.querySelector('[role="combobox"]');
  pressKey(dom, "End");
  assert.equal(input.getAttribute("aria-activedescendant"), "palette-opt-8");
  pressKey(dom, "ArrowDown");
  assert.equal(input.getAttribute("aria-activedescendant"), "palette-opt-0");
});
