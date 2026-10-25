import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { validateSkillStructure } from '../lib/eval/index.mjs';
import {
  cloneSkillSkeleton,
  writeTree,
  rmSync,
  join,
  tempDir,
} from './eval-helpers.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function hashTree(root, rels) {
  const h = createHash('sha256');
  for (const rel of rels) {
    h.update(rel);
    h.update(readFileSync(join(root, rel)));
  }
  return h.digest('hex');
}

const TRACKED = [
  'SKILL.md',
  'references/principles.md',
  'references/greenfield.md',
  'references/audit.md',
  'references/migration.md',
  'references/maintenance.md',
  'bin/install.mjs',
];

test('real package structural validation passes', () => {
  const result = validateSkillStructure(packageRoot);
  assert.equal(result.ok, true, result.errors.map((e) => e.message).join('\n'));
});

test('broken skill reference is reported', () => {
  const root = cloneSkillSkeleton(packageRoot);
  const skillPath = join(root, 'SKILL.md');
  const skill = readFileSync(skillPath, 'utf8');
  writeFileSync(
    skillPath,
    skill + '\n\nSee also [missing](references/does-not-exist.md).\n',
  );
  const result = validateSkillStructure(root);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'BROKEN_REF'));
  rmSync(root, { recursive: true, force: true });
});

test('invalid scenario file under eval/scenarios is reported', () => {
  const root = cloneSkillSkeleton(packageRoot);
  writeTree(root, {
    'eval/scenarios/bad.json': JSON.stringify({
      schemaVersion: 'eh.scenario.v1',
      id: 'BAD',
      title: 'Bad',
      mode: 'behavioral',
      criteria: [
        {
          id: 'X',
          description: 'x',
          severity: 'critical',
          verificationMethod: 'nope',
        },
      ],
    }),
  });
  const result = validateSkillStructure(root);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'SCHEMA_ENUM'));
  rmSync(root, { recursive: true, force: true });
});

test('duplicate scenario ids across files are reported', () => {
  const root = cloneSkillSkeleton(packageRoot);
  const scenario = {
    schemaVersion: 'eh.scenario.v1',
    id: 'SAME',
    title: 'One',
    mode: 'structural',
    criteria: [
      {
        id: 'C1',
        description: 'c',
        severity: 'minor',
        verificationMethod: 'static',
      },
    ],
  };
  writeTree(root, {
    'eval/scenarios/a.json': JSON.stringify(scenario),
    'eval/scenarios/b.json': JSON.stringify({ ...scenario, title: 'Two' }),
  });
  const result = validateSkillStructure(root);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'DUPLICATE_ID'));
  rmSync(root, { recursive: true, force: true });
});

test('structural validation is read-only (does not modify package files)', () => {
  const before = hashTree(packageRoot, TRACKED);
  const mtimes = Object.fromEntries(
    TRACKED.map((rel) => [rel, statSync(join(packageRoot, rel)).mtimeMs]),
  );
  const result = validateSkillStructure(packageRoot);
  assert.equal(result.ok, true);
  const after = hashTree(packageRoot, TRACKED);
  assert.equal(before, after);
  for (const rel of TRACKED) {
    assert.equal(statSync(join(packageRoot, rel)).mtimeMs, mtimes[rel]);
  }
});

test('missing installer entrypoint fails structural validation', () => {
  const root = cloneSkillSkeleton(packageRoot);
  rmSync(join(root, 'bin/install.mjs'), { force: true });
  const result = validateSkillStructure(root);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'MISSING_FILE'));
  rmSync(root, { recursive: true, force: true });
});

test('temp dir without skill files fails cleanly', () => {
  const root = tempDir();
  const result = validateSkillStructure(root);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'MISSING_FILE'));
  rmSync(root, { recursive: true, force: true });
});
