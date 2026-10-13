import fs from "node:fs";
const file = new URL("../data/frontier-models.json", import.meta.url);
const models = JSON.parse(fs.readFileSync(file, "utf8"));
const source = "https://ai.google.dev/gemini-api/docs/pricing?hl=en";
const response = await fetch(source);
if (!response.ok) throw Error(response.status);
const html = await response.text();
const clean = (s) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
for (const m of models.filter(
  (m) =>
    m.provider === "Google" &&
    !/image|tts|live|omni|embedding|robotic|transcribe/.test(m.id),
)) {
  const start = html.indexOf(`id="${m.id}"`);
  if (start < 0) continue;
  const section = html.slice(start).split("</table>")[0];
  const rows = [...section.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => clean(c[1])),
  );
  const input = rows.find((r) => /^Input price/.test(r[0] || ""))?.at(-1);
  const output = rows.find((r) => /^Output price/.test(r[0] || ""))?.at(-1);
  const number = (s) => s?.match(/\$([\d.]+)/)?.[1];
  if (number(input) && number(output)) {
    m.input = +number(input);
    m.output = +number(output);
    m.priceSource = source + "#" + m.id;
    m.priceNote = `First published standard paid-tier band. Input: ${input}. Output: ${output}.`;
    m.verifiedAt = new Date().toISOString().slice(0, 10);
  }
}
fs.writeFileSync(file, JSON.stringify(models, null, 2) + "\n");
console.log(
  "Google prices",
  models.filter((m) => m.provider === "Google" && m.input !== null).length,
);
