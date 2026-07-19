import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, "index.html");
const STATE_PATH = path.join(ROOT, ".daily-agent", "state.json");
const SEED_PATH = path.join(ROOT, ".daily-agent", "new-technologies-seed.json");
const EXTENSIONS_PATH = path.join(ROOT, "data", "technology-extensions.json");
const GENERATED_PATH = path.join(ROOT, "data", "generated-technologies.json");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readText(filePath));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = readText(filePath).split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

function getApiKey() {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_TECH_MAXXING_API_KEY ||
    process.env["OPENAI-TECH-MAXXING-API-KEY"] ||
    ""
  ).trim();
}

function parseBaseTechnologies(indexHtml) {
  const blockMatch = indexHtml.match(/tech:\s*\{([\s\S]*?)\n\s*\}\s*\};/);
  if (!blockMatch) {
    throw new Error("Could not locate DATA.tech block in index.html");
  }

  const techBlock = blockMatch[1];
  const entryRegex = /^\s*([a-zA-Z0-9_]+):\{name:"([^"]+)"/gm;
  const list = [];
  let m;
  while ((m = entryRegex.exec(techBlock)) !== null) {
    list.push({ id: m[1], name: m[2] });
  }
  return list;
}

function pickTarget({ baseTechs, extensions, generated, seeds, forceTechId }) {
  if (forceTechId) {
    const fromBase = baseTechs.find((t) => t.id === forceTechId);
    if (fromBase) return { mode: "extend", target: fromBase };

    const fromSeed = seeds.find((s) => s.id === forceTechId);
    if (fromSeed) return { mode: "new", target: fromSeed };

    throw new Error(
      `FORCE_TECH_ID '${forceTechId}' was not found in base technologies or seed list.`,
    );
  }

  const extendedIds = new Set(Object.keys(extensions));
  const pendingExisting = baseTechs.filter((t) => !extendedIds.has(t.id));
  if (pendingExisting.length > 0) {
    return { mode: "extend", target: pendingExisting[0] };
  }

  const existingIds = new Set([
    ...baseTechs.map((t) => t.id),
    ...generated.map((t) => t.id),
  ]);

  const pendingNew = seeds.find((s) => !existingIds.has(s.id));
  if (!pendingNew) {
    return null;
  }

  return { mode: "new", target: pendingNew };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function callModel({ apiKey, model, prompt, schemaName }) {
  const body = {
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You are a senior curriculum architect. Output valid JSON only. Keep responses concise for low-cost daily runs. Prioritize mobile usability, anti-cheat assessment quality, practical coding growth, and history-focused lesson checks.",
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: prompt }],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            tag: { type: "string" },
            latestChanges: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: { type: "string" },
            },
            problemItSolves: { type: "string" },
            historyNotes: {
              type: "array",
              minItems: 3,
              maxItems: 4,
              items: { type: "string" },
            },
            relatedTechnologies: {
              type: "array",
              minItems: 3,
              maxItems: 5,
              items: { type: "string" },
            },
            docs: {
              type: "array",
              minItems: 3,
              maxItems: 4,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  label: { type: "string" },
                  url: { type: "string" },
                },
                required: ["label", "url"],
              },
            },
            practiceChallenges: {
              type: "array",
              minItems: 5,
              maxItems: 5,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  level: { type: "integer", minimum: 1, maximum: 5 },
                  title: { type: "string" },
                  prompt: { type: "string" },
                  format: {
                    type: "string",
                    enum: ["coding", "multiple-choice", "mixed"],
                  },
                },
                required: ["level", "title", "prompt", "format"],
              },
            },
            assessment: {
              type: "object",
              additionalProperties: false,
              properties: {
                antiCheatRules: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: { type: "string" },
                },
                multipleChoice: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      question: { type: "string" },
                      options: {
                        type: "array",
                        minItems: 3,
                        maxItems: 5,
                        items: { type: "string" },
                      },
                      answerIndex: { type: "integer", minimum: 0, maximum: 4 },
                      explanation: { type: "string" },
                    },
                    required: [
                      "question",
                      "options",
                      "answerIndex",
                      "explanation",
                    ],
                  },
                },
                codeDropdown: {
                  type: "array",
                  minItems: 1,
                  maxItems: 1,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      instructions: { type: "string" },
                      language: { type: "string" },
                      template: { type: "string" },
                      blanks: {
                        type: "array",
                        minItems: 1,
                        maxItems: 5,
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            id: { type: "string" },
                            options: {
                              type: "array",
                              minItems: 3,
                              maxItems: 6,
                              items: { type: "string" },
                            },
                            answer: { type: "string" },
                          },
                          required: ["id", "options", "answer"],
                        },
                      },
                    },
                    required: [
                      "instructions",
                      "language",
                      "template",
                      "blanks",
                    ],
                  },
                },
              },
              required: ["antiCheatRules", "multipleChoice", "codeDropdown"],
            },
          },
          required: [
            "title",
            "tag",
            "latestChanges",
            "problemItSolves",
            "historyNotes",
            "relatedTechnologies",
            "docs",
            "practiceChallenges",
            "assessment",
          ],
        },
      },
    },
    max_output_tokens: 1800,
    reasoning: { effort: "medium" },
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const text = json.output_text;
  if (!text) {
    throw new Error("Model did not return output_text.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Model output was not valid JSON.");
  }
}

function normalizeDocs(docs = []) {
  return docs
    .filter(
      (d) => d && typeof d.url === "string" && /^https?:\/\//i.test(d.url),
    )
    .map((d) => ({
      label: d.label?.trim() || "Official resource",
      url: d.url.trim(),
    }));
}

function extensionFromResult(result) {
  return {
    tag: result.tag,
    latestChanges: result.latestChanges,
    problemItSolves: result.problemItSolves,
    historyNotes: result.historyNotes,
    relatedTechnologies: result.relatedTechnologies,
    docs: normalizeDocs(result.docs),
    practiceChallenges: result.practiceChallenges,
    assessment: result.assessment,
    mobileUxNotes: [
      "Prioritize large touch targets and short prompts.",
      "Prefer dropdown code blanks over free-form typing on mobile.",
      "Keep each assessment step under ~60 seconds.",
    ],
    updatedAt: new Date().toISOString(),
  };
}

async function main() {
  parseDotEnv(path.join(ROOT, ".env"));

  const dryRun = ["1", "true", "yes"].includes(
    String(process.env.DAILY_AGENT_DRY_RUN || "").toLowerCase(),
  );

  const apiKey = getApiKey();
  if (!dryRun && !apiKey) {
    throw new Error(
      "Missing API key. Set OPENAI_API_KEY (recommended) or OPENAI-TECH-MAXXING-API-KEY.",
    );
  }

  const model = process.env.DAILY_AGENT_MODEL || "gpt-5.3-codex";
  const forceTechId = (process.env.FORCE_TECH_ID || "").trim();

  const indexHtml = readText(INDEX_PATH);
  const baseTechs = parseBaseTechnologies(indexHtml);
  const state = readJson(STATE_PATH, {
    version: 1,
    lastRunDate: null,
    lastProcessedTechId: null,
    runCount: 0,
  });
  const extensions = readJson(EXTENSIONS_PATH, {});
  const generated = readJson(GENERATED_PATH, []);
  const seeds = readJson(SEED_PATH, []);

  if (!forceTechId && state.lastRunDate === todayIso()) {
    console.log("Daily limit reached. Already processed one technology today.");
    return;
  }

  const target = pickTarget({
    baseTechs,
    extensions,
    generated,
    seeds,
    forceTechId,
  });

  if (!target) {
    console.log("No pending technologies. Nothing to update.");
    return;
  }

  const isNew = target.mode === "new";
  const id = target.target.id;
  const name = target.target.name;

  const prompt = isNew
    ? `Create a new technology dossier for ${name} (${id}). Category hint: ${target.target.catHint || "lang"}.\n\nReturn concise, accurate mobile-first content. Include: (1) anti-cheat assessment rules, (2) three history-focused multiple-choice questions, and (3) one dropdown fill-in checkpoint designed to appear at the end of a lesson paragraph. Keep wording short to reduce token usage.`
    : `Enhance this existing technology for daily learning progression: ${name} (${id}).\n\nReturn concise, accurate mobile-first content. Include: (1) anti-cheat assessment rules, (2) three history-focused multiple-choice questions, and (3) one dropdown fill-in checkpoint designed to appear at the end of a lesson paragraph. Keep wording short to reduce token usage.`;

  const result = dryRun
    ? {
        title: name,
        tag: `${name} practical mastery roadmap`,
        latestChanges: [
          `${name} ecosystem released notable updates in the last 12 months.`,
          `Tooling around ${name} improved DX and performance.`,
          `Learning resources for ${name} now emphasize real-world architecture patterns.`,
        ],
        problemItSolves: `${name} helps teams deliver maintainable solutions for its core domain with predictable conventions and strong ecosystem support.`,
        historyNotes: [
          `${name} started with focused goals and later broadened into a full ecosystem.`,
          `Community adoption accelerated once tooling stabilized.`,
          `Modern usage favors patterns that improve long-term maintainability.`,
        ],
        relatedTechnologies: ["typescript", "node", "docker"],
        docs: [
          { label: `${name} Official Docs`, url: "https://example.com/docs" },
          { label: `${name} Changelog`, url: "https://example.com/changelog" },
          {
            label: `${name} Best Practices`,
            url: "https://example.com/best-practices",
          },
        ],
        practiceChallenges: [
          {
            level: 1,
            title: "Basics",
            prompt: `Build a tiny ${name} hello-world and explain each part.`,
            format: "coding",
          },
          {
            level: 2,
            title: "Core patterns",
            prompt: `Implement one core ${name} pattern and justify your choices.`,
            format: "mixed",
          },
          {
            level: 3,
            title: "Architecture",
            prompt: `Design a maintainable ${name} module split for a medium feature.`,
            format: "multiple-choice",
          },
          {
            level: 4,
            title: "Performance",
            prompt: `Profile and optimize one measurable bottleneck in a ${name} workflow.`,
            format: "coding",
          },
          {
            level: 5,
            title: "Production readiness",
            prompt: `Create a production checklist for ${name} and validate it against a sample project.`,
            format: "mixed",
          },
        ],
        assessment: {
          antiCheatRules: [
            "Focus switches are tracked and reduce confidence in the score.",
            "Assessment is time-boxed and should be completed in one attempt.",
            "Avoid copy/paste and external assistants while answering.",
          ],
          multipleChoice: [
            {
              question: `When did ${name} first become widely adopted?`,
              options: [
                "Before the internet era",
                "After core tooling matured",
                "Only in the last year",
                "It never reached broad use",
              ],
              answerIndex: 1,
              explanation:
                "Adoption usually accelerates after stable tooling and community standards appear.",
            },
            {
              question: `What historical shift most helped ${name} grow?`,
              options: [
                "Removal of documentation",
                "Ecosystem and tooling expansion",
                "Elimination of testing",
                "Blocking community contributions",
              ],
              answerIndex: 1,
              explanation:
                "Most technologies scale when ecosystem tools lower onboarding and production risk.",
            },
            {
              question: `Which statement best matches ${name}'s history?`,
              options: [
                "It stayed unchanged from day one",
                "It evolved from focused origins into broader usage",
                "It was replaced immediately",
                "It only existed as a classroom concept",
              ],
              answerIndex: 1,
              explanation:
                "Successful technologies typically evolve in response to real production needs.",
            },
          ],
          codeDropdown: [
            {
              instructions: `Complete this short ${name} history recap by filling each dropdown.`,
              language: "text",
              template:
                `${name} started as {{blank1}}. As adoption grew, teams relied on {{blank2}}. Today it is known for {{blank3}}.`,
              blanks: [
                {
                  id: "blank1",
                  options: [
                    "a focused solution for a specific problem",
                    "a replacement for every programming language",
                    "a temporary experiment with no users",
                  ],
                  answer: "a focused solution for a specific problem",
                },
                {
                  id: "blank2",
                  options: [
                    "strong tooling and ecosystem support",
                    "avoiding standards and documentation",
                    "removing practical use cases",
                  ],
                  answer: "strong tooling and ecosystem support",
                },
                {
                  id: "blank3",
                  options: [
                    "practical real-world delivery",
                    "staying disconnected from production",
                    "eliminating maintainability concerns",
                  ],
                  answer: "practical real-world delivery",
                },
              ],
            },
          ],
        },
      }
    : await callModel({
        apiKey,
        model,
        prompt,
        schemaName: isNew
          ? "new_technology_dossier"
          : "technology_extension_dossier",
      });

  const extension = extensionFromResult(result);

  if (isNew) {
    const generatedTech = {
      id,
      name: result.title || name,
      cat: target.target.catHint || "lang",
      born: `${new Date().getFullYear()} · Daily Agent`,
      tag: extension.tag,
      history: (extension.historyNotes || []).join(" "),
      why: extension.problemItSolves,
      rel: {
        seeAlso: extension.relatedTechnologies
          .slice(0, 5)
          .map((x) => x.toLowerCase().replace(/\s+/g, "")),
      },
      challenges: extension.practiceChallenges.slice(0, 5).map((c) => c.prompt),
      extension,
    };

    generated.push(generatedTech);
    writeJson(GENERATED_PATH, generated);
  } else {
    extensions[id] = extension;
    writeJson(EXTENSIONS_PATH, extensions);
  }

  state.lastRunDate = todayIso();
  state.lastProcessedTechId = id;
  state.runCount = (state.runCount || 0) + 1;
  writeJson(STATE_PATH, state);

  console.log(
    `Daily technology agent completed: ${isNew ? "created" : "extended"} '${id}' (${name})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
