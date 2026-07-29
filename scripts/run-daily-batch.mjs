import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, ".daily-agent", "state.json");
const SEED_PATH = path.join(ROOT, ".daily-agent", "new-technologies-seed.json");
const GENERATED_PATH = path.join(ROOT, "data", "generated-technologies.json");
const SUMMARY_PATH = path.join(ROOT, ".daily-agent", "last-run-summary.json");
const SUMMARY_MD_PATH = path.join(ROOT, ".daily-agent", "last-run-summary.md");
const COUNT = Number(process.env.DAILY_AGENT_COUNT || 10);
const DRY_RUN = ["1", "true", "yes"].includes(
  String(process.env.DAILY_AGENT_DRY_RUN || "").toLowerCase(),
);

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function snapshot() {
  return {
    state: readJson(STATE_PATH, {}),
    generated: readJson(GENERATED_PATH, []),
    seeds: readJson(SEED_PATH, []),
  };
}

if (!Number.isInteger(COUNT) || COUNT < 1) {
  throw new Error("DAILY_AGENT_COUNT must be a positive integer.");
}

const before = snapshot();
const existingIds = new Set(before.generated.map((item) => item.id));
const pendingSeeds = before.seeds.filter((seed) => !existingIds.has(seed.id));

if (pendingSeeds.length < COUNT) {
  throw new Error(
    `Not enough unused technology seeds. Need ${COUNT}, but only ${pendingSeeds.length} remain.`,
  );
}

const selectedSeeds = pendingSeeds.slice(0, COUNT);
const added = [];

if (DRY_RUN) {
  console.log(`Dry run: would create exactly ${COUNT} technologies:`);
  for (const seed of selectedSeeds) {
    console.log(`- ${seed.name} (${seed.id})`);
  }
  console.log("Dry run: no files written and no API calls made.");
  process.exit(0);
}

for (let i = 0; i < selectedSeeds.length; i += 1) {
  const seed = selectedSeeds[i];
  console.log(`Creating ${i + 1}/${COUNT}: ${seed.name} (${seed.id})`);

  const result = spawnSync(process.execPath, ["scripts/daily-agent.mjs"], {
    cwd: ROOT,
    env: {
      ...process.env,
      FORCE_TECH_ID: seed.id,
    },
    encoding: "utf8",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    throw new Error(`Daily agent failed while creating ${seed.name}.`);
  }

  const afterItem = snapshot();
  const generatedItem = afterItem.generated.find((item) => item.id === seed.id);
  if (!generatedItem) {
    throw new Error(`Agent completed but did not create '${seed.id}'.`);
  }

  added.push({
    id: generatedItem.id,
    name: generatedItem.name,
    category: generatedItem.cat,
    action: "created",
  });
}

const after = snapshot();
const completedAt = new Date().toISOString();
const summary = {
  completedAt,
  requestedCount: COUNT,
  processedCount: added.length,
  beforeRunCount: before.state.runCount || 0,
  afterRunCount: after.state.runCount || 0,
  totalGeneratedTechnologies: after.generated.length,
  remainingSeeds: after.seeds.filter(
    (seed) => !new Set(after.generated.map((item) => item.id)).has(seed.id),
  ).length,
  items: added,
};

const markdown = [
  "# Technology Maxxing Daily Report",
  "",
  `Completed: ${completedAt}`,
  `Created: ${added.length} new technologies`,
  `Total generated technologies: ${summary.totalGeneratedTechnologies}`,
  `Unused seeds remaining: ${summary.remainingSeeds}`,
  "",
  "## Added today",
  "",
  ...added.map((item) => `- ${item.name} (\`${item.id}\`) — ${item.category}`),
  "",
  "Production: https://monzingo89.github.io/technology-maxxing/",
  "",
].join("\n");

fs.mkdirSync(path.dirname(SUMMARY_PATH), { recursive: true });
fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2) + "\n");
fs.writeFileSync(SUMMARY_MD_PATH, markdown);
console.log(`Batch complete: created exactly ${added.length} new technologies.`);
