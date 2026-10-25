import {
  CRITERION_RESULT_SCHEMA_VERSION,
  CRITERION_STATUSES,
  RUN_SCHEMA_VERSION,
} from './constants.mjs';
import { diagnostic } from './diagnostics.mjs';
import { validateEvidenceList, validateEvidenceRefShape } from './evidence.mjs';

/**
 * @typedef {import('./evidence.mjs').EvidenceRef} EvidenceRef
 * @typedef {import('./scenario.mjs').Scenario} Scenario
 *
 * @typedef {{
 *   schemaVersion?: string,
 *   criterionId: string,
 *   status: string,
 *   evidence: EvidenceRef[],
 *   notes?: string,
 *   notApplicableJustification?: string,
 * }} CriterionResult
 *
 * @typedef {{
 *   schemaVersion: string,
 *   id: string,
 *   scenarioId: string,
 *   startedAt?: string,
 *   skillVersion?: string,
 *   results: CriterionResult[],
 * }} RunRecord
 */

/**
 * @param {unknown} raw
 * @param {{ path?: string, evaluationRoot?: string, skipEvidenceFs?: boolean }} [opts]
 * @returns {import('./diagnostics.mjs').Diagnostic[]}
 */
export function validateCriterionResult(raw, opts = {}) {
  const path = opts.path ?? 'results[]';
  /** @type {import('./diagnostics.mjs').Diagnostic[]} */
  const errors = [];

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return [diagnostic('SCHEMA_TYPE', 'Criterion result must be an object', { path })];
  }
  const r = /** @type {Record<string, unknown>} */ (raw);

  if (
    r.schemaVersion !== undefined &&
    r.schemaVersion !== CRITERION_RESULT_SCHEMA_VERSION
  ) {
    errors.push(
      diagnostic(
        'SCHEMA_VERSION',
        `schemaVersion must be "${CRITERION_RESULT_SCHEMA_VERSION}" when present`,
        { path: `${path}.schemaVersion`, detail: r.schemaVersion },
      ),
    );
  }
  if (typeof r.criterionId !== 'string' || !r.criterionId.trim()) {
    errors.push(
      diagnostic('SCHEMA_TYPE', 'criterionId must be a non-empty string', {
        path: `${path}.criterionId`,
      }),
    );
  }
  if (!CRITERION_STATUSES.includes(/** @type {string} */ (r.status))) {
    errors.push(
      diagnostic(
        'SCHEMA_ENUM',
        `status must be one of: ${CRITERION_STATUSES.join(', ')}`,
        { path: `${path}.status`, detail: r.status },
      ),
    );
  }
  if (r.notes !== undefined && typeof r.notes !== 'string') {
    errors.push(
      diagnostic('SCHEMA_TYPE', 'notes must be a string when present', {
        path: `${path}.notes`,
      }),
    );
  }

  if (r.status === 'not_applicable') {
    if (
      typeof r.notApplicableJustification !== 'string' ||
      !r.notApplicableJustification.trim()
    ) {
      errors.push(
        diagnostic(
          'NA_JUSTIFICATION',
          'not_applicable requires a non-empty notApplicableJustification',
          { path: `${path}.notApplicableJustification` },
        ),
      );
    }
  }

  if (!Array.isArray(r.evidence)) {
    errors.push(
      diagnostic('SCHEMA_TYPE', 'evidence must be an array', { path: `${path}.evidence` }),
    );
  } else if (opts.evaluationRoot && !opts.skipEvidenceFs) {
    const ev = validateEvidenceList(r.evidence, opts.evaluationRoot, `${path}.evidence`);
    errors.push(...ev.errors);
  } else {
    r.evidence.forEach((item, i) => {
      errors.push(...validateEvidenceRefShape(item, `${path}.evidence[${i}]`));
    });
  }

  return errors;
}

/**
 * Validate a run record against schema (and optionally evidence FS + scenario ids).
 * @param {unknown} raw
 * @param {{
 *   path?: string,
 *   evaluationRoot?: string,
 *   scenario?: Scenario,
 *   skipEvidenceFs?: boolean,
 * }} [opts]
 * @returns {{ ok: boolean, errors: import('./diagnostics.mjs').Diagnostic[], run?: RunRecord }}
 */
export function validateRun(raw, opts = {}) {
  const base = opts.path ?? 'run';
  /** @type {import('./diagnostics.mjs').Diagnostic[]} */
  const errors = [];

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      errors: [diagnostic('SCHEMA_TYPE', 'Run record must be an object', { path: base })],
    };
  }

  const r = /** @type {Record<string, unknown>} */ (raw);

  if (r.schemaVersion !== RUN_SCHEMA_VERSION) {
    errors.push(
      diagnostic('SCHEMA_VERSION', `schemaVersion must be "${RUN_SCHEMA_VERSION}"`, {
        path: `${base}.schemaVersion`,
        detail: r.schemaVersion,
      }),
    );
  }
  if (typeof r.id !== 'string' || !r.id.trim()) {
    errors.push(
      diagnostic('SCHEMA_TYPE', 'id must be a non-empty string', { path: `${base}.id` }),
    );
  }
  if (typeof r.scenarioId !== 'string' || !r.scenarioId.trim()) {
    errors.push(
      diagnostic('SCHEMA_TYPE', 'scenarioId must be a non-empty string', {
        path: `${base}.scenarioId`,
      }),
    );
  }
  if (opts.scenario && r.scenarioId !== opts.scenario.id) {
    errors.push(
      diagnostic(
        'RUN_SCENARIO_MISMATCH',
        `Run scenarioId "${r.scenarioId}" does not match scenario "${opts.scenario.id}"`,
        { path: `${base}.scenarioId` },
      ),
    );
  }
  if (r.startedAt !== undefined && typeof r.startedAt !== 'string') {
    errors.push(
      diagnostic('SCHEMA_TYPE', 'startedAt must be a string when present', {
        path: `${base}.startedAt`,
      }),
    );
  }
  if (r.skillVersion !== undefined && typeof r.skillVersion !== 'string') {
    errors.push(
      diagnostic('SCHEMA_TYPE', 'skillVersion must be a string when present', {
        path: `${base}.skillVersion`,
      }),
    );
  }

  if (!Array.isArray(r.results)) {
    errors.push(
      diagnostic('SCHEMA_REQUIRED', 'results must be an array', { path: `${base}.results` }),
    );
  } else {
    const seen = new Set();
    r.results.forEach((item, i) => {
      const p = `${base}.results[${i}]`;
      errors.push(
        ...validateCriterionResult(item, {
          path: p,
          evaluationRoot: opts.evaluationRoot,
          skipEvidenceFs: opts.skipEvidenceFs,
        }),
      );
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const cid = /** @type {Record<string, unknown>} */ (item).criterionId;
        if (typeof cid === 'string') {
          if (seen.has(cid)) {
            errors.push(
              diagnostic('DUPLICATE_ID', `Duplicate result for criterion "${cid}"`, {
                path: `${p}.criterionId`,
              }),
            );
          }
          seen.add(cid);
          if (opts.scenario && !opts.scenario.criteria.some((c) => c.id === cid)) {
            errors.push(
              diagnostic(
                'UNKNOWN_CRITERION',
                `Result references unknown criterion "${cid}"`,
                { path: `${p}.criterionId` },
              ),
            );
          }
        }
      }
    });
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    run: /** @type {RunRecord} */ (r),
  };
}
