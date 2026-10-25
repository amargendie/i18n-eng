import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { REQUIRED_SKILL_FILES, REQUIRED_WORKFLOW_REFS } from './constants.mjs';
import { diagnostic } from './diagnostics.mjs';
import { validateCase } from './case.mjs';
import { findDuplicateScenarioIds, validateScenario } from './scenario.mjs';

/**
 * @typedef {import('./diagnostics.mjs').Diagnostic} Diagnostic
 */

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;

/**
 * Parse minimal YAML-like frontmatter for required skill fields (read-only).
 * @param {string} text
 * @returns {{ ok: boolean, name?: string, description?: string, errors: Diagnostic[] }}
 */
export function parseSkillFrontmatter(text) {
  /** @type {Diagnostic[]} */
  const errors = [];
  const m = text.match(FRONTMATTER_RE);
  if (!m) {
    return {
      ok: false,
      errors: [
        diagnostic('FRONTMATTER', 'SKILL.md must begin with YAML frontmatter delimited by ---'),
      ],
    };
  }
  const body = m[1];
  const nameMatch = body.match(/^name:\s*(.+)$/m);
  const descMatch = body.match(/^description:\s*(>-?|\|)?\s*$/m) || body.match(/^description:\s*(.+)$/m);
  if (!nameMatch) {
    errors.push(diagnostic('FRONTMATTER', 'Frontmatter missing name', { path: 'SKILL.md' }));
  }
  const name = nameMatch ? nameMatch[1].trim() : undefined;
  if (name && name !== 'i18n-eng') {
    errors.push(
      diagnostic(
        'FRONTMATTER',
        `name must be "i18n-eng" (got "${name}")`,
        { path: 'SKILL.md' },
      ),
    );
  }
  if (!descMatch) {
    errors.push(
      diagnostic('FRONTMATTER', 'Frontmatter missing description', { path: 'SKILL.md' }),
    );
  }
  return { ok: errors.length === 0, name, description: descMatch ? 'present' : undefined, errors };
}

/**
 * Collect local markdown targets from a file (skip http(s), mailto, anchors-only).
 * @param {string} text
 * @returns {string[]}
 */
export function extractLocalMarkdownTargets(text) {
  /** @type {string[]} */
  const targets = [];
  for (const match of text.matchAll(MD_LINK_RE)) {
    let href = match[2].trim();
    // Strip optional title: url "title"
    const sp = href.match(/^(\S+)(?:\s+["'].*)?$/);
    if (sp) href = sp[1];
    if (!href || href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
      continue;
    }
    const noHash = href.split('#')[0];
    if (noHash) targets.push(noHash);
  }
  return targets;
}

/**
 * @param {string} fromFile
 * @param {string} target
 * @param {string} packageRoot
 * @returns {boolean}
 */
function localTargetExists(fromFile, target, packageRoot) {
  const baseDir = dirname(fromFile);
  const abs = resolve(baseDir, target);
  const rootReal = resolve(packageRoot);
  if (abs !== rootReal && !abs.startsWith(rootReal + '/') && !abs.startsWith(rootReal + '\\')) {
    return false;
  }
  return existsSync(abs);
}

/**
 * Recursively list JSON scenario candidates under eval/scenarios when present.
 * @param {string} dir
 * @returns {string[]}
 */
function listScenarioFiles(dir) {
  if (!existsSync(dir)) return [];
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...listScenarioFiles(p));
    else if (extname(name) === '.json') out.push(p);
  }
  return out;
}

/**
 * Read-only structural validation of the skill package.
 * Does not execute fixture or package code beyond reading text/JSON.
 *
 * @param {string} packageRoot
 * @returns {{ ok: boolean, errors: Diagnostic[], warnings: Diagnostic[] }}
 */
export function validateSkillStructure(packageRoot) {
  /** @type {Diagnostic[]} */
  const errors = [];
  /** @type {Diagnostic[]} */
  const warnings = [];
  const root = resolve(packageRoot);

  for (const rel of REQUIRED_SKILL_FILES) {
    if (!existsSync(join(root, rel))) {
      errors.push(
        diagnostic('MISSING_FILE', `Required skill file missing: ${rel}`, { path: rel }),
      );
    }
  }

  const skillPath = join(root, 'SKILL.md');
  if (existsSync(skillPath)) {
    const skillText = readFileSync(skillPath, 'utf8');
    const fm = parseSkillFrontmatter(skillText);
    errors.push(...fm.errors);

    for (const ref of REQUIRED_WORKFLOW_REFS) {
      if (!skillText.includes(ref)) {
        errors.push(
          diagnostic(
            'MISSING_REF',
            `SKILL.md must reference required workflow path ${ref}`,
            { path: 'SKILL.md' },
          ),
        );
      }
      if (!existsSync(join(root, ref))) {
        errors.push(
          diagnostic('BROKEN_REF', `Workflow reference target missing: ${ref}`, {
            path: ref,
          }),
        );
      }
    }

    // Broken local references within skill documentation (SKILL.md + references/*.md)
    const docFiles = [
      skillPath,
      ...REQUIRED_WORKFLOW_REFS.map((r) => join(root, r)).filter((p) => existsSync(p)),
    ];
    for (const file of docFiles) {
      const text = readFileSync(file, 'utf8');
      const relFile = file.slice(root.length + 1);
      for (const target of extractLocalMarkdownTargets(text)) {
        if (!localTargetExists(file, target, root)) {
          errors.push(
            diagnostic(
              'BROKEN_REF',
              `Broken local reference "${target}" in ${relFile}`,
              { path: relFile, detail: target },
            ),
          );
        }
      }
    }
  }

  const installer = join(root, 'bin/install.mjs');
  if (existsSync(installer)) {
    const st = statSync(installer);
    if (!st.isFile()) {
      errors.push(
        diagnostic('INSTALLER', 'bin/install.mjs must be a file', { path: 'bin/install.mjs' }),
      );
    }
  }

  // Optional legacy dir (G2 placeholder) — schema-only when present.
  const legacyScenarioDir = join(root, 'eval', 'scenarios');
  /** @type {import('./scenario.mjs').Scenario[]} */
  const scenarios = [];
  for (const file of listScenarioFiles(legacyScenarioDir)) {
    const rel = file.slice(root.length + 1);
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      errors.push(
        diagnostic('SCENARIO_JSON', `Invalid JSON in scenario file: ${rel}`, {
          path: rel,
          detail: String(err),
        }),
      );
      continue;
    }
    const result = validateScenario(parsed, { path: rel });
    if (!result.ok) errors.push(...result.errors);
    else if (result.scenario) scenarios.push(result.scenario);
  }

  // G3 evaluation cases under tests/cases — schema + prompt/fixture packaging.
  const casesDir = join(root, 'tests', 'cases');
  for (const file of listScenarioFiles(casesDir)) {
    const rel = file.slice(root.length + 1);
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      errors.push(
        diagnostic('SCENARIO_JSON', `Invalid JSON in case file: ${rel}`, {
          path: rel,
          detail: String(err),
        }),
      );
      continue;
    }
    const result = validateCase(parsed, { path: rel, packageRoot: root });
    if (!result.ok) errors.push(...result.errors);
    else if (result.case) scenarios.push(result.case);
  }

  errors.push(...findDuplicateScenarioIds(scenarios));

  return { ok: errors.length === 0, errors, warnings };
}
