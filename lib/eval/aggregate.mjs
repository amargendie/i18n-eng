import { validateRun } from './run.mjs';
import { validateScenario } from './scenario.mjs';
import {
  hasCompatibleEvidenceForVerifiedPass,
  unverifiedPassReason,
  validateEvidenceList,
} from './evidence.mjs';
import { diagnostic } from './diagnostics.mjs';

/**
 * @typedef {import('./scenario.mjs').Scenario} Scenario
 * @typedef {import('./scenario.mjs').Criterion} Criterion
 * @typedef {import('./run.mjs').RunRecord} RunRecord
 * @typedef {import('./run.mjs').CriterionResult} CriterionResult
 * @typedef {import('./diagnostics.mjs').Diagnostic} Diagnostic
 */

/**
 * @typedef {{
 *   criterionId: string,
 *   severity: string,
 *   mandatory: boolean,
 *   verificationMethod: string,
 *   declaredStatus: string,
 *   effectiveStatus: string,
 *   verified: boolean,
 *   limitations: string[],
 *   diagnostics: Diagnostic[],
 * }} CriterionEvaluation
 *
 * @typedef {{
 *   outcome: 'PASS' | 'PASS_WITH_LIMITATIONS' | 'FAIL' | 'INCONCLUSIVE' | 'INVALID',
 *   reasons: string[],
 *   criteria: CriterionEvaluation[],
 *   diagnostics: Diagnostic[],
 * }} AggregationResult
 */

/**
 * Normalize a criterion result against evidence compatibility.
 * Declared pass without compatible evidence is not a verified pass.
 *
 * @param {Criterion} criterion
 * @param {CriterionResult | undefined} result
 * @param {string} evaluationRoot
 * @returns {CriterionEvaluation}
 */
export function evaluateCriterion(criterion, result, evaluationRoot) {
  /** @type {Diagnostic[]} */
  const diagnostics = [];
  /** @type {string[]} */
  const limitations = [];
  const mandatory =
    criterion.mandatory !== undefined
      ? criterion.mandatory
      : criterion.severity === 'critical' || criterion.severity === 'major';

  if (!result) {
    return {
      criterionId: criterion.id,
      severity: criterion.severity,
      mandatory,
      verificationMethod: criterion.verificationMethod,
      declaredStatus: 'not_run',
      effectiveStatus: 'not_run',
      verified: false,
      limitations,
      diagnostics: [
        diagnostic('CRITERION_NOT_RUN', `No result recorded for criterion "${criterion.id}"`, {
          path: criterion.id,
        }),
      ],
    };
  }

  const declaredStatus = result.status;
  let effectiveStatus = declaredStatus;
  let verified = false;

  if (declaredStatus === 'not_applicable') {
    if (!result.notApplicableJustification?.trim()) {
      diagnostics.push(
        diagnostic(
          'NA_JUSTIFICATION',
          'not_applicable requires justification',
          { path: criterion.id },
        ),
      );
      effectiveStatus = 'invalid';
    } else if (mandatory) {
      diagnostics.push(
        diagnostic(
          'NA_MANDATORY',
          `Mandatory criterion "${criterion.id}" cannot be marked not_applicable`,
          { path: criterion.id },
        ),
      );
      effectiveStatus = 'invalid';
    }
    return {
      criterionId: criterion.id,
      severity: criterion.severity,
      mandatory,
      verificationMethod: criterion.verificationMethod,
      declaredStatus,
      effectiveStatus,
      verified: false,
      limitations,
      diagnostics,
    };
  }

  const ev = validateEvidenceList(result.evidence ?? [], evaluationRoot, `${criterion.id}.evidence`);
  diagnostics.push(...ev.errors);

  if (ev.errors.length) {
    // Invalid evidence structure / missing / escape → do not treat as verified anything.
    if (declaredStatus === 'fail') {
      // Unconfirmed fail when evidence is invalid.
      effectiveStatus = 'inconclusive';
      limitations.push('Declared fail discarded because evidence was invalid or missing');
    } else if (declaredStatus === 'pass') {
      effectiveStatus = 'inconclusive';
      limitations.push('Declared pass discarded because evidence was invalid or missing');
    }
    return {
      criterionId: criterion.id,
      severity: criterion.severity,
      mandatory,
      verificationMethod: criterion.verificationMethod,
      declaredStatus,
      effectiveStatus,
      verified: false,
      limitations,
      diagnostics,
    };
  }

  if (declaredStatus === 'pass') {
    if (hasCompatibleEvidenceForVerifiedPass(criterion.verificationMethod, ev.refs)) {
      verified = true;
      effectiveStatus = 'pass';
    } else {
      const reason =
        unverifiedPassReason(criterion.verificationMethod, ev.refs) ??
        'Declared pass lacks compatible evidence';
      diagnostics.push(
        diagnostic('UNVERIFIED_PASS', reason, { path: criterion.id }),
      );
      effectiveStatus = 'inconclusive';
      limitations.push(reason);
      verified = false;
    }
  } else if (declaredStatus === 'fail') {
    // Confirmed fail requires at least one existing evidence file (already validated).
    if (ev.refs.length === 0) {
      diagnostics.push(
        diagnostic(
          'UNCONFIRMED_FAIL',
          `Declared fail for "${criterion.id}" has no evidence`,
          { path: criterion.id },
        ),
      );
      effectiveStatus = 'inconclusive';
      limitations.push('Declared fail without evidence is not a confirmed failure');
    } else {
      verified = true;
      effectiveStatus = 'fail';
    }
  } else if (declaredStatus === 'inconclusive' || declaredStatus === 'not_run') {
    effectiveStatus = declaredStatus;
  }

  return {
    criterionId: criterion.id,
    severity: criterion.severity,
    mandatory,
    verificationMethod: criterion.verificationMethod,
    declaredStatus,
    effectiveStatus,
    verified,
    limitations,
    diagnostics,
  };
}

/**
 * Deterministic outcome aggregation (order-independent).
 *
 * Rules:
 * 1. Confirmed critical/major fail → FAIL
 * 2. Missing/insufficient evidence for critical → INCONCLUSIVE (unless FAIL already)
 * 3. All applicable criteria verified pass → PASS
 * 4. Minor confirmed fails or noncritical incomplete → PASS_WITH_LIMITATIONS
 * 5. Invalid structure / invalid mandatory N/A → INVALID
 * 6. not_applicable justified and non-mandatory only
 * 7. Declared pass without compatible evidence ≠ verified pass
 *
 * @param {Scenario} scenario
 * @param {RunRecord} run
 * @param {string} evaluationRoot
 * @returns {AggregationResult}
 */
export function aggregateOutcome(scenario, run, evaluationRoot) {
  /** @type {Diagnostic[]} */
  const diagnostics = [];
  /** @type {string[]} */
  const reasons = [];

  // Sort criteria by id for deterministic processing / output.
  const criteriaSorted = [...scenario.criteria].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );

  const resultById = new Map(run.results.map((r) => [r.criterionId, r]));
  const evaluations = criteriaSorted.map((c) =>
    evaluateCriterion(c, resultById.get(c.id), evaluationRoot),
  );

  for (const ev of evaluations) diagnostics.push(...ev.diagnostics);

  const hasInvalid = evaluations.some((e) => e.effectiveStatus === 'invalid');
  if (hasInvalid) {
    reasons.push('Invalid criterion status or unjustified/mandatory not_applicable');
    return {
      outcome: 'INVALID',
      reasons,
      criteria: evaluations,
      diagnostics,
    };
  }

  const confirmedFailCriticalOrMajor = evaluations.some(
    (e) =>
      e.effectiveStatus === 'fail' &&
      e.verified &&
      (e.severity === 'critical' || e.severity === 'major'),
  );
  if (confirmedFailCriticalOrMajor) {
    reasons.push('Confirmed failure of a critical or major criterion');
    return {
      outcome: 'FAIL',
      reasons,
      criteria: evaluations,
      diagnostics,
    };
  }

  const criticalInsufficient = evaluations.some(
    (e) =>
      e.severity === 'critical' &&
      (e.effectiveStatus === 'not_run' ||
        e.effectiveStatus === 'inconclusive' ||
        (e.declaredStatus === 'pass' && !e.verified)),
  );
  if (criticalInsufficient) {
    reasons.push('Missing or insufficient evidence for a critical criterion');
    return {
      outcome: 'INCONCLUSIVE',
      reasons,
      criteria: evaluations,
      diagnostics,
    };
  }

  const applicable = evaluations.filter((e) => e.effectiveStatus !== 'not_applicable');
  const allVerifiedPass =
    applicable.length > 0 &&
    applicable.every((e) => e.effectiveStatus === 'pass' && e.verified);

  const minorFail = evaluations.some(
    (e) => e.effectiveStatus === 'fail' && e.verified && e.severity === 'minor',
  );
  const majorInsufficient = evaluations.some(
    (e) =>
      e.severity === 'major' &&
      (e.effectiveStatus === 'not_run' ||
        e.effectiveStatus === 'inconclusive' ||
        (e.declaredStatus === 'pass' && !e.verified)),
  );
  const minorIncomplete = evaluations.some(
    (e) =>
      e.severity === 'minor' &&
      (e.effectiveStatus === 'not_run' || e.effectiveStatus === 'inconclusive'),
  );

  if (allVerifiedPass && !minorFail) {
    reasons.push('All applicable criteria passed with sufficient compatible evidence');
    return {
      outcome: 'PASS',
      reasons,
      criteria: evaluations,
      diagnostics,
    };
  }

  if (minorFail || majorInsufficient || minorIncomplete) {
    if (minorFail) reasons.push('Minor confirmed failure documented');
    if (majorInsufficient) reasons.push('Noncritical (major) check incomplete or unverified');
    if (minorIncomplete) reasons.push('Minor check incomplete');
    // Guard: if any major has confirmed fail we already returned FAIL.
    // If critical were insufficient we already returned INCONCLUSIVE.
    // Major incomplete with all critical verified pass → PASS_WITH_LIMITATIONS
    const criticalOk = evaluations
      .filter((e) => e.severity === 'critical' && e.effectiveStatus !== 'not_applicable')
      .every((e) => e.effectiveStatus === 'pass' && e.verified);
    if (criticalOk) {
      return {
        outcome: 'PASS_WITH_LIMITATIONS',
        reasons,
        criteria: evaluations,
        diagnostics,
      };
    }
  }

  // Fallback: major confirmed... already handled. Remaining edge → INCONCLUSIVE
  reasons.push('Unable to confirm overall pass with available evidence');
  return {
    outcome: 'INCONCLUSIVE',
    reasons,
    criteria: evaluations,
    diagnostics,
  };
}

/**
 * Validate inputs then aggregate. Invalid scenario/run/evidence structure → INVALID.
 *
 * @param {unknown} scenarioRaw
 * @param {unknown} runRaw
 * @param {string} evaluationRoot
 * @returns {AggregationResult}
 */
export function evaluateRun(scenarioRaw, runRaw, evaluationRoot) {
  const scenarioResult = validateScenario(scenarioRaw);
  if (!scenarioResult.ok || !scenarioResult.scenario) {
    return {
      outcome: 'INVALID',
      reasons: ['Invalid scenario structure'],
      criteria: [],
      diagnostics: scenarioResult.errors,
    };
  }

  const runResult = validateRun(runRaw, {
    scenario: scenarioResult.scenario,
    evaluationRoot,
  });
  if (!runResult.ok || !runResult.run) {
    return {
      outcome: 'INVALID',
      reasons: ['Invalid run or evidence structure'],
      criteria: [],
      diagnostics: runResult.errors,
    };
  }

  return aggregateOutcome(scenarioResult.scenario, runResult.run, evaluationRoot);
}
