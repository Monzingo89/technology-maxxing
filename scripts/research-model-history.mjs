import fs from "node:fs";
const file = new URL("../data/frontier-models.json", import.meta.url);
// Rebuild non-OpenAI provider snapshots instead of retaining stale scraper IDs.
const models = JSON.parse(fs.readFileSync(file, "utf8")).filter(
  (m) => m.provider === "OpenAI",
);
const date = new Date().toISOString().slice(0, 10);
const get = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw Error(`${r.status} ${url}`);
  return r.text();
};
const defaults = {
  verifiedAt: date,
  reasoning: [],
  inputModalities: [],
  outputModalities: [],
  context: null,
  input: null,
  output: null,
  cached: null,
  releaseDate: null,
  launchInput: null,
  launchOutput: null,
  benchmark: [],
  deployment: "hosted",
  status: "Historical; verify availability",
};
const index = await get(
  "https://platform.claude.com/docs/en/models/overview.md",
);
const retired = await get(
  "https://platform.claude.com/docs/en/about-claude/model-deprecations.md",
);
const pricing = await get(
  "https://platform.claude.com/docs/en/about-claude/pricing.md",
);
const ids = [
  ...new Set(
    [
      ...retired.matchAll(
        /\b(claude-(?:opus|sonnet|haiku|fable|mythos|instant|[123])[\w.-]*)/g,
      ),
    ].map((m) => m[1]),
  ),
];
for (const id of ids) {
  let slug = id.replace("claude-", "").replace(/-\d{8}$/, "");
  const source = `https://platform.claude.com/docs/en/models/${slug}/overview`;
  let t = "";
  try {
    t = await get(source + ".md");
  } catch {}
  const name =
    "Claude " +
    slug
      .split("-")
      .map((s) => s[0].toUpperCase() + s.slice(1))
      .join(" ")
      .replace(/(\d) (\d)/g, "$1.$2");
  const line = pricing.split("\n").find((l) => l.startsWith("| " + name + " "));
  const prices = line
    ? [...line.matchAll(/\$([\d.]+)\s*\/\s*MTok/g)].map((m) => +m[1])
    : [];
  const release = t.match(/Released ([A-Z][a-z]+ \d{1,2}, \d{4})/)?.[1];
  const effortLine =
    t.split("\n").find((l) => /Supported effort|Effort levels/.test(l)) || "";
  models.push({
    ...defaults,
    id,
    name,
    provider: "Anthropic",
    description:
      t.match(/\n\n(For [^\n]+)\n/)?.[1] ||
      `${name} is a versioned Claude language model. Consult its lifecycle and model documentation before selecting it.`,
    source: t
      ? source
      : "https://platform.claude.com/docs/en/about-claude/model-deprecations",
    snapshots: [id],
    inputModalities: /vision|image input/i.test(t)
      ? ["text", "image"]
      : ["text"],
    input: prices[0] ?? null,
    output: prices.at(-1) ?? null,
    cached: prices.length > 3 ? prices.at(-2) : null,
    releaseDate: release ? new Date(release).toISOString().slice(0, 10) : null,
    reasoning: [...effortLine.matchAll(/`(low|medium|high|xhigh|max)`/g)].map(
      (m) => m[1],
    ),
    context: /Context window: 1M/.test(t) ? 1000000 : null,
    status:
      t.match(/\*\*(Latest|Legacy|Deprecated|Retired)\./)?.[1] ||
      "Historical; see lifecycle source",
  });
}
// Extract published Gemini endpoints directly, including explicitly marked retired entries.
const googleSource = "https://ai.google.dev/gemini-api/docs/models?hl=en";
const google = await get(googleSource);
const googleIds = [
  ...new Set(
    [
      ...google.matchAll(
        /<(?:pre|code)[^>]*>\s*(gemini-[a-z0-9.\-]+)\s*<\/(?:pre|code)>/g,
      ),
    ].map((m) => m[1]),
  ),
];
if (googleIds.length < 15)
  throw Error("Google endpoint table missing; preserving previous catalog");
for (const id of googleIds)
  models.push({
    ...defaults,
    id,
    name: id.replaceAll("-", " "),
    provider: "Google",
    description:
      "Gemini family endpoint. Consult the linked model catalog for exact modalities, thinking settings, lifecycle and limits.",
    source: googleSource,
    snapshots: [id],
    inputModalities: [],
    outputModalities: [],
    status: "See current model catalog",
  });
// Research predecessors are distinct from currently sold API endpoints.
const ancestors = [
  [
    "gpt-1",
    "GPT-1",
    "OpenAI",
    "2018-06-11",
    "https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf",
  ],
  ["gpt-2", "GPT-2", "OpenAI", "2019-02-14", "https://github.com/openai/gpt-2"],
  [
    "gpt-3",
    "GPT-3",
    "OpenAI",
    "2020-05-28",
    "https://arxiv.org/abs/2005.14165",
  ],
  ["palm", "PaLM", "Google", "2022-04-04", "https://arxiv.org/abs/2204.02311"],
  [
    "palm-2",
    "PaLM 2",
    "Google",
    "2023-05-10",
    "https://arxiv.org/abs/2305.10403",
  ],
  [
    "gemini-1.0",
    "Gemini 1.0",
    "Google",
    "2023-12-06",
    "https://arxiv.org/abs/2312.11805",
  ],
  [
    "gemini-1.5-pro",
    "Gemini 1.5 Pro",
    "Google",
    "2024-02-15",
    "https://arxiv.org/abs/2403.05530",
  ],
  [
    "grok-1",
    "Grok-1",
    "xAI",
    "2023-11-04",
    "https://github.com/xai-org/grok-1",
  ],
];
for (const [id, name, provider, releaseDate, source] of ancestors)
  models.push({
    ...defaults,
    id,
    name,
    provider,
    releaseDate,
    source,
    snapshots: [id],
    description: `Historical ${name} research generation. Original research is linked; unavailable prices and measurements remain unknown.`,
    deployment: ["gpt-1", "gpt-2", "grok-1"].includes(id)
      ? "open weights"
      : "historical research",
    status: "Historical",
  });
const xSource = "https://docs.x.ai/developers/models";
const xText = await get(xSource + ".md");
for (const line of xText
  .split("\n")
  .filter(
    (l) =>
      /^\| grok-/.test(l) && l.includes("prompt tokens)") && !l.includes("≥"),
  )) {
  const cells = line.split("|").map((s) => s.trim());
  const id = cells[1].split(" ")[0];
  const number = (s) => Number(s.replace(/[^\d.]/g, ""));
  models.push({
    ...defaults,
    id,
    name: id,
    provider: "xAI",
    source: xSource,
    snapshots: [id],
    description:
      "Grok API model for text and coding workflows. Search tools must be enabled for current web information.",
    context: cells[2].endsWith("M")
      ? number(cells[2]) * 1e6
      : number(cells[2]) * 1000,
    input: number(cells[3]),
    cached: number(cells[4]),
    output: number(cells[5]),
    status: "Listed in current provider pricing; under 200K input tokens",
  });
}
for (const [id, name, input, output, cached] of [
  ["deepseek-flash", "DeepSeek V4.1 Flash", 0.3, 1.2, 0.006],
  ["deepseek-v4-pro", "DeepSeek V4 Pro", 1.32, 3.96, 0.044],
])
  models.push({
    ...defaults,
    id,
    name,
    provider: "DeepSeek",
    source: "https://api-docs.deepseek.com/quick_start/pricing",
    snapshots: [id],
    description:
      "DeepSeek model endpoint with thinking, tool calls and structured output. Displayed prices are peak rates; off-peak is half.",
    input,
    output,
    cached,
    context: 1000000,
    status: "Current pricing snapshot; peak rate",
  });
const evidence = JSON.parse(
  fs.readFileSync(
    new URL("../data/model-evidence.json", import.meta.url),
    "utf8",
  ),
);
const finalModels = [
  ...new Map(models.map((m) => [m.id, { ...m, ...evidence[m.id] }])).values(),
];
fs.writeFileSync(file, JSON.stringify(finalModels, null, 2) + "\n");
console.log({
  claude: ids.length,
  gemini: googleIds.length,
  total: models.length,
});
