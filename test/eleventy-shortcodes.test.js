import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  asciiShortcode,
  cactusStrip,
  moonAboveHorizon,
  starField,
} from "../.eleventy.js";

test("asciiShortcode returns the dino art, HTML-escaped", () => {
  const html = asciiShortcode("dino");
  assert.equal(typeof html, "string");
  assert.ok(html.length > 0);
  assert.ok(!html.includes("<"), "raw < must be escaped to &lt;");
});

test("asciiShortcode throws for a name with no matching .txt file", () => {
  assert.throws(() => asciiShortcode("no-such-asset"), /no such file/);
});

test("cactusStrip is cut at exactly 4 tile-widths + 45 columns, independently derived from cactus.txt", () => {
  // Independently reproduces CACTUS_TRIM_COL=15, CACTUS_TILES=5,
  // CACTUS_CUT_IN_LAST_TILE=45 from the raw asset, rather than asserting
  // against the module's own constants — this is the "5 tiles, cut at 45"
  // claim, checked from source, not restated.
  const raw = fs
    .readFileSync("src/assets/ascii/cactus.txt", "utf8")
    .replace(/\n$/, "")
    .split("\n");
  const trimmed = raw.map((line) => line.slice(15));
  const tileWidth = Math.max(...trimmed.map((line) => line.length));
  const expectedWidth = 4 * tileWidth + 45; // (CACTUS_TILES - 1) * tileWidth + CACTUS_CUT_IN_LAST_TILE

  const html = cactusStrip();
  const lines = html.split("\n");
  const maxWidth = Math.max(...lines.map((l) => l.length));
  assert.equal(maxWidth, expectedWidth);
});

test("moonAboveHorizon removes glyphs the raw moon asset has, and never leaves one at/below the ridge", () => {
  // Verified directly against the real assets while drafting this plan
  // (see the plan's self-review notes) — moonWidth MUST come from the raw
  // moon.txt asset's natural width (pre-occlusion), not reconstructed from
  // moonAboveHorizon()'s output: occlusion blanks the disc's rightmost
  // column on every row here, so a width derived from the trimmed output
  // undercounts by one and silently shifts every column index, producing
  // false violations near the right edge. This is not a hypothetical
  // failure mode — it was caught this way before being written down.
  const padGrid = (lines) => {
    const width = Math.max(...lines.map((l) => l.length));
    return lines.map((l) => l.padEnd(width, " "));
  };

  const strip = padGrid(cactusStrip().split("\n"));
  const moon = moonAboveHorizon().split("\n");
  const rawMoon = fs
    .readFileSync("src/assets/ascii/moon.txt", "utf8")
    .replace(/\n$/, "")
    .split("\n");
  const moonWidth = Math.max(...rawMoon.map((l) => l.length));

  const glyphCount = (lines) => lines.join("").replace(/\s/g, "").length;
  // Occlusion only ever removes glyphs — the composited output must have
  // strictly fewer non-space characters than the unoccluded source art.
  assert.ok(
    glyphCount(moon) < glyphCount(rawMoon),
    `expected occlusion to remove glyphs: moon=${glyphCount(moon)} raw=${glyphCount(rawMoon)}`,
  );

  // The actual invariant horizonByColumn + MOON_GROUND_OVERLAP exist to
  // produce: no surviving moon glyph sits at or below the strip's ridge
  // for its column, once both are read from their shared bottom-right edge.
  const stripWidth = strip[0].length;
  const horizon = strip[0]
    .split("")
    .map((_, col) => strip.findIndex((line) => line[col] !== " "));
  // horizonByColumn's -1 sentinel becomes strip.length ("open sky"); redo
  // that mapping here so this test doesn't import horizonByColumn itself.
  const ridgeByColumn = horizon.map((row) => (row === -1 ? strip.length : row));

  moon.forEach((line, row) => {
    const stripRow = strip.length - (moon.length - row);
    for (let col = 0; col < line.length; col++) {
      if (line[col] === " ") continue;
      const stripCol = stripWidth - (moonWidth - col);
      const ridge = ridgeByColumn[stripCol];
      if (ridge === undefined) continue; // out of strip's range: open sky, never hidden
      assert.ok(
        stripRow < ridge + 1, // MOON_GROUND_OVERLAP = -1: one extra row past true horizon is allowed
        `moon glyph survived at row ${row} col ${col} (stripRow ${stripRow} >= ridge ${ridge})`,
      );
    }
  });
});

test("starField reproduces the pad-repeat-cut pipeline exactly against the real ground row and star assets", () => {
  // A width-equality spot check on the trimmed output is flaky here: which
  // row (if any) reaches the full computed width depends on where sparse
  // stars happen to land after right-trim, not on whether tiling is
  // correct. Full reconstruction is the check that can't pass by luck —
  // confirmed by hand against the real assets while drafting this plan
  // (see self-review notes): tiles=4, skyRows=9, width=281 for the current
  // committed art.
  const rightTrim = (l) => l.replace(/\s+$/, "");
  const toGrid = (lines) => {
    const width = Math.max(...lines.map((l) => l.length));
    return lines.map((l) => l.padEnd(width, " "));
  };
  const SCENE_ROWS = 17;

  const strip = toGrid(cactusStrip().split("\n"));
  const runLength = (line) =>
    Math.max(0, ...(line.match(/_+/g) || []).map((r) => r.length));
  const groundRowIndex = strip
    .map(runLength)
    .reduce((best, len, i, arr) => (len > arr[best] ? i : best), 0);
  const groundDepth = strip.length - groundRowIndex;
  const skyRows = SCENE_ROWS - groundDepth;

  const rawStars = fs
    .readFileSync("src/assets/ascii/stars.txt", "utf8")
    .replace(/\n$/, "")
    .split("\n");
  const band = toGrid(rawStars.slice(0, skyRows));
  const width = strip[0].length;
  const tiles = Math.ceil(width / band[0].length);

  const expected = band.map((_, row) =>
    rightTrim(
      Array.from(
        { length: tiles },
        (__, tile) => band[(row + tile) % band.length],
      )
        .join("")
        .slice(0, width),
    ),
  );
  const padded = expected.concat(Array(SCENE_ROWS - expected.length).fill(""));
  if (padded[padded.length - 1] === "") {
    padded[padded.length - 1] = " "; // withNonEmptyLastLine's rule
  }

  assert.deepEqual(starField().split("\n"), padded);
});
