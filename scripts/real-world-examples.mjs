// Generated content is data, never HTML, JavaScript, or executable diagram syntax.
export function validateExample(example, topic) {
  const fail = (message) => {
    throw Error(`${topic.id}: ${message}`);
  };
  const text = (value, max = 2400) =>
    typeof value === "string" && value.trim().length > 0 && value.length <= max;
  if (example?.version !== 1 || example.topicId !== topic.id)
    fail("invalid example identity");
  for (const key of [
    "title",
    "business",
    "problem",
    "solution",
    "outcome",
    "limitation",
  ])
    if (!text(example[key])) fail(`invalid ${key}`);
  if (
    !Array.isArray(example.steps) ||
    example.steps.length < 3 ||
    example.steps.length > 6 ||
    example.steps.some((s) => !text(s, 800))
  )
    fail("expected 3-6 implementation steps");
  const allowedSources = new Set(topic.docs.map((s) => s.url));
  if (
    !example.sources?.length ||
    example.sources.some(
      (s) => !allowedSources.has(s.url) || !text(s.label, 200),
    )
  )
    fail("sources must be fetched catalog documentation");
  const diagram = example.diagram;
  if (
    !diagram ||
    !["flow", "er"].includes(diagram.kind) ||
    !text(diagram.title, 200) ||
    !text(diagram.description, 1000)
  )
    fail("missing annotated diagram");
  if (
    !Array.isArray(diagram.nodes) ||
    diagram.nodes.length < 3 ||
    diagram.nodes.length > 6
  )
    fail("diagram needs 3-6 nodes");
  const ids = new Set();
  for (const n of diagram.nodes) {
    if (
      !/^[a-z][a-z0-9_-]{0,30}$/i.test(n.id) ||
      ids.has(n.id) ||
      !text(n.label, 100) ||
      !text(n.detail, 300)
    )
      fail("invalid diagram node");
    ids.add(n.id);
  }
  if (
    !Array.isArray(diagram.edges) ||
    diagram.edges.length < 2 ||
    diagram.edges.length > 8 ||
    diagram.edges.some(
      (e) => !ids.has(e.from) || !ids.has(e.to) || !text(e.label, 160),
    )
  )
    fail("invalid labeled relationships");
  if (
    example.code !== null &&
    (!text(example.code?.language, 40) ||
      !text(example.code?.content, 5000) ||
      !text(example.code?.explanation, 1000) ||
      !/(\/\/|#|--|\/\*|<!--)/.test(example.code.content))
  )
    fail("code needs inline comments and explanation");
  const lesson = [
    example.business,
    example.problem,
    example.solution,
    ...example.steps,
    example.outcome,
    example.limitation,
  ].join(" ");
  if (!Array.isArray(example.questions) || example.questions.length !== 2)
    fail("exactly two scenario questions required");
  const prompts = new Set();
  for (const q of example.questions) {
    if (
      !text(q.question, 350) ||
      !q.question.toLowerCase().includes(example.title.toLowerCase()) ||
      prompts.has(q.question)
    )
      fail("question must reference the scenario title");
    prompts.add(q.question);
    if (
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      q.options.some((s) => !text(s, 220)) ||
      new Set(q.options.map((s) => s.toLowerCase().trim())).size !== 4
    )
      fail("four distinct answer choices required");
    if (
      !Number.isInteger(q.answerIndex) ||
      q.answerIndex < 0 ||
      q.answerIndex > 3 ||
      !text(q.explanation, 700)
    )
      fail("invalid answer or explanation");
    if (!text(q.evidence, 800) || !lesson.includes(q.evidence))
      fail("answer must point to an exact passage in the lesson");
  }
  return example;
}

export function exampleQuestions(example, topicName = example.topicId) {
  return example.questions.map((q, index) => ({
    id: `${example.topicId}-real-world-${index + 1}`,
    kind: "single",
    question: `${topicName}: ${q.question}`,
    options: q.options,
    answerIndex: q.answerIndex,
    explanation: `${q.explanation} From the example: ${q.evidence}`,
    skill:
      index === 0
        ? "Real-world problem and solution"
        : "Real-world implementation and tradeoffs",
    difficulty: "applied",
    section: "real-world",
    sources: [
      {
        label: "Real World Example: " + example.title,
        url: `https://tech.robertjmonzingo.com/learn/${encodeURIComponent(example.topicId)}/#real-world-example`,
      },
      ...example.sources,
    ],
  }));
}

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
export function renderExample(e) {
  if (!e) return "";
  const nodes = new Map(e.diagram.nodes.map((n) => [n.id, n.label]));
  return `<section id="real-world-example" aria-labelledby="real-world-title" class="real-world"><h2 id="real-world-title">Real World Example</h2><p class="meta">Illustrative business scenario · AI-generated from linked documentation · Not a measured customer case study</p><h3>${esc(e.title)}</h3><p>${esc(e.business)}</p><h3>The business problem</h3><p>${esc(e.problem)}</p><h3>How this topic solves it</h3><p>${esc(e.solution)}</p><ol>${e.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol><figure class="example-diagram"><figcaption><strong>${esc(e.diagram.title)}</strong> · ${e.diagram.kind === "er" ? "Entity relationships" : "Process flow"}</figcaption><p>${esc(e.diagram.description)}</p><div class="example-nodes">${e.diagram.nodes.map((n) => `<article><strong>${esc(n.label)}</strong><p>${esc(n.detail)}</p></article>`).join("")}</div><ul class="example-edges" aria-label="Labeled connections">${e.diagram.edges.map((edge) => `<li><strong>${esc(nodes.get(edge.from))}</strong><span> → ${esc(edge.label)} → </span><strong>${esc(nodes.get(edge.to))}</strong></li>`).join("")}</ul></figure>${e.code ? `<h3>Implementation example</h3><p>${esc(e.code.explanation)}</p><p class="meta">${esc(e.code.language)} · Illustrative code; not executed or production-validated.</p><pre tabindex="0" aria-label="Commented ${esc(e.code.language)} example"><code>${esc(e.code.content)}</code></pre>` : ""}<h3>Expected business outcome</h3><p>${esc(e.outcome)}</p><h3>Limitations and checks</h3><p>${esc(e.limitation)}</p><h3>Sources</h3><ul>${e.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a></li>`).join("")}</ul><p class="meta">Generated ${esc(e.generatedAt?.slice(0, 10) || "")} with ${esc(e.model || "Gemini")}. Your assessment includes two questions about this example.</p></section>`;
}

export const exampleStyles = `.real-world{margin-top:48px;border-top:1px solid #dedbd4;padding-top:12px}.example-diagram{margin:24px 0;padding:20px;border:1px solid #d7dfcf;border-radius:16px;background:#fff}.example-nodes{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:12px}.example-nodes article{border:1px solid #c6d4b7;border-radius:10px;padding:14px;background:#f5f8ef}.example-nodes p{font-size:14px;margin:6px 0 0}.example-edges{list-style:none;padding:0;display:grid;gap:12px}.example-edges li{margin:0;display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;text-align:center;gap:8px;font-size:14px}.example-edges li strong{padding:12px 8px;border:1px solid #b8caaa;border-radius:8px;background:#f5f8ef;overflow-wrap:anywhere}.example-edges li span{color:#465f37;overflow-wrap:anywhere}.real-world pre{max-width:100%;overflow:auto;padding:20px;border-radius:12px;background:#1c2430;color:#eef3fa;font-size:14px;line-height:1.6}.real-world code{font-family:ui-monospace,monospace}.real-world p,.real-world li{overflow-wrap:anywhere}`;
