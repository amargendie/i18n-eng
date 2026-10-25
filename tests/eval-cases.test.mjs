import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateCase,
  validateSkillStructure,
  SCENARIO_SCHEMA_VERSION,
} from '../lib/eval/index.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function makeMinimalCase(overrides = {}) {
  return {
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    id: overrides.id ?? 'TMP-001',
    title: 'Temporary case',
    mode: 'behavioral',
    expectedWorkflow: overrides.expectedWorkflow ?? 'greenfield',
    promptPath: overrides.promptPath ?? 'tests/prompts/missing.md',
    fixturePath: overrides.fixturePath ?? 'tests/fixtures/missing',
    criteria: overrides.criteria ?? [
      {
        id: 'TMP-001.C1',
        description: 'readonly',
        severity: 'critical',
        verificationMethod: 'git_diff',
      },
    ],
    ...overrides,
  };
}

test('packaged G3 cases validate against schema and packaging refs', () => {
  for (const id of ['GF-001', 'AU-001', 'MI-001', 'MA-001', 'NEG-001']) {
    const raw = JSON.parse(
      readFileSync(join(packageRoot, 'tests/cases', `${id}.json`), 'utf8'),
    );
    const result = validateCase(raw, { packageRoot, path: `tests/cases/${id}.json` });
    assert.equal(result.ok, true, result.errors.map((e) => e.message).join('\n'));
  }
});

test('missing prompt path fails case validation', () => {
  const root = mkdtempSync(join(tmpdir(), 'eh-case-'));
  mkdirSync(join(root, 'tests/fixtures/x'), { recursive: true });
  writeFileSync(join(root, 'keep.txt'), 'x');
  const result = validateCase(
    makeMinimalCase({
      promptPath: 'tests/prompts/does-not-exist.md',
      fixturePath: 'tests/fixtures/x',
    }),
    { packageRoot: root },
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'CASE_MISSING'));
  rmSync(root, { recursive: true, force: true });
});

test('missing fixture directory fails case validation', () => {
  const root = mkdtempSync(join(tmpdir(), 'eh-case-'));
  mkdirSync(join(root, 'tests/prompts'), { recursive: true });
  writeFileSync(join(root, 'tests/prompts/p.md'), 'hello');
  const result = validateCase(
    makeMinimalCase({
      promptPath: 'tests/prompts/p.md',
      fixturePath: 'tests/fixtures/absent',
    }),
    { packageRoot: root },
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'CASE_MISSING'));
  rmSync(root, { recursive: true, force: true });
});

test('empty prompt file fails case validation', () => {
  const root = mkdtempSync(join(tmpdir(), 'eh-case-'));
  mkdirSync(join(root, 'tests/prompts'), { recursive: true });
  mkdirSync(join(root, 'tests/fixtures/x'), { recursive: true });
  writeFileSync(join(root, 'tests/prompts/empty.md'), '   \n');
  const result = validateCase(
    makeMinimalCase({
      promptPath: 'tests/prompts/empty.md',
      fixturePath: 'tests/fixtures/x',
    }),
    { packageRoot: root },
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'CASE_PROMPT_EMPTY'));
  rmSync(root, { recursive: true, force: true });
});

test('path escape in promptPath is rejected', () => {
  const root = mkdtempSync(join(tmpdir(), 'eh-case-'));
  mkdirSync(join(root, 'tests/fixtures/x'), { recursive: true });
  const result = validateCase(
    makeMinimalCase({
      promptPath: '../outside.md',
      fixturePath: 'tests/fixtures/x',
    }),
    { packageRoot: root },
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'CASE_ESCAPE'));
  rmSync(root, { recursive: true, force: true });
});

test('unsupported expectedWorkflow is rejected', () => {
  const result = validateCase(
    makeMinimalCase({ expectedWorkflow: 'translation-service' }),
    { skipFs: true },
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'CASE_WORKFLOW'));
});

test('structural validation includes G3 cases and still passes', () => {
  const result = validateSkillStructure(packageRoot);
  assert.equal(result.ok, true, result.errors.map((e) => e.message).join('\n'));
});

test('broken case reference is reported by structural validation', () => {
  const root = mkdtempSync(join(tmpdir(), 'eh-struct-'));
  // Minimal skill skeleton
  for (const rel of [
    'SKILL.md',
    'references/principles.md',
    'references/greenfield.md',
    'references/audit.md',
    'references/migration.md',
    'references/maintenance.md',
    'bin/install.mjs',
  ]) {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    if (rel === 'SKILL.md') {
      writeFileSync(
        join(root, rel),
        `---\nname: i18n-eng\ndescription: >-\n  test\n---\n\nSee [references/principles.md](references/principles.md) [references/greenfield.md](references/greenfield.md) [references/audit.md](references/audit.md) [references/migration.md](references/migration.md) [references/maintenance.md](references/maintenance.md)\n`,
      );
    } else {
      writeFileSync(join(root, rel), `# ${rel}\n`);
    }
  }
  mkdirSync(join(root, 'tests/cases'), { recursive: true });
  writeFileSync(
    join(root, 'tests/cases/BAD.json'),
    JSON.stringify(
      makeMinimalCase({
        id: 'BAD',
        promptPath: 'tests/prompts/nope.md',
        fixturePath: 'tests/fixtures/nope',
      }),
      null,
      2,
    ),
  );
  const result = validateSkillStructure(root);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'CASE_MISSING'));
  rmSync(root, { recursive: true, force: true });
});
