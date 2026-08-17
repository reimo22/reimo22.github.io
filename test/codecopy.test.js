import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";

const CODECOPY_JS = fs.readFileSync("src/assets/js/codecopy.js", "utf8");

const PAGE_HTML = `
  <main>
    <pre><code class="language-bash">echo "hi"</code></pre>
    <p>inline <code>code</code> is untouched</p>
  </main>
  <header><pre>--- banner art ---</pre></header>
`;

function makeDom(bodyHtml = PAGE_HTML) {
  const dom = new JSDOM(
    `<!doctype html><html><body>${bodyHtml}</body></html>`,
    {
      url: "https://example.test/",
      runScripts: "outside-only",
    },
  );
  dom.window.eval(CODECOPY_JS);
  return dom;
}

async function clickButton(dom, button) {
  button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  // The copy flow resolves on a promise, so let pending microtasks run
  // before the test asserts on its side effects.
  await new Promise((resolve) => setImmediate(resolve));
}

test("wraps every main pre in a .codeblock with a Copy button", () => {
  const dom = makeDom();
  const { document } = dom.window;
  const blocks = document.querySelectorAll(".codeblock");
  assert.equal(blocks.length, 1);
  const button = blocks[0].querySelector(".codecopy");
  assert.ok(button, "expected a copy button");
  assert.equal(button.type, "button");
  assert.equal(button.textContent, "Copy");
  assert.equal(button.getAttribute("aria-label"), "Copy code");
});

test("does not touch <pre> outside main (the banner art)", () => {
  const dom = makeDom();
  const { document } = dom.window;
  const banner = document.querySelector("header pre");
  assert.ok(banner, "banner pre still present");
  assert.equal(banner.closest(".codeblock"), null);
  assert.equal(
    banner.parentNode.tagName,
    "HEADER",
    "banner pre stays directly inside header",
  );
});

test("no main pre means no wrappers", () => {
  const dom = makeDom("<main><p>nothing here</p></main>");
  assert.equal(dom.window.document.querySelectorAll(".codeblock").length, 0);
});

test("clicking the button copies the block's exact text via the Clipboard API", async () => {
  const dom = makeDom();
  const { document, navigator } = dom.window;
  let copied = "";
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: async (text) => void (copied = text) },
    configurable: true,
  });

  await clickButton(dom, document.querySelector(".codecopy"));

  assert.equal(copied, 'echo "hi"');
});

test("falls back to a temp textarea + execCommand when the Clipboard API is absent", async () => {
  const dom = makeDom();
  const { document, navigator } = dom.window;
  Object.defineProperty(navigator, "clipboard", {
    value: undefined,
    configurable: true,
  });
  let execCalls = 0;
  let copiedValue = null;
  document.execCommand = () => {
    execCalls += 1;
    // The temp textarea lives at body level (appended in codecopy.js), not
    // inside the .codeblock wrapper.
    const textarea = document.querySelector("textarea");
    copiedValue = textarea && textarea.value;
    return true;
  };

  await clickButton(dom, document.querySelector(".codecopy"));

  assert.equal(copiedValue, 'echo "hi"');
  assert.equal(execCalls, 1);
  assert.equal(document.querySelector("textarea"), null, "removed after copy");
});

test("label flips to Copied and reverts after the timeout", async () => {
  const dom = makeDom();
  const { document, navigator } = dom.window;
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: async () => {} },
    configurable: true,
  });
  const button = document.querySelector(".codecopy");

  await clickButton(dom, button);
  assert.equal(button.textContent, "Copied");
  assert.equal(button.getAttribute("aria-label"), "Code copied");

  await new Promise((resolve) => setTimeout(resolve, 2100));
  assert.equal(button.textContent, "Copy");
  assert.equal(button.getAttribute("aria-label"), "Copy code");
});

test("a failed copy surfaces as Copy failed", async () => {
  const dom = makeDom();
  const { document, navigator } = dom.window;
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: async () => Promise.reject(new Error("nope")) },
    configurable: true,
  });
  const button = document.querySelector(".codecopy");

  await clickButton(dom, button);
  assert.equal(button.textContent, "Copy failed");
});
