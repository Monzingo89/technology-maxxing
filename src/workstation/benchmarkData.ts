import evidence from "../../data/model-evidence.json";
export type Result = {
  model: string;
  access: string;
  score: number;
  config: string;
  source: string;
  date: string;
  cohort: string;
};
export type Benchmark = {
  id: string;
  name: string;
  area: string;
  metric: string;
  description: string;
  results: Result[];
};
const models = [
  "Claude-3.5-Sonnet-1022",
  "GPT-4o-0513",
  "DeepSeek-V3 (original)",
  "o1-mini",
  "o1-1217",
  "DeepSeek-R1 (original)",
];
const snapshot = (
  id: string,
  name: string,
  area: string,
  metric: string,
  description: string,
  scores: number[],
): Benchmark => ({
  id,
  name,
  area,
  metric,
  description,
  results: scores.map((score, index) => ({
    model: models[index],
    score,
    access: [2, 5].includes(index) ? "Open weights" : "Hosted",
    source:
      "https://huggingface.co/deepseek-ai/DeepSeek-R1#4-evaluation-results",
    date: "2025-01",
    cohort: "DeepSeek R1 release comparison",
    config:
      "Publisher-reported comparison, not independently rerun. DeepSeek reports a 32,768-token generation cap; sampled evaluations use temperature 0.6, top-p 0.95 and 64 samples to estimate pass@1. Other model harnesses can differ; see source.",
  })),
});
export const benchmarks: Benchmark[] = [
  snapshot(
    "mmlu",
    "MMLU",
    "Knowledge",
    "Pass@1 (%)",
    "Broad subject knowledge; not a substitute for domain validation.",
    [88.3, 87.2, 88.5, 85.2, 91.8, 90.8],
  ),
  snapshot(
    "gpqa",
    "GPQA Diamond",
    "Research",
    "Pass@1 (%)",
    "Difficult science questions; not evidence of clinical competence.",
    [65, 49.9, 59.1, 60, 75.7, 71.5],
  ),
  snapshot(
    "swe",
    "SWE-bench Verified",
    "Coding",
    "Resolved (%)",
    "Repository issue resolution depends on the agent harness and tools.",
    [50.8, 38.8, 42, 41.6, 48.9, 49.2],
  ),
  snapshot(
    "aider",
    "Aider Polyglot",
    "Coding",
    "Accuracy (%)",
    "Editing code across languages; not every real-world codebase is represented.",
    [45.3, 16, 49.6, 32.9, 61.7, 53.3],
  ),
  snapshot(
    "aime",
    "AIME 2024",
    "Math",
    "Pass@1 (%)",
    "Competition math from a fixed historical problem set.",
    [16, 9.3, 39.2, 63.6, 79.2, 79.8],
  ),
  snapshot(
    "math500",
    "MATH-500",
    "Math",
    "Pass@1 (%)",
    "Mathematical problem solving on a 500-problem evaluation subset.",
    [78.3, 74.6, 90.2, 90, 96.4, 97.3],
  ),
];
for (const [model, record] of Object.entries(evidence)) {
  if (!("benchmark" in record)) continue;
  for (const result of record.benchmark) {
    // Keep different reports/harnesses separate from the original R1 cohort.
    const id = `evidence-${result.name}`;
    let benchmark = benchmarks.find((item) => item.id === id);
    if (!benchmark) {
      benchmark = {
        id,
        name: result.name,
        area: result.name === "MMLU" ? "Knowledge" : "Coding",
        metric: "Score (%)",
        description:
          "Published evidence from the model atlas. Compare configurations before drawing conclusions.",
        results: [],
      };
      benchmarks.push(benchmark);
    }
    benchmark.results.push({
      model,
      score: result.score,
      config: result.config,
      source: result.source,
      date: result.date,
      cohort: new URL(result.source).hostname + " · " + result.date,
      access: "Hosted",
    });
  }
}
