import { readFileSync, writeFileSync } from 'node:fs';
const generated = JSON.parse(readFileSync(new URL('../data/generated-technologies.json', import.meta.url), 'utf8'));
const extensions = JSON.parse(readFileSync(new URL('../data/technology-extensions.json', import.meta.url), 'utf8'));
const selected = generated.filter(node => /^(mlflow|dvc|huggingface|transformers|ollama|vllm|llamacpp|langchain|llamaindex|openrouter|deepseek|grok|llama|cursor|claude|m365copilot|githubcopilot|poolside)$/.test(node.id));
const sources = selected.map(node => ({ id: node.id, name: node.name, summary: node.history, purpose: node.why, details: node.extension?.problemItSolves || '', docs: (node.extension?.docs || []).map(doc => doc.url) }));
// Include expansion records too; the deployment snapshot grows with the repository.
for (const [id, item] of Object.entries(extensions)) {
  if (/ai|agent|prompt|model|machine learning/i.test(`${id} ${item.problemItSolves || ''}`)) sources.push({ id, name: id, summary: item.problemItSolves || '', details: (item.historyNotes || []).join(' ').slice(0, 1500), docs: (item.docs || []).map(doc => doc.url) });
}
writeFileSync(new URL('./src/catalog-source.json', import.meta.url), JSON.stringify(sources, null, 2) + '\n');
console.log(`Prepared ${sources.length} catalog source records for the server-side AI author.`);
