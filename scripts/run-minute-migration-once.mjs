// Local macOS launchd entry point. No tokens or API keys are saved here.
import { open, writeFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const [dir, scheduledAt, mode] = process.argv.slice(2);
const start = Date.parse(scheduledAt);
if (!dir || !path.isAbsolute(dir) || !Number.isFinite(start))
  throw Error('Provide an absolute artifact directory and ISO schedule time.');
await access(dir);
const date = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', dateStyle: 'full', timeStyle: 'long',
}).format(start);
console.log(`One-time migration scheduled: ${date}`);
// RunAtLoad is safe: before the scheduled time this only validates the setup.
// A delayed wake is allowed for 12 hours, never an annual or nightly rerun.
if (mode === '--check' || Date.now() < start) process.exit(0);
if (Date.now() > start + 12 * 3600000) {
  console.log('Schedule expired; no generation attempted.');
  process.exit(0);
}
let lock;
try { lock = await open(path.join(dir, 'scheduled-attempt.json'), 'wx', 0o600); }
catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('This one-time job was already attempted; no automatic paid retry.');
  process.exit(0);
}
await lock.writeFile(JSON.stringify({ scheduledAt, startedAt: new Date().toISOString() }));
await lock.close();
const script = fileURLToPath(new URL('./regenerate-minute-videos.mjs', import.meta.url));
async function run(phase) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, phase, dir], {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      stdio: 'inherit',
      env: { ...process.env, MINUTE_TOPIC_IDS: '' },
      timeout: 2 * 3600000,
    });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(Error(`${phase} failed; no automatic paid retry.`)));
  });
}
try {
  await run('prepare');
  await run('validate');
  await run('publish');
  await writeFile(path.join(dir, 'scheduled-result.json'), JSON.stringify({ status: 'published', finishedAt: new Date().toISOString() }), { mode: 0o600 });
  console.log('SUCCESS: All four one-minute videos are published.');
} catch (error) {
  await writeFile(path.join(dir, 'scheduled-result.json'), JSON.stringify({ status: 'failed', error: error.message, finishedAt: new Date().toISOString() }), { mode: 0o600 });
  console.error(error.message);
  process.exitCode = 1;
}
