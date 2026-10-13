import fs from "node:fs";
import { hardware } from "../src/workstation/hardware.ts";
import { pickModels } from "../src/workstation/modelRecommendations.ts";
const read = (name) =>
  JSON.parse(
    fs.readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8"),
  );
const slug = (id) =>
  "ai_" +
  id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_$/, "");
const docs = (url) => [{ label: "Primary source / model card", url }];
const date = new Date().toISOString().slice(0, 10);
const nodes = [];
function add(id, name, tag, why, problem, source, related, extra = "") {
  nodes.push({
    id: slug(id),
    name,
    cat: "ai",
    born: "AI Workbench · sourced catalog",
    tag,
    history: `${name}: ${tag} ${extra}`.trim(),
    why,
    rel: { needs: related.map(slug) },
    challenges: [
      `Explain what ${name} does.`,
      `Identify a use case for ${name}.`,
      `Describe a limitation of ${name}.`,
      `Name a compatible tool for ${name}.`,
      `Compare ${name} against an alternative.`,
    ],
    extension: {
      problemItSolves: problem,
      docs: docs(source),
      updatedAt: date,
      latestChanges: [
        "See the AI Workbench for source dates, pricing evidence and configuration details.",
      ],
    },
  });
}
const foundations = [
  [
    "chatgpt_platform",
    "ChatGPT plugin platform",
    "Adds skills and connected tools to ChatGPT workflows.",
    "Avoids copying context between supported applications.",
    "Connects an assistant to external app capabilities.",
    "https://learn.chatgpt.com/docs/plugins",
  ],
  [
    "claude_platform",
    "Claude connector platform",
    "Connects Claude to external tools and information through supported integrations.",
    "Provides app context and actions inside the assistant workflow.",
    "Bridges isolated business tools and model conversations.",
    "https://claude.com/marketplace/connectors-plugins",
  ],
  [
    "mcp_protocol",
    "Model Context Protocol (workbench)",
    "Defines an interface between AI hosts and tool or resource servers.",
    "Allows supported hosts to reuse server integrations.",
    "Reduces bespoke integrations between assistants and tools.",
    "https://modelcontextprotocol.io/docs/getting-started/intro",
  ],
  [
    "open_webui",
    "Open WebUI",
    "Provides a self-hosted interface to supported local and hosted model endpoints.",
    "Centralizes model conversations and supported tools.",
    "Makes multiple model backends accessible through a browser.",
    "https://docs.openwebui.com/",
  ],
  [
    "llama_cpp",
    "llama.cpp runtime",
    "Runs supported language models using optimized local inference backends.",
    "Supports quantized GGUF weights and multiple hardware backends.",
    "Enables local inference without requiring a managed API.",
    "https://github.com/ggml-org/llama.cpp",
  ],
  [
    "mlx_runtime",
    "MLX",
    "Provides array computation and machine learning on Apple silicon.",
    "Uses Apple unified memory for supported machine-learning workloads.",
    "Supports efficient experimentation on Apple hardware.",
    "https://github.com/ml-explore/mlx",
  ],
  [
    "quantization",
    "Weight quantization",
    "Stores model weights at reduced numerical precision.",
    "Reduces model memory requirements and sometimes improves inference efficiency.",
    "Makes larger models fit within limited memory budgets.",
    "https://huggingface.co/docs/transformers/quantization/overview",
  ],
  [
    "model_cards",
    "Model cards",
    "Document model purpose, license, limitations and evaluation context.",
    "Make deployment decisions traceable to model-specific evidence.",
    "Reduce unsupported assumptions about model capabilities.",
    "https://huggingface.co/docs/hub/model-cards",
  ],
  [
    "agent_runner",
    "Agent execution runtime",
    "Executes tool calls and tracks a model-driven workflow.",
    "Makes file edits and command execution auditable and controllable.",
    "Connects model proposals to permissioned actions in an environment.",
    "https://docs.openhands.dev/",
  ],
];
for (const [id, name, tag, why, problem, source] of foundations)
  add(
    id,
    name,
    tag,
    why,
    problem,
    source,
    id === "mcp_protocol" ? ["model_cards"] : ["mcp_protocol"],
  );
for (const platform of ["chatgpt", "claude"])
  for (const p of read(`${platform}-integrations`)) {
    const host = platform === "chatgpt" ? "ChatGPT" : "Claude";
    add(
      p.id,
      `${p.name} (${host} ${p.kind || "plugin"})`,
      p.description,
      `Brings ${p.name} capabilities into ${host} so the assistant can work with that service's context.`,
      `Reduces manual handoffs between ${host} and ${p.name}.`,
      p.source,
      [`${platform}_platform`, "mcp_protocol"],
      `Directory record checked ${p.verifiedAt}. Availability depends on region, plan, permissions and the publisher. Directory presence does not establish a quality ranking.`,
    );
  }
for (const m of read("frontier-models"))
  add(
    m.id,
    m.name,
    m.description,
    `Offers the documented ${m.provider} model capabilities through ${m.deployment}.`,
    `Provides model inference for supported ${m.inputModalities.join(" / ") || "documented"} inputs.`,
    m.source,
    ["open_webui", "model_cards"],
    `Published aliases: ${m.snapshots.join(", ")}. Input: ${m.inputModalities.join(", ") || "consult source"}. Output: ${m.outputModalities.join(", ") || "consult source"}. Checked ${m.verifiedAt}. Model capabilities are distinct from tools available in a particular agent.`,
  );
for (const m of read("open-models"))
  add(
    m.id,
    m.name,
    `${m.task} model from ${m.publisher}. ${m.description}`,
    `Provides downloadable weights for ${m.task} experimentation, subject to the model card and license.`,
    m.description,
    m.source,
    ["model_cards", "quantization"],
    `License: ${m.license}. Hugging Face downloads at snapshot: ${m.downloads}. This is a task-stratified popularity sample, not a performance ranking. Runtime compatibility must be checked for the specific architecture.`,
  );
for (const h of hardware)
  add(
    h.id,
    h.name,
    `${h.maker} ${h.kind === "mac" ? "Apple silicon family with unified memory" : "accelerator"}; ${h.memory}GB ${h.kind === "mac" ? "maximum family capacity" : "device memory"}.`,
    h.tradeoff,
    `Provides compute and memory for supported workloads using ${h.runtime}.`,
    h.source,
    [h.kind === "mac" ? "mlx_runtime" : "llama_cpp", "quantization"],
    `${h.meaning} ${h.tradeoff}`,
  );
for (const [id, license, description] of Object.values(pickModels)) {
  if (nodes.some((n) => n.id === slug(id))) continue;
  add(
    id,
    id.split("/")[1],
    description,
    "Provides downloadable model weights for controlled, task-specific evaluation.",
    "Supports local model experimentation; category recommendations are editorial, not measured rankings.",
    `https://huggingface.co/${id}`,
    ["model_cards", "quantization"],
    `License: ${license}. Source checked 2026-10-13. Evaluate on your own task before use.`,
  );
}
const seen = new Set();
for (const n of nodes) {
  if (seen.has(n.id)) throw Error(`Duplicate ${n.id}`);
  seen.add(n.id);
}
for (const n of nodes)
  for (const id of n.rel.needs)
    if (!seen.has(id)) throw Error(`Broken edge ${n.id} -> ${id}`);
const old = read("generated-technologies").filter(
  (n) => !n.id.startsWith("ai_") || !n.born?.startsWith("AI Workbench"),
);
const oldIds = new Set(old.map((n) => n.id));
// Connect the new section to established concepts without rewriting user topics.
const bridges = {
  ai_mcp_protocol: "mcp",
  ai_agent_runner: "agent_runtime",
  ai_model_cards: "llm",
};
for (const [from, to] of Object.entries(bridges)) {
  if (!oldIds.has(to)) throw Error(`Missing existing library bridge: ${to}`);
  nodes.find((n) => n.id === from).rel.needs.push(to);
}
const normalized = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const existingNames = new Set(old.map((n) => normalized(n.name)));
const library = fs.readFileSync(
  new URL("../library.html", import.meta.url),
  "utf8",
);
for (const match of library.matchAll(/\bname:"([^"]+)"/g))
  existingNames.add(normalized(match[1]));
for (const n of nodes) {
  if (existingNames.has(normalized(n.name)))
    n.name += ` (${n.id.slice(3).replaceAll("_", " ")})`;
  if (existingNames.has(normalized(n.name)))
    throw Error(`Duplicate name ${n.name}`);
  existingNames.add(normalized(n.name));
}
for (const n of nodes)
  if (oldIds.has(n.id)) throw Error(`Existing catalog collision: ${n.id}`);
fs.writeFileSync(
  new URL("../data/generated-technologies.json", import.meta.url),
  JSON.stringify([...old, ...nodes], null, 2) + "\n",
);
console.log(
  `Integrated ${nodes.length} AI Workbench topics with ${nodes.reduce((n, t) => n + t.rel.needs.length, 0)} reviewed links; preserved ${old.length} existing generated entries.`,
);
