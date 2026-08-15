import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";

const THEME_JS = fs.readFileSync("src/assets/js/theme.js", "utf8");

const BUTTON_HTML = `<button id="theme-toggle" aria-label="Toggle color theme"></button>`;

function makeDom(bodyHtml = BUTTON_HTML) {
  const dom = new JSDOM(
    `<!doctype html><html><body>${bodyHtml}</body></html>`,
    {
      url: "https://example.test/",
      runScripts: "outside-only",
    },
  );
  dom.window.eval(THEME_JS);
  return dom;
}

test("defaults to dark when no data-theme is set", () => {
  const dom = makeDom();
  const button = dom.window.document.getElementById("theme-toggle");
  assert.equal(
    dom.window.document.documentElement.getAttribute("data-theme"),
    null,
  );
  assert.equal(button.getAttribute("aria-label"), "Switch to light theme");
});

test("click sets data-theme, localStorage, and flips the aria-label", () => {
  const dom = makeDom();
  const { document, localStorage } = dom.window;
  const button = document.getElementById("theme-toggle");

  button.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

  assert.equal(document.documentElement.getAttribute("data-theme"), "light");
  assert.equal(localStorage.getItem("theme"), "light");
  assert.equal(button.getAttribute("aria-label"), "Switch to dark theme");
});

test("a second click reverts to dark", () => {
  const dom = makeDom();
  const { document, localStorage } = dom.window;
  const button = document.getElementById("theme-toggle");

  button.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  button.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

  assert.equal(document.documentElement.getAttribute("data-theme"), "dark");
  assert.equal(localStorage.getItem("theme"), "dark");
  assert.equal(button.getAttribute("aria-label"), "Switch to light theme");
});

test("respects a data-theme already set on <html> (e.g. by the inline blocking script)", () => {
  const dom = new JSDOM(
    `<!doctype html><html data-theme="light"><body>${BUTTON_HTML}</body></html>`,
    { url: "https://example.test/", runScripts: "outside-only" },
  );
  dom.window.eval(THEME_JS);
  const button = dom.window.document.getElementById("theme-toggle");
  assert.equal(button.getAttribute("aria-label"), "Switch to dark theme");
});

test("no-ops when the toggle button is absent", () => {
  assert.doesNotThrow(() => makeDom("<p>no button here</p>"));
});
