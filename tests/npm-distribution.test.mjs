import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir, homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const SKILL_ID = 'i18n-eng';
const installBin = join(root, 'bin/install.mjs');

/**
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv }} [opts]
 */
function runCli(args, opts = {}) {
  return spawnSync(process.execPath, [installBin, ...args], {
    cwd: opts.cwd ?? root,
    encoding: 'utf8',
    env: opts.env ?? process.env,
  });
}

/**
 * @param {string} dir
 */
function listTop(dir) {
  return readdirSync(dir).sort();
}

test('package is publishable: not private, bin and files allowlist', () => {
  assert.equal(pkg.name, SKILL_ID);
  assert.equal(pkg.version, '0.3.0');
  assert.equal(pkg.license, 'Apache-2.0');
  assert.equal(pkg.private, undefined);
  assert.equal(pkg.bin?.[SKILL_ID], './bin/install.mjs');
  assert.ok(Array.isArray(pkg.files));
  for (const required of [
    'SKILL.md',
    'references',
    'bin/install.mjs',
    'README.md',
    'LICENSE',
    'NOTICE',
    'CHANGELOG.md',
  ]) {
    assert.ok(pkg.files.includes(required), `files missing ${required}`);
  }
  assert.equal(pkg.files.includes('bin/eval.mjs'), false);
  assert.equal(pkg.files.includes('lib'), false);
  assert.equal(pkg.files.includes('docs'), false);
  assert.equal(pkg.files.includes('tests'), false);
  assert.equal(pkg.engines?.node, '>=24');
});

test('CLI --help and bare invocation print usage', () => {
  for (const args of [[], ['--help'], ['-h']]) {
    const r = runCli(args);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Usage:/);
    assert.match(r.stdout, /npx i18n-eng install/);
  }
});

test('CLI rejects unknown commands with exit 2', () => {
  const r = runCli(['publish']);
  assert.equal(r.status, 2);
  assert.match(r.stderr + r.stdout, /Unknown command/);
});

test('CLI rejects invalid --agent with exit 2', () => {
  const r = runCli(['install', '--agent', 'nope', '--dry-run']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Invalid --agent/);
});

test('project-local install and dry-run', () => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'i18n-eng-npm-local-')));
  try {
    const dry = runCli(['install', '--dry-run'], { cwd: base });
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /Would install skill/);
    assert.equal(existsSync(join(base, '.cursor')), false);

    const r = runCli(['install'], { cwd: base });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const dest = join(base, '.cursor', 'skills', SKILL_ID);
    assert.deepEqual(listTop(dest), ['SKILL.md', 'references'].sort());
    assert.match(readFileSync(join(dest, 'SKILL.md'), 'utf8'), /^name:\s*i18n-eng\s*$/m);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('global install uses isolated HOME', () => {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'i18n-eng-npm-home-')));
  try {
    const env = { ...process.env, HOME: home };
    const r = runCli(['install', '--global'], { cwd: tmpdir(), env });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const dest = join(home, '.cursor', 'skills', SKILL_ID);
    assert.ok(r.stdout.includes(`Installed to ${dest}`), r.stdout);
    assert.deepEqual(listTop(dest), ['SKILL.md', 'references'].sort());
    assert.notEqual(home, homedir());
    assert.notEqual(dest, join(homedir(), '.cursor', 'skills', SKILL_ID));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('--agent agents installs under .agents/skills', () => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'i18n-eng-npm-agents-')));
  try {
    const r = runCli(['install', '--agent', 'agents'], { cwd: base });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const dest = join(base, '.agents', 'skills', SKILL_ID);
    assert.ok(existsSync(join(dest, 'SKILL.md')));
    assert.equal(existsSync(join(base, '.cursor', 'skills', SKILL_ID)), false);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('existing install protected unless --force', () => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'i18n-eng-npm-force-')));
  try {
    const dest = join(base, '.cursor', 'skills', SKILL_ID);
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(dest, 'SKILL.md'), 'stale\n');
    writeFileSync(join(dest, 'extra.txt'), 'x');

    const blocked = runCli(['install'], { cwd: base });
    assert.equal(blocked.status, 1);
    assert.match(blocked.stderr + blocked.stdout, /Already exists/);
    assert.equal(readFileSync(join(dest, 'SKILL.md'), 'utf8'), 'stale\n');

    const forced = runCli(['install', '--force'], { cwd: base });
    assert.equal(forced.status, 0, forced.stderr + forced.stdout);
    assert.deepEqual(listTop(dest), ['SKILL.md', 'references'].sort());
    assert.equal(existsSync(join(dest, 'extra.txt')), false);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('npm pack payload installs from tarball without harness', () => {
  const work = realpathSync(mkdtempSync(join(tmpdir(), 'i18n-eng-npm-pack-')));
  try {
    const pack = spawnSync('npm', ['pack', '--pack-destination', work], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(pack.status, 0, pack.stderr + pack.stdout);
    const tgzName = pack.stdout.trim().split(/\s+/).pop();
    assert.ok(tgzName?.endsWith('.tgz'), pack.stdout);
    const tgz = join(work, tgzName);

    const extract = join(work, 'extract');
    mkdirSync(extract);
    const tar = spawnSync('tar', ['-xzf', tgz, '-C', extract], { encoding: 'utf8' });
    assert.equal(tar.status, 0, tar.stderr);
    const pkgRoot = join(extract, 'package');
    assert.ok(existsSync(join(pkgRoot, 'bin/install.mjs')));
    assert.ok(existsSync(join(pkgRoot, 'SKILL.md')));
    assert.ok(existsSync(join(pkgRoot, 'references/principles.md')));
    assert.equal(existsSync(join(pkgRoot, 'bin/eval.mjs')), false);
    assert.equal(existsSync(join(pkgRoot, 'lib')), false);
    assert.equal(existsSync(join(pkgRoot, 'tests')), false);
    assert.equal(existsSync(join(pkgRoot, 'docs')), false);
    assert.equal(existsSync(join(pkgRoot, 'eval-runs')), false);

    const packedPkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'));
    assert.equal(packedPkg.private, undefined);

    const project = join(work, 'project');
    mkdirSync(project);
    const r = spawnSync(process.execPath, [join(pkgRoot, 'bin/install.mjs'), 'install'], {
      cwd: project,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const dest = join(project, '.cursor', 'skills', SKILL_ID);
    assert.deepEqual(listTop(dest), ['SKILL.md', 'references'].sort());
    assert.equal(existsSync(join(dest, 'bin')), false);
    assert.equal(existsSync(join(dest, 'lib')), false);

    // npm exec style: run bin from installed package copy
    const prefix = join(work, 'prefix');
    mkdirSync(prefix);
    const npmInstall = spawnSync('npm', ['install', '--prefix', prefix, tgz], {
      encoding: 'utf8',
    });
    assert.equal(npmInstall.status, 0, npmInstall.stderr + npmInstall.stdout);
    const binPath = join(prefix, 'node_modules', '.bin', SKILL_ID);
    assert.ok(existsSync(binPath), 'bin shim missing after npm install from tarball');
    const execProject = join(work, 'exec-project');
    mkdirSync(execProject);
    const exec = spawnSync(binPath, ['install'], {
      cwd: execProject,
      encoding: 'utf8',
    });
    assert.equal(exec.status, 0, exec.stderr + exec.stdout);
    assert.ok(existsSync(join(execProject, '.cursor', 'skills', SKILL_ID, 'SKILL.md')));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test('packed tree has no private project identifiers', () => {
  const work = realpathSync(mkdtempSync(join(tmpdir(), 'i18n-eng-npm-privacy-')));
  try {
    const pack = spawnSync('npm', ['pack', '--pack-destination', work], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(pack.status, 0, pack.stderr);
    const tgz = join(work, pack.stdout.trim().split(/\s+/).pop());
    const extract = join(work, 'extract');
    mkdirSync(extract);
    spawnSync('tar', ['-xzf', tgz, '-C', extract], { encoding: 'utf8' });
    const needle = ['Apo', 'doXIII'].join('') + '|' + ['Ink', 'spectra'].join('') + '|' + ['Presupuesto', 'QueSí'].join('') + '|/Users/andres' + 'margendiebenoit';
    const scan = spawnSync('rg', ['-n', needle, join(extract, 'package')], {
      encoding: 'utf8',
    });
    // rg exit 1 = no matches
    assert.equal(scan.status, 1, scan.stdout);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
