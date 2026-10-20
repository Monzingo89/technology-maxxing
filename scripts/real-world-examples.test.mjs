import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  validateExample,
  renderExample,
  exampleQuestions,
} from "./real-world-examples.mjs";
const topics = JSON.parse(
  fs.readFileSync("public/knowledge.json", "utf8"),
).technologies;
test("all published real-world examples have two directly grounded questions and safe diagrams", () => {
  for (const file of fs.readdirSync("data/real-world-examples")) {
    const e = JSON.parse(
      fs.readFileSync(`data/real-world-examples/${file}`, "utf8"),
    );
    const topic = topics.find((t) => t.id === e.topicId);
    assert.ok(topic);
    validateExample(e, topic);
    assert.equal(exampleQuestions(e).length, 2);
    assert.ok(exampleQuestions(e).every((q) => q.section === "real-world"));
    assert.ok(renderExample(e).includes("Real World Example"));
  }
});
test("rejects invented sources, invalid answer keys and absent lesson evidence", () => {
  const e = JSON.parse(
    fs.readFileSync("data/real-world-examples/sql.json", "utf8"),
  );
  const topic = topics.find((t) => t.id === "sql");
  const bad = structuredClone(e);
  bad.sources[0].url = "https://invented.example/";
  assert.throws(() => validateExample(bad, topic), /sources/);
  const key = structuredClone(e);
  key.questions[0].answerIndex = 4;
  assert.throws(() => validateExample(key, topic), /answer/);
  const evidence = structuredClone(e);
  evidence.questions[0].evidence = "This was not taught.";
  assert.throws(() => validateExample(evidence, topic), /passage/);
});
test("renders model-controlled prose, diagram labels and code as inert text", () => {
  const e = JSON.parse(
    fs.readFileSync("data/real-world-examples/sql.json", "utf8"),
  );
  e.title = "<img src=x onerror=alert(1)>";
  e.diagram.nodes[0].label = "<script>alert(1)</script>";
  e.code = {
    language: "js",
    content: "// Demo\n<script>alert(1)</script>",
    explanation: "Not executed",
  };
  const html = renderExample(e);
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;script&gt;"));
});
