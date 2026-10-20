import fs from "node:fs";
import { readAcronyms, matchingTopic } from "./exam-study.mjs";

const index = JSON.parse(
  fs.readFileSync(
    new URL("../public/knowledge-index.json", import.meta.url),
    "utf8",
  ),
);
const records = readAcronyms();
const map = JSON.parse(
  fs.readFileSync(
    new URL("../data/acronym-topic-map.json", import.meta.url),
    "utf8",
  ),
);
const errors = [];
const topics = new Map(index.technologies.map((topic) => [topic.id, topic]));
const examIds = new Set(index.exams.map((exam) => exam.id));
const assigned = new Set();
const batches = [];
for (const batch of [...new Set(records.map((entry) => entry.batch))]) {
  const entries = records.filter((entry) => entry.batch === batch);
  const startErrors = errors.length;
  for (const entry of entries) {
    const row = map.find(
      (row) => row.batch === batch && row.term === entry.term,
    );
    const topic = row && topics.get(row.topicId);
    if (!topic) {
      errors.push(`${entry.term}: missing published topic`);
      continue;
    }
    if (assigned.has(topic.id))
      errors.push(`${entry.term}: two meanings share topic ${topic.id}`);
    assigned.add(topic.id);
    const study = topic.acronymStudy;
    if (
      !study ||
      ["term", "expansion", "mnemonic", "meaning", "distinction", "batch"].some(
        (key) => study[key] !== entry[key],
      )
    )
      errors.push(`${entry.term}: study content lost or overwritten`);
    if (
      !study?.sources?.length ||
      !study.sources.every(
        (source) => source.label && /^https:\/\//.test(source.url),
      )
    )
      errors.push(`${entry.term}: missing primary references`);
    if (
      !topic.examMappings?.length ||
      !topic.examMappings.every(
        (mapping) => examIds.has(mapping.examId) && mapping.reason,
      )
    )
      errors.push(`${entry.term}: invalid exam mappings`);
    const bank = index.assessments[topic.id];
    if (
      bank?.length < 5 ||
      !bank?.every(
        (question) =>
          question.options.length === 4 &&
          new Set(question.options).size === 4 &&
          question.options[question.answerIndex] &&
          question.sources?.length,
      )
    )
      errors.push(`${entry.term}: invalid assessment`);
    const page = new URL(
      `../public/${topic.learnPath}index.html`,
      import.meta.url,
    );
    if (
      !fs.existsSync(page) ||
      !fs.readFileSync(page, "utf8").includes('aria-label="Acronym study"')
    )
      errors.push(`${entry.term}: missing study section on learning page`);
    const duplicate = matchingTopic(
      entry,
      index.technologies.filter((candidate) => candidate.id !== topic.id),
    );
    if (duplicate)
      errors.push(`${entry.term}: duplicate concept ${duplicate.id}`);
  }
  batches.push({
    batch,
    entries: entries.length,
    topicsResolved: entries.filter((entry) =>
      map.some(
        (row) =>
          row.term === entry.term &&
          row.batch === batch &&
          topics.has(row.topicId),
      ),
    ).length,
    errors: errors.length - startErrors,
  });
}
if (map.length !== records.length || assigned.size !== records.length)
  errors.push(
    "Manifest and distinct-topic counts must equal the source entry count",
  );
const report = {
  reviewedAt: index.examResearchDate,
  acronyms: records.length,
  distinctTopics: assigned.size,
  batches,
  errors,
  limitations: [
    "Structural and consistency validation, not independent expert review of every fact.",
    "Exam relevance is not exhaustive objective coverage or a guarantee of an exam question.",
    "Brand names, generation labels, and form-factor designations are included and identified in the notes.",
  ],
};
fs.writeFileSync(
  new URL("../docs/acronym-audit.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
