import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("video-only deployment selects six functions and excludes credentials", () => {
  const root = new URL("../", import.meta.url);
  const config = JSON.parse(
    readFileSync(new URL("../firebase.video.json", root)),
  );
  assert.equal(config.functions[0].codebase, "ai-space");
  assert.ok(config.functions[0].ignore.includes(".secret*"));
  assert.ok(config.functions[0].ignore.includes(".env*"));
  const entry = readFileSync(new URL("src/video-index.js", root), "utf8");
  assert.ok(!entry.includes("./index.js"));
  const pkg = JSON.parse(readFileSync(new URL("../package.json", root)));
  assert.equal(
    pkg.scripts["video:deploy"].match(/functions:ai-space:/g).length,
    6,
  );
});
