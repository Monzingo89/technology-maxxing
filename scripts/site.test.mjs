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
