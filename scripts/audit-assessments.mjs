import fs from "node:fs";
const index = JSON.parse(
  fs.readFileSync(
    new URL("../public/knowledge-index.json", import.meta.url),
    "utf8",
  ),
);
const errors = [];
const flags = [];
const prompts = new Map();
let authored = 0;
for (const topic of index.technologies) {
  const bank = index.assessments[topic.id];
  const scenarioCount = bank?.filter(q => q.section === 'real-world').length || 0;
  if (![0, 2].includes(scenarioCount) || bank?.length !== 5 + scenarioCount) {
    errors.push(`${topic.id}: expected five core questions and two when a real-world example is available`);
    continue;
  }
  if (topic.assessmentQuality === "authored") authored++;
  else
    flags.push({
      topic: topic.id,
      reason:
        "Generated catalog recall; not an independently validated proficiency assessment.",
    });
  const skills = new Set();
  for (const q of bank) {
    const prompt = q.question.trim().toLowerCase().replace(/\s+/g, " ");
    if (prompts.has(prompt))
      errors.push(`${q.id}: duplicate prompt with ${prompts.get(prompt)}`);
    prompts.set(prompt, q.id);
    if (
      q.options.length !== 4 ||
      new Set(q.options.map((s) => s.trim().toLowerCase())).size !== 4
    )
      errors.push(`${q.id}: invalid or repeated choices`);
    const correct = q.kind === "multiple" ? q.answerIndices : [q.answerIndex];
    if (
      !correct?.length ||
      correct.some((i) => !Number.isInteger(i) || i < 0 || i >= 4)
    )
      errors.push(`${q.id}: invalid answer key`);
    if (!q.explanation?.trim() || !q.sources?.length)
      errors.push(`${q.id}: missing explanation or source`);
    if (skills.has(q.skill))
      flags.push({
        topic: topic.id,
        reason: `Repeated skill label: ${q.skill}`,
      });
    skills.add(q.skill);
    const words = `${q.question} ${q.options.join(" ")}`.split(/\s+/).length;
    if (words > 85)
      flags.push({
        topic: topic.id,
        reason: `${q.id} has ${words} words; review reading burden under the 20-second timer.`,
      });
  }
}
const report = {
  checkedAt: new Date().toISOString().slice(0, 10),
  topics: index.technologies.length,
  questions: prompts.size,
  authoredTopics: authored,
  catalogRecallTopics: index.technologies.length - authored,
  errors,
  flags,
  limitations: [
    "Structural checks are not expert validation of every answer or distractor.",
    "Twenty-second timing, randomized question order and shuffled options discourage casual lookup but cannot prevent AI assistance.",
    "Publicly shipped answer keys and client-side timers cannot support high-stakes certification.",
    "Catalog-recall banks test recognition of catalog descriptions; they do not establish practical proficiency.",
  ],
};
fs.writeFileSync(
  new URL("../docs/assessment-audit.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, flags: flags.length }, null, 2));
if (errors.length) process.exitCode = 1;
