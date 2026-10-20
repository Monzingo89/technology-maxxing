import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  acronymTopic,
  inferExamMappings,
  matchingTopic,
  readAcronyms,
} from "./exam-study.mjs";

const entries = readAcronyms();
const index = JSON.parse(
  fs.readFileSync(
    new URL("../public/knowledge-index.json", import.meta.url),
    "utf8",
  ),
);
test("each acronym batch contains 100 independently resolvable meanings", () => {
  const studies = index.technologies.filter((topic) => topic.acronymStudy);
  assert.equal(studies.length, entries.length);
  for (const batch of new Set(entries.map((entry) => entry.batch)))
    assert.equal(
      studies.filter((topic) => topic.acronymStudy.batch === batch).length,
      100,
    );
  for (const entry of entries) {
    const matches = studies.filter(
      (topic) =>
        topic.acronymStudy.term === entry.term &&
        topic.acronymStudy.batch === entry.batch,
    );
    assert.equal(matches.length, 1, entry.term);
    assert.equal(matches[0].acronymStudy.expansion, entry.expansion);
  }
});
test("homonyms retain their independent meanings and contextual identities", () => {
  const find = (term) =>
    index.technologies.find((topic) => topic.acronymStudy?.term === term);
  for (const [a, b] of [
    ["SoC", "SOC"],
    ["IPS", "IPS"],
    ["ECC", "ECC (cryptography)"],
    ["GPT", "GPT (AI)"],
    ["ASR", "ASR (speech)"],
  ]) {
    if (a === b) {
      const matches = index.technologies.filter(
        (topic) => topic.acronymStudy?.term === a,
      );
      assert.equal(matches.length, 2);
      assert.notEqual(matches[0].id, matches[1].id);
      assert.notEqual(
        matches[0].acronymStudy.expansion,
        matches[1].acronymStudy.expansion,
      );
    } else {
      assert.notEqual(find(a).id, find(b).id);
      assert.notEqual(
        find(a).acronymStudy.expansion,
        find(b).acronymStudy.expansion,
      );
    }
  }
});
test("deduplication reuses exact concepts without swallowing service-specific entries", () => {
  const dns = entries.find((entry) => entry.term === "DNS");
  const candidates = [
    { id: "azure_dns", name: "Azure DNS" },
    { id: "dns", name: "Domain Name System (DNS)" },
  ];
  assert.equal(matchingTopic(dns, candidates).id, "dns");
  assert.equal(matchingTopic(dns, [candidates[0]]), undefined);
  assert.throws(
    () => matchingTopic(dns, [...candidates, { id: "dns2", name: "DNS" }]),
    /Ambiguous/,
  );
  const system = entries.find((entry) => entry.term === "SoC");
  const security = entries.find((entry) => entry.term === "SOC");
  assert.notEqual(acronymTopic(system).id, acronymTopic(security).id);
});
test("reused authored question banks survive acronym enrichment", () => {
  const reviewed = JSON.parse(
    fs.readFileSync(
      new URL("../data/assessment-banks.json", import.meta.url),
      "utf8",
    ),
  );
  for (const topic of index.technologies.filter(
    (topic) => topic.acronymStudy && reviewed[topic.id],
  ))
    assert.deepEqual(
      index.assessments[topic.id].slice(0, 5),
      reviewed[topic.id].questions,
    );
});
test("exam relevance is many-to-many, explained, and distinguishes retired study", () => {
  const mapping = inferExamMappings({
    id: "azure_virtual_network",
    name: "Azure Virtual Network",
    category: "Cloud",
    tag: "Azure network",
  });
  assert.ok(mapping.some((item) => item.examId === "az104"));
  assert.ok(mapping.some((item) => item.examId === "az900"));
  assert.ok(mapping.every((item) => item.reason && item.basis === "related"));
  const ids = new Set(index.exams.map((exam) => exam.id));
  for (const topic of index.technologies)
    assert.ok(
      topic.examMappings.every((item) => ids.has(item.examId) && item.reason),
    );
  assert.equal(
    index.exams.find((exam) => exam.id === "ai900-legacy").status,
    "retired",
  );
  assert.equal(
    index.exams.find((exam) => exam.id === "ai901").status,
    "current",
  );
});
