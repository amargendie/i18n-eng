import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRun } from '../lib/eval/index.mjs';
import { makeScenario, makeRun, tempDir, writeTree, rmSync } from './eval-helpers.mjs';

function setupEvidence(files) {
  const root = tempDir();
  writeTree(root, files);
  return root;
}

const multiCriteria = () =>
  makeScenario({
    criteria: [
      {
        id: 'CRIT',
        description: 'critical git',
        severity: 'critical',
        verificationMethod: 'git_diff',
      },
      {
        id: 'MAJOR',
        description: 'major trace',
        severity: 'major',
        verificationMethod: 'trace',
      },
      {
        id: 'MINOR',
        description: 'minor static',
        severity: 'minor',
        verificationMethod: 'static',
      },
    ],
  });

test('critical confirmed failure aggregates to FAIL', () => {
  const root = setupEvidence({
    'd.diff': 'diff --git a/x b/x\n+bad',
    'trace.json': '{}',
    'snap.txt': 's',
  });
  const outcome = evaluateRun(
    multiCriteria(),
    makeRun({
      results: [
        {
          criterionId: 'CRIT',
          status: 'fail',
          evidence: [{ kind: 'git_diff', path: 'd.diff' }],
        },
        {
          criterionId: 'MAJOR',
          status: 'pass',
          evidence: [{ kind: 'tool_trace', path: 'trace.json' }],
        },
        {
          criterionId: 'MINOR',
          status: 'pass',
          evidence: [{ kind: 'file_snapshot', path: 'snap.txt' }],
        },
      ],
    }),
    root,
  );
  assert.equal(outcome.outcome, 'FAIL');
  rmSync(root, { recursive: true, force: true });
});

test('critical not_run aggregates to INCONCLUSIVE', () => {
  const root = setupEvidence({
    'trace.json': '{}',
    'snap.txt': 's',
  });
  const outcome = evaluateRun(
    multiCriteria(),
    makeRun({
      results: [
        { criterionId: 'CRIT', status: 'not_run', evidence: [] },
        {
          criterionId: 'MAJOR',
          status: 'pass',
          evidence: [{ kind: 'tool_trace', path: 'trace.json' }],
        },
        {
          criterionId: 'MINOR',
          status: 'pass',
          evidence: [{ kind: 'file_snapshot', path: 'snap.txt' }],
        },
      ],
    }),
    root,
  );
  assert.equal(outcome.outcome, 'INCONCLUSIVE');
  rmSync(root, { recursive: true, force: true });
});

test('insufficient provenance for trace yields non-verified pass / INCONCLUSIVE when critical', () => {
  const root = setupEvidence({
    'claim.md': 'I read greenfield',
    'd.diff': '',
    'snap.txt': 's',
  });
  const scenario = makeScenario({
    criteria: [
      {
        id: 'T',
        description: 'needs trace',
        severity: 'critical',
        verificationMethod: 'trace',
      },
    ],
  });
  const outcome = evaluateRun(
    scenario,
    makeRun({
      results: [
        {
          criterionId: 'T',
          status: 'pass',
          evidence: [{ kind: 'agent_report', path: 'claim.md' }],
        },
      ],
    }),
    root,
  );
  assert.equal(outcome.outcome, 'INCONCLUSIVE');
  assert.ok(outcome.criteria[0].effectiveStatus === 'inconclusive');
  rmSync(root, { recursive: true, force: true });
});

test('insufficient provenance for git_diff and command', () => {
  const root = setupEvidence({
    'claim.md': 'no changes',
    'out.txt': 'ok',
  });
  const scenario = makeScenario({
    criteria: [
      {
        id: 'G',
        description: 'git',
        severity: 'critical',
        verificationMethod: 'git_diff',
      },
      {
        id: 'CMD',
        description: 'cmd',
        severity: 'major',
        verificationMethod: 'command',
      },
    ],
  });
  const outcome = evaluateRun(
    scenario,
    makeRun({
      results: [
        {
          criterionId: 'G',
          status: 'pass',
          evidence: [{ kind: 'agent_report', path: 'claim.md' }],
        },
        {
          criterionId: 'CMD',
          status: 'pass',
          evidence: [{ kind: 'agent_report', path: 'claim.md' }],
        },
      ],
    }),
    root,
  );
  assert.equal(outcome.outcome, 'INCONCLUSIVE');
  rmSync(root, { recursive: true, force: true });
});

test('all verified passes aggregate to PASS', () => {
  const root = setupEvidence({
    'd.diff': '',
    'trace.json': '{}',
    'snap.txt': 's',
  });
  const outcome = evaluateRun(
    multiCriteria(),
    makeRun({
      results: [
        {
          criterionId: 'CRIT',
          status: 'pass',
          evidence: [{ kind: 'git_diff', path: 'd.diff' }],
        },
        {
          criterionId: 'MAJOR',
          status: 'pass',
          evidence: [{ kind: 'tool_trace', path: 'trace.json' }],
        },
        {
          criterionId: 'MINOR',
          status: 'pass',
          evidence: [{ kind: 'file_snapshot', path: 'snap.txt' }],
        },
      ],
    }),
    root,
  );
  assert.equal(outcome.outcome, 'PASS');
  rmSync(root, { recursive: true, force: true });
});

test('minor failures produce PASS_WITH_LIMITATIONS when critical pass', () => {
  const root = setupEvidence({
    'd.diff': '',
    'trace.json': '{}',
    'snap.txt': 's',
  });
  const outcome = evaluateRun(
    multiCriteria(),
    makeRun({
      results: [
        {
          criterionId: 'CRIT',
          status: 'pass',
          evidence: [{ kind: 'git_diff', path: 'd.diff' }],
        },
        {
          criterionId: 'MAJOR',
          status: 'pass',
          evidence: [{ kind: 'tool_trace', path: 'trace.json' }],
        },
        {
          criterionId: 'MINOR',
          status: 'fail',
          evidence: [{ kind: 'file_snapshot', path: 'snap.txt' }],
          notes: 'cosmetic',
        },
      ],
    }),
    root,
  );
  assert.equal(outcome.outcome, 'PASS_WITH_LIMITATIONS');
  rmSync(root, { recursive: true, force: true });
});

test('invalid not_applicable without justification yields INVALID', () => {
  const root = setupEvidence({ 'd.diff': '' });
  const scenario = makeScenario({
    criteria: [
      {
        id: 'M',
        description: 'minor optional',
        severity: 'minor',
        verificationMethod: 'static',
        mandatory: false,
      },
    ],
  });
  const outcome = evaluateRun(
    scenario,
    makeRun({
      results: [{ criterionId: 'M', status: 'not_applicable', evidence: [] }],
    }),
    root,
  );
  assert.equal(outcome.outcome, 'INVALID');
  rmSync(root, { recursive: true, force: true });
});

test('mandatory not_applicable is INVALID even with justification', () => {
  const root = setupEvidence({ 'd.diff': '' });
  const scenario = makeScenario({
    criteria: [
      {
        id: 'C',
        description: 'critical',
        severity: 'critical',
        verificationMethod: 'git_diff',
      },
    ],
  });
  const outcome = evaluateRun(
    scenario,
    makeRun({
      results: [
        {
          criterionId: 'C',
          status: 'not_applicable',
          notApplicableJustification: 'skipped for convenience',
          evidence: [],
        },
      ],
    }),
    root,
  );
  assert.equal(outcome.outcome, 'INVALID');
  rmSync(root, { recursive: true, force: true });
});

test('aggregation is deterministic regardless of criterion ordering', () => {
  const root = setupEvidence({
    'd.diff': 'changed',
    'trace.json': '{}',
    'snap.txt': 's',
  });
  const criteriaA = [
    {
      id: 'Z-CRIT',
      description: 'c',
      severity: 'critical',
      verificationMethod: 'git_diff',
    },
    {
      id: 'A-MINOR',
      description: 'm',
      severity: 'minor',
      verificationMethod: 'static',
    },
  ];
  const criteriaB = [...criteriaA].reverse();
  const resultsA = [
    {
      criterionId: 'Z-CRIT',
      status: 'fail',
      evidence: [{ kind: 'git_diff', path: 'd.diff' }],
    },
    {
      criterionId: 'A-MINOR',
      status: 'pass',
      evidence: [{ kind: 'file_snapshot', path: 'snap.txt' }],
    },
  ];
  const resultsB = [...resultsA].reverse();
  const outA = evaluateRun(
    makeScenario({ id: 'ORD', criteria: criteriaA }),
    makeRun({ scenarioId: 'ORD', results: resultsA }),
    root,
  );
  const outB = evaluateRun(
    makeScenario({ id: 'ORD', criteria: criteriaB }),
    makeRun({ scenarioId: 'ORD', results: resultsB }),
    root,
  );
  assert.equal(outA.outcome, outB.outcome);
  assert.equal(outA.outcome, 'FAIL');
  assert.deepEqual(
    outA.criteria.map((c) => c.criterionId),
    outB.criteria.map((c) => c.criterionId),
  );
  rmSync(root, { recursive: true, force: true });
});

test('invalid scenario structure yields INVALID', () => {
  const root = setupEvidence({});
  const outcome = evaluateRun({ not: 'a scenario' }, makeRun(), root);
  assert.equal(outcome.outcome, 'INVALID');
  rmSync(root, { recursive: true, force: true });
});
