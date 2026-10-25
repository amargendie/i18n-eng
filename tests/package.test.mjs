import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, mkdtempSync, rmSync, statSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skill = readFileSync(join(root, 'SKILL.md'), 'utf8');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const files = ['principles', 'greenfield', 'audit', 'migration', 'maintenance'];
const SKILL_ID = 'i18n-eng';
const LEGACY_SKILL_ID = 'internationalization-engineering';

test('valid frontmatter, name matches package identity', () => {
  assert.equal(pkg.name, SKILL_ID);
  assert.match(skill, /^---\nname: i18n-eng\n/);
  assert.match(skill, /\ndescription: >-/);
  assert.match(skill, /^# Internationalization Engineering/m);
});

test('all workflow references resolve', () => {
  for (const file of files) {
    assert.ok(existsSync(join(root, 'references', file + '.md')));
    assert.ok(skill.includes('references/' + file + '.md'));
  }
});

test('routes four workflows and guards read-only audits', () => {
  for (const mode of ['Greenfield', 'Audit', 'Migration', 'Maintenance']) {
    assert.match(skill, new RegExp('\\*\\*' + mode + '\\*\\*'));
  }
  assert.match(skill, /Read-only audit:/i);
  assert.match(skill, /Migration gates:/i);
  assert.match(skill, /Product scope:/i);
});

test('installer dry-run does not modify target', () => {
  const r = spawnSync(
    process.execPath,
    [join(root, 'bin/install.mjs'), 'install', '--dry-run'],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Would install skill/);
  assert.match(r.stdout, new RegExp(`\\.cursor/skills/${SKILL_ID}`));
});

test('fresh install writes only SKILL.md and references under i18n-eng', () => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'i18n-eng-fresh-')));
  try {
    const r = spawnSync(
      process.execPath,
      [join(root, 'bin/install.mjs'), 'install'],
      { cwd: base, encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const dest = join(base, '.cursor', 'skills', SKILL_ID);
    assert.ok(r.stdout.includes(`Installed to ${dest}`), r.stdout);
    assert.ok(existsSync(join(dest, 'SKILL.md')));
    assert.ok(existsSync(join(dest, 'references', 'principles.md')));
    const top = readdirSync(dest).sort();
    assert.deepEqual(top, ['SKILL.md', 'references'].sort());
    const installedName = readFileSync(join(dest, 'SKILL.md'), 'utf8').match(/^name:\s*(.+)$/m);
    assert.equal(installedName?.[1]?.trim(), SKILL_ID);
    assert.match(r.stdout, /Legacy skill \(internationalization-engineering\): not present/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('upgrade with --force replaces existing i18n-eng only', () => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'i18n-eng-upgrade-')));
  try {
    const dest = join(base, '.cursor', 'skills', SKILL_ID);
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(dest, 'SKILL.md'), '---\nname: i18n-eng\ndescription: stale\n---\n\nold\n');
    writeFileSync(join(dest, 'stale-extra.txt'), 'should be removed by replace');
    const unrelated = join(base, '.cursor', 'skills', 'other-skill');
    mkdirSync(unrelated, { recursive: true });
    writeFileSync(join(unrelated, 'marker.txt'), 'untouched');

    const blocked = spawnSync(
      process.execPath,
      [join(root, 'bin/install.mjs'), 'install'],
      { cwd: base, encoding: 'utf8' },
    );
    assert.equal(blocked.status, 1);
    assert.match(blocked.stderr + blocked.stdout, /Already exists/);

    const r = spawnSync(
      process.execPath,
      [join(root, 'bin/install.mjs'), 'install', '--force'],
      { cwd: base, encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.ok(existsSync(join(dest, 'SKILL.md')));
    assert.ok(existsSync(join(dest, 'references', 'greenfield.md')));
    assert.equal(existsSync(join(dest, 'stale-extra.txt')), false);
    assert.equal(readFileSync(join(unrelated, 'marker.txt'), 'utf8'), 'untouched');
    const top = readdirSync(dest).sort();
    assert.deepEqual(top, ['SKILL.md', 'references'].sort());
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('installer reports legacy folder and does not modify it', () => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'i18n-eng-legacy-')));
  try {
    const legacy = join(base, '.cursor', 'skills', LEGACY_SKILL_ID);
    mkdirSync(legacy, { recursive: true });
    const sentinel = 'legacy-sentinel-do-not-touch';
    writeFileSync(join(legacy, 'SKILL.md'), sentinel);
    writeFileSync(join(legacy, 'keep.txt'), 'keep');
    const beforeMtime = statSync(join(legacy, 'SKILL.md')).mtimeMs;

    const r = spawnSync(
      process.execPath,
      [join(root, 'bin/install.mjs'), 'install'],
      { cwd: base, encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, new RegExp(`Legacy skill \\(${LEGACY_SKILL_ID}\\): present`));
    assert.match(r.stdout, /left untouched/);
    assert.equal(readFileSync(join(legacy, 'SKILL.md'), 'utf8'), sentinel);
    assert.equal(readFileSync(join(legacy, 'keep.txt'), 'utf8'), 'keep');
    assert.equal(statSync(join(legacy, 'SKILL.md')).mtimeMs, beforeMtime);
    assert.ok(existsSync(join(base, '.cursor', 'skills', SKILL_ID, 'SKILL.md')));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
