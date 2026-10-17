import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const runner = fileURLToPath(new URL('../../scripts/run-minute-migration-once.mjs', import.meta.url));
test('one-time schedule never generates early, after expiry, or after a previous attempt', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'minute-schedule-test-'));
  const run = (time, mode) => spawnSync(process.execPath, [runner, dir, new Date(time).toISOString(), ...(mode ? [mode] : [])], {encoding:'utf8'});
  try {
    assert.equal(run(Date.now() + 3600000).status, 0);
    assert.equal(run(Date.now(), '--check').status, 0);
    assert.match(run(Date.now() - 86400000).stdout, /expired/);
    assert.deepEqual(await readdir(dir), []);
    await writeFile(join(dir, 'scheduled-attempt.json'), '{}');
    const duplicate = run(Date.now() - 1000);
    assert.equal(duplicate.status, 0);
    assert.match(duplicate.stdout, /already attempted/);
    assert.deepEqual(await readdir(dir), ['scheduled-attempt.json']);
  } finally { await rm(dir, {recursive:true,force:true}); }
});
