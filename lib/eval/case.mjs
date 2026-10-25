import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, normalize, resolve, sep } from 'node:path';
import { VERIFICATION_METHODS } from './constants.mjs';
import { diagnostic } from './diagnostics.mjs';
import { validateScenario } from './scenario.mjs';

/** @typedef {import('./diagnostics.mjs').Diagnostic} Diagnostic */
/** @typedef {import('./scenario.mjs').Scenario} Scenario */

export const EXPECTED_WORKFLOWS = Object.freeze([
  'greenfield',
  'audit',
  'migration',
  'maintenance',
  'none',
]);

/**
 * @typedef {Scenario & {
 *   expectedWorkflow: string,
 *   promptPath: string,
 *   fixturePath: string,
 *   evaluatorGuidePath?: string,
 * }} EvalCase
 */

/**
 * Resolve a package-relative path with escape/symlink protection.
 * @param {string} relativePath
 * @param {string} packageRoot
 * @param {'file' | 'directory'} expect
 * @param {string} diagPath
 * @returns {{ ok: true, absolutePath: string } | { ok: false, errors: Diagnostic[] }}
 */
export function resolvePackageRelativePath(
  relativePath,
  packageRoot,
  expect,
  diagPath,
) {
  if (typeof relativePath !== 'string' || relativePath.trim() === '') {
    return {
      ok: false,
      errors: [
        diagnostic('CASE_PATH', 'Path must be a non-empty string', { path: diagPath }),
      ],
    };
  }
  if (isAbsolute(relativePath)) {
    return {
      ok: false,
      errors: [
        diagnostic('CASE_ESCAPE', 'Path must be relative to the package root', {
          path: diagPath,
          detail: relativePath,
        }),
      ],
    };
  }
  const normalized = normalize(relativePath);
  if (
    normalized.startsWith('..' + sep) ||
    normalized === '..' ||
    normalized.includes(sep + '..' + sep)
  ) {
    return {
      ok: false,
      errors: [
        diagnostic('CASE_ESCAPE', 'Path must not escape the package root', {
          path: diagPath,
          detail: relativePath,
        }),
      ],
    };
  }

  let rootReal;
  try {
    rootReal = realpathSync(packageRoot);
  } catch {
    return {
      ok: false,
      errors: [
        diagnostic('CASE_ROOT', 'Package root is not readable', {
          path: 'packageRoot',
          detail: packageRoot,
        }),
      ],
    };
  }

  const candidate = resolve(join(rootReal, normalized));
  if (candidate !== rootReal && !candidate.startsWith(rootReal + sep)) {
    return {
      ok: false,
      errors: [
        diagnostic('CASE_ESCAPE', 'Path resolves outside the package root', {
          path: diagPath,
          detail: relativePath,
        }),
      ],
    };
  }

  if (!existsSync(candidate)) {
    return {
      ok: false,
      errors: [
        diagnostic('CASE_MISSING', `Referenced path not found: ${relativePath}`, {
          path: diagPath,
        }),
      ],
    };
  }

  let real;
  try {
    real = realpathSync(candidate);
  } catch {
    return {
      ok: false,
      errors: [
        diagnostic('CASE_MISSING', `Referenced path not readable: ${relativePath}`, {
          path: diagPath,
        }),
      ],
    };
  }
  if (real !== rootReal && !real.startsWith(rootReal + sep)) {
    return {
      ok: false,
      errors: [
        diagnostic('CASE_ESCAPE', 'Path escapes the package root via symlink', {
          path: diagPath,
          detail: relativePath,
        }),
      ],
    };
  }

  const st = statSync(real);
  if (expect === 'file' && !st.isFile()) {
    return {
      ok: false,
      errors: [
        diagnostic('CASE_PATH', `Expected a file at ${relativePath}`, { path: diagPath }),
      ],
    };
  }
  if (expect === 'directory' && !st.isDirectory()) {
    return {
      ok: false,
      errors: [
        diagnostic('CASE_PATH', `Expected a directory at ${relativePath}`, {
          path: diagPath,
        }),
      ],
    };
  }

  return { ok: true, absolutePath: real };
}

/**
 * Validate a G3 evaluation case: eh.scenario.v1 plus packaging fields.
 * Does not change G2 aggregation semantics.
 *
 * @param {unknown} raw
 * @param {{ path?: string, packageRoot?: string, skipFs?: boolean }} [opts]
 * @returns {{ ok: boolean, errors: Diagnostic[], case?: EvalCase }}
 */
export function validateCase(raw, opts = {}) {
  const base = opts.path ?? 'case';
  const scenarioResult = validateScenario(raw, { path: base });
  /** @type {Diagnostic[]} */
  const errors = [...scenarioResult.errors];

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors };
  }
  const c = /** @type {Record<string, unknown>} */ (raw);

  if (!EXPECTED_WORKFLOWS.includes(/** @type {string} */ (c.expectedWorkflow))) {
    errors.push(
      diagnostic(
        'CASE_WORKFLOW',
        `expectedWorkflow must be one of: ${EXPECTED_WORKFLOWS.join(', ')}`,
        { path: `${base}.expectedWorkflow`, detail: c.expectedWorkflow },
      ),
    );
  }

  for (const field of ['promptPath', 'fixturePath']) {
    if (typeof c[field] !== 'string' || !String(c[field]).trim()) {
      errors.push(
        diagnostic('CASE_PATH', `${field} must be a non-empty string`, {
          path: `${base}.${field}`,
        }),
      );
    }
  }
  if (
    c.evaluatorGuidePath !== undefined &&
    (typeof c.evaluatorGuidePath !== 'string' || !c.evaluatorGuidePath.trim())
  ) {
    errors.push(
      diagnostic('CASE_PATH', 'evaluatorGuidePath must be a non-empty string when present', {
        path: `${base}.evaluatorGuidePath`,
      }),
    );
  }

  if (Array.isArray(c.criteria)) {
    c.criteria.forEach((crit, i) => {
      if (crit && typeof crit === 'object' && !Array.isArray(crit)) {
        const vm = /** @type {Record<string, unknown>} */ (crit).verificationMethod;
        if (typeof vm === 'string' && !VERIFICATION_METHODS.includes(vm)) {
          errors.push(
            diagnostic('SCHEMA_ENUM', `Unsupported verificationMethod: ${vm}`, {
              path: `${base}.criteria[${i}].verificationMethod`,
            }),
          );
        }
      }
    });
  }

  if (!opts.skipFs && opts.packageRoot) {
    if (typeof c.promptPath === 'string' && c.promptPath.trim()) {
      const prompt = resolvePackageRelativePath(
        c.promptPath,
        opts.packageRoot,
        'file',
        `${base}.promptPath`,
      );
      if (!prompt.ok) {
        errors.push(...prompt.errors);
      } else {
        try {
          const text = readFileSync(prompt.absolutePath, 'utf8');
          if (!text.trim()) {
            errors.push(
              diagnostic('CASE_PROMPT_EMPTY', 'Prompt file must not be empty', {
                path: `${base}.promptPath`,
              }),
            );
          }
        } catch {
          errors.push(
            diagnostic('CASE_MISSING', `Prompt file not readable: ${c.promptPath}`, {
              path: `${base}.promptPath`,
            }),
          );
        }
      }
    }
    if (typeof c.fixturePath === 'string' && c.fixturePath.trim()) {
      const fixture = resolvePackageRelativePath(
        c.fixturePath,
        opts.packageRoot,
        'directory',
        `${base}.fixturePath`,
      );
      if (!fixture.ok) errors.push(...fixture.errors);
    }
    if (typeof c.evaluatorGuidePath === 'string' && c.evaluatorGuidePath.trim()) {
      const guide = resolvePackageRelativePath(
        c.evaluatorGuidePath,
        opts.packageRoot,
        'file',
        `${base}.evaluatorGuidePath`,
      );
      if (!guide.ok) errors.push(...guide.errors);
    }
  }

  if (errors.length || !scenarioResult.scenario) return { ok: false, errors };

  /** @type {EvalCase} */
  const evalCase = {
    ...scenarioResult.scenario,
    expectedWorkflow: /** @type {string} */ (c.expectedWorkflow),
    promptPath: /** @type {string} */ (c.promptPath),
    fixturePath: /** @type {string} */ (c.fixturePath),
  };
  if (typeof c.evaluatorGuidePath === 'string') {
    evalCase.evaluatorGuidePath = c.evaluatorGuidePath;
  }
  return { ok: true, errors: [], case: evalCase };
}
