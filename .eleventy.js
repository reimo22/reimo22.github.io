import fs from "node:fs";
import path from "node:path";
import markdownIt from "markdown-it";

// Cactus strip generation. `cactus.txt` stays the single source of truth —
// the wide strip is derived at build time, never committed as a second art
// file, so the two can't drift apart.
const CACTUS_TRIM_COL = 15; // drops the left hill and its small cactus glyph
const CACTUS_TILES = 2;
const CACTUS_CUT_RIGHT = 104; // keeps the second hill's rise + plateau, drops its descent

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
    const trimmed = readAscii("cactus")
      .replace(/\n$/, "")
      .split("\n")
      .map((line) => line.slice(CACTUS_TRIM_COL));
    const tileWidth = Math.max(...trimmed.map((line) => line.length));
    const strip = trimmed
      .map((line) =>
        line
          .padEnd(tileWidth, " ")
          .repeat(CACTUS_TILES)
          .slice(0, CACTUS_CUT_RIGHT)
          .replace(/\s+$/, ""),
      )
      .join("\n");
    return escapeHtml(strip);
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
