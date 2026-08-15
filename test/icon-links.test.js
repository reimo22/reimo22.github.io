import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ICONS_DIR = "src/assets/img/icons";

function findNjkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "boxes") return []; // htb-writeups submodule, not this repo
      return findNjkFiles(full);
    }
    return entry.name.endsWith(".njk") ? [full] : [];
  });
}

// Matches `icons.iconLink(...)` across the call, however it's wrapped onto
// multiple lines, then pulls out the quoted string arguments in order:
// href, icon, label, and an optional class.
function findIconLinkCalls(source) {
  const calls = [];
  const callRegex = /icons\.iconLink\(([\s\S]*?)\)/g;
  let match;
  while ((match = callRegex.exec(source)) !== null) {
    const args = [];
    const argRegex = /(["'])((?:\\.|(?!\1).)*)\1/g;
    let argMatch;
    while ((argMatch = argRegex.exec(match[1])) !== null) {
      args.push(argMatch[2]);
    }
    calls.push({
      href: args[0],
      icon: args[1],
      label: args[2],
      class: args[3],
    });
  }
  return calls;
}

test("findIconLinkCalls parses a multi-line call with all four arguments", () => {
  const source = `{{
    icons.iconLink(
      "/about/x.pdf",
      "export_pdf",
      "Download PDF",
      "resume-download"
    )
  }}`;
  const calls = findIconLinkCalls(source);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    href: "/about/x.pdf",
    icon: "export_pdf",
    label: "Download PDF",
    class: "resume-download",
  });
});

test("every icons.iconLink call site in the templates resolves to an existing dark/light icon pair with a non-empty label", () => {
  const njkFiles = findNjkFiles("src");
  const allCalls = njkFiles.flatMap((file) => {
    const source = fs.readFileSync(file, "utf8");
    return findIconLinkCalls(source).map((call) => ({ ...call, file }));
  });

  assert.ok(
    allCalls.length > 0,
    "expected at least one icons.iconLink call site",
  );

  for (const call of allCalls) {
    assert.ok(
      call.label && call.label.trim().length > 0,
      `${call.file}: iconLink call for "${call.icon}" has an empty label`,
    );
    const darkPath = path.join(ICONS_DIR, `${call.icon}_dark.png`);
    const lightPath = path.join(ICONS_DIR, `${call.icon}_light.png`);
    assert.ok(
      fs.existsSync(darkPath),
      `${call.file}: missing ${darkPath} for iconLink("${call.icon}")`,
    );
    assert.ok(
      fs.existsSync(lightPath),
      `${call.file}: missing ${lightPath} for iconLink("${call.icon}")`,
    );
  }
});
