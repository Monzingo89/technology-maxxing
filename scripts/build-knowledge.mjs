import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = path.join(root, "public");
const libraryPath = path.join(root, "library.html");
if (!fs.existsSync(libraryPath))
  throw new Error(
    "Preserve the original catalog as library.html before building knowledge pages.",
  );
const html = fs.readFileSync(libraryPath, "utf8");
const source = html
  .split("<script>")[1]
  ?.split("/* ---------- boot ---------- */")[0];
if (!source || !source.includes("const DATA ="))
  throw new Error("Could not locate the existing catalog loader.");
const readData = (name) =>
  JSON.parse(fs.readFileSync(path.join(root, "data", `${name}.json`), "utf8"));
const generated = readData("generated-technologies");
const extensions = readData("technology-extensions");
// Only the trusted, checked-in catalog runtime is evaluated. No fetched scripts or user input.
const context = vm.createContext({
  window: {},
  document: { addEventListener() {} },
  localStorage: { getItem: () => null },
  fetch: async (url) => ({
    ok: true,
    json: async () =>
      structuredClone(
        url.includes("generated-technologies") ? generated : extensions,
      ),
  }),
});
vm.runInContext(source, context, { timeout: 5000 });
await vm.runInContext("loadAgentData()", context, { timeout: 5000 });
const data = JSON.parse(vm.runInContext("JSON.stringify(DATA)", context));
const asText = (value) => (typeof value === "string" ? value : "");
const strings = (value) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const httpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
};
const site = new URL(
  process.env.SITE_URL || "https://monzingo89.github.io/technology-maxxing/",
);
if (
  !["http:", "https:"].includes(site.protocol) ||
  site.username ||
  site.password ||
  site.search ||
  site.hash
)
  throw new Error(
    "SITE_URL must be an HTTP(S) deployment base URL without credentials, query, or fragment.",
  );
site.pathname = `${site.pathname.replace(/\/$/, "")}/`;
const absolute = (route) => new URL(route, site).href;
const categories = Object.entries(data.cats).map(([id, category]) => ({
  id,
  name: asText(category.name),
}));
const ASSESSMENT_QUESTION_COUNT = 10;
const technologies = Object.entries(data.tech)
  .map(([id, item]) => {
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(id))
      throw new Error(`Unsafe catalog ID: ${id}`);
    const docs = (item.docs || []).flatMap((doc) => {
      const url = httpsUrl(doc.url);
      return url
        ? [{ label: asText(doc.label) || new URL(url).hostname, url }]
        : [];
    });
    const related = Object.entries(item.rel || {}).flatMap(
      ([relationship, ids]) =>
        ids
          .filter((target) => target !== id && data.tech[target])
          .map((target) => ({
            id: target,
            name: data.tech[target].name,
            relationship,
          })),
    );
    // These are already-public library questions for practice, never ranked server secrets.
    const questionBank = (item.assessment?.multipleChoice || [])
      .filter(
        (question) =>
          typeof question.question === "string" &&
          Array.isArray(question.options) &&
          question.options.every((option) => typeof option === "string") &&
          Number.isInteger(question.answerIndex) &&
          question.answerIndex >= 0 &&
          question.answerIndex < question.options.length,
      )
      .map((question) => ({
        question: question.question,
        options: question.options,
        answerIndex: question.answerIndex,
        explanation: asText(question.explanation),
      }));
    return {
      id,
      name: asText(item.name),
      cat: asText(item.cat),
      category: asText(data.cats[item.cat]?.name),
      tag: asText(item.tag),
      born: asText(item.born),
      history: asText(item.history),
      why: asText(item.why),
      problemItSolves: asText(item.problemItSolves),
      latestChanges: strings(item.latestChanges),
      historyNotes: strings(item.historyNotes),
      challenges: strings(item.challenges),
      practiceChallenges: (item.practiceChallenges || []).map((challenge) => ({
        level: Number(challenge.level) || 1,
        title: asText(challenge.title),
        prompt: asText(challenge.prompt),
        format: asText(challenge.format),
      })),
      docs,
      related,
      questionBank,
      learnPath: `learn/${id}/`,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
if (!technologies.length)
  throw new Error("Refusing to publish an empty knowledge catalog.");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, "knowledge.json"),
  JSON.stringify(
    { version: 1, source: "technology-maxxing", categories, technologies },
    null,
    2,
  ) + "\n",
);

const relationLabels = {
  needs: "Built on",
  powers: "Enables",
  rivals: "Alternatives",
  evolvedFrom: "Evolved from",
  seeAlso: "Explore next",
};
const unique = (items) =>
  Array.from(
    new Set(
      items
        .filter((item) => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim()),
    ),
  );
const firstSentence = (value, fallback) => {
  const text = asText(value).replace(/\s+/g, " ").trim();
  return text.split(/(?<=[.!?])\s+/)[0]?.replace(/[.!?]$/, "") || fallback;
};
const distractors = (correct, pool, count = 3) => {
  const options = unique(pool).filter((item) => item !== correct);
  const generic = [
    "It is mainly a consumer payment network",
    "It is primarily a desktop image editor",
    "It is a hardware-only networking appliance",
    "It is mostly used for handwritten document storage",
  ];
  while (options.length < count) options.push(generic[options.length % generic.length]);
  return options.slice(0, count);
};
const mcq = (id, question, correct, pool, explanation) => ({
  id,
  question,
  options: unique([correct, ...distractors(correct, pool)]).slice(0, 4),
  answerIndex: 0,
  explanation: explanation || correct,
});
const fitOptions = (correct, options, pool) =>
  unique([correct, ...options, ...distractors(correct, pool)]).slice(0, 4);
const normalizeAuthoredQuestion = (question, index) => {
  const correct = question.options[question.answerIndex];
  return {
    id: `authored-${index}`,
    question: question.question,
    options: fitOptions(correct, question.options, []),
    answerIndex: 0,
    explanation: question.explanation,
  };
};
const focusedPrompt = (name, prompt) =>
  prompt.endsWith("?") ? prompt : `For ${name}, ${prompt}`;
function buildAssessmentBank(technology, allTechnologies) {
  const t = technology;
  const sameCategory = allTechnologies.filter(
    (item) => item.id !== t.id && item.category === t.category,
  );
  const otherTopics = allTechnologies.filter((item) => item.id !== t.id);
  const categoryPool = unique(categories.map((item) => item.name));
  const topicNamePool = unique(otherTopics.map((item) => item.name));
  const tagPool = unique(otherTopics.map((item) => item.tag));
  const whyPool = unique(otherTopics.map((item) => firstSentence(item.why, item.tag)));
  const bornPool = unique(otherTopics.map((item) => item.born));
  const sameCategoryPool = unique(sameCategory.map((item) => item.name));
  const relatedPool = unique(t.related.map((item) => item.name));
  const challengePool = unique(otherTopics.flatMap((item) => item.challenges));
  const docsPool = unique(
    otherTopics.flatMap((item) =>
      item.docs.map((doc) => {
        try {
          return new URL(doc.url).hostname;
        } catch {
          return "";
        }
      }),
    ),
  );
  const correctDocHost = t.docs[0] ? new URL(t.docs[0].url).hostname : "official documentation";
  const challengeQuestions = t.challenges.slice(0, 5).map((challenge, index) =>
    mcq(
      `challenge-${index}`,
      `Which task would best prove practical knowledge of ${t.name} in scenario ${index + 1}?`,
      challenge,
      challengePool,
      challenge,
    ),
  );
  const practiceQuestions = t.practiceChallenges.slice(0, 3).map((challenge, index) => {
    const correct = focusedPrompt(t.name, challenge.prompt);
    const pool = unique(
      otherTopics.flatMap((item) =>
        item.practiceChallenges.map((itemChallenge) =>
          focusedPrompt(item.name, itemChallenge.prompt),
        ),
      ),
    );
    return mcq(
      `practice-scenario-${index}`,
      `Which scenario is the most focused ${t.name} practice task at level ${challenge.level || index + 1}?`,
      correct,
      pool,
      correct,
    );
  });
  const relatedQuestions = t.related.slice(0, 3).map((item, index) =>
    mcq(
      `related-${index}`,
      `In the IoT map, which topic is most directly connected to ${t.name} as "${relationLabels[item.relationship] || item.relationship}"?`,
      item.name,
      topicNamePool,
      `${item.name} is connected to ${t.name}.`,
    ),
  );
  const questions = [
    ...t.questionBank.map(normalizeAuthoredQuestion).slice(0, 2),
    ...challengeQuestions,
    ...practiceQuestions,
    mcq(
      "why",
      `Which reason best explains when ${t.name} is worth learning?`,
      firstSentence(t.why, t.tag),
      whyPool,
      t.why,
    ),
    mcq(
      "history",
      `Which technical background note belongs to ${t.name}?`,
      firstSentence(t.history, t.tag),
      whyPool,
      t.history,
    ),
    mcq(
      "docs",
      `Which source is the best first check for ${t.name}?`,
      correctDocHost,
      docsPool,
      `The catalog links ${t.name} to ${correctDocHost}.`,
    ),
    ...relatedQuestions,
    mcq(
      "category",
      `Which category best frames ${t.name} in the IoT library?`,
      t.category,
      categoryPool,
      `${t.name} is listed under ${t.category}.`,
    ),
    mcq(
      "tag",
      `Which focused description best matches ${t.name}?`,
      t.tag || firstSentence(t.why, t.name),
      tagPool,
      t.tag || t.why,
    ),
  ];
  const fallback = relatedPool.length
    ? relatedPool
    : sameCategoryPool.length
      ? sameCategoryPool
      : topicNamePool;
  for (let index = 0; questions.length < ASSESSMENT_QUESTION_COUNT; index += 1) {
    const correct = fallback[index % fallback.length] || t.name;
    questions.push(
      mcq(
        `concept-${index}`,
        `Which connected concept is most relevant to ${t.name}?`,
        correct,
        topicNamePool,
        `${correct} is relevant to ${t.name} in the catalog context.`,
      ),
    );
  }
  const byPrompt = new Map();
  for (const question of questions) {
    const promptKey = question.question.replace(/\s+/g, " ").trim().toLowerCase();
    if (!byPrompt.has(promptKey)) byPrompt.set(promptKey, question);
  }
  const bank = Array.from(byPrompt.values())
    .slice(0, ASSESSMENT_QUESTION_COUNT)
    .map((question, index) => ({ ...question, id: `${t.id}-${index + 1}` }));
  const prompts = new Set(bank.map((question) => question.question));
  if (prompts.size !== bank.length)
    throw new Error(`Assessment bank for ${t.id} contains repeated prompts.`);
  return bank;
}
const assessmentBanks = Object.fromEntries(
  technologies.map((technology) => [
    technology.id,
    buildAssessmentBank(technology, technologies),
  ]),
);
for (const [id, bank] of Object.entries(assessmentBanks)) {
  if (bank.length !== ASSESSMENT_QUESTION_COUNT)
    throw new Error(`Assessment bank for ${id} has ${bank.length} questions; expected ${ASSESSMENT_QUESTION_COUNT}.`);
}

// Keep the discovery app fast on mobile; full detail lives on each static page.
fs.writeFileSync(
  path.join(out, "knowledge-index.json"),
  JSON.stringify({
    technologies: technologies.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      tag: t.tag || t.why.slice(0, 150),
      challengeCount: t.challenges.length,
      assessmentCount: assessmentBanks[t.id].length,
      learnPath: t.learnPath,
    })),
    assessments: assessmentBanks,
  }) + "\n",
);

const styles = `:root{color-scheme:light;--ink:#242322;--muted:#686560;--paper:#f7f8f5;--accent:#527443}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.65 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}a{color:var(--accent);text-underline-offset:4px}a:focus-visible{outline:3px solid var(--accent);outline-offset:5px}header,main,footer{max-width:1040px;margin:auto;padding:24px}header{display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap;border-bottom:1px solid #dedbd4}.brand{font-size:23px;font-weight:800;color:var(--ink);text-decoration:none}nav{display:flex;gap:20px;flex-wrap:wrap}main{padding-top:48px}h1{font-size:clamp(36px,7vw,72px);line-height:1.07;letter-spacing:-.055em;margin:15px 0 24px}h2{font-size:27px;line-height:1.2;margin-top:42px;letter-spacing:-.025em}h3{font-size:19px;line-height:1.4}.eyebrow{font-size:13px;font-weight:750;letter-spacing:.13em;text-transform:uppercase;color:var(--accent)}.lede{font-size:22px;max-width:770px;color:var(--muted)}p,li{max-width:850px}.meta,small{color:var(--muted);font-size:14px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px}.card{padding:20px;border:1px solid #dfdcd6;border-radius:18px;background:#fff}.card h3{margin:0 0 10px}.card p{font-size:15px;margin:0}.pills{display:flex;gap:10px;flex-wrap:wrap}.pills a{padding:8px 12px;border:1px solid #dedbd4;border-radius:12px;text-decoration:none}.callout{padding:24px;background:#edf3e2;border-radius:20px;margin:40px 0}.callout h2{margin-top:0}footer{border-top:1px solid #dedbd4;margin-top:30px;font-size:14px;color:var(--muted)}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}`;
const jsonLd = (value) =>
  JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
function shell({ title, description, route, content, structured }) {
  const base = route === "learn/" ? "../" : "../../";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f6f3ee"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(absolute(route))}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(absolute(route))}"><meta name="twitter:card" content="summary"><link rel="icon" href="${base}space-icon.svg"><style>${styles}</style><script type="application/ld+json">${jsonLd(structured)}</script></head><body><header><a class="brand" href="${base}">AI Space<span aria-hidden="true"> ↗</span></a><nav aria-label="Main"><a href="${base}learn/">Knowledge library</a><a href="${base}library.html">Technology map</a><a href="${base}">AI Space home</a></nav></header><main>${content}</main><footer><p>AI Space · IoT library, AI topics, and timed assessments.</p><p>Based on the technology-maxxing repository. These learning notes are a maintained catalog, not a claim to describe the latest release. Consult linked primary documentation before relying on version-specific details.</p><a href="${base}#privacy">Privacy</a> · <a href="${base}#terms">Terms</a></footer></body></html>\n`;
}
for (const technology of technologies) {
  const t = technology;
  const description = `${t.name}: ${t.problemItSolves || t.why || t.tag}`.slice(
    0,
    165,
  );
  const relatedGroups = Object.entries(relationLabels)
    .map(([relationship, label]) => {
      const links = t.related.filter(
        (item) => item.relationship === relationship,
      );
      return links.length
        ? `<h3>${esc(label)}</h3><div class="pills">${links.map((item) => `<a href="../${esc(item.id)}/">${esc(item.name)}</a>`).join("")}</div>`
        : "";
    })
    .join("");
  const content = `<p class="eyebrow">${esc(t.category)} / Knowledge library</p><h1>${esc(t.name)}</h1>${t.tag ? `<p class="lede">${esc(t.tag)}</p>` : ""}<p class="meta">${esc(t.born)}</p><h2>Why learn ${esc(t.name)}?</h2><p>${esc(t.why)}</p>${t.problemItSolves && t.problemItSolves !== t.why ? `<h2>The problem it solves</h2><p>${esc(t.problemItSolves)}</p>` : ""}<h2>Where it came from</h2><p>${esc(t.history)}</p>${t.historyNotes.length ? `<ul>${t.historyNotes.map((note) => `<li>${esc(note)}</li>`).join("")}</ul>` : ""}${t.challenges.length ? `<h2>Build your understanding</h2><p>Work through these exercises in order. Try the task before opening a reference.</p><ol>${t.challenges.map((challenge) => `<li>${esc(challenge)}</li>`).join("")}</ol>` : ""}${t.practiceChallenges.length ? `<h2>More ways to practice</h2><div class="grid">${t.practiceChallenges.map((challenge) => `<article class="card"><small>Level ${esc(challenge.level)}</small><h3>${esc(challenge.title)}</h3><p>${esc(challenge.prompt)}</p></article>`).join("")}</div>` : ""}${t.docs.length ? `<h2>Documentation and sources</h2><ul>${t.docs.map((doc) => `<li><a href="${esc(doc.url)}" rel="noopener noreferrer">${esc(doc.label)}</a> <small>(${esc(new URL(doc.url).hostname)})</small></li>`).join("")}</ul>` : ""}${t.latestChanges.length ? `<h2>Catalog research notes</h2><ul>${t.latestChanges.map((note) => `<li>${esc(note)}</li>`).join("")}</ul>` : ""}${relatedGroups ? `<h2>Connect the ideas</h2>${relatedGroups}` : ""}<aside class="callout"><h2>Test your knowledge.</h2><p>Study this topic, then return to AI Space for a timed 10-question assessment and ELO tracking.</p><a href="../../">Take an assessment →</a></aside><p class="meta">Catalog source: <a href="https://github.com/Monzingo89/technology-maxxing">technology-maxxing</a>. This page reproduces the existing catalog’s learning material and source links.</p>`;
  const directory = path.join(out, "learn", t.id);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "index.html"),
    shell({
      title: `${t.name}: learn, practice & connect | AI Space`,
      description,
      route: t.learnPath,
      content,
      structured: {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        name: `Learn ${t.name}`,
        description,
        url: absolute(t.learnPath),
        inLanguage: "en",
        learningResourceType: "Learning notes and practice exercises",
        isAccessibleForFree: true,
        about: t.name,
        citation: t.docs.map((doc) => doc.url),
      },
    }),
  );
}
const indexContent = `<p class="eyebrow">IoT library and AI assessments</p><h1>Find your next<br>technical edge.</h1><p class="lede">${technologies.length} technologies, startups, AI terms, white papers, and practice paths for timed knowledge assessments.</p><div class="pills">${categories.map((category) => `<a href="#${esc(category.id)}">${esc(category.name)}</a>`).join("")}</div>${categories
  .map(
    (category) =>
      `<section aria-labelledby="${esc(category.id)}"><h2 id="${esc(category.id)}">${esc(category.name)}</h2><div class="grid">${technologies
        .filter((t) => t.cat === category.id)
        .map(
          (t) =>
            `<article class="card"><h3><a href="${esc(t.id)}/">${esc(t.name)}</a></h3><p>${esc(t.tag || t.problemItSolves || t.why)}</p></article>`,
        )
        .join("")}</div></section>`,
  )
  .join("")}`;
fs.writeFileSync(
  path.join(out, "learn", "index.html"),
  shell({
    title: "The AI Space knowledge library | Learn technology by doing",
    description:
      "Explore connected learning notes, documentation, and practice exercises for AI, programming languages, frameworks, operating systems, and developer tools.",
    route: "learn/",
    content: indexContent,
    structured: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "AI Space knowledge library",
      url: absolute("learn/"),
      isAccessibleForFree: true,
    },
  }),
);
const routes = ["", "learn/", ...technologies.map((t) => t.learnPath)];
fs.writeFileSync(
  path.join(out, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${esc(absolute(route))}</loc></url>`).join("")}</urlset>\n`,
);
fs.writeFileSync(
  path.join(out, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${absolute("sitemap.xml")}\n`,
);
console.log(
  `Built ${technologies.length} knowledge pages, library index, sitemap, and public practice catalog for ${site.href}`,
);
