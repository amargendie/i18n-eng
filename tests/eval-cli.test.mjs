import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evalBin = join(packageRoot, 'bin/eval.mjs');

function runEval(args, cwd = packageRoot) {
  return spawnSync(process.execPath, [evalBin, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

test('eval --help exits 0 and documents validate/record/report', () => {
  const r = runEval(['--help']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /validate/);
  assert.match(r.stdout, /record/);
  assert.match(r.stdout, /report/);
});

test('eval validate passes on this package', () => {
  const r = runEval(['validate']);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /PASSED/);
});

test('eval validate fails with nonzero exit on empty root', () => {
  const empty = mkdtempSync(join(tmpdir(), 'eh-empty-'));
  const r = runEval(['validate', '--root', empty]);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stderr, /FAILED/);
  rmSync(empty, { recursive: true, force: true });
});

test('eval record without required flags is a usage error', () => {
  const r = runEval(['record']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--case|--input/i);
});

test('eval report without --run is a usage error', () => {
  const r = runEval(['report']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--run/i);
});

test('npm run eval:structural works', () => {
  const r = spawnSync('npm', ['run', 'eval:structural'], {
    cwd: packageRoot,
    encoding: 'utf8',
    shell: false,
  });
  assert.equal(r.status, 0, r.stderr + r.stdout);
});
