import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, "index.html");
const STATE_PATH = path.join(ROOT, ".daily-agent", "state.json");
const SEED_PATH = path.join(ROOT, ".daily-agent", "new-technologies-seed.json");
const EXTENSIONS_PATH = path.join(ROOT, "data", "technology-extensions.json");
const GENERATED_PATH = path.join(ROOT, "data", "generated-technologies.json");

const DOSSIER_SYSTEM =
  "You are a senior curriculum architect. Output valid JSON only. Prioritize mobile usability, anti-cheat assessment quality, and practical coding growth.";

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

function normalizeId(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ---------- index.html parsing ---------- */

function extractTechBlock(indexHtml) {
  const blockMatch = indexHtml.match(/tech:\s*\{([\s\S]*?)\n\s*\}\s*\};/);
  if (!blockMatch) {
    throw new Error("Could not locate DATA.tech block in index.html");
  }
  return blockMatch[1];
}

function parseBaseTechnologies(indexHtml) {
  const techBlock = extractTechBlock(indexHtml);
  const entryRegex = /^\s*([a-zA-Z0-9_]+):\{name:"([^"]+)"/gm;
  const list = [];
  let m;
  while ((m = entryRegex.exec(techBlock)) !== null) {
    list.push({ id: m[1], name: m[2] });
  }
  return list;
}

function parseCategoryKeys(indexHtml) {
  const m = indexHtml.match(/cats:\s*\{([\s\S]*?)\n\s*\}/);
  if (!m) return ["lang", "front", "back", "data", "cloud", "os", "devops", "legacy"];
  return [...m[1].matchAll(/^\s*([a-zA-Z0-9_]+):\s*\{/gm)].map((x) => x[1]);
}

/* Ids referenced in rel edges / relatedTechnologies but not present in the map:
   the "seeAlso frontier" from the agent guide — the highest-value additions. */
function collectFrontierIds({ indexHtml, generated, extensions, existingIds }) {
  const referenced = new Set();

  const techBlock = extractTechBlock(indexHtml);
  for (const relMatch of techBlock.matchAll(/rel:\{([^}]*)\}/g)) {
    for (const idMatch of relMatch[1].matchAll(/"([a-zA-Z0-9_]+)"/g)) {
      referenced.add(normalizeId(idMatch[1]));
    }
  }

  for (const item of generated) {
    for (const ids of Object.values(item?.rel || {})) {
      for (const x of ids || []) referenced.add(normalizeId(x));
    }
    for (const x of item?.extension?.relatedTechnologies || []) {
      referenced.add(normalizeId(x));
    }
  }

  for (const ext of Object.values(extensions)) {
    for (const x of ext?.relatedTechnologies || []) {
      referenced.add(normalizeId(x));
    }
  }

  return [...referenced].filter((id) => id && !existingIds.has(id));
}

/* ---------- OpenAI Responses API ---------- */

/* The raw REST response has no `output_text` field (that is an SDK-only
   convenience property). Text lives in output[] -> message items ->
   content[] -> output_text parts, which we aggregate here. */
function extractOutputText(json) {
  if (typeof json.output_text === "string" && json.output_text.length > 0) {
    return json.output_text;
  }
  const parts = [];
  for (const item of json.output || []) {
    if (item.type !== "message") continue;
    for (const piece of item.content || []) {
      if (piece.type === "output_text" && typeof piece.text === "string") {
        parts.push(piece.text);
      } else if (piece.type === "refusal") {
        throw new Error(`Model refused the request: ${piece.refusal}`);
      }
    }
  }
  return parts.join("");
}

async function callModel({ apiKey, model, system, prompt, schemaName, schema }) {
  const body = {
    model,
    input: [
      { role: "system", content: [{ type: "input_text", text: system }] },
      { role: "user", content: [{ type: "input_text", text: prompt }] },
    ],
    text: {
      format: { type: "json_schema", name: schemaName, strict: true, schema },
    },
    reasoning: { effort: "high" },
  };

  const maxAttempts = 3;
  for (let attempt = 1; ; attempt++) {
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
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < maxAttempts) {
        await sleep(attempt * 5000);
        continue;
      }
      throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    if (json.error) {
      throw new Error(`OpenAI returned an error: ${JSON.stringify(json.error)}`);
    }
    if (json.status === "incomplete") {
      throw new Error(
        `Model response incomplete (${json.incomplete_details?.reason || "unknown reason"}).`,
      );
    }

    const text = extractOutputText(json);
    if (!text) {
      const itemTypes = (json.output || []).map((o) => o.type).join(", ") || "none";
      throw new Error(
        `Model returned no text output (status: ${json.status}; output item types: ${itemTypes}).`,
      );
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Model output was not valid JSON: ${text.slice(0, 200)}`);
    }
  }
}

/* ---------- schemas ---------- */

const DOSSIER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    tag: { type: "string" },
    latestChanges: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: { type: "string" },
    },
    problemItSolves: { type: "string" },
    historyNotes: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: { type: "string" },
    },
    relatedTechnologies: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: { type: "string" },
    },
    docs: {
      type: "array",
      minItems: 3,
      maxItems: 8,
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
      maxItems: 8,
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
          maxItems: 6,
          items: { type: "string" },
        },
        multipleChoice: {
          type: "array",
          minItems: 3,
          maxItems: 6,
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
            required: ["question", "options", "answerIndex", "explanation"],
          },
        },
        codeDropdown: {
          type: "array",
          minItems: 1,
          maxItems: 3,
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
            required: ["instructions", "language", "template", "blanks"],
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
};

function proposalSchema(catKeys) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      technologies: {
        type: "array",
        minItems: 1,
        maxItems: 40,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            catHint: { type: "string", enum: catKeys },
          },
          required: ["id", "name", "catHint"],
        },
      },
    },
    required: ["technologies"],
  };
}

/* ---------- prompts ---------- */

const DOSSIER_FIELD_NOTES = `Field rules:
- tag: a one-line lowercase "what it is" description under 60 characters (example: "the document skeleton of the web"). Never just the technology name.
- codeDropdown.template: mark every blank with double curly braces around its blank id, e.g. {{blank1}}. Blank ids must not appear in the template without the braces.`;

function dossierPrompt({ isNew, name, id, catHint }) {
  return isNew
    ? `Create a new technology dossier for ${name} (${id}). Category hint: ${catHint || "lang"}.\n\nReturn content that is concise, accurate, and optimized for mobile learning experiences. Include anti-cheat assessment rules, multiple-choice checks (use them to test history and conceptual knowledge), and at least one dropdown-based code completion challenge.\n\n${DOSSIER_FIELD_NOTES}`
    : `Enhance this existing technology for daily learning progression: ${name} (${id}).\n\nReturn content that is concise, accurate, and optimized for mobile learning experiences. Include anti-cheat assessment rules, multiple-choice checks (use them to test history and conceptual knowledge), and at least one dropdown-based code completion challenge.\n\n${DOSSIER_FIELD_NOTES}`;
}

async function proposeNewTechnologies({ apiKey, model, need, existingIds, frontier, catKeys }) {
  const prompt = `TECHWEB is a learning map of technologies. Existing technology ids:\n${[...existingIds].join(", ")}\n\nIds referenced by existing connections but missing from the map (the frontier): ${frontier.join(", ") || "none"}\n\nPropose exactly ${need} technologies to add today.\nRules:\n- Cover frontier ids first (using those exact ids), then fill remaining slots with widely used, career-relevant technologies spread across categories.\n- Skip frontier ids that are merely aliases of existing ids (example: existing id "js" already covers "javascript").\n- id: lowercase letters and digits only, short and stable (examples: rust, vue, graphql).\n- Never reuse an existing id.\n- name: the proper display name.\n- catHint: the best-fitting category key.`;

  const result = await callModel({
    apiKey,
    model,
    system:
      "You curate a technology learning map. Output valid JSON only. Choose technologies with real-world career value.",
    prompt,
    schemaName: "daily_new_technology_plan",
    schema: proposalSchema(catKeys),
  });

  const seen = new Set(existingIds);
  const picks = [];
  for (const t of result.technologies || []) {
    const id = normalizeId(t.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    picks.push({ id, name: t.name || id, catHint: t.catHint });
    if (picks.length >= need) break;
  }
  return picks;
}

/* ---------- result -> site data ---------- */

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

/* The site's renderCodeTemplate only recognizes {{blankId}} placeholders.
   If the model wrote a blank id into the template without braces, wrap it. */
function normalizeAssessment(assessment) {
  if (!assessment) return assessment;
  for (const codeQ of assessment.codeDropdown || []) {
    if (typeof codeQ?.template !== "string") continue;
    for (const blank of codeQ.blanks || []) {
      if (!blank?.id) continue;
      if (
        !codeQ.template.includes(`{{${blank.id}}}`) &&
        codeQ.template.includes(blank.id)
      ) {
        codeQ.template = codeQ.template.split(blank.id).join(`{{${blank.id}}}`);
      }
    }
  }
  return assessment;
}

/* An empty tag keeps the site's existing tagline (the loader skips falsy tags),
   which beats overwriting it with a degenerate one like the bare tech name. */
function normalizeTag(tag, target) {
  const t = String(tag || "").trim();
  if (normalizeId(t) === normalizeId(target.id)) return "";
  if (normalizeId(t) === normalizeId(target.name)) return "";
  return t;
}

function extensionFromResult(result, target) {
  return {
    tag: normalizeTag(result.tag, target),
    latestChanges: result.latestChanges,
    problemItSolves: result.problemItSolves,
    historyNotes: result.historyNotes,
    relatedTechnologies: result.relatedTechnologies,
    docs: normalizeDocs(result.docs),
    practiceChallenges: result.practiceChallenges,
    assessment: normalizeAssessment(result.assessment),
    mobileUxNotes: [
      "Prioritize large touch targets and short prompts.",
      "Prefer dropdown code blanks over free-form typing on mobile.",
      "Keep each assessment step under ~60 seconds.",
    ],
    updatedAt: new Date().toISOString(),
  };
}

function generatedTechFromResult(target, result) {
  const extension = extensionFromResult(result, target);
  return {
    id: target.id,
    name: result.title || target.name,
    cat: target.catHint || "lang",
    born: `${new Date().getFullYear()} · Daily Agent`,
    tag: extension.tag,
    history: (extension.historyNotes || []).join(" "),
    why: extension.problemItSolves,
    rel: {
      seeAlso: (extension.relatedTechnologies || [])
        .slice(0, 5)
        .map(normalizeId)
        .filter(Boolean),
    },
    challenges: (extension.practiceChallenges || [])
      .slice(0, 5)
      .map((c) => c.prompt),
    extension,
  };
}

/* ---------- daily plan ----------
   Each run: extend ONE not-yet-enriched base technology (tutorials + quizzes)
   and create DAILY_NEW_TECH_COUNT (default 10) brand-new technologies —
   seeds first, then model-proposed picks that prefer the frontier. */
function buildPlan({ baseTechs, extensions, generated, seeds, forceTechId, newTechCount }) {
  if (forceTechId) {
    const fromBase = baseTechs.find((t) => t.id === forceTechId);
    if (fromBase) return { extend: fromBase, create: [], proposalSlots: 0 };
    const fromSeed = seeds.find((s) => s.id === forceTechId);
    if (fromSeed) return { extend: null, create: [fromSeed], proposalSlots: 0 };
    throw new Error(
      `FORCE_TECH_ID '${forceTechId}' was not found in base technologies or seed list.`,
    );
  }

  const extendedIds = new Set(Object.keys(extensions));
  const extend = baseTechs.find((t) => !extendedIds.has(t.id)) || null;

  const existingIds = new Set([
    ...baseTechs.map((t) => t.id),
    ...generated.map((t) => t.id),
  ]);
  const create = seeds
    .filter((s) => !existingIds.has(s.id))
    .slice(0, newTechCount);

  return {
    extend,
    create,
    proposalSlots: Math.max(0, newTechCount - create.length),
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
  const newTechCount = Math.min(
    40,
    Math.max(0, parseInt(process.env.DAILY_NEW_TECH_COUNT || "10", 10) || 0),
  );

  const indexHtml = readText(INDEX_PATH);
  const baseTechs = parseBaseTechnologies(indexHtml);
  const catKeys = parseCategoryKeys(indexHtml);
  const state = readJson(STATE_PATH, {
    version: 1,
    lastRunDate: null,
    lastProcessedTechId: null,
    runCount: 0,
  });
  const extensions = readJson(EXTENSIONS_PATH, {});
  const generated = readJson(GENERATED_PATH, []);
  const seeds = readJson(SEED_PATH, []);

  const plan = buildPlan({
    baseTechs,
    extensions,
    generated,
    seeds,
    forceTechId,
    newTechCount,
  });

  const existingIds = new Set([
    ...baseTechs.map((t) => t.id),
    ...generated.map((t) => t.id),
    ...plan.create.map((t) => t.id),
  ]);
  const frontier = collectFrontierIds({ indexHtml, generated, extensions, existingIds });

  console.log(
    `Plan: extend ${plan.extend ? `'${plan.extend.id}'` : "nothing (all base techs enriched)"}, ` +
      `create ${plan.create.length} from seeds + ${plan.proposalSlots} model-proposed ` +
      `(frontier candidates: ${frontier.slice(0, 10).join(", ") || "none"}${frontier.length > 10 ? ", …" : ""})`,
  );

  if (dryRun) {
    if (plan.extend) {
      console.log(`Dry run: would extend '${plan.extend.id}' (${plan.extend.name}).`);
    }
    for (const t of plan.create) {
      console.log(`Dry run: would create '${t.id}' (${t.name}).`);
    }
    if (plan.proposalSlots > 0) {
      console.log(
        `Dry run: would ask the model to propose ${plan.proposalSlots} more technologies.`,
      );
    }
    console.log("Dry run: no files written, no API calls made.");
    return;
  }

  if (plan.proposalSlots > 0) {
    try {
      const proposed = await proposeNewTechnologies({
        apiKey,
        model,
        need: plan.proposalSlots,
        existingIds,
        frontier,
        catKeys,
      });
      plan.create.push(...proposed);
      console.log(
        `Model proposed ${proposed.length} technologies: ${proposed.map((t) => t.id).join(", ")}`,
      );
    } catch (err) {
      console.error(`Proposal call failed, continuing with seeds only: ${err.message}`);
    }
  }

  const created = [];
  const failed = [];
  let extendedId = null;

  if (plan.extend) {
    const { id, name } = plan.extend;
    try {
      const result = await callModel({
        apiKey,
        model,
        system: DOSSIER_SYSTEM,
        prompt: dossierPrompt({ isNew: false, name, id }),
        schemaName: "technology_extension_dossier",
        schema: DOSSIER_SCHEMA,
      });
      extensions[id] = extensionFromResult(result, plan.extend);
      writeJson(EXTENSIONS_PATH, extensions);
      extendedId = id;
      console.log(`Extended '${id}' (${name}).`);
    } catch (err) {
      failed.push({ id, stage: "extend", error: err.message });
      console.error(`Failed to extend '${id}': ${err.message}`);
    }
  }

  for (const target of plan.create) {
    try {
      const result = await callModel({
        apiKey,
        model,
        system: DOSSIER_SYSTEM,
        prompt: dossierPrompt({
          isNew: true,
          name: target.name,
          id: target.id,
          catHint: target.catHint,
        }),
        schemaName: "new_technology_dossier",
        schema: DOSSIER_SCHEMA,
      });
      generated.push(generatedTechFromResult(target, result));
      writeJson(GENERATED_PATH, generated);
      created.push(target.id);
      console.log(`Created '${target.id}' (${target.name}).`);
    } catch (err) {
      failed.push({ id: target.id, stage: "create", error: err.message });
      console.error(`Failed to create '${target.id}': ${err.message}`);
    }
  }

  const didAnything = extendedId !== null || created.length > 0;
  if (didAnything) {
    state.lastRunDate = todayIso();
    state.lastProcessedTechId = created[created.length - 1] || extendedId;
    state.runCount = (state.runCount || 0) + 1;
    state.lastRunSummary = {
      date: todayIso(),
      extended: extendedId,
      created,
      failed: failed.map((f) => `${f.stage} ${f.id}: ${f.error}`),
    };
    writeJson(STATE_PATH, state);
  }

  console.log(
    `Daily technology agent completed: extended ${extendedId ? `'${extendedId}'` : "nothing"}, ` +
      `created ${created.length}, failed ${failed.length}.`,
  );

  if (!didAnything) {
    if (failed.length > 0) {
      throw new Error(`All model calls failed. First error: ${failed[0].error}`);
    }
    console.log("Nothing pending. No changes made.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
