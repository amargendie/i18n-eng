import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateScenario,
  findDuplicateScenarioIds,
  validateRun,
  SCENARIO_SCHEMA_VERSION,
} from '../lib/eval/index.mjs';
import { makeScenario, makeRun } from './eval-helpers.mjs';

test('valid scenario schema is accepted', () => {
  const result = validateScenario(makeScenario());
  assert.equal(result.ok, true);
  assert.equal(result.scenario?.id, 'SCN-1');
  assert.equal(result.scenario?.criteria[0].mandatory, true);
});

test('invalid scenario schema is rejected', () => {
  const bad = makeScenario({ mode: 'nope' });
  const result = validateScenario(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'SCHEMA_ENUM'));
});

test('wrong scenario schemaVersion is rejected', () => {
  const bad = { ...makeScenario(), schemaVersion: 'eh.scenario.v0' };
  const result = validateScenario(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'SCHEMA_VERSION'));
});

test('duplicate criterion ids are rejected', () => {
  const result = validateScenario(
    makeScenario({
      criteria: [
        {
          id: 'DUP',
          description: 'a',
          severity: 'minor',
          verificationMethod: 'static',
        },
        {
          id: 'DUP',
          description: 'b',
          severity: 'minor',
          verificationMethod: 'static',
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'DUPLICATE_ID'));
});

test('duplicate scenario ids across list are detected', () => {
  const a = validateScenario(makeScenario({ id: 'X' })).scenario;
  const b = validateScenario(makeScenario({ id: 'X', title: 'Other' })).scenario;
  assert.ok(a && b);
  const errs = findDuplicateScenarioIds([a, b]);
  assert.ok(errs.some((e) => e.code === 'DUPLICATE_ID'));
});

test('valid run schema is accepted (shape-only)', () => {
  const scenario = validateScenario(makeScenario()).scenario;
  const run = makeRun({
    results: [
      {
        criterionId: 'C-CRIT',
        status: 'not_run',
        evidence: [],
      },
    ],
  });
  const result = validateRun(run, { scenario, skipEvidenceFs: true });
  assert.equal(result.ok, true);
});

test('run with unknown status is rejected', () => {
  const result = validateRun(
    makeRun({
      results: [{ criterionId: 'C-CRIT', status: 'maybe', evidence: [] }],
    }),
    { skipEvidenceFs: true },
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'SCHEMA_ENUM'));
});

test('scenario schemaVersion constant is stable', () => {
  assert.equal(SCENARIO_SCHEMA_VERSION, 'eh.scenario.v1');
});
