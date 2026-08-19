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
  assert.equal(JSON.stringify(labels), JSON.stringify(["Home", "About", "Writeups", "Blog"]));
});

test("action labels match site.json", () => {
  const dom = makeDom();
  const labels = dom.window.__palette.commands.slice(4).map((c) => c.label);
  assert.equal(
    JSON.stringify(labels),
    JSON.stringify(["Toggle theme", "Copy page URL", "RSS feed", "Email", "GitHub"]),
  );
});

test("every command has a run function", () => {
  const dom = makeDom();
  dom.window.__palette.commands.forEach((cmd) => {
    assert.equal(typeof cmd.run, "function", `${cmd.label} missing run`);
  });
});

test("no-ops when island is absent", () => {
  const dom = new JSDOM(
    `<body><button id="theme-toggle"></button></body>`,
    { url: "https://example.test/", runScripts: "outside-only" },
  );
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
