import {
  MODES,
  SCENARIO_SCHEMA_VERSION,
  SEVERITIES,
  VERIFICATION_METHODS,
} from './constants.mjs';
import { diagnostic } from './diagnostics.mjs';

/**
 * @typedef {{
 *   id: string,
 *   description: string,
 *   severity: string,
 *   verificationMethod: string,
 *   mandatory?: boolean,
 * }} Criterion
 *
 * @typedef {{
 *   schemaVersion: string,
 *   id: string,
 *   title: string,
 *   mode: string,
 *   description?: string,
 *   criteria: Criterion[],
 * }} Scenario
 */

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {import('./diagnostics.mjs').Diagnostic[]}
 */
function requireNonEmptyString(value, path) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [diagnostic('SCHEMA_TYPE', `Expected non-empty string`, { path })];
  }
  return [];
}

/**
 * Validate a criterion object.
 * @param {unknown} raw
 * @param {string} path
 * @returns {import('./diagnostics.mjs').Diagnostic[]}
 */
export function validateCriterion(raw, path = 'criteria[]') {
  /** @type {import('./diagnostics.mjs').Diagnostic[]} */
  const errors = [];
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return [diagnostic('SCHEMA_TYPE', 'Criterion must be an object', { path })];
  }
  const c = /** @type {Record<string, unknown>} */ (raw);
  errors.push(...requireNonEmptyString(c.id, `${path}.id`));
  errors.push(...requireNonEmptyString(c.description, `${path}.description`));
  if (!SEVERITIES.includes(/** @type {string} */ (c.severity))) {
    errors.push(
      diagnostic('SCHEMA_ENUM', `severity must be one of: ${SEVERITIES.join(', ')}`, {
        path: `${path}.severity`,
        detail: c.severity,
      }),
    );
  }
  if (!VERIFICATION_METHODS.includes(/** @type {string} */ (c.verificationMethod))) {
    errors.push(
      diagnostic(
        'SCHEMA_ENUM',
        `verificationMethod must be one of: ${VERIFICATION_METHODS.join(', ')}`,
        { path: `${path}.verificationMethod`, detail: c.verificationMethod },
      ),
    );
  }
  if (c.mandatory !== undefined && typeof c.mandatory !== 'boolean') {
    errors.push(
      diagnostic('SCHEMA_TYPE', 'mandatory must be a boolean when present', {
        path: `${path}.mandatory`,
      }),
    );
  }
  return errors;
}

/**
 * Validate a scenario definition (native checks; no third-party schema lib).
 * @param {unknown} raw
 * @param {{ path?: string }} [opts]
 * @returns {{ ok: boolean, errors: import('./diagnostics.mjs').Diagnostic[], scenario?: Scenario }}
 */
export function validateScenario(raw, opts = {}) {
  const base = opts.path ?? 'scenario';
  /** @type {import('./diagnostics.mjs').Diagnostic[]} */
  const errors = [];

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      errors: [diagnostic('SCHEMA_TYPE', 'Scenario must be an object', { path: base })],
    };
  }

  const s = /** @type {Record<string, unknown>} */ (raw);

  if (s.schemaVersion !== SCENARIO_SCHEMA_VERSION) {
    errors.push(
      diagnostic(
        'SCHEMA_VERSION',
        `schemaVersion must be "${SCENARIO_SCHEMA_VERSION}"`,
        { path: `${base}.schemaVersion`, detail: s.schemaVersion },
      ),
    );
  }
  errors.push(...requireNonEmptyString(s.id, `${base}.id`));
  errors.push(...requireNonEmptyString(s.title, `${base}.title`));
  if (!MODES.includes(/** @type {string} */ (s.mode))) {
    errors.push(
      diagnostic('SCHEMA_ENUM', `mode must be one of: ${MODES.join(', ')}`, {
        path: `${base}.mode`,
        detail: s.mode,
      }),
    );
  }
  if (s.description !== undefined && typeof s.description !== 'string') {
    errors.push(
      diagnostic('SCHEMA_TYPE', 'description must be a string when present', {
        path: `${base}.description`,
      }),
    );
  }
  if (!Array.isArray(s.criteria) || s.criteria.length === 0) {
    errors.push(
      diagnostic('SCHEMA_REQUIRED', 'criteria must be a non-empty array', {
        path: `${base}.criteria`,
      }),
    );
  } else {
    const seen = new Set();
    s.criteria.forEach((crit, i) => {
      const p = `${base}.criteria[${i}]`;
      const critErrors = validateCriterion(crit, p);
      errors.push(...critErrors);
      if (crit && typeof crit === 'object' && !Array.isArray(crit)) {
        const id = /** @type {Record<string, unknown>} */ (crit).id;
        if (typeof id === 'string' && id.trim()) {
          if (seen.has(id)) {
            errors.push(
              diagnostic('DUPLICATE_ID', `Duplicate criterion id "${id}"`, {
                path: `${p}.id`,
              }),
            );
          }
          seen.add(id);
        }
      }
    });
  }

  if (errors.length) return { ok: false, errors };

  /** @type {Scenario} */
  const scenario = {
    schemaVersion: /** @type {string} */ (s.schemaVersion),
    id: /** @type {string} */ (s.id),
    title: /** @type {string} */ (s.title),
    mode: /** @type {string} */ (s.mode),
    criteria: /** @type {Criterion[]} */ (s.criteria).map((c) => ({
      id: c.id,
      description: c.description,
      severity: c.severity,
      verificationMethod: c.verificationMethod,
      mandatory:
        c.mandatory !== undefined
          ? c.mandatory
          : c.severity === 'critical' || c.severity === 'major',
    })),
  };
  if (typeof s.description === 'string') scenario.description = s.description;

  return { ok: true, errors: [], scenario };
}

/**
 * Detect duplicate scenario ids across a list.
 * @param {Scenario[]} scenarios
 * @returns {import('./diagnostics.mjs').Diagnostic[]}
 */
export function findDuplicateScenarioIds(scenarios) {
  /** @type {import('./diagnostics.mjs').Diagnostic[]} */
  const errors = [];
  const seen = new Map();
  for (const s of scenarios) {
    if (seen.has(s.id)) {
      errors.push(
        diagnostic('DUPLICATE_ID', `Duplicate scenario id "${s.id}"`, {
          path: `scenario.id`,
          detail: { first: seen.get(s.id), second: s.title },
        }),
      );
    } else {
      seen.set(s.id, s.title);
    }
  }
  return errors;
}
