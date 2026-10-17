import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";
const source = new URL("../functions/", import.meta.url);
const target = new URL("../.firebase/video-functions/", import.meta.url);
await mkdir(new URL("src/", target), { recursive: true });
for (const name of [
  "video-index.js",
  "videos.js",
  "video-media.js",
  "video-policy.js",
  "guest-quota.js",
  "video-catalog.json",
]) {
  await copyFile(
    new URL(`src/${name}`, source),
    new URL(`src/${name}`, target),
  );
}
const pkg = JSON.parse(await readFile(new URL("package.json", source), "utf8"));
pkg.main = "src/video-index.js";
delete pkg.scripts;
await writeFile(new URL("package.json", target), JSON.stringify(pkg, null, 2));
await copyFile(
  new URL("package-lock.json", source),
  new URL("package-lock.json", target),
);
// Runtime settings only. Provider secrets remain in Secret Manager, never copied.
const env = parseEnv(await readFile(new URL(".env", source), "utf8"));
const settings = [
  "VIDEO_GENERATION_ENABLED",
  "VIDEO_OMNI_MODEL",
  "VIDEO_SCRIPT_MODEL",
  "VIDEO_VOICE_ID",
  "VIDEO_VOICE_MODEL",
  "VIDEO_DAILY_LIMIT",
];
await writeFile(
  new URL(".env", target),
  settings
    .filter((k) => env[k] !== undefined)
    .map((k) => `${k}=${JSON.stringify(env[k])}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);
const install = spawnSync(
  "npm",
  ["ci", "--omit=dev", "--no-audit", "--no-fund"],
  { cwd: target, stdio: "inherit" },
);
if (install.status !== 0) process.exit(install.status || 1);
