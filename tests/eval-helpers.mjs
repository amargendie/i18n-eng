import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  symlinkSync,
  cpSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  SCENARIO_SCHEMA_VERSION,
  RUN_SCHEMA_VERSION,
} from '../lib/eval/constants.mjs';

/**
 * @param {string} [prefix]
 */
export function tempDir(prefix = 'eh-g2-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

/**
 * @param {string} root
 * @param {Record<string, string>} files
 */
export function writeTree(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, content);
  }
}

/**
 * Minimal valid scenario factory.
 * @param {Partial<{ id: string, mode: string, criteria: object[] }> & { criteria?: object[] }} [overrides]
 */
export function makeScenario(overrides = {}) {
  const criteria = overrides.criteria ?? [
    {
      id: 'C-CRIT',
      description: 'Critical check',
      severity: 'critical',
      verificationMethod: 'git_diff',
    },
  ];
  return {
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    id: overrides.id ?? 'SCN-1',
    title: overrides.title ?? 'Test scenario',
    mode: overrides.mode ?? 'behavioral',
    description: overrides.description,
    criteria,
  };
}

/**
 * @param {object} overrides
 */
export function makeRun(overrides = {}) {
  return {
    schemaVersion: RUN_SCHEMA_VERSION,
    id: overrides.id ?? 'run-1',
    scenarioId: overrides.scenarioId ?? 'SCN-1',
    startedAt: overrides.startedAt ?? '2026-10-24T00:00:00Z',
    skillVersion: overrides.skillVersion ?? '0.2.3',
    results: overrides.results ?? [],
  };
}

/**
 * Copy the real skill docs into a temp root for structural mutation tests.
 * @param {string} skillPackageRoot
 */
export function cloneSkillSkeleton(skillPackageRoot) {
  const root = tempDir('eh-skill-');
  for (const rel of [
    'SKILL.md',
    'references/principles.md',
    'references/greenfield.md',
    'references/audit.md',
    'references/migration.md',
    'references/maintenance.md',
    'bin/install.mjs',
  ]) {
    const from = join(skillPackageRoot, rel);
    const to = join(root, rel);
    mkdirSync(join(to, '..'), { recursive: true });
    cpSync(from, to);
  }
  return root;
}

export { writeFileSync, mkdirSync, symlinkSync, rmSync, join };
