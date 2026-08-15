import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rightTrim,
  withNonEmptyLastLine,
  escapeHtml,
  toGrid,
  horizonByColumn,
  groundRow,
  toSceneGrid,
} from "../.eleventy.js";

test("rightTrim strips only trailing whitespace", () => {
  assert.equal(rightTrim("  hi   "), "  hi");
  assert.equal(rightTrim("no-trailing"), "no-trailing");
  assert.equal(rightTrim(""), "");
});

test("withNonEmptyLastLine leaves a non-empty last line alone", () => {
  assert.deepEqual(withNonEmptyLastLine(["a", "b"]), ["a", "b"]);
});

test("withNonEmptyLastLine replaces an empty last line with a single space", () => {
  assert.deepEqual(withNonEmptyLastLine(["a", ""]), ["a", " "]);
});

test("escapeHtml escapes &, <, > but not quotes", () => {
  assert.equal(
    escapeHtml(`<a href="x">&</a>`),
    `&lt;a href="x"&gt;&amp;&lt;/a&gt;`,
  );
});

test("toGrid pads every line to the width of the longest line", () => {
  assert.deepEqual(toGrid(["a", "abc", "ab"]), ["a  ", "abc", "ab "]);
});

test("horizonByColumn returns the topmost non-space row per column", () => {
  const grid = ["   ", " x ", "xxx"];
  assert.deepEqual(horizonByColumn(grid), [2, 1, 2]);
});

test("horizonByColumn reports grid.length for an all-space column", () => {
  const grid = ["  ", "  "];
  assert.deepEqual(horizonByColumn(grid), [2, 2]);
});

test("groundRow picks the row with the longest run of underscores", () => {
  const grid = ["____", "__", "______"];
  assert.equal(groundRow(grid), 2);
});

test("toSceneGrid bottom-aligns short art into a 17-row grid padded with blank sky", () => {
  const result = toSceneGrid(["ab", "cd"]);
  assert.equal(result.length, 17);
  assert.deepEqual(result.slice(0, 15), Array(15).fill("  "));
  assert.deepEqual(result.slice(15), ["ab", "cd"]);
});

test("toSceneGrid throws if art is taller than SCENE_ROWS (17)", () => {
  const tooTall = Array(18).fill("x");
  assert.throws(() => toSceneGrid(tooTall), /raise SCENE_ROWS/);
});
