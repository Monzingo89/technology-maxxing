// Explicit refresh only. Builds source-backed snapshots; normal builds work offline.
import fs from "node:fs";
const date = new Date().toISOString().slice(0, 10);
const get = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`${r.status} ${url}`);
  return r.text();
};
const save = (name, data) =>
  fs.writeFileSync(
    new URL(`../data/${name}.json`, import.meta.url),
    JSON.stringify(data, null, 2) + "\n",
  );
function arrayAt(text, marker) {
  if (!text.includes(marker))
    throw Error(`Missing directory marker: ${marker}`);
  const start = text.indexOf("[", text.indexOf(marker) + marker.length);
  if (start < 0) throw Error(marker);
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === "[") depth++;
    else if (c === "]" && !--depth) return JSON.parse(text.slice(start, i + 1));
  }
  throw Error(`Incomplete ${marker}`);
}
const directory = "https://claude.com/marketplace/connectors-plugins";
const html = await get(directory);
const flight = [
  ...html.matchAll(/self\.__next_f\.push\((\[.*?\])\)<\/script>/g),
]
  .map((m) => JSON.parse(m[1])[1] || "")
  .join("");
const connectors = arrayAt(flight, '"data":{"items":');
const plugins = arrayAt(flight, '"topPlugins":');
const unique = [...new Map(connectors.map((p) => [p.slug, p])).values()].sort(
  (a, b) => (b.popularityScore ?? -1) - (a.popularityScore ?? -1),
);
const claude = [
  ...plugins.map((p) => ({ ...p, kind: "plugin" })),
  ...unique
    .slice(0, 100 - plugins.length)
    .map((p) => ({ ...p, kind: "connector" })),
].map((p) => ({
  id: `claude-${p.kind}-${p.slug}`,
  name: p.title,
  description: p.oneLiner || p.subheading,
  kind: p.kind,
  source: `https://claude.com/marketplace/${p.kind === "plugin" ? "plugins" : "connectors"}/${p.slug}`,
  author: p.author || "See publisher",
  popularity: p.installs ?? p.popularityScore ?? null,
  popularityMetric:
    p.kind === "plugin"
      ? "Directory installs"
      : "Directory popularity score (not installs)",
  verifiedAt: date,
}));
if (claude.length !== 100 || new Set(claude.map((p) => p.id)).size !== 100)
  throw Error("Claude snapshot incomplete; refusing replacement");
save("claude-integrations", claude);
console.log("Claude", claude.length);
const tasks = {
  "text-generation": 40,
  "image-text-to-text": 12,
  "text-to-image": 10,
  "text-to-video": 6,
  "image-to-video": 4,
  "automatic-speech-recognition": 6,
  "text-to-speech": 6,
  "sentence-similarity": 6,
  "feature-extraction": 4,
  "image-to-text": 3,
  "object-detection": 3,
};
const purposes = {
  "text-generation":
    "Draft text, answer questions, or generate code with locally deployable weights.",
  "image-text-to-text": "Answer questions grounded in images and text.",
  "text-to-image": "Turn a written visual brief into an image.",
  "text-to-video": "Create video clips from a written scene description.",
  "image-to-video": "Animate a source image into a video clip.",
  "automatic-speech-recognition":
    "Make recorded speech searchable and accessible as text.",
  "text-to-speech":
    "Create spoken audio for accessibility and voice interfaces.",
  "sentence-similarity": "Find semantically related passages for retrieval.",
  "feature-extraction": "Represent content as vectors for downstream analysis.",
  "image-to-text": "Extract captions or written content from images.",
  "object-detection": "Locate objects in images for visual analysis.",
};
const local = [];
for (const [task, count] of Object.entries(tasks)) {
  const url = `https://huggingface.co/api/models?pipeline_tag=${task}&sort=downloads&direction=-1&limit=${count + 30}&full=true`;
  const rows = JSON.parse(await get(url))
    .filter((p) => !p.private && !local.some((x) => x.id === p.id))
    .slice(0, count);
  for (const p of rows)
    local.push({
      id: p.id,
      name: p.id.split("/").pop(),
      publisher: p.id.split("/")[0],
      task,
      description: purposes[task],
      downloads: p.downloads,
      likes: p.likes,
      license:
        p.cardData?.license ||
        p.tags?.find((t) => t.startsWith("license:"))?.slice(8) ||
        "Check model card",
      source: `https://huggingface.co/${p.id}`,
      verifiedAt: date,
      parametersB: null,
      releaseDate: null,
      benchmark: null,
    });
}
save("open-models", local);
console.log("Open models", local.length);
const base = "https://developers.openai.com";
const index = await get(`${base}/api/docs/models.md`);
const links = [
  ...new Map(
    [
      ...index.matchAll(
        /- \[([^\]]+)\]\((\/api\/docs\/models\/[^)]+\.md)\): ([^\n]+)/g,
      ),
    ].map((m) => [m[2], { name: m[1], path: m[2], description: m[3] }]),
  ).values(),
];
const models = [];
const failures = [];
for (let i = 0; i < links.length; i += 6) {
  await Promise.all(
    links.slice(i, i + 6).map(async (item) => {
      try {
        const t = await get(base + item.path);
        const id =
          t.match(/Model ID: `([^`]+)`/)?.[1] ||
          item.path.split("/").pop().replace(".md", "");
        const section =
          t.split("## Snapshots")[1]?.split("## Rate limits")[0] || "";
        const snapshots = [...section.matchAll(/^- `([^`]+)`/gm)].map(
          (m) => m[1],
        );
        const money = (label) => {
          const v = t.match(new RegExp(`\\| ${label} \\| \\$([\\d.]+) \\|`));
          return v ? Number(v[1]) : null;
        };
        const efforts =
          (t.match(/(?:reasoning\.effort|reasoning effort)[^\n]+/i)?.[0] || "")
            .match(/`(?:none|minimal|low|medium|high|xhigh|max)`/g)
            ?.map((v) => v.slice(1, -1)) || [];
        models.push({
          id,
          name: item.name,
          provider: "OpenAI",
          description: item.description,
          source: base + item.path.replace(".md", ""),
          verifiedAt: date,
          snapshots: snapshots.length ? snapshots : [id],
          reasoning: efforts,
          inputModalities:
            t.match(/- Input modalities: (.+)/)?.[1]?.split(", ") || [],
          outputModalities:
            t.match(/- Output modalities: (.+)/)?.[1]?.split(", ") || [],
          context:
            Number(
              t.match(/- ([\d,]+) context window/)?.[1]?.replaceAll(",", ""),
            ) || null,
          input: money("Input"),
          output: money("Output"),
          cached: money("Cached input"),
          releaseDate: null,
          launchInput: null,
          launchOutput: null,
          benchmark: [],
          deployment: id.startsWith("gpt-oss") ? "open weights" : "hosted",
          status: /deprecated/i.test(item.description)
            ? "deprecated"
            : "Check provider availability",
        });
      } catch (e) {
        failures.push(item.name);
        console.error(item.name, e.message);
      }
    }),
  );
}
if (failures.length || models.length < 50)
  throw Error(
    `Incomplete OpenAI snapshot; preserving previous frontier catalog (${failures.length} failed pages)`,
  );
save(
  "frontier-models",
  models.sort((a, b) => a.id.localeCompare(b.id)),
);
console.log("OpenAI models", models.length);
