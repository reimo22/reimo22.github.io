import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
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

// Shifts the ridge cutoff used to blank moon glyphs. Zero is the
// geometrically exact composite — the disc's visible edge stops exactly at
// the hill line — which reads as the moon floating disconnected from the
// horizon wherever the hill isn't locally tall enough to reach it.
//
// Negative values render that many extra rows of the moon *past* the true
// horizon: those glyphs are no longer hidden, so at columns where the hill
// also has ink the two layers' strokes visibly interleave rather than one
// sitting cleanly behind the other. That's a deliberate tradeoff here, kept
// for how it looks — chosen over the geometrically clean gap at 0 — not an
// oversight; a positive value would do the opposite and trim the disc back
// from the ridge instead.
const MOON_GROUND_OVERLAP = -1;

// The writeup frontmatter contract, enforced against every README.md in the
// submodule at build start. Each box has its own schema (os) and each CTF
// challenge its own (event/category), distinguished by whether `os` is set.
const BOX_KEYS = ["title", "os", "difficulty", "technique", "date"];
const CTF_KEYS = [
  "title",
  "event",
  "category",
  "difficulty",
  "technique",
  "date",
];

export function missingFrontmatterKeys(frontmatter = {}) {
  const keys = frontmatter.os ? BOX_KEYS : CTF_KEYS;
  return keys.filter((key) => frontmatter[key] == null);
}

export function isoDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

// RFC-822, the date format RSS 2.0's <pubDate> requires.
export function rfc822Date(value) {
  return new Date(value).toUTCString();
}

export function rightTrim(line) {
  return line.replace(/\s+$/, "");
}

// A <pre> generates no line box for a truly empty final line, so a block
// whose last emitted line is "" renders one row short and every row-index
// mapping composited against it (moonAboveHorizon's ridge subtraction,
// starField's floor cutoff) is off by one. Forcing a single space keeps the
// line box without being visible.
export function withNonEmptyLastLine(lines) {
  if (lines[lines.length - 1] === "") {
    return lines.slice(0, -1).concat(" ");
  }
  return lines;
}

export function escapeHtml(raw) {
  return raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Memoized: every shortcode below reads the same fixed set of asset files,
// several of them more than once per page, and none of it can change within
// a build.
const asciiCache = new Map();

function readAscii(name) {
  if (asciiCache.has(name)) {
    return asciiCache.get(name);
  }
  const filePath = path.join("src/assets/ascii", `${name}.txt`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`ascii shortcode: no such file ${filePath}`);
  }
  const contents = fs.readFileSync(filePath, "utf8");
  asciiCache.set(name, contents);
  return contents;
}

function asciiLines(name) {
  return readAscii(name).replace(/\n$/, "").split("\n");
}

// Every line padded to the block's full width. Ragged lines would make column
// indexing meaningless, and the occlusion below is entirely column arithmetic.
export function toGrid(lines) {
  const width = Math.max(...lines.map((line) => line.length));
  return lines.map((line) => line.padEnd(width, " "));
}

// Trim -> repeat -> cut, as a grid. `cactusStrip` renders this; the dark
// scene additionally reads its silhouette, so the two can't disagree about
// where the horizon is. Memoized: `cactusStrip`, `moonAboveHorizon`, and
// `starField` each call this at least once per page render.
let cactusStripGridCache = null;

function cactusStripGrid() {
  if (cactusStripGridCache) {
    return cactusStripGridCache;
  }
  const trimmed = asciiLines("cactus").map((line) =>
    line.slice(CACTUS_TRIM_COL),
  );
  const tileWidth = Math.max(...trimmed.map((line) => line.length));
  const cut = (CACTUS_TILES - 1) * tileWidth + CACTUS_CUT_IN_LAST_TILE;
  cactusStripGridCache = trimmed.map((line) =>
    line.padEnd(tileWidth, " ").repeat(CACTUS_TILES).slice(0, cut),
  );
  return cactusStripGridCache;
}

// The horizon, per column: the row index of the topmost non-space glyph, i.e.
// the hill silhouette. `grid.length` means "this column is empty sky".
//
// This is what makes the moon sit *behind* the hills. Painting can't do it —
// a <pre> has no background, so the ground layer draws glyphs over the moon
// but never hides it. Occlusion has to be subtraction from the art itself.
export function horizonByColumn(grid) {
  const width = grid[0].length;
  return Array.from({ length: width }, (_, col) => {
    const row = grid.findIndex((line) => line[col] !== " ");
    return row === -1 ? grid.length : row;
  });
}

// The row of the flat desert floor: the line with the longest unbroken run of
// `_`. It is the horizon's lowest point, so anything drawn above it is sky at
// every column.
export function groundRow(grid) {
  const runLength = (line) =>
    Math.max(0, ...(line.match(/_+/g) || []).map((run) => run.length));
  const runs = grid.map(runLength);
  return runs.indexOf(Math.max(...runs));
}

// Bottom-align art into a grid `SCENE_ROWS` tall, padding above with empty sky.
// Doing this before any row arithmetic is what lets the mapping below assume
// the sky grid is at least as tall as the strip, whatever size the art is.
export function toSceneGrid(lines) {
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

export function asciiShortcode(name) {
  return escapeHtml(readAscii(name));
}

// Trim -> repeat -> cut. The tiles are concatenated *per line* into one
// contiguous block rather than emitted as two <pre> elements: a single text
// layout is what keeps the ground line an unbroken character run across the
// join.
export function cactusStrip() {
  return escapeHtml(
    withNonEmptyLastLine(cactusStripGrid().map(rightTrim)).join("\n"),
  );
}

// The moon, with everything at or below the hill silhouette subtracted, so
// it reads as rising *behind* the ridge instead of floating in front of it.
//
// The alignment this relies on: the moon <pre> and the strip <pre> are both
// flush to the banner's right edge and both bottom-aligned, at the same font
// size and line-height. Sharing an edge is what makes this exact — the
// offset is zero columns in any monospace font, so nothing here depends on
// resolving `ch` to pixels. It holds at every width the moon is on screen;
// below the container query in `main.css` the moon is gone anyway.
export function moonAboveHorizon() {
  const strip = cactusStripGrid();
  const horizon = horizonByColumn(strip);
  const moon = toSceneGrid(asciiLines("moon"));
  const stripWidth = strip[0].length;
  const moonWidth = moon[0].length;

  const rows = moon.map((line, row) => {
    // Both blocks are anchored bottom-right, so a moon cell maps onto
    // the strip by its distance from those two edges. Rows above the
    // strip give a negative index, which matches no ridge — open sky.
    const stripRow = strip.length - (moon.length - row);
    return rightTrim(
      Array.from(line, (glyph, col) => {
        const stripCol = stripWidth - (moonWidth - col);
        const ridge = horizon[stripCol];
        const behindRidge =
          ridge !== undefined && stripRow >= ridge - MOON_GROUND_OVERLAP;
        return behindRidge ? " " : glyph;
      }).join(""),
    );
  });

  return escapeHtml(
    // Blanked rows stay as lines: they carry the moon's height, and
    // dropping them would let the bottom-aligned disc sink into the hills.
    withNonEmptyLastLine(rows).join("\n"),
  );
}

// The star field, held above the desert floor and tiled out to the strip's
// full width.
//
// Unlike the moon this is *not* column-composited. The field sits one
// 1.5rem `column-gap` away from the moon — an offset of ~2.5 columns that
// shifts with whatever monospace font the browser resolves, so per-column
// occlusion would be off by a fraction of a cell. Only the row grid is
// shared exactly. So the rule is row-only: keep the rows that clear the
// floor, and pad below to hold bottom alignment.
//
// Width is deliberately over-provisioned to the strip's, which is wider
// than the field's own lane by that gap plus the moon. Matching the strip
// is what guarantees stars reach the banner's left edge at every viewport;
// computing an exact lane width would have to resolve `ch` and `rem` to
// pixels at build time, which nothing else here does. The surplus overflows
// left into `overflow: hidden` and costs nothing.
export function starField() {
  const strip = cactusStripGrid();
  const groundDepth = strip.length - groundRow(strip);
  const skyRows = SCENE_ROWS - groundDepth;

  // Pad to a rectangle *before* tiling. Right-trimming first — as this did
  // when the field was a single tile — would let short rows concatenate
  // early and drag every star after the join left by a different amount on
  // each row, shearing the field. Trimming is the last step, per row.
  const band = toGrid(asciiLines("stars").slice(0, skyRows));
  const width = strip[0].length;
  const tiles = Math.ceil(width / band[0].length);

  // Each tile takes the band's rows rotated one step further, so the field
  // repeats every `tiles * skyRows` columns rather than every tile. Stars
  // are sparse enough that a row shift is all it takes to hide the seam.
  const stars = band.map((_, row) =>
    rightTrim(
      Array.from(
        { length: tiles },
        (__, tile) => band[(row + tile) % band.length],
      )
        .join("")
        .slice(0, width),
    ),
  );

  return escapeHtml(
    withNonEmptyLastLine(
      stars.concat(Array(SCENE_ROWS - stars.length).fill("")),
    ).join("\n"),
  );
}

export default function (eleventyConfig) {
  const md = markdownIt({
    html: true,
    breaks: false,
    linkify: true,
  });

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet("href");
    if (href && /^https?:\/\//.test(href)) {
      tokens[idx].attrPush(["target", "_blank"]);
      tokens[idx].attrPush(["rel", "noopener noreferrer"]);
    }
    return self.renderToken(tokens, idx, options);
  };

  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addPassthroughCopy("src/assets/css");
  eleventyConfig.addPassthroughCopy("src/assets/js");
  eleventyConfig.addPassthroughCopy("src/assets/img");
  eleventyConfig.addPassthroughCopy("src/about");
  eleventyConfig.addPassthroughCopy(
    "src/assets/token-saving-tools-for-claude-code--setup.txt",
  );

  // The directories inside the htb-writeups submodule, found once at config
  // time and reused by both the image passthrough and the frontmatter gate.
  const boxDirs = fs
    .readdirSync("src/writeups/boxes", { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name);

  const writeupGlob = "src/writeups/boxes/*/README.md";
  const byDate = (a, b) => new Date(a.data.date) - new Date(b.data.date);

  // YAML dates parse to JS Date objects; templates need a plain YYYY-MM-DD.
  eleventyConfig.addFilter("isoDate", isoDate);
  eleventyConfig.addFilter("rfc822Date", rfc822Date);

  eleventyConfig.addFilter("postsToCommands", (items) =>
    items.map((item) => ({
      label: item.data.title,
      url: item.url,
      date: isoDate(item.data.date),
      tags: (item.data.tags || []).filter(
        (t) => t !== "post" && t !== "writeups-box" && t !== "writeups-ctf",
      ),
    })),
  );

  eleventyConfig.addFilter("mergeNewestFirst", (a, b) => {
    var merged = (a || []).concat(b || []);
    merged.sort(function (x, y) {
      return new Date(y.data.date) - new Date(x.data.date);
    });
    return merged;
  });

  // Two kinds of writeup, split on which frontmatter shape the item has.
  // Must be addCollection: eleventyComputed.tags never reaches a collection,
  // because Eleventy resolves collections from `tags` before computed data.
  eleventyConfig.addCollection("writeups-box", (api) =>
    api
      .getFilteredByGlob(writeupGlob)
      .filter((item) => item.data.os)
      .sort(byDate),
  );
  // Same addCollection + getFilteredByGlob pattern as the writeups
  // collections above, for the same reason: relying on `tags` risks the
  // computed-data-resolves-after-collections trap already hit in Phase 5.
  eleventyConfig.addCollection("blog", (api) =>
    api.getFilteredByGlob("src/blog/*.md").sort(byDate).reverse(),
  );
  eleventyConfig.addCollection("writeups-ctf", (api) =>
    api
      .getFilteredByGlob(writeupGlob)
      .filter((item) => item.data.event)
      .sort(byDate),
  );

  // Per-box object form. The design doc's glob (`boxes/**/images/**`) keeps
  // the `boxes/` segment in output and breaks relative README links, while a
  // top-level `{ glob: "writeups" }` flattens files into _site/writeups/ and
  // collides on shared filenames (two login.png). Object form per box maps
  // exactly to _site/writeups/<slug>/images. Passthrough ignores
  // .eleventyignore, but this only touches image dirs, so .git/, the root
  // README, and the templates never get copied.
  for (const slug of boxDirs) {
    const imagesDir = path.join("src/writeups/boxes", slug, "images");
    if (fs.existsSync(imagesDir)) {
      eleventyConfig.addPassthroughCopy({
        [imagesDir]: `writeups/${slug}/images`,
      });
    }
  }

  // Fail the build on any writeup missing a required frontmatter key rather
  // than shipping blank metadata behind a green check. Parsed with gray-matter
  // so the gate sees exactly what Eleventy sees.
  eleventyConfig.on("eleventy.before", () => {
    const failures = [];
    for (const slug of boxDirs) {
      const filePath = path.join("src/writeups/boxes", slug, "README.md");
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const { data } = matter(fs.readFileSync(filePath, "utf8"));
      const missing = missingFrontmatterKeys(data);
      if (missing.length > 0) {
        failures.push(`${slug}: missing ${missing.join(", ")}`);
      }
    }
    if (failures.length > 0) {
      throw new Error(
        `writeups build check: ${failures.length} README(s) missing frontmatter keys:\n` +
          failures.join("\n"),
      );
    }
  });

  eleventyConfig.addShortcode("ascii", asciiShortcode);
  eleventyConfig.addShortcode("cactusStrip", cactusStrip);
  eleventyConfig.addShortcode("moonAboveHorizon", moonAboveHorizon);
  eleventyConfig.addShortcode("starField", starField);

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
}
