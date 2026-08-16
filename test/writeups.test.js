import { test } from "node:test";
import assert from "node:assert/strict";
import { missingFrontmatterKeys, isoDate } from "../.eleventy.js";

const box = {
  title: "Cap",
  os: "Linux",
  difficulty: "Easy",
  technique: "IDOR",
  date: new Date("2026-07-13"),
};

const ctf = {
  title: "Gatery",
  event: "HTB Cyber Apocalypse 2026",
  category: "Web",
  difficulty: "Very Easy",
  technique: "Forged cookie",
  date: new Date("2026-07-24"),
};

test("missingFrontmatterKeys returns [] for a complete box", () => {
  assert.deepEqual(missingFrontmatterKeys(box), []);
});

test("missingFrontmatterKeys returns [] for a complete CTF challenge", () => {
  assert.deepEqual(missingFrontmatterKeys(ctf), []);
});

test("a box missing its date is flagged", () => {
  const rest = { ...box };
  delete rest.date;
  assert.deepEqual(missingFrontmatterKeys(rest), ["date"]);
});

test("a CTF challenge missing its event is flagged", () => {
  const rest = { ...ctf };
  delete rest.event;
  assert.deepEqual(missingFrontmatterKeys(rest), ["event"]);
});

test("a box missing os is still flagged", () => {
  const rest = { ...box };
  delete rest.os;
  assert.ok(missingFrontmatterKeys(rest).length > 0, "expected missing keys");
});

test("empty frontmatter flags every CTF key", () => {
  assert.deepEqual(missingFrontmatterKeys({}), [
    "title",
    "event",
    "category",
    "difficulty",
    "technique",
    "date",
  ]);
});

test("isoDate renders a Date as YYYY-MM-DD in UTC", () => {
  assert.equal(isoDate(new Date("2026-07-24T00:00:00Z")), "2026-07-24");
  assert.equal(isoDate("2026-07-13"), "2026-07-13");
});
