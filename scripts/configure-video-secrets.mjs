import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--project' || !/^[a-z][a-z0-9-]{4,62}$/.test(args[1])) {
  console.error('Usage: npm run video:secrets -- --project YOUR_FIREBASE_PROJECT_ID');
  process.exit(1);
}
let values;
try { values = parseEnv(readFileSync(new URL('../functions/.secret.local', import.meta.url), 'utf8')); }
catch { console.error('Copy functions/.secret.local.example to functions/.secret.local and fill both keys.'); process.exit(1); }
const names = ['GEMINI_API_KEY', 'ELEVENLABS_API_KEY'];
for (const name of names) {
  if (!values[name] || values[name].length < 12 || /[\r\n]/.test(values[name]) || /^(replace|placeholder|your|<)/i.test(values[name])) {
    console.error(`${name} is blank or a placeholder. Fill functions/.secret.local first.`); process.exit(1);
  }
}
for (const name of names) {
  console.log(`Configuring ${name} in Firebase project ${args[1]} (value hidden).`);
  const child = spawnSync('firebase', ['functions:secrets:set', name, '--project', args[1], '--data-file', '-', '--non-interactive'], {
    input: values[name], stdio: ['pipe', 'inherit', 'inherit'], shell: false,
  });
  if (child.error || child.status !== 0) { console.error('Secret setup failed. Check firebase login --reauth and project permissions.'); process.exit(1); }
}
console.log('Both secrets are configured. Deploy the video functions using docs/VIDEO-SETUP.md.');
