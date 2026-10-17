import { readFileSync, writeFileSync } from "node:fs";
const { technologies } = JSON.parse(
  readFileSync(new URL("../public/knowledge.json", import.meta.url), "utf8"),
);
const catalog = technologies.map(
  ({ id, name, category, tag, history, problemItSolves, docs }) => ({
    id,
    name,
    category,
    tag,
    history,
    problemItSolves,
    docs,
  }),
);
writeFileSync(
  new URL("../functions/src/video-catalog.json", import.meta.url),
  JSON.stringify(catalog),
);
console.log(`Prepared ${catalog.length} video topic records.`);
