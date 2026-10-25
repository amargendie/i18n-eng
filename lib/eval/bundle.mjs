import { BUNDLE_SCHEMA_VERSION, CRITERION_STATUSES, EVIDENCE_KINDS } from './constants.mjs';
import { diagnostic } from './diagnostics.mjs';
import { validateEvidenceRefShape } from './evidence.mjs';

/**
 * @typedef {{
 *   product?: string,
 *   model?: string,
 * }} AgentInfo
 *
 * @typedef {{
 *   schemaVersion?: string,
 *   criterionId: string,
 *   status: string,
 *   evidence: Array<{ kind: string, path: string, schemaVersion?: string }>,
 *   notes?: string,
 *   notApplicableJustification?: string,
 * }} BundleCriterionResult
 *
 * @typedef {{
 *   schemaVersion: string,
 *   runId: string,
 *   caseId: string,
 *   skillVersion: string,
 *   agent: AgentInfo,
 *   executedAt: string,
 *   fixtureRevision: string,
 *   notes?: string,
 *   limitations?: string[],
 *   results: BundleCriterionResult[],
 * }} ExecutionBundle
 */

/**
 * Validate an execution bundle document (schema only; FS checks happen at record time).
 * @param {unknown} raw
 * @param {{ path?: string }} [opts]
 * @returns {{ ok: boolean, errors: import('./diagnostics.mjs').Diagnostic[], bundle?: ExecutionBundle }}
 */
export function validateBundle(raw, opts = {}) {
  const base = opts.path ?? 'bundle';
  /** @type {import('./diagnostics.mjs').Diagnostic[]} */
  const errors = [];

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      errors: [diagnostic('SCHEMA_TYPE', 'Execution bundle must be an object', { path: base })],
    };
  }
  const b = /** @type {Record<string, unknown>} */ (raw);

  if (b.schemaVersion !== BUNDLE_SCHEMA_VERSION) {
    errors.push(
      diagnostic('SCHEMA_VERSION', `schemaVersion must be "${BUNDLE_SCHEMA_VERSION}"`, {
        path: `${base}.schemaVersion`,
        detail: b.schemaVersion,
      }),
    );
  }
  for (const field of ['runId', 'caseId', 'skillVersion', 'executedAt', 'fixtureRevision']) {
    if (typeof b[field] !== 'string' || !String(b[field]).trim()) {
      errors.push(
        diagnostic('SCHEMA_TYPE', `${field} must be a non-empty string`, {
          path: `${base}.${field}`,
        }),
      );
    }
  }
  if (typeof b.runId === 'string' && /[\\/]/.test(b.runId)) {
    errors.push(
      diagnostic('BUNDLE_RUN_ID', 'runId must not contain path separators', {
        path: `${base}.runId`,
      }),
    );
  }
  if (b.agent === null || typeof b.agent !== 'object' || Array.isArray(b.agent)) {
    errors.push(
      diagnostic('SCHEMA_TYPE', 'agent must be an object (use product/model or "unknown")', {
        path: `${base}.agent`,
      }),
    );
  } else {
    const agent = /** @type {Record<string, unknown>} */ (b.agent);
    for (const key of ['product', 'model']) {
      if (agent[key] !== undefined && typeof agent[key] !== 'string') {
        errors.push(
          diagnostic('SCHEMA_TYPE', `agent.${key} must be a string when present`, {
            path: `${base}.agent.${key}`,
          }),
        );
      }
    }
    if (agent.product === undefined && agent.model === undefined) {
      errors.push(
        diagnostic(
          'SCHEMA_REQUIRED',
          'agent must include product and/or model (use "unknown" when not known)',
          { path: `${base}.agent` },
        ),
      );
    }
  }
  if (b.notes !== undefined && typeof b.notes !== 'string') {
    errors.push(
      diagnostic('SCHEMA_TYPE', 'notes must be a string when present', { path: `${base}.notes` }),
    );
  }
  if (b.limitations !== undefined) {
    if (!Array.isArray(b.limitations) || b.limitations.some((x) => typeof x !== 'string')) {
      errors.push(
        diagnostic('SCHEMA_TYPE', 'limitations must be an array of strings when present', {
          path: `${base}.limitations`,
        }),
      );
    }
  }
  if (!Array.isArray(b.results)) {
    errors.push(
      diagnostic('SCHEMA_REQUIRED', 'results must be an array', { path: `${base}.results` }),
    );
  } else {
    const seen = new Set();
    b.results.forEach((item, i) => {
      const p = `${base}.results[${i}]`;
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(diagnostic('SCHEMA_TYPE', 'result must be an object', { path: p }));
        return;
      }
      const r = /** @type {Record<string, unknown>} */ (item);
      if (typeof r.criterionId !== 'string' || !r.criterionId.trim()) {
        errors.push(
          diagnostic('SCHEMA_TYPE', 'criterionId must be a non-empty string', {
            path: `${p}.criterionId`,
          }),
        );
      } else if (seen.has(r.criterionId)) {
        errors.push(
          diagnostic('DUPLICATE_ID', `Duplicate result for criterion "${r.criterionId}"`, {
            path: `${p}.criterionId`,
          }),
        );
      } else {
        seen.add(r.criterionId);
      }
      if (!CRITERION_STATUSES.includes(/** @type {string} */ (r.status))) {
        errors.push(
          diagnostic(
            'SCHEMA_ENUM',
            `status must be one of: ${CRITERION_STATUSES.join(', ')}`,
            { path: `${p}.status`, detail: r.status },
          ),
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
              'not_applicable requires notApplicableJustification',
              { path: `${p}.notApplicableJustification` },
            ),
          );
        }
      }
      if (!Array.isArray(r.evidence)) {
        errors.push(
          diagnostic('SCHEMA_TYPE', 'evidence must be an array', { path: `${p}.evidence` }),
        );
      } else {
        r.evidence.forEach((ev, j) => {
          const ep = `${p}.evidence[${j}]`;
          errors.push(...validateEvidenceRefShape(ev, ep));
          if (ev && typeof ev === 'object' && !Array.isArray(ev)) {
            const kind = /** @type {Record<string, unknown>} */ (ev).kind;
            if (typeof kind === 'string' && !EVIDENCE_KINDS.includes(kind)) {
              // already covered by validateEvidenceRefShape
            }
          }
        });
      }
      if (r.notes !== undefined && typeof r.notes !== 'string') {
        errors.push(
          diagnostic('SCHEMA_TYPE', 'notes must be a string when present', {
            path: `${p}.notes`,
          }),
        );
      }
    });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], bundle: /** @type {ExecutionBundle} */ (b) };
}
