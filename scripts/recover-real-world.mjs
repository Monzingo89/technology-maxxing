// Revalidate cached model responses after validator improvements; no paid calls.
import fs from "node:fs/promises";
import { validateExample } from "./real-world-examples.mjs";
const topics = JSON.parse(
  await fs.readFile("public/knowledge.json", "utf8"),
).technologies;
let recovered = 0;
for (const topic of topics) {
  const target = `data/real-world-examples/${topic.id}.json`;
  try {
    await fs.access(target);
    continue;
  } catch {}
  try {
    const file = `.cache/real-world/${topic.id}.response.json`;
    const cached = JSON.parse(await fs.readFile(file, "utf8"));
    const example = JSON.parse(cached.raw);
    example.model = "gemini-3.1-flash-lite";
    example.generatedAt = (await fs.stat(file)).mtime.toISOString();
    validateExample(example, {
      ...topic,
      docs: topic.docs.filter((s) => cached.sourceUrls.includes(s.url)),
    });
    await fs.writeFile(target, JSON.stringify(example, null, 2) + "\n");
    recovered++;
  } catch {}
}
console.log({ recovered });
