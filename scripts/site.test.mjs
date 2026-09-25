import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { validateReviewedBanks } from "./assessment-banks.mjs";

const reviewedBanks = JSON.parse(
  fs.readFileSync(
    new URL("../data/assessment-banks.json", import.meta.url),
    "utf8",
  ),
);

const html = fs.readFileSync(
  new URL("../library.html", import.meta.url),
  "utf8",
);
const source = html
  .split("<script>")[1]
  .split("/* ---------- boot ---------- */")[0];

async function load(generated, extensions = {}) {
  const context = vm.createContext({
    window: {},
    document: { addEventListener() {} },
    localStorage: {
      getItem: () => JSON.stringify({ scores: { js: 4 }, done: { "js:0": 1 } }),
    },
    fetch: async (url) => ({
      ok: true,
      json: async () =>
        structuredClone(
          url.includes("generated-technologies") ? generated : extensions,
        ),
    }),
  });
  vm.runInContext(source, context);
  await vm.runInContext("loadAgentData()", context);
  return context;
}

test("base extensions can link to generated nodes and resolve display names", async () => {
  const context = await load(
    [
      {
        id: "sample",
        name: "Sample Startup",
        cat: "devops",
        rel: { needs: ["JavaScript"] },
        extension: { relatedTechnologies: ["Git"] },
      },
    ],
    { js: { relatedTechnologies: ["Sample Startup"] } },
  );
  assert.equal(
    vm.runInContext('DATA.tech.js.rel.seeAlso.includes("sample")', context),
    true,
  );
  assert.equal(
    vm.runInContext('DATA.tech.sample.rel.needs.includes("js")', context),
    true,
  );
  assert.equal(
    vm.runInContext('DATA.tech.js.rel.powers.includes("sample")', context),
    true,
  );
  assert.equal(
    vm.runInContext('DATA.tech.git.rel.seeAlso.includes("sample")', context),
    true,
  );
  await vm.runInContext("loadAgentData()", context);
  assert.equal(
    vm.runInContext(
      'DATA.tech.js.rel.powers.filter(x=>x==="sample").length',
      context,
    ),
    1,
  );
});

test("rename preserves saved progress", async () => {
  const context = await load([]);
  vm.runInContext("loadLocalProgress()", context);
  assert.equal(vm.runInContext("LS_KEY", context), "techweb:progress:v1");
  assert.equal(vm.runInContext("scores.js", context), 4);
  assert.equal(vm.runInContext('done["js:0"]', context), 1);
});

test("repository data loads without broken category assignments", async () => {
  const read = (name) =>
    JSON.parse(
      fs.readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8"),
    );
  const context = await load(
    read("generated-technologies"),
    read("technology-extensions"),
  );
  assert.equal(
    vm.runInContext(
      "Object.values(DATA.tech).every(t=>DATA.cats[t.cat])",
      context,
    ),
    true,
  );
});

test("public assessment banks provide five focused answerable questions per topic", () => {
  const index = JSON.parse(
    fs.readFileSync(
      new URL("../public/knowledge-index.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(
    Object.keys(index.assessments).length,
    index.technologies.length,
  );
  for (const technology of index.technologies) {
    const bank = index.assessments[technology.id];
    assert.equal(bank.length, 5, `${technology.id} should have 5 questions`);
    assert.equal(technology.assessmentCount, 5);
    assert.equal(new Set(bank.map((question) => question.id)).size, 5);
    assert.equal(new Set(bank.map((question) => question.question)).size, 5);
    for (const question of bank) {
      assert.equal(typeof question.question, "string");
      assert.ok(question.question.length > 10);
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options).size, 4);
      assert.ok(
        question.options.every(
          (option) => typeof option === "string" && option.length > 0,
        ),
      );
      assert.ok(Number.isInteger(question.answerIndex));
      assert.ok(
        question.answerIndex >= 0 &&
          question.answerIndex < question.options.length,
      );
    }
  }
});

test("every topic publishes the same five practical assessment dimensions", () => {
  const index = JSON.parse(
    fs.readFileSync(
      new URL("../public/knowledge-index.json", import.meta.url),
      "utf8",
    ),
  );
  validateReviewedBanks(
    reviewedBanks,
    index.technologies.map((topic) => topic.id),
  );
  const skills = [
    "What the topic does",
    "Why people use it",
    "Problem it solves",
    "Compatible technologies",
    "Technology category",
  ];
  for (const [id, bank] of Object.entries(index.assessments)) {
    assert.deepEqual(
      bank.map((question) => question.skill),
      skills,
      `${id}: assessment dimensions`,
    );
    assert.equal(bank[3].kind, "multiple", `${id}: compatibility checkbox`);
    assert.ok(bank[3].answerIndices.length, `${id}: compatible answers`);
    assert.equal(
      new Set(bank[3].answerIndices).size,
      bank[3].answerIndices.length,
    );
    assert.equal(
      new Set(bank.slice(0, 3).map((question) =>
        question.options[question.answerIndex].trim().toLowerCase(),
      )).size,
      3,
      `${id}: purpose, popularity, and problem answers must be distinct`,
    );
    for (const question of bank) {
      const words = `${question.question} ${question.options.join(" ")}`
        .trim()
        .split(/\s+/).length;
      assert.ok(
        words <= 85,
        `${question.id} must be readable within the question timer (${words} words)`,
      );
      assert.doesNotMatch(
        question.question,
        /which linked source|which background note|which catalog relationship/i,
      );
    }
  }
});

test("reviewed assessment validation rejects broken or incomplete banks", () => {
  const example = reviewedBanks.rlhf;
  const mutations = [
    (bank) => bank.questions.pop(),
    (bank) => {
      bank.questions[0].answerIndex = 4;
    },
    (bank) => {
      bank.questions[0].options[1] = bank.questions[0].options[0];
    },
    (bank) => {
      bank.questions[0].options[1] = " ";
    },
    (bank) => {
      bank.questions[1].id = bank.questions[0].id;
    },
    (bank) => {
      bank.questions[1].question = bank.questions[0].question;
    },
    (bank) => {
      bank.questions[1].skill = bank.questions[0].skill;
    },
    (bank) => {
      bank.questions[0].sources = [];
    },
    (bank) => {
      bank.questions[0].sources[0].url = "javascript:alert(1)";
    },
    (bank) => {
      bank.questions[0].explanation = "";
    },
    (bank) => {
      bank.questions.forEach((q) => {
        q.difficulty = "foundation";
      });
    },
  ];
  for (const mutate of mutations) {
    const bank = structuredClone(example);
    mutate(bank);
    assert.throws(
      () => validateReviewedBanks({ rlhf: bank }, ["rlhf"]),
      /Reviewed assessment:/,
    );
  }
  assert.throws(
    () => validateReviewedBanks({ rlhf: example }, []),
    /unknown topic/,
  );
});

test("bulk catalog preserves requested entries and resolves every new connection", async () => {
  const generated = JSON.parse(
    fs.readFileSync(
      new URL("../data/generated-technologies.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(
    new Set(generated.map((t) => t.id)).size,
    generated.length,
    "generated IDs must be unique",
  );
  const context = await load(generated);
  const catalog = vm.runInContext("DATA.tech", context);
  const batchIds =
    "numpy pandas scipy scikitlearn keras jax jupyter polars duckdb clickhouse powerbi tableau hadoop hdfs hive flink iceberg deltalake arrow parquet trino mlflow dvc qdrant milvus chroma pinecone weaviate huggingface transformers ollama vllm llamacpp onnx tensorrt langchain langgraph llamaindex rag embeddings astro sveltekit solidjs htmx alpinejs bootstrap shadcnui d3 threejs webassembly blazor aspnetcore express nestjs hono fastify phoenix elixir bash powershell r julia scala lua zig haskell ocaml clojure pnpm uv poetry gradle maven bazel nix podman argocd keycloak wireshark trivy".split(
      " ",
    );
  assert.equal(batchIds.length, 80);
  const secondBatchIds =
    "erlang fsharp perl racket scheme commonlisp solidity vyper prolog elm purescript rescript gleam crystal nim dlang objectivec groovy awk zsh influxdb timescaledb neo4j cockroachdb yugabytedb tidb scylladb couchdb couchbase surrealdb arangodb valkey memcached opensearch solr meilisearch typesense nats pulsar redpanda caddy envoy traefik haproxy linkerd cilium calico containerd buildah buildkit packer vagrant opentofu crossplane flux tekton kustomize certmanager sops age storybook testinglibrary selenium pytest hypothesis ruff mypy eslint prettier biome swc esbuild rollup turborepo nx tanstackquery tanstackrouter zustand redux xstate".split(
      " ",
    );
  assert.equal(secondBatchIds.length, 80);
  const aiTermIds =
    "rlhf unsupervised_learning supervised_learning self_supervised_learning reinforcement_learning sft dpo rlaif llm transformer_architecture moe diffusion_models knowledge_distillation quantization cot react_agents vlm a2a peft in_context_learning".split(
      " ",
    );
  assert.equal(aiTermIds.length, 20);
  const secondAiTermIds =
    "attention_mechanism tokenization byte_pair_encoding prompt_engineering few_shot_learning zero_shot_learning semantic_search reranking context_window hallucination agent_memory multi_agent_systems ai_alignment adversarial_examples federated_learning synthetic_data graph_neural_networks generative_adversarial_networks variational_autoencoders transfer_learning".split(
      " ",
    );
  assert.equal(secondAiTermIds.length, 20);
  assert.equal(
    new Set([...batchIds, ...secondBatchIds, ...aiTermIds, ...secondAiTermIds])
      .size,
    200,
    "bulk batches must not overlap",
  );
  const baseCatalog = vm.runInContext("DATA.tech", await load([]));
  const normalizedNames = new Set(
    Object.values(baseCatalog).map((t) =>
      t.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
    ),
  );
  for (const entry of generated) {
    const name = entry.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    assert.ok(
      !normalizedNames.has(name),
      `duplicate technology name ${entry.name}`,
    );
    normalizedNames.add(name);
  }
  const inverse = {
    needs: "powers",
    powers: "needs",
    rivals: "rivals",
    seeAlso: "seeAlso",
    evolvedFrom: "seeAlso",
  };
  const index = JSON.parse(
    fs.readFileSync(
      new URL("../public/knowledge-index.json", import.meta.url),
      "utf8",
    ),
  );
  for (const id of [
    ...batchIds,
    ...secondBatchIds,
    ...aiTermIds,
    ...secondAiTermIds,
  ]) {
    const entry = generated.find((t) => t.id === id);
    assert.ok(entry, `missing ${id}`);
    assert.equal(entry.challenges.length, 5, `${id} exercises`);
    assert.ok(entry.history && entry.why && entry.tag, `${id} details`);
    if ([...aiTermIds, ...secondAiTermIds].includes(id)) {
      assert.equal(entry.cat, "ai", `${id} belongs in the AI section`);
      assert.equal(index.assessments[id].length, 5, `${id} assessment size`);
      assert.equal(
        index.assessments[id][3].kind,
        "multiple",
        `${id} compatibility checkbox`,
      );
      if (secondAiTermIds.includes(id)) {
        assert.equal(
          reviewedBanks[id].questions.length,
          5,
          `${id} has five reviewed assessment questions`,
        );
      }
    }
    assert.ok(
      entry.extension.docs.some(
        (doc) => new URL(doc.url).protocol === "https:",
      ),
      `${id} source`,
    );
    for (const [verb, targets] of Object.entries(entry.rel)) {
      assert.ok(inverse[verb], `${id} relation type ${verb}`);
      for (const target of targets) {
        assert.ok(catalog[target], `${id} has unknown target ${target}`);
        assert.ok(
          catalog[target].rel[inverse[verb]].includes(id),
          `${target} links back to ${id}`,
        );
      }
    }
  }
  for (const id of [
    "tensorflow",
    "pytorch",
    "tailwind",
    "terraform",
    "numpy",
    "bash",
    "powerbi",
    "hadoop",
    "blazor",
  ]) {
    assert.ok(catalog[id], `requested technology ${id}`);
  }
});
