import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = html.split('<script>')[1].split('/* ---------- boot ---------- */')[0];

async function load(generated, extensions = {}) {
  const context = vm.createContext({
    window: {},
    document: { addEventListener() {} },
    localStorage: { getItem: () => JSON.stringify({ scores: { js: 4 }, done: { 'js:0': 1 } }) },
    fetch: async url => ({ ok: true, json: async () => structuredClone(url.includes('generated-technologies') ? generated : extensions) }),
  });
  vm.runInContext(source, context);
  await vm.runInContext('loadAgentData()', context);
  return context;
}

test('base extensions can link to generated nodes and resolve display names', async () => {
  const context = await load([
    { id: 'sample', name: 'Sample Startup', cat: 'devops', rel: { needs: ['JavaScript'] }, extension: { relatedTechnologies: ['Git'] } },
  ], { js: { relatedTechnologies: ['Sample Startup'] } });
  assert.equal(vm.runInContext('DATA.tech.js.rel.seeAlso.includes("sample")', context), true);
  assert.equal(vm.runInContext('DATA.tech.sample.rel.needs.includes("js")', context), true);
  assert.equal(vm.runInContext('DATA.tech.js.rel.powers.includes("sample")', context), true);
  assert.equal(vm.runInContext('DATA.tech.git.rel.seeAlso.includes("sample")', context), true);
  await vm.runInContext('loadAgentData()', context);
  assert.equal(vm.runInContext('DATA.tech.js.rel.powers.filter(x=>x==="sample").length', context), 1);
});

test('rename preserves saved progress', async () => {
  const context = await load([]);
  vm.runInContext('loadLocalProgress()', context);
  assert.equal(vm.runInContext('LS_KEY', context), 'techweb:progress:v1');
  assert.equal(vm.runInContext('scores.js', context), 4);
  assert.equal(vm.runInContext('done["js:0"]', context), 1);
});

test('repository data loads without broken category assignments', async () => {
  const read = name => JSON.parse(fs.readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
  const context = await load(read('generated-technologies'), read('technology-extensions'));
  assert.equal(vm.runInContext('Object.values(DATA.tech).every(t=>DATA.cats[t.cat])', context), true);
});

test('bulk catalog preserves requested entries and resolves every new connection', async () => {
  const generated = JSON.parse(fs.readFileSync(new URL('../data/generated-technologies.json', import.meta.url), 'utf8'));
  assert.equal(new Set(generated.map(t => t.id)).size, generated.length, 'generated IDs must be unique');
  const context = await load(generated);
  const catalog = vm.runInContext('DATA.tech', context);
  const batchIds = 'numpy pandas scipy scikitlearn keras jax jupyter polars duckdb clickhouse powerbi tableau hadoop hdfs hive flink iceberg deltalake arrow parquet trino mlflow dvc qdrant milvus chroma pinecone weaviate huggingface transformers ollama vllm llamacpp onnx tensorrt langchain langgraph llamaindex rag embeddings astro sveltekit solidjs htmx alpinejs bootstrap shadcnui d3 threejs webassembly blazor aspnetcore express nestjs hono fastify phoenix elixir bash powershell r julia scala lua zig haskell ocaml clojure pnpm uv poetry gradle maven bazel nix podman argocd keycloak wireshark trivy'.split(' ');
  assert.equal(batchIds.length, 80);
  const secondBatchIds = 'erlang fsharp perl racket scheme commonlisp solidity vyper prolog elm purescript rescript gleam crystal nim dlang objectivec groovy awk zsh influxdb timescaledb neo4j cockroachdb yugabytedb tidb scylladb couchdb couchbase surrealdb arangodb valkey memcached opensearch solr meilisearch typesense nats pulsar redpanda caddy envoy traefik haproxy linkerd cilium calico containerd buildah buildkit packer vagrant opentofu crossplane flux tekton kustomize certmanager sops age storybook testinglibrary selenium pytest hypothesis ruff mypy eslint prettier biome swc esbuild rollup turborepo nx tanstackquery tanstackrouter zustand redux xstate'.split(' ');
  assert.equal(secondBatchIds.length, 80);
  assert.equal(new Set([...batchIds, ...secondBatchIds]).size, 160, 'bulk batches must not overlap');
  const baseCatalog = vm.runInContext('DATA.tech', await load([]));
  const normalizedNames = new Set(Object.values(baseCatalog).map(t => t.name.toLowerCase().replace(/[^a-z0-9]/g, '')));
  for (const entry of generated) {
    const name = entry.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    assert.ok(!normalizedNames.has(name), `duplicate technology name ${entry.name}`);
    normalizedNames.add(name);
  }
  const inverse = { needs: 'powers', powers: 'needs', rivals: 'rivals', seeAlso: 'seeAlso', evolvedFrom: 'seeAlso' };
  for (const id of [...batchIds, ...secondBatchIds]) {
    const entry = generated.find(t => t.id === id);
    assert.ok(entry, `missing ${id}`);
    assert.equal(entry.challenges.length, 5, `${id} exercises`);
    assert.ok(entry.history && entry.why && entry.tag, `${id} details`);
    assert.ok(entry.extension.docs.some(doc => new URL(doc.url).protocol === 'https:'), `${id} source`);
    for (const [verb, targets] of Object.entries(entry.rel)) {
      assert.ok(inverse[verb], `${id} relation type ${verb}`);
      for (const target of targets) {
        assert.ok(catalog[target], `${id} has unknown target ${target}`);
        assert.ok(catalog[target].rel[inverse[verb]].includes(id), `${target} links back to ${id}`);
      }
    }
  }
  for (const id of ['tensorflow', 'pytorch', 'tailwind', 'terraform', 'numpy', 'bash', 'powerbi', 'hadoop', 'blazor']) {
    assert.ok(catalog[id], `requested technology ${id}`);
  }
});
