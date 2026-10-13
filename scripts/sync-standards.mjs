import fs from "node:fs";
import { standardTopics } from "./standards-topics.mjs";
const path = new URL("../data/generated-technologies.json", import.meta.url);
const existing = JSON.parse(fs.readFileSync(path, "utf8"));
const ids = new Set(standardTopics.map((t) => t.id));
fs.writeFileSync(
  path,
  JSON.stringify(
    [...existing.filter((t) => !ids.has(t.id)), ...standardTopics],
    null,
    2,
  ) + "\n",
);
console.log(`Synced ${standardTopics.length} license and file-format topics.`);
