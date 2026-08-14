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

// Must match SCENE_ROWS in `.eleventy.js` — the moon and star-field <pre>s
// are built to exactly this many rows, bottom-aligned against the cactus
// strip. A block that renders short (a swallowed trailing blank line is the
// known way this happens) sits with its *top* edge sunk into the hills,
// since the bottom edge is pinned by flexbox regardless of height.
const SCENE_ROWS = 17;

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
  let worstGridRemainder = 0;
  let worstRightGap = 0;
  let worstMoonEdgeGap = 0;
  let worstMoonRowGap = 0;
  let worstStarRowGap = 0;
  let worstPageOverflow = -Infinity;
  let clipFrom = null;
  let clipTo = null;
  let moonHiddenAt = null;

  for (let width = MIN_WIDTH; width <= MAX_WIDTH; width += STEP) {
    await page.setViewport({ width, height: 900 });
    const sample = await page.evaluate(
      async (t, sceneRows) => {
        // Two frames: the first lands the new viewport, the second lets layout
        // settle. Sampling on the same frame as a resize reads mid-flight values.
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
        const scene = document.querySelector(
          t === "dark" ? ".banner-dark" : ".banner-light",
        );
        // The ground layer carries the horizon in both themes and is the layer
        // every other one is aligned against.
        const ground = scene.querySelector(".banner-ground");
        const art = ground.querySelector("pre.cactus");

        // One character cell, measured from the art's own resolved font rather
        // than assumed — the whole layout is expressed in `ch`.
        const probe = document.createElement("span");
        probe.style.font = getComputedStyle(art).font;
        probe.style.position = "absolute";
        probe.style.visibility = "hidden";
        probe.textContent = "0".repeat(100);
        document.body.append(probe);
        const cell = probe.getBoundingClientRect().width / 100;
        probe.remove();

        const moon = scene.querySelector(".moon");
        const moonVisible = moon
          ? getComputedStyle(moon).display !== "none"
          : null;
        const stars = scene.querySelector(".stargap");

        // Both are built to exactly `sceneRows` lines and bottom-aligned by
        // flexbox, so their bottom edge stays put regardless of height — a
        // block that renders one row short (the swallowed-trailing-blank-line
        // bug) doesn't move its bottom, it sinks its *top* into the hills.
        // Measuring rendered height against the expected row count catches
        // that; a bottom-edge comparison against the ground would not, since
        // flexbox pins the bottom edge either way.
        const rowGap = (el) => {
          if (!el) return 0;
          const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
          return Math.abs(
            el.getBoundingClientRect().height - sceneRows * lineHeight,
          );
        };

        return {
          // The `moonAboveHorizon` composite subtracts the ridge from the moon
          // assuming the two share a right edge. If they drift, the moon is
          // occluded against the wrong columns and the art quietly deforms.
          moonEdgeGap: moonVisible
            ? moon.getBoundingClientRect().right -
              art.getBoundingClientRect().right
            : 0,
          moonRowGap: moonVisible ? rowGap(moon) : 0,
          starRowGap: rowGap(stars),
          // The layers are snapped to whole character cells so the left-hand
          // clip lands on a cell boundary instead of slicing glyphs in half. If
          // `round()` is unsupported the width silently falls back to the
          // unsnapped value and the mangled column returns, so measure it.
          gridRemainder: (() => {
            // Sub-pixel width: `clientWidth` is integer-rounded, which alone
            // shows up as ~0.5px of phantom drift and would mask the real thing.
            const w = ground.getBoundingClientRect().width;
            const rem = w % cell;
            return Math.min(rem, cell - rem);
          })(),
          height: Math.round(scene.getBoundingClientRect().height * 100) / 100,
          rightGap:
            ground.getBoundingClientRect().right -
            art.getBoundingClientRect().right,
          leftClip:
            ground.getBoundingClientRect().left -
            art.getBoundingClientRect().left,
          pageOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          moonVisible,
        };
      },
      theme,
      SCENE_ROWS,
    );

    heights.add(sample.height);
    worstGridRemainder = Math.max(worstGridRemainder, sample.gridRemainder);
    worstRightGap = Math.max(worstRightGap, Math.abs(sample.rightGap));
    worstMoonEdgeGap = Math.max(worstMoonEdgeGap, Math.abs(sample.moonEdgeGap));
    worstMoonRowGap = Math.max(worstMoonRowGap, sample.moonRowGap);
    worstStarRowGap = Math.max(worstStarRowGap, sample.starRowGap);
    worstPageOverflow = Math.max(worstPageOverflow, sample.pageOverflow);
    if (sample.leftClip > 0) {
      if (clipFrom === null) clipFrom = width;
      clipTo = width;
    }
    // The moon is present at every width now — it crops instead of popping.
    if (
      theme === "dark" &&
      moonHiddenAt === null &&
      sample.moonVisible === false
    )
      moonHiddenAt = width;
  }

  results[theme] = {
    heights: [...heights],
    worstGridRemainder,
    worstRightGap,
    worstMoonEdgeGap,
    worstMoonRowGap,
    worstStarRowGap,
    worstPageOverflow,
    clipFrom,
    clipTo,
    moonHiddenAt,
  };
}

await browser.close();

const failures = [];
for (const [theme, r] of Object.entries(results)) {
  console.log(
    `${theme.padEnd(5)} | heights: ${r.heights.join(",")} | ` +
      `max off-grid clip: ${r.worstGridRemainder.toFixed(2)}px | ` +
      `max right-edge gap: ${r.worstRightGap.toFixed(2)}px | ` +
      `max page overflow: ${r.worstPageOverflow.toFixed(2)}px | ` +
      `crop engaged: ${r.clipFrom === null ? "NEVER" : `${r.clipFrom}-${r.clipTo}px`}` +
      (theme === "dark"
        ? ` | moon hidden at: ${r.moonHiddenAt === null ? "NEVER" : `${r.moonHiddenAt}px`}` +
          ` | max moon-edge gap: ${r.worstMoonEdgeGap.toFixed(2)}px` +
          ` | max moon-row gap: ${r.worstMoonRowGap.toFixed(2)}px` +
          ` | max star-row gap: ${r.worstStarRowGap.toFixed(2)}px`
        : ""),
  );

  // The composite in `moonAboveHorizon` subtracts the ridge from the moon on
  // the assumption that the two blocks share a right edge. If they drift, the
  // moon is occluded against the wrong columns and the art quietly deforms.
  if (theme === "dark" && r.worstMoonEdgeGap > 0.5)
    failures.push(
      `dark: the moon and the cactus strip disagree on the right edge by ` +
        `${r.worstMoonEdgeGap.toFixed(2)}px — the horizon composite assumes they share it`,
    );

  // Both `<pre>`s are built to exactly SCENE_ROWS lines and bottom-aligned
  // against the cactus strip. If either renders short, its top edge sinks
  // into the hills or the ground even though the bottom edge — pinned by
  // flexbox — looks fine, which is why the edge-gap and height checks above
  // don't catch it.
  if (theme === "dark" && r.worstMoonRowGap > 0.5)
    failures.push(
      `dark: the moon <pre> is ${r.worstMoonRowGap.toFixed(2)}px short of ` +
        `${SCENE_ROWS} rows — its top edge has sunk into the hills`,
    );
  if (theme === "dark" && r.worstStarRowGap > 0.5)
    failures.push(
      `dark: the star field <pre> is ${r.worstStarRowGap.toFixed(2)}px short of ` +
        `${SCENE_ROWS} rows — it has sunk toward the desert floor`,
    );

  // The moon no longer pops. Every layer spans the full banner and overflows
  // leftward, so the moon has the whole width to sit in rather than a share of
  // it left over after the dino — which is what used to force the pop.
  if (theme === "dark" && r.moonHiddenAt !== null)
    failures.push(
      `dark: the moon is hidden at ${r.moonHiddenAt}px — it should be present at every width`,
    );

  // The layers are snapped to whole character cells. Unsnapped, the left-hand
  // clip cuts glyphs down the middle and the art ends in a mangled column.
  if (r.worstGridRemainder > 0.5)
    failures.push(
      `${theme}: art layer is ${r.worstGridRemainder.toFixed(2)}px off the character grid — ` +
        "the left clip will slice glyphs in half",
    );
  // 1 — no horizontal scrollbar on the page.
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
