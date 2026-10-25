import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, openSync, writeSync, closeSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  MAX_EVIDENCE_FILE_BYTES,
  checkEvidenceFileSizeFromStat,
  resolveEvidencePath,
  recordExecution,
  BUNDLE_SCHEMA_VERSION,
  createTempRunsRoot,
} from '../lib/eval/index.mjs';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('MAX_EVIDENCE_FILE_BYTES is 10 MiB', () => {
  assert.equal(MAX_EVIDENCE_FILE_BYTES, 10 * 1024 * 1024);
});

test('size boundary: exactly max bytes is accepted by stat check', () => {
  const ok = checkEvidenceFileSizeFromStat(MAX_EVIDENCE_FILE_BYTES, 'p');
  assert.equal(ok.ok, true);
});

test('size boundary: max+1 bytes is rejected by stat check', () => {
  const bad = checkEvidenceFileSizeFromStat(MAX_EVIDENCE_FILE_BYTES + 1, 'p', 'big.bin');
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => e.code === 'EVIDENCE_TOO_LARGE'));
});

test('resolveEvidencePath rejects oversized file without treating it as valid evidence', () => {
  const root = mkdtempSync(join(tmpdir(), 'eh-size-'));
  const path = join(root, 'big.bin');
  // Create a sparse-ish file by seeking: write one byte at offset max
  const fd = openSync(path, 'w');
  writeSync(fd, Buffer.from([1]), 0, 1, MAX_EVIDENCE_FILE_BYTES); // size becomes max+1
  closeSync(fd);
  const result = resolveEvidencePath('big.bin', root);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'EVIDENCE_TOO_LARGE'));
  rmSync(root, { recursive: true, force: true });
});

test('record rejects oversized evidence and does not publish a run', async () => {
  const runsRoot = createTempRunsRoot();
  const bundleDir = mkdtempSync(join(tmpdir(), 'eh-bundle-'));
  mkdirSync(join(bundleDir, 'evidence'), { recursive: true });
  const big = join(bundleDir, 'evidence/too-big.bin');
  const fd = openSync(big, 'w');
  writeSync(fd, Buffer.from([1]), 0, 1, MAX_EVIDENCE_FILE_BYTES);
  closeSync(fd);
  writeFileSync(
    join(bundleDir, 'bundle.json'),
    JSON.stringify({
      schemaVersion: BUNDLE_SCHEMA_VERSION,
      runId: 'run-too-big',
      caseId: 'NEG-001',
      skillVersion: '0.3.0',
      agent: { product: 'synthetic', model: 'unknown' },
      executedAt: '2026-10-24T00:00:00Z',
      fixtureRevision: 'g5b',
      results: [
        {
          criterionId: 'NEG-001.READONLY',
          status: 'pass',
          evidence: [{ kind: 'file_snapshot', path: 'evidence/too-big.bin' }],
        },
        { criterionId: 'NEG-001.NO_SKILL_TRACE', status: 'not_run', evidence: [] },
        { criterionId: 'NEG-001.NO_I18N_SCOPE_CREEP', status: 'not_run', evidence: [] },
      ],
    }),
  );
  const rec = await recordExecution({
    packageRoot,
    caseId: 'NEG-001',
    bundleDir,
    runsRoot,
  });
  assert.equal(rec.ok, false, rec.diagnosticsText);
  assert.ok(rec.errors.some((e) => e.code === 'EVIDENCE_TOO_LARGE'));
  assert.equal(
    (await import('node:fs')).existsSync(join(runsRoot, 'run-too-big')),
    false,
  );
  rmSync(runsRoot, { recursive: true, force: true });
  rmSync(bundleDir, { recursive: true, force: true });
});
