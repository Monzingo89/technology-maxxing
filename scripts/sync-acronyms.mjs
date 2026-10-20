import fs from "node:fs";
import vm from "node:vm";
import { acronymTopic, matchingTopic, readAcronyms } from "./exam-study.mjs";

const value = process.argv.find((arg) => arg.startsWith("--through="));
const through = value ? Number(value.split("=")[1]) : Infinity;
if (!(through > 0))
  throw new Error("--through must be a positive batch number");
const root = new URL("../", import.meta.url);
const generatedPath = new URL("data/generated-technologies.json", root);
const extensionsPath = new URL("data/technology-extensions.json", root);
const previous = JSON.parse(fs.readFileSync(generatedPath, "utf8"));
// This generator owns only records carrying its study payload and provenance.
const owned = previous.filter(
  (item) => item.study && item.born?.startsWith("Acronym study batch "),
);
const generated = previous.filter((item) => !owned.includes(item));
const extensions = JSON.parse(fs.readFileSync(extensionsPath, "utf8"));
for (const [id, extension] of Object.entries(extensions)) {
  delete extension.acronymStudy;
  if (!Object.keys(extension).length) delete extensions[id];
}
const html = fs.readFileSync(new URL("library.html", root), "utf8");
const context = vm.createContext({
  window: {},
  document: { addEventListener() {} },
  localStorage: { getItem: () => null },
  fetch: async (url) => ({
    ok: true,
    json: async () =>
      structuredClone(
        url.includes("generated-technologies") ? generated : extensions,
      ),
  }),
});
vm.runInContext(
  html.split("<script>")[1].split("/* ---------- boot ---------- */")[0],
  context,
  { timeout: 5000 },
);
await vm.runInContext("loadAgentData()", context, { timeout: 5000 });
const topics = JSON.parse(
  vm.runInContext(
    "JSON.stringify(Object.entries(DATA.tech).map(([id,t])=>({id,name:t.name})))",
    context,
  ),
);
const records = readAcronyms(through);
const seen = new Set();
const report = [];
const assigned = new Set();
for (const entry of records) {
  const key = `${entry.area}:${entry.term.toLowerCase()}`;
  if (seen.has(key)) throw new Error(`Duplicate acronym ${key}`);
  seen.add(key);
  const topic = acronymTopic(entry);
  const existing = matchingTopic(entry, topics);
  // Existing study entries use the same stable ID across repeated syncs.
  const existingGenerated = generated.find((item) => item.id === topic.id);
  const targetId = existing?.id || existingGenerated?.id || topic.id;
  if (assigned.has(targetId))
    throw new Error(
      `Two meanings resolve to ${targetId}; disambiguate ${entry.term}`,
    );
  assigned.add(targetId);
  if (!existing && !existingGenerated) {
    generated.push(topic);
    topics.push({ id: topic.id, name: topic.name });
  }
  extensions[targetId] = {
    ...extensions[targetId],
    acronymStudy: { ...topic.study, reusedTopic: Boolean(existing) },
  };
  report.push({ batch: entry.batch, term: entry.term, topicId: targetId });
}
for (const [url, data] of [
  [generatedPath, generated],
  [extensionsPath, extensions],
  [new URL("data/acronym-topic-map.json", root), report],
])
  fs.writeFileSync(url, JSON.stringify(data, null, 2) + "\n");
console.log(
  JSON.stringify({
    acronyms: report.length,
    batches: [...new Set(report.map((row) => row.batch))],
    distinctTopics: new Set(report.map((row) => row.topicId)).size,
  }),
);
