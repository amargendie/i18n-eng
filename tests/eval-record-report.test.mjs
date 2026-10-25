import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  symlinkSync,
  readdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  BUNDLE_SCHEMA_VERSION,
  recordExecution,
  reportExecution,
  createTempRunsRoot,
} from '../lib/eval/index.mjs';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evalBin = join(packageRoot, 'bin/eval.mjs');

function writeBundle(dir, bundle, files = {}) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'bundle.json'), JSON.stringify(bundle, null, 2));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
}

function baseBundle(overrides = {}) {
  return {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    runId: overrides.runId ?? `run-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    caseId: 'NEG-001',
    skillVersion: '0.2.3',
    agent: { product: 'cursor', model: 'unknown' },
    executedAt: '2026-10-24T12:00:00Z',
    fixtureRevision: 'synth-neg-001@fixture',
    limitations: ['Synthetic test bundle'],
    results: overrides.results,
    ...overrides,
  };
}

test('A. insufficient evidence → critical inconclusive / global INCONCLUSIVE', async () => {
  const runsRoot = createTempRunsRoot();
  const bundleDir = mkdtempSync(join(tmpdir(), 'eh-bundle-'));
  const runId = 'run-insuff-1';
  writeBundle(
    bundleDir,
    baseBundle({
      runId,
      results: [
        {
          criterionId: 'NEG-001.NO_SKILL_TRACE',
          status: 'pass',
          evidence: [{ kind: 'agent_report', path: 'evidence/claim.md' }],
        },
        {
          criterionId: 'NEG-001.NO_I18N_SCOPE_CREEP',
          status: 'pass',
          evidence: [{ kind: 'human_attestation', path: 'evidence/attest.md' }],
        },
        {
          criterionId: 'NEG-001.READONLY',
          status: 'pass',
          evidence: [{ kind: 'git_diff', path: 'evidence/tree.diff' }],
        },
      ],
    }),
    {
      'evidence/claim.md': 'I did not load the skill',
      'evidence/attest.md': 'Human reviewed response scope',
      'evidence/tree.diff': '',
    },
  );
  const rec = await recordExecution({
    packageRoot,
    caseId: 'NEG-001',
    bundleDir,
    runsRoot,
  });
  assert.equal(rec.ok, true, rec.diagnosticsText);
  assert.equal(rec.outcome, 'INCONCLUSIVE');
  const rep = await reportExecution({ packageRoot, runId, runsRoot });
  assert.equal(rep.ok, true, rep.diagnosticsText);
  assert.equal(rep.outcome, 'INCONCLUSIVE');
  assert.match(rep.text, /not verified|limitation|agent_report/i);
  rmSync(runsRoot, { recursive: true, force: true });
  rmSync(bundleDir, { recursive: true, force: true });
});

test('B. complete evidence → PASS and stable report', async () => {
  const runsRoot = createTempRunsRoot();
  const bundleDir = mkdtempSync(join(tmpdir(), 'eh-bundle-'));
  const runId = 'run-pass-1';
  writeBundle(
    bundleDir,
    baseBundle({
      runId,
      results: [
        {
          criterionId: 'NEG-001.NO_SKILL_TRACE',
          status: 'pass',
          evidence: [{ kind: 'tool_trace', path: 'evidence/trace.json' }],
        },
        {
          criterionId: 'NEG-001.NO_I18N_SCOPE_CREEP',
          status: 'pass',
          evidence: [{ kind: 'human_attestation', path: 'evidence/attest.md' }],
        },
        {
          criterionId: 'NEG-001.READONLY',
          status: 'pass',
          evidence: [{ kind: 'git_diff', path: 'evidence/tree.diff' }],
        },
      ],
    }),
    {
      'evidence/trace.json': '{"reads":[]}',
      'evidence/attest.md': 'Scope OK',
      'evidence/tree.diff': '',
    },
  );
  const rec = await recordExecution({
    packageRoot,
    caseId: 'NEG-001',
    bundleDir,
    runsRoot,
  });
  assert.equal(rec.ok, true, rec.diagnosticsText);
  assert.equal(rec.outcome, 'PASS');
  const rep1 = await reportExecution({ packageRoot, runId, runsRoot });
  const rep2 = await reportExecution({ packageRoot, runId, runsRoot, json: true });
  assert.equal(rep1.ok, true);
  assert.equal(rep1.outcome, 'PASS');
  assert.equal(rep2.outcome, 'PASS');
  assert.equal(rep1.report.outcome, rep2.report.outcome);
  assert.deepEqual(
    rep1.report.criteria.map((c) => c.criterionId),
    rep2.report.criteria.map((c) => c.criterionId),
  );
  rmSync(runsRoot, { recursive: true, force: true });
  rmSync(bundleDir, { recursive: true, force: true });
});

test('C. confirmed critical failure → FAIL', async () => {
  const runsRoot = createTempRunsRoot();
  const bundleDir = mkdtempSync(join(tmpdir(), 'eh-bundle-'));
  const runId = 'run-fail-1';
  writeBundle(
    bundleDir,
    baseBundle({
      runId,
      results: [
        {
          criterionId: 'NEG-001.NO_SKILL_TRACE',
          status: 'pass',
          evidence: [{ kind: 'tool_trace', path: 'evidence/trace.json' }],
        },
        {
          criterionId: 'NEG-001.NO_I18N_SCOPE_CREEP',
          status: 'pass',
          evidence: [{ kind: 'human_attestation', path: 'evidence/attest.md' }],
        },
        {
          criterionId: 'NEG-001.READONLY',
          status: 'fail',
          evidence: [{ kind: 'git_diff', path: 'evidence/tree.diff' }],
          notes: 'Files were modified',
        },
      ],
    }),
    {
      'evidence/trace.json': '{"reads":[]}',
      'evidence/attest.md': 'ok',
      'evidence/tree.diff': 'diff --git a/x b/x\n+changed',
    },
  );
  const rec = await recordExecution({
    packageRoot,
    caseId: 'NEG-001',
    bundleDir,
    runsRoot,
  });
  assert.equal(rec.ok, true, rec.diagnosticsText);
  assert.equal(rec.outcome, 'FAIL');
  const rep = await reportExecution({ packageRoot, runId, runsRoot });
  assert.equal(rep.outcome, 'FAIL');
  rmSync(runsRoot, { recursive: true, force: true });
  rmSync(bundleDir, { recursive: true, force: true });
});

test('D. tampered evidence → integrity failure, no stale PASS', async () => {
  const runsRoot = createTempRunsRoot();
  const bundleDir = mkdtempSync(join(tmpdir(), 'eh-bundle-'));
  const runId = 'run-tamper-1';
  writeBundle(
    bundleDir,
    baseBundle({
      runId,
      results: [
        {
          criterionId: 'NEG-001.NO_SKILL_TRACE',
          status: 'pass',
          evidence: [{ kind: 'tool_trace', path: 'evidence/trace.json' }],
        },
        {
          criterionId: 'NEG-001.NO_I18N_SCOPE_CREEP',
          status: 'pass',
          evidence: [{ kind: 'human_attestation', path: 'evidence/attest.md' }],
        },
        {
          criterionId: 'NEG-001.READONLY',
          status: 'pass',
          evidence: [{ kind: 'git_diff', path: 'evidence/tree.diff' }],
        },
      ],
    }),
    {
      'evidence/trace.json': '{"reads":[]}',
      'evidence/attest.md': 'ok',
      'evidence/tree.diff': '',
    },
  );
  const rec = await recordExecution({
    packageRoot,
    caseId: 'NEG-001',
    bundleDir,
    runsRoot,
  });
  assert.equal(rec.outcome, 'PASS');
  writeFileSync(join(runsRoot, runId, 'evidence/trace.json'), '{"tampered":true}');
  const rep = await reportExecution({ packageRoot, runId, runsRoot });
  assert.equal(rep.ok, false);
  assert.equal(rep.outcome, 'INTEGRITY_FAILURE');
  assert.ok(!rep.text.includes('\nOutcome: PASS\n'));
  assert.match(rep.text, /INTEGRITY FAILURE/);
  rmSync(runsRoot, { recursive: true, force: true });
  rmSync(bundleDir, { recursive: true, force: true });
});

test('E. duplicate run ID rejected without modifying original', async () => {
  const runsRoot = createTempRunsRoot();
  const bundleDir = mkdtempSync(join(tmpdir(), 'eh-bundle-'));
  const runId = 'run-dup-1';
  const files = {
    'evidence/trace.json': '{"reads":[]}',
    'evidence/attest.md': 'ok',
    'evidence/tree.diff': '',
  };
  const results = [
    {
      criterionId: 'NEG-001.NO_SKILL_TRACE',
      status: 'pass',
      evidence: [{ kind: 'tool_trace', path: 'evidence/trace.json' }],
    },
    {
      criterionId: 'NEG-001.NO_I18N_SCOPE_CREEP',
      status: 'pass',
      evidence: [{ kind: 'human_attestation', path: 'evidence/attest.md' }],
    },
    {
      criterionId: 'NEG-001.READONLY',
      status: 'pass',
      evidence: [{ kind: 'git_diff', path: 'evidence/tree.diff' }],
    },
  ];
  writeBundle(bundleDir, baseBundle({ runId, results }), files);
  const first = await recordExecution({
    packageRoot,
    caseId: 'NEG-001',
    bundleDir,
    runsRoot,
  });
  assert.equal(first.ok, true);
  const before = readFileSync(join(runsRoot, runId, 'manifest.json'), 'utf8');
  const second = await recordExecution({
    packageRoot,
    caseId: 'NEG-001',
    bundleDir,
    runsRoot,
  });
  assert.equal(second.ok, false);
  assert.ok(second.errors.some((e) => e.code === 'RUN_EXISTS'));
  assert.equal(readFileSync(join(runsRoot, runId, 'manifest.json'), 'utf8'), before);
  rmSync(runsRoot, { recursive: true, force: true });
  rmSync(bundleDir, { recursive: true, force: true });
});

test('F. invalid paths (absolute, traversal, symlink escape, collision) rejected', async () => {
  const runsRoot = createTempRunsRoot();

  // Absolute path
  {
    const bundleDir = mkdtempSync(join(tmpdir(), 'eh-bundle-'));
    writeFileSync(join(bundleDir, 'abs.txt'), 'x');
    writeBundle(
      bundleDir,
      baseBundle({
        runId: 'run-abs',
        results: [
          {
            criterionId: 'NEG-001.READONLY',
            status: 'pass',
            evidence: [{ kind: 'git_diff', path: join(bundleDir, 'abs.txt') }],
          },
          {
            criterionId: 'NEG-001.NO_SKILL_TRACE',
            status: 'not_run',
            evidence: [],
          },
          {
            criterionId: 'NEG-001.NO_I18N_SCOPE_CREEP',
            status: 'not_run',
            evidence: [],
          },
        ],
      }),
    );
    const rec = await recordExecution({
      packageRoot,
      caseId: 'NEG-001',
      bundleDir,
      runsRoot,
    });
    assert.equal(rec.ok, false);
    assert.ok(rec.errors.some((e) => e.code === 'EVIDENCE_ESCAPE'));
    rmSync(bundleDir, { recursive: true, force: true });
  }

  // Traversal
  {
    const bundleDir = mkdtempSync(join(tmpdir(), 'eh-bundle-'));
    writeBundle(
      bundleDir,
      baseBundle({
        runId: 'run-trav',
        results: [
          {
            criterionId: 'NEG-001.READONLY',
            status: 'pass',
            evidence: [{ kind: 'git_diff', path: '../secret.diff' }],
          },
          {
            criterionId: 'NEG-001.NO_SKILL_TRACE',
            status: 'not_run',
            evidence: [],
          },
          {
            criterionId: 'NEG-001.NO_I18N_SCOPE_CREEP',
            status: 'not_run',
            evidence: [],
          },
        ],
      }),
    );
    const rec = await recordExecution({
      packageRoot,
      caseId: 'NEG-001',
      bundleDir,
      runsRoot,
    });
    assert.equal(rec.ok, false);
    assert.ok(rec.errors.some((e) => e.code === 'EVIDENCE_ESCAPE'));
    rmSync(bundleDir, { recursive: true, force: true });
  }

  // Symlink escape
  {
    const outside = mkdtempSync(join(tmpdir(), 'eh-out-'));
    writeFileSync(join(outside, 'secret.txt'), 'secret');
    const bundleDir = mkdtempSync(join(tmpdir(), 'eh-bundle-'));
    mkdirSync(join(bundleDir, 'evidence'), { recursive: true });
    symlinkSync(join(outside, 'secret.txt'), join(bundleDir, 'evidence/link.txt'));
    writeBundle(
      bundleDir,
      baseBundle({
        runId: 'run-symlink',
        results: [
          {
            criterionId: 'NEG-001.READONLY',
            status: 'pass',
            evidence: [{ kind: 'git_diff', path: 'evidence/link.txt' }],
          },
          {
            criterionId: 'NEG-001.NO_SKILL_TRACE',
            status: 'not_run',
            evidence: [],
          },
          {
            criterionId: 'NEG-001.NO_I18N_SCOPE_CREEP',
            status: 'not_run',
            evidence: [],
          },
        ],
      }),
    );
    const rec = await recordExecution({
      packageRoot,
      caseId: 'NEG-001',
      bundleDir,
      runsRoot,
    });
    assert.equal(rec.ok, false);
    assert.ok(rec.errors.some((e) => e.code === 'EVIDENCE_ESCAPE'));
    rmSync(bundleDir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }

  // Destination collision with different content
  {
    const bundleDir = mkdtempSync(join(tmpdir(), 'eh-bundle-'));
    writeBundle(
      bundleDir,
      baseBundle({
        runId: 'run-collide',
        results: [
          {
            criterionId: 'NEG-001.READONLY',
            status: 'fail',
            evidence: [
              { kind: 'git_diff', path: 'a.diff' },
              { kind: 'file_snapshot', path: 'evidence/a.diff' },
            ],
          },
          {
            criterionId: 'NEG-001.NO_SKILL_TRACE',
            status: 'not_run',
            evidence: [],
          },
          {
            criterionId: 'NEG-001.NO_I18N_SCOPE_CREEP',
            status: 'not_run',
            evidence: [],
          },
        ],
      }),
      {
        'a.diff': 'one',
        'evidence/a.diff': 'two',
      },
    );
    // Both normalize to evidence/a.diff — conflict if content differs
    const rec = await recordExecution({
      packageRoot,
      caseId: 'NEG-001',
      bundleDir,
      runsRoot,
    });
    // May fail at stage with collision OR succeed if validate runs first - stage collects unique by kind::path so both refs are staged. normalizeEvidenceDest('a.diff') -> evidence/a.diff and evidence/a.diff -> evidence/a.diff with different hashes -> COLLISION
    assert.equal(rec.ok, false);
    assert.ok(
      rec.errors.some((e) => e.code === 'EVIDENCE_COLLISION' || e.code === 'RECORD_FAILED'),
      rec.diagnosticsText,
    );
    rmSync(bundleDir, { recursive: true, force: true });
  }

  assert.equal(existsSync(runsRoot) ? readdirSync(runsRoot).filter((n) => !n.startsWith('.')).length : 0, 0);
  rmSync(runsRoot, { recursive: true, force: true });
});

test('G. partial recording failure leaves no published run', async () => {
  const runsRoot = createTempRunsRoot();
  const bundleDir = mkdtempSync(join(tmpdir(), 'eh-bundle-'));
  const runId = 'run-partial-1';
  writeBundle(
    bundleDir,
    baseBundle({
      runId,
      results: [
        {
          criterionId: 'NEG-001.NO_SKILL_TRACE',
          status: 'pass',
          evidence: [{ kind: 'tool_trace', path: 'evidence/trace.json' }],
        },
        {
          criterionId: 'NEG-001.NO_I18N_SCOPE_CREEP',
          status: 'pass',
          evidence: [{ kind: 'human_attestation', path: 'evidence/attest.md' }],
        },
        {
          criterionId: 'NEG-001.READONLY',
          status: 'pass',
          evidence: [{ kind: 'git_diff', path: 'evidence/tree.diff' }],
        },
      ],
    }),
    {
      'evidence/trace.json': '{}',
      'evidence/attest.md': 'ok',
      'evidence/tree.diff': '',
    },
  );
  const rec = await recordExecution({
    packageRoot,
    caseId: 'NEG-001',
    bundleDir,
    runsRoot,
    hooks: {
      failBeforePublish: () => {
        throw new Error('simulated staging failure');
      },
    },
  });
  assert.equal(rec.ok, false);
  assert.equal(existsSync(join(runsRoot, runId)), false);
  const leftovers = readdirSync(runsRoot).filter((n) => n.startsWith('.staging-'));
  assert.equal(leftovers.length, 0);
  rmSync(runsRoot, { recursive: true, force: true });
  rmSync(bundleDir, { recursive: true, force: true });
});

test('CLI record + report end-to-end', async () => {
  const runsRoot = createTempRunsRoot();
  const bundleDir = mkdtempSync(join(tmpdir(), 'eh-bundle-'));
  const runId = 'run-cli-1';
  writeBundle(
    bundleDir,
    baseBundle({
      runId,
      results: [
        {
          criterionId: 'NEG-001.NO_SKILL_TRACE',
          status: 'pass',
          evidence: [{ kind: 'tool_trace', path: 'evidence/trace.json' }],
        },
        {
          criterionId: 'NEG-001.NO_I18N_SCOPE_CREEP',
          status: 'pass',
          evidence: [{ kind: 'human_attestation', path: 'evidence/attest.md' }],
        },
        {
          criterionId: 'NEG-001.READONLY',
          status: 'pass',
          evidence: [{ kind: 'git_diff', path: 'evidence/tree.diff' }],
        },
      ],
    }),
    {
      'evidence/trace.json': '{}',
      'evidence/attest.md': 'ok',
      'evidence/tree.diff': '',
    },
  );
  const rec = spawnSync(
    process.execPath,
    [
      evalBin,
      'record',
      '--case',
      'NEG-001',
      '--input',
      bundleDir,
      '--runs-dir',
      runsRoot,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(rec.status, 0, rec.stderr + rec.stdout);
  assert.match(rec.stdout, /Recorded run/);
  const rep = spawnSync(
    process.execPath,
    [evalBin, 'report', '--run', runId, '--runs-dir', runsRoot, '--json'],
    { encoding: 'utf8' },
  );
  assert.equal(rep.status, 0, rep.stderr + rep.stdout);
  const json = JSON.parse(rep.stdout);
  assert.equal(json.outcome, 'PASS');
  rmSync(runsRoot, { recursive: true, force: true });
  rmSync(bundleDir, { recursive: true, force: true });
});
