import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { planBuild } from "../src/workstation/planner.ts";
const read = (n) =>
  JSON.parse(
    fs.readFileSync(new URL(`../data/${n}.json`, import.meta.url), "utf8"),
  );
const prefs = { os: "auto", bits: 4, context: 8192, budget: 5000, local: true };
test("70B sizing includes overhead and does not claim a 32GB card fits", () => {
  const p = planBuild("Run a 70B model privately", prefs);
  assert.equal(p.weights, 35);
  assert.ok(p.memory > 35);
  assert.ok(p.accelerator.memory >= p.memory);
  assert.notEqual(p.accelerator.id, "rtx5090");
  assert.equal(p.completePrice, false);
});
test("Mac omni request remains a documented modular stack, not an invented Ultra laptop", () => {
  const p = planBuild("70B omni on a MacBook Pro M5 Ultra with AX100", {
    ...prefs,
    context: 32768,
  });
  assert.equal(p.os, "macOS");
  assert.ok(p.notes.some((n) => n.includes("desktop Mac Studio")));
  assert.ok(p.notes.some((n) => n.includes("not a verified NVIDIA GPU")));
  assert.match(p.model, /text only/);
  assert.ok(p.notes.some((n) => n.includes("separate vision")));
});
test("context and precision increase memory, impossible targets do not claim fit", () => {
  const a = planBuild("70B", prefs),
    b = planBuild("70B", { ...prefs, bits: 8, context: 32768 });
  assert.ok(b.memory > a.memory);
  const impossible = planBuild("1000B model", prefs);
  assert.ok(impossible.notes.some((n) => n.includes("not a confirmed fit")));
});
test("hosted plan requires no GPU purchase and does not hide recurring usage", () => {
  const p = planBuild("Refactor code", { ...prefs, local: false });
  assert.equal(p.local, false);
  assert.equal(p.parts.filter((x) => x.category === "GPU").length, 0);
  assert.equal(p.estimated, 0);
  assert.equal(p.weights, 0);
  assert.equal(p.memory, 0);
  assert.match(p.parts[0].note, /API usage/);
});
test("reference model sizing never underestimates a smaller requested model", () => {
  const p = planBuild("Run a 1B assistant", prefs);
  assert.equal(p.parameters, 8);
  assert.equal(p.weights, 4);
  assert.ok(p.notes.some((n) => n.includes("Requested sizing target: 1B")));
});
test("media plans name separate sourced tools without promising concurrent fit", () => {
  const p = planBuild("70B omni image video audio", prefs);
  assert.ok(p.parts.some((part) => part.name === "Qwen2.5-Omni-7B"));
  assert.ok(p.parts.some((part) => part.name === "Wan2.1-T2V-14B"));
  assert.ok(p.notes.some((n) => n.includes("run sequentially")));
});
test("planner rejects non-finite prices and unsupported precision", () => {
  assert.throws(() => planBuild("hello", { ...prefs, bits: 3 }));
  assert.throws(() => planBuild("hello", { ...prefs, budget: NaN }));
});
test("catalog has the requested 100 + 100 integrations and 100 task-stratified open models", () => {
  for (const name of [
    "chatgpt-integrations",
    "claude-integrations",
    "open-models",
  ]) {
    const rows = read(name);
    assert.equal(rows.length, 100, name);
    assert.equal(new Set(rows.map((x) => x.id)).size, 100);
    for (const r of rows) {
      assert.ok(r.name && r.description);
      assert.ok(r.source.startsWith("https://"));
      assert.match(r.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal("installed" in r, false);
    }
  }
  assert.ok(new Set(read("open-models").map((x) => x.task)).size >= 10);
});
test("Astra price and valid reasoning settings survive collection", () => {
  const m = read("frontier-models").find((m) => m.id === "gpt-6-astra");
  assert.equal(m.input, 10);
  assert.equal(m.output, 50);
  assert.deepEqual(m.reasoning, ["low", "medium", "high", "xhigh", "max"]);
  assert.equal(m.reasoning.includes("ultra"), false);
  assert.ok(m.benchmark.every((b) => b.source && b.config && b.date));
});
test("model evidence excludes Google page headings and never invents missing benchmark values", () => {
  const rows = read("frontier-models");
  for (const id of ["gemini-3-stable", "gemini-3-preview", "gemini-3-models"])
    assert.ok(!rows.some((m) => m.id === id));
  for (const m of rows)
    for (const b of m.benchmark) {
      assert.ok(Number.isFinite(b.score));
      assert.ok(b.source.startsWith("https://"));
      assert.ok(b.config && b.date);
    }
  assert.equal(rows.find((m) => m.id === "gpt-4.1").launchInput, 2);
});
test("new library records have useful source content and resolved relationships", () => {
  const rows = read("generated-technologies");
  const ids = new Set(rows.map((x) => x.id));
  assert.equal(ids.size, rows.length);
  const added = rows.filter((x) => x.born?.startsWith("AI Workbench"));
  assert.ok(added.length >= 500);
  for (const row of added) {
    assert.ok(row.extension.docs.length);
    assert.ok(row.extension.problemItSolves);
    assert.equal(row.challenges.length, 5);
    for (const id of row.rel.needs)
      assert.ok(ids.has(id), `${row.id} -> ${id}`);
  }
});
