import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, ".daily-agent", "state.json");
const GENERATED_PATH = path.join(ROOT, "data", "generated-technologies.json");
const EXTENSIONS_PATH = path.join(ROOT, "data", "technology-extensions.json");
const SUMMARY_PATH = path.join(ROOT, ".daily-agent", "last-run-summary.json");
const COUNT = Number(process.env.DAILY_AGENT_COUNT || 10);

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function snapshot() {
  const state = readJson(STATE_PATH, {});
  return {
    state,
    generated: readJson(GENERATED_PATH, []),
    extensions: readJson(EXTENSIONS_PATH, {}),
  };
}

const before = snapshot();
const added = [];

for (let i = 0; i < COUNT; i += 1) {
  const result = spawnSync(process.execPath, ["scripts/daily-agent.mjs"], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    throw new Error(`Daily agent failed on item ${i + 1} of ${COUNT}.`);
  }

  const afterItem = snapshot();
  const id = afterItem.state.lastProcessedTechId;
  if (!id) {
    throw new Error(`Daily agent did not record an item on iteration ${i + 1}.`);
  }

  const generatedItem = afterItem.generated.find((x) => x.id === id);
  const baseWasExtended = !generatedItem && afterItem.extensions[id];
  added.push({
    id,
    name: generatedItem?.name || id,
    action: generatedItem ? "created" : baseWasExtended ? "extended" : "updated",
  });
}

const after = snapshot();
const summary = {
  completedAt: new Date().toISOString(),
  requestedCount: COUNT,
  processedCount: added.length,
  beforeRunCount: before.state.runCount || 0,
  afterRunCount: after.state.runCount || 0,
  items: added,
};

fs.mkdirSync(path.dirname(SUMMARY_PATH), { recursive: true });
fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2) + "\n");
console.log(`Batch complete: processed ${added.length} technologies.`);
