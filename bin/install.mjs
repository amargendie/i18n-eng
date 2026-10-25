#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

/** Technical skill id — must match SKILL.md frontmatter `name` and install folder. */
const SKILL_ID = 'i18n-eng';
/** Previous technical id; may still exist on disk. Never deleted or overwritten by this installer. */
const LEGACY_SKILL_ID = 'internationalization-engineering';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

const help = () =>
  console.log(`Install Internationalization Engineering Agent Skill (${SKILL_ID})

Usage:
  npx ${SKILL_ID} install [--global] [--agent cursor|agents] [--force] [--dry-run]
  npx ${SKILL_ID}@<version> install [...]
  ${SKILL_ID} install [...]
  ${SKILL_ID} --help

Defaults: project-level .cursor/skills/${SKILL_ID} installation, without overwriting.

The command copies only SKILL.md and references/ into the skills directory.
It does not install the Evaluation Harness or development fixtures.

Legacy: if .cursor/skills/${LEGACY_SKILL_ID} (or .agents/…) still exists, it is reported
and left untouched. Remove it manually only after verifying the new install.`);

const wantsHelp = args.includes('--help') || args.includes('-h');
if (wantsHelp || args.length === 0) {
  help();
  process.exit(0);
}

if (args[0] !== 'install') {
  console.error(`Unknown command: ${args[0]}`);
  help();
  process.exit(2);
}

const flags = args.slice(1);
const value = (flag, fallback) => {
  const i = flags.indexOf(flag);
  return i === -1 ? fallback : flags[i + 1];
};
const agent = value('--agent', 'cursor');
if (!['cursor', 'agents'].includes(agent)) {
  console.error('Invalid --agent (cursor|agents)');
  process.exit(2);
}

const globalInstall = flags.includes('--global');
const base = globalInstall ? homedir() : process.cwd();
const skillsRoot = join(base, `.${agent}`, 'skills');
const dest = join(skillsRoot, SKILL_ID);
const legacyDest = join(skillsRoot, LEGACY_SKILL_ID);
const force = flags.includes('--force');
const dry = flags.includes('--dry-run');

/**
 * Report legacy install status without modifying it.
 * @param {string} path
 */
const reportLegacy = (path) => {
  if (!existsSync(path)) {
    console.log(`Legacy skill (${LEGACY_SKILL_ID}): not present`);
    return;
  }
  console.log(`Legacy skill (${LEGACY_SKILL_ID}): present at ${path}`);
  console.log('Status: left untouched (installer does not delete or overwrite legacy installs).');
  console.log(`Migration: verify /${SKILL_ID} works, then remove the legacy folder manually when ready.`);
};

for (const f of [
  'SKILL.md',
  'references/principles.md',
  'references/greenfield.md',
  'references/audit.md',
  'references/migration.md',
  'references/maintenance.md',
]) {
  if (!existsSync(join(root, f))) {
    console.error(`Missing package file: ${f}`);
    process.exit(1);
  }
}
if (dry) {
  console.log(`[dry-run] Would install skill to ${dest}`);
  if (existsSync(dest) && !force) {
    console.log('Note: destination already exists; a real install would require --force.');
  }
  reportLegacy(legacyDest);
  process.exit(0);
}
if (existsSync(dest) && !force) {
  console.error(`Already exists: ${dest}\nPass --force to replace.`);
  reportLegacy(legacyDest);
  process.exit(1);
}
mkdirSync(dirname(dest), { recursive: true });
const staging = mkdtempSync(join(dirname(dest), '.i18n-skill-'));
try {
  cpSync(join(root, 'SKILL.md'), join(staging, 'SKILL.md'));
  cpSync(join(root, 'references'), join(staging, 'references'), { recursive: true });
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  renameSync(staging, dest);
  console.log(`Installed to ${dest}`);
  reportLegacy(legacyDest);
} catch (err) {
  rmSync(staging, { recursive: true, force: true });
  throw err;
}
