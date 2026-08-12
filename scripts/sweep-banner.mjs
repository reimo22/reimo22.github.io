// Banner width sweep — the mechanical half of the continuous-crop acceptance
// criteria (see docs/superpowers/specs/2026-08-12-theme-toggle-and-banner-crop-design.md).
//
// Run with the dev server already up:
//   npm run serve            # in another terminal
//   npm run audit:banner
//
// The npm script clears LD_PRELOAD: headless Chrome dies under secureblue's
// hardened_malloc with "fatal allocator error: invalid uninitialized allocator
// usage". CHROME_PATH comes from the environment, same as audit:lighthouse.
//
// Deliberately absent: `scrollWidth <= clientWidth` on the banner row. It
// passes unconditionally here — the crop zone is overflow:hidden so clipped
// content never reaches an ancestor's scrollWidth, and scrollWidth only counts
// overflow in the end direction while this design overflows leftward.

import puppeteer from "puppeteer-core";

const URL = process.env.SWEEP_URL || "http://localhost:8080/";
const MIN_WIDTH = 280;
const MAX_WIDTH = 1500;
const STEP = 2;

const chromePath = process.env.CHROME_PATH;
if (!chromePath) {
  console.error(
    "CHROME_PATH is not set. Install a headless shell with\n" +
      "  npx @puppeteer/browsers install chrome-headless-shell@stable\n" +
      "and point CHROME_PATH at the binary (see .claude/settings.local.json).",
  );
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: chromePath,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
try {
  await page.goto(URL, { waitUntil: "load", timeout: 10000 });
} catch {
  console.error(`Could not load ${URL} — is \`npm run serve\` running?`);
  await browser.close();
  process.exit(1);
}

const results = {};

for (const theme of ["light", "dark"]) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
  }, theme);

  const heights = new Set();
  let worstChildOverflow = -Infinity;
  let worstRightGap = 0;
  let worstPageOverflow = -Infinity;
  let clipFrom = null;
  let clipTo = null;
  let moonPop = null;
  let moonFlips = 0;
  let moonWasVisible = null;

  for (let width = MIN_WIDTH; width <= MAX_WIDTH; width += STEP) {
    await page.setViewport({ width, height: 900 });
    const sample = await page.evaluate(async (t) => {
      // Two frames: the first lands the new viewport, the second lets layout
      // settle. Sampling on the same frame as a resize reads mid-flight values.
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
      const scene = document.querySelector(
        t === "dark" ? ".banner-dark" : ".banner-light",
      );
      const row = scene.querySelector(".banner-row");
      const crop = scene.querySelector(".banner-crop");
      const art = crop.querySelector("pre");

      let childrenSum = 0;
      for (const child of row.children) {
        const style = getComputedStyle(child);
        if (style.position === "absolute" || style.display === "none") continue;
        childrenSum += child.getBoundingClientRect().width;
      }

      const moon = scene.querySelector(".moon");
      return {
        childOverflow: childrenSum - row.clientWidth,
        height: Math.round(row.getBoundingClientRect().height * 100) / 100,
        rightGap:
          crop.getBoundingClientRect().right -
          art.getBoundingClientRect().right,
        leftClip:
          crop.getBoundingClientRect().left - art.getBoundingClientRect().left,
        pageOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        moonVisible: moon ? getComputedStyle(moon).display !== "none" : null,
      };
    }, theme);

    heights.add(sample.height);
    worstChildOverflow = Math.max(worstChildOverflow, sample.childOverflow);
    worstRightGap = Math.max(worstRightGap, Math.abs(sample.rightGap));
    worstPageOverflow = Math.max(worstPageOverflow, sample.pageOverflow);
    if (sample.leftClip > 0) {
      if (clipFrom === null) clipFrom = width;
      clipTo = width;
    }
    if (theme === "dark") {
      if (moonPop === null && sample.moonVisible) moonPop = width;
      if (moonWasVisible !== null && sample.moonVisible !== moonWasVisible)
        moonFlips += 1;
      moonWasVisible = sample.moonVisible;
    }
  }

  results[theme] = {
    heights: [...heights],
    worstChildOverflow,
    worstRightGap,
    worstPageOverflow,
    clipFrom,
    clipTo,
    moonPop,
    moonFlips,
  };
}

await browser.close();

const failures = [];
for (const [theme, r] of Object.entries(results)) {
  console.log(
    `${theme.padEnd(5)} | heights: ${r.heights.join(",")} | ` +
      `max(children - rowInner): ${r.worstChildOverflow.toFixed(2)}px | ` +
      `max right-edge gap: ${r.worstRightGap.toFixed(2)}px | ` +
      `max page overflow: ${r.worstPageOverflow.toFixed(2)}px | ` +
      `crop engaged: ${r.clipFrom === null ? "NEVER" : `${r.clipFrom}-${r.clipTo}px`}` +
      (r.moonPop === null ? "" : ` | moon appears at: ${r.moonPop}px`),
  );

  // The pop threshold sits near the header's 40rem padding change. If the two
  // interact the wrong way the moon flickers in and out as the viewport grows,
  // so require exactly one transition across the whole range.
  if (theme === "dark" && r.moonFlips > 1)
    failures.push(
      `dark: the moon changes visibility ${r.moonFlips} times across the sweep`,
    );

  // 1 — no horizontal scrollbar, in the banner or on the page.
  if (r.worstChildOverflow > 0.5)
    failures.push(
      `${theme}: row children exceed the row by ${r.worstChildOverflow.toFixed(2)}px`,
    );
  if (r.worstPageOverflow > 0.5)
    failures.push(
      `${theme}: page scrolls horizontally by ${r.worstPageOverflow.toFixed(2)}px`,
    );
  // 2, 3 — one height across every width, so the moon's pop costs no reflow.
  if (r.heights.length !== 1)
    failures.push(
      `${theme}: banner height varies across widths (${r.heights.join(",")})`,
    );
  // 5 — the art stays welded to the crop zone's right edge.
  if (r.worstRightGap > 0.5)
    failures.push(
      `${theme}: art detached from the right edge by ${r.worstRightGap.toFixed(2)}px`,
    );
  // Negative control: without this the suite passes on content that never crops.
  if (r.clipFrom === null)
    failures.push(
      `${theme}: the crop never engages — this suite is measuring nothing`,
    );
}

// 2 — and the same height in both themes, so toggling never moves the page.
if (results.light.heights.join() !== results.dark.heights.join()) {
  failures.push(
    `themes disagree on banner height: light ${results.light.heights.join(",")} vs dark ${results.dark.heights.join(",")}`,
  );
}

if (failures.length) {
  console.error("\nFAIL");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nPASS");
