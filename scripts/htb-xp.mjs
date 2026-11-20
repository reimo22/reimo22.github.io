// Polls the Hack The Box profile XP and records it in src/_data/htb.json.
//
// The App token is read from HTB_TOKEN (set as a repo secret, only exposed to
// this step in .github/workflows/htb-xp.yml). The response shape is not
// documented and has moved before, so XP is located by walking the payload for
// the first numeric `xp` key rather than by a fixed path; a miss fails loudly
// with the top-level keys so the workflow log says what changed.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ENDPOINT = "https://labs.hackthebox.com/api/v4/user/info";
export const DATA_PATH = fileURLToPath(
  new URL("../src/_data/htb.json", import.meta.url),
);

export function findXp(payload) {
  const seen = new Set();
  const walk = (node) => {
    if (!node || typeof node !== "object" || seen.has(node)) return undefined;
    seen.add(node);
    if (typeof node.xp === "number") return node.xp;
    for (const value of Object.values(node)) {
      const hit = walk(value);
      if (hit !== undefined) return hit;
    }
    return undefined;
  };
  return walk(payload);
}

// Key paths only — never values — so a shape change is diagnosable from the
// workflow log without printing account data.
export function keyPaths(node, prefix = "", depth = 0, out = []) {
  if (!node || typeof node !== "object" || depth > 2) return out;
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    out.push(path);
    keyPaths(value, path, depth + 1, out);
  }
  return out;
}

async function readPrevious(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

export async function poll({ token, path = DATA_PATH, now = new Date() }) {
  const response = await fetch(ENDPOINT, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `HTB API returned ${response.status}: ${body.slice(0, 300)}`,
    );
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(`HTB API returned non-JSON: ${body.slice(0, 120)}`);
  }

  const xp = findXp(payload);
  if (typeof xp !== "number") {
    throw new Error(
      `no numeric xp key in the response; key paths: ${keyPaths(payload).slice(0, 60).join(", ")}`,
    );
  }

  const previous = await readPrevious(path);
  if (previous?.xp === xp) {
    return { changed: false, xp, previousXp: previous.xp };
  }

  const record = { xp, updatedAt: now.toISOString().slice(0, 10) };
  await writeFile(path, `${JSON.stringify(record, null, 2)}\n`);
  return { changed: true, xp, previousXp: previous?.xp };
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const token = process.env.HTB_TOKEN;
  if (!token) {
    console.error("HTB_TOKEN is not set");
    process.exitCode = 1;
  } else {
    const result = await poll({ token });
    console.log(
      result.changed
        ? `xp ${result.previousXp ?? "unknown"} -> ${result.xp}`
        : `xp unchanged at ${result.xp}`,
    );
  }
}
