import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";

const HTB_IDLE_JS = fs.readFileSync("src/assets/js/htb-idle.js", "utf8");

function makeDom(bodyHtml = "") {
  const dom = new JSDOM(
    `<!doctype html><html><body>${bodyHtml}</body></html>`,
    {
      url: "https://example.test/",
      runScripts: "outside-only",
    },
  );
  dom.window.eval(HTB_IDLE_JS);
  return dom;
}

test("daysSince counts whole UTC days", () => {
  const dom = makeDom();
  assert.equal(
    dom.window.__htbIdle.daysSince(
      "2026-11-01",
      new Date("2026-11-20T12:00:00Z"),
    ),
    19,
  );
});

test("daysSince returns 0 for today", () => {
  const dom = makeDom();
  assert.equal(
    dom.window.__htbIdle.daysSince(
      "2026-11-20",
      new Date("2026-11-20T23:59:00Z"),
    ),
    0,
  );
});

test("daysSince clamps a future date to 0", () => {
  const dom = makeDom();
  assert.equal(
    dom.window.__htbIdle.daysSince(
      "2026-11-25",
      new Date("2026-11-20T00:00:00Z"),
    ),
    0,
  );
});

test("daysSince rejects a missing or malformed date", () => {
  const dom = makeDom();
  assert.equal(dom.window.__htbIdle.daysSince(null, new Date()), null);
  assert.equal(dom.window.__htbIdle.daysSince("not-a-date", new Date()), null);
});

test("the home page line rewrites once the date is known", () => {
  const dom = makeDom(
    `<p id="htb-idle" data-last-played="2026-11-01">Last HTB activity: 2026-11-01</p>`,
  );
  dom.window.eval(HTB_IDLE_JS);
  const text = dom.window.document.getElementById("htb-idle").textContent;
  assert.match(text, /^Days since I last played HTB: \d+$/);
});

test("no line on the page is a no-op", () => {
  const dom = makeDom("");
  dom.window.eval(HTB_IDLE_JS);
  assert.equal(dom.window.document.getElementById("htb-idle"), null);
});
