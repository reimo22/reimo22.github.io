import fs from "node:fs";
import path from "node:path";
import markdownIt from "markdown-it";

// Cactus strip generation. `cactus.txt` stays the single source of truth —
// the wide strip is derived at build time, never committed as a second art
// file, so the two can't drift apart.
const CACTUS_TRIM_COL = 15; // drops the left hill and its small cactus glyph

// The strip grows *leftward*: tiles are added on the left and the cut is
// measured into the last one, so the right edge is byte-identical whatever
// `CACTUS_TILES` is. That matters beyond aesthetics — `moonAboveHorizon`
// composites against this strip's right edge, so retiling must not move it.
//
// Five tiles reach ~2700px, which keeps the ground line running to the banner's
// left edge on a 2560px display instead of starting mid-frame and leaving the
// horizon hanging in empty sky. The cost is a more visibly repeating hill.
const CACTUS_TILES = 5;
const CACTUS_CUT_IN_LAST_TILE = 45; // keeps the hill's rise + plateau, drops its descent

// The banner's height in text rows. `main.css` encodes this same number as
// `min-height: 18.7rem` on both scenes (17 rows x 1.1 line-height) — change one
// and you must change the other. Both dark-scene shortcodes lay their art out
// in a grid this tall, so the sky's height is stated once here rather than
// inferred from whichever asset happens to be the tallest.
const SCENE_ROWS = 17;

function rightTrim(line) {
  return line.replace(/\s+$/, "");
}

function escapeHtml(raw) {
  return raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function readAscii(name) {
  const filePath = path.join("src/assets/ascii", `${name}.txt`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`ascii shortcode: no such file ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function asciiLines(name) {
  return readAscii(name).replace(/\n$/, "").split("\n");
}

// Every line padded to the block's full width. Ragged lines would make column
// indexing meaningless, and the occlusion below is entirely column arithmetic.
function toGrid(lines) {
  const width = Math.max(...lines.map((line) => line.length));
  return lines.map((line) => line.padEnd(width, " "));
}

// Trim -> repeat -> cut, as a grid. `cactusStrip` renders this; the dark
// scene additionally reads its silhouette, so the two can't disagree about
// where the horizon is.
function cactusStripGrid() {
  const trimmed = asciiLines("cactus").map((line) =>
    line.slice(CACTUS_TRIM_COL),
  );
  const tileWidth = Math.max(...trimmed.map((line) => line.length));
  const cut = (CACTUS_TILES - 1) * tileWidth + CACTUS_CUT_IN_LAST_TILE;
  return trimmed.map((line) =>
    line.padEnd(tileWidth, " ").repeat(CACTUS_TILES).slice(0, cut),
  );
}

// The horizon, per column: the row index of the topmost non-space glyph, i.e.
// the hill silhouette. `grid.length` means "this column is empty sky".
//
// This is what makes the moon sit *behind* the hills. Painting can't do it —
// a <pre> has no background, so the ground layer draws glyphs over the moon
// but never hides it. Occlusion has to be subtraction from the art itself.
function horizonByColumn(grid) {
  const width = grid[0].length;
  return Array.from({ length: width }, (_, col) => {
    const row = grid.findIndex((line) => line[col] !== " ");
    return row === -1 ? grid.length : row;
  });
}

// The row of the flat desert floor: the line with the longest unbroken run of
// `_`. It is the horizon's lowest point, so anything drawn above it is sky at
// every column.
function groundRow(grid) {
  const runLength = (line) =>
    Math.max(0, ...(line.match(/_+/g) || []).map((run) => run.length));
  const runs = grid.map(runLength);
  return runs.indexOf(Math.max(...runs));
}

// Bottom-align art into a grid `SCENE_ROWS` tall, padding above with empty sky.
// Doing this before any row arithmetic is what lets the mapping below assume
// the sky grid is at least as tall as the strip, whatever size the art is.
function toSceneGrid(lines) {
  if (lines.length > SCENE_ROWS) {
    throw new Error(
      `ascii art is ${lines.length} rows but the banner is ${SCENE_ROWS}; ` +
        "raise SCENE_ROWS here and min-height in main.css together",
    );
  }
  const grid = toGrid(lines);
  const blank = " ".repeat(grid[0].length);
  return Array(SCENE_ROWS - grid.length)
    .fill(blank)
    .concat(grid);
}

export default function (eleventyConfig) {
  eleventyConfig.setLibrary(
    "md",
    markdownIt({
      html: true,
      breaks: false,
      linkify: true,
    }),
  );

  eleventyConfig.addPassthroughCopy("src/assets/css");
  eleventyConfig.addPassthroughCopy("src/assets/js");

  eleventyConfig.addShortcode("ascii", function (name) {
    return escapeHtml(readAscii(name));
  });

  // Trim -> repeat -> cut. The tiles are concatenated *per line* into one
  // contiguous block rather than emitted as two <pre> elements: a single text
  // layout is what keeps the ground line an unbroken character run across the
  // join.
  eleventyConfig.addShortcode("cactusStrip", function () {
    return escapeHtml(cactusStripGrid().map(rightTrim).join("\n"));
  });

  // The moon, with everything at or below the hill silhouette subtracted, so
  // it reads as rising *behind* the ridge instead of floating in front of it.
  //
  // The alignment this relies on: the moon <pre> and the strip <pre> are both
  // flush to the banner's right edge and both bottom-aligned, at the same font
  // size and line-height. Sharing an edge is what makes this exact — the
  // offset is zero columns in any monospace font, so nothing here depends on
  // resolving `ch` to pixels. It holds at every width the moon is on screen;
  // below the container query in `main.css` the moon is gone anyway.
  eleventyConfig.addShortcode("moonAboveHorizon", function () {
    const strip = cactusStripGrid();
    const horizon = horizonByColumn(strip);
    const moon = toSceneGrid(asciiLines("moon"));
    const stripWidth = strip[0].length;
    const moonWidth = moon[0].length;

    return escapeHtml(
      moon
        .map((line, row) => {
          // Both blocks are anchored bottom-right, so a moon cell maps onto
          // the strip by its distance from those two edges. Rows above the
          // strip give a negative index, which matches no ridge — open sky.
          const stripRow = strip.length - (moon.length - row);
          return rightTrim(
            Array.from(line, (glyph, col) => {
              const stripCol = stripWidth - (moonWidth - col);
              const ridge = horizon[stripCol];
              const behindRidge = ridge !== undefined && stripRow >= ridge;
              return behindRidge ? " " : glyph;
            }).join(""),
          );
        })
        // Blanked rows stay as empty lines: they carry the moon's height, and
        // dropping them would let the bottom-aligned disc sink into the hills.
        .join("\n"),
    );
  });

  // The star field, held above the desert floor.
  //
  // Unlike the moon this is *not* column-composited. The field sits in the
  // elastic crop zone, one 1.5rem gap away from the moon — an offset of
  // ~2.5 columns that shifts with whatever monospace font the browser
  // resolves, so per-column occlusion would be off by a fraction of a cell.
  // Only the row grid is shared exactly. So the rule is row-only: keep the
  // rows that clear the floor, and pad below to hold bottom alignment.
  eleventyConfig.addShortcode("starField", function () {
    const strip = cactusStripGrid();
    const groundDepth = strip.length - groundRow(strip);
    const skyRows = SCENE_ROWS - groundDepth;
    const stars = asciiLines("stars").slice(0, skyRows).map(rightTrim);

    return escapeHtml(
      stars.concat(Array(SCENE_ROWS - stars.length).fill("")).join("\n"),
    );
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
}
