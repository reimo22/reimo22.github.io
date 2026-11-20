import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const { findXp, poll } = await import("../scripts/htb-xp.mjs");

test("findXp reads a nested xp field", () => {
  assert.equal(findXp({ user: { xp: 4200 } }), 4200);
});

test("findXp prefers the first xp it meets", () => {
  assert.equal(findXp({ xp: 1, nested: { xp: 2 } }), 1);
});

test("findXp ignores non-numeric xp values", () => {
  assert.equal(findXp({ xp: "4200", nested: { xp: 9 } }), 9);
});

test("findXp returns undefined when no xp exists", () => {
  assert.equal(findXp({ user: { points: 10 } }), undefined);
});

test("findXp survives arrays and nulls", () => {
  assert.equal(findXp({ a: null, b: [null, { xp: 7 }] }), 7);
});

test("poll writes the record when XP is new", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "htb-xp-"));
  const file = path.join(dir, "htb.json");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ user: { xp: 4200 } }),
  });
  try {
    const result = await poll({
      token: "test",
      path: file,
      now: new Date("2026-11-21T00:00:00Z"),
    });
    assert.deepEqual(result, {
      changed: true,
      xp: 4200,
      previousXp: undefined,
    });
    const written = JSON.parse(await readFile(file, "utf8"));
    assert.deepEqual(written, { xp: 4200, updatedAt: "2026-11-21" });
  } finally {
    globalThis.fetch = originalFetch;
    await rm(dir, { recursive: true, force: true });
  }
});

test("poll leaves the file alone when XP has not moved", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "htb-xp-"));
  const file = path.join(dir, "htb.json");
  await writeFile(
    file,
    `${JSON.stringify({ xp: 4200, updatedAt: "2026-11-20" })}\n`,
  );
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ user: { xp: 4200 } }),
  });
  try {
    const result = await poll({ token: "test", path: file });
    assert.deepEqual(result, { changed: false, xp: 4200, previousXp: 4200 });
    const unchanged = JSON.parse(await readFile(file, "utf8"));
    assert.equal(unchanged.updatedAt, "2026-11-20");
  } finally {
    globalThis.fetch = originalFetch;
    await rm(dir, { recursive: true, force: true });
  }
});

test("poll reports a rejected token instead of writing", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "htb-xp-"));
  const file = path.join(dir, "htb.json");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    text: async () => '{"message":"Unauthenticated."}',
  });
  try {
    await assert.rejects(() => poll({ token: "bad", path: file }), /401/);
    await assert.rejects(() => readFile(file, "utf8"), { code: "ENOENT" });
  } finally {
    globalThis.fetch = originalFetch;
    await rm(dir, { recursive: true, force: true });
  }
});

test("poll names the response keys when xp is missing", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "htb-xp-"));
  const file = path.join(dir, "htb.json");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ user: { points: 3 }, info: {} }),
  });
  try {
    await assert.rejects(
      () => poll({ token: "test", path: file }),
      /key paths: user, user.points, info/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    await rm(dir, { recursive: true, force: true });
  }
});
