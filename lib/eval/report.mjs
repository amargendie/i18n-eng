import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { diagnostic, formatDiagnostics } from './diagnostics.mjs';
import { aggregateOutcome } from './aggregate.mjs';
import { RUN_SCHEMA_VERSION } from './constants.mjs';
import {
  getRunDir,
  getRunsRoot,
  loadManifest,
  verifyEvidenceIntegrity,
} from './store.mjs';

/**
 * @typedef {{
 *   ok: boolean,
 *   integrityOk: boolean,
 *   outcome?: string,
 *   report?: object,
 *   text?: string,
 *   errors: import('./diagnostics.mjs').Diagnostic[],
 *   diagnosticsText: string,
 * }} ReportResult
 */

/**
 * Build a human-readable report string (does not dump evidence file contents).
 * @param {object} report
 */
export function formatReportText(report) {
  if (report.integrityFailure) {
    return [
      'INTEGRITY FAILURE — stored evidence no longer matches recorded SHA-256 hashes.',
      'Refusing to display a prior PASS/outcome as verified.',
      formatDiagnostics(report.integrityErrors || []),
    ].join('\n');
  }

  const lines = [];
  lines.push(`Evaluation report — run ${report.runId}`);
  lines.push(`Case: ${report.caseId}`);
  lines.push(`Outcome: ${report.outcome}`);
  lines.push(`Skill version: ${report.skillVersion}`);
  lines.push(
    `Agent: product=${report.agent?.product ?? 'unknown'} model=${report.agent?.model ?? 'unknown'}`,
  );
  lines.push(`Fixture revision: ${report.fixtureRevision}`);
  lines.push(`Executed at: ${report.executedAt}`);
  lines.push(`Recorded at: ${report.recordedAt}`);
  if (report.reasons?.length) {
    lines.push('Reasons:');
    for (const r of report.reasons) lines.push(`  - ${r}`);
  }
  lines.push('Criteria:');
  for (const c of report.criteria || []) {
    lines.push(
      `  [${c.effectiveStatus}] ${c.criterionId} (${c.severity}, ${c.verificationMethod}` +
        `${c.verified ? ', verified' : ', not verified'})`,
    );
    if (c.declaredStatus !== c.effectiveStatus) {
      lines.push(`    declared: ${c.declaredStatus}`);
    }
    for (const lim of c.limitations || []) {
      lines.push(`    limitation: ${lim}`);
    }
    for (const ev of c.evidence || []) {
      lines.push(`    evidence: kind=${ev.kind} path=${ev.path}`);
    }
  }
  lines.push('Trust:');
  lines.push(`  ${report.trustNote}`);
  if (report.limitations?.length) {
    lines.push('Run limitations:');
    for (const lim of report.limitations) lines.push(`  - ${lim}`);
  }
  return lines.join('\n');
}

/**
 * Generate a report for a recorded run.
 *
 * @param {{
 *   packageRoot: string,
 *   runId: string,
 *   runsRoot?: string,
 *   json?: boolean,
 * }} opts
 * @returns {Promise<ReportResult>}
 */
export async function reportExecution(opts) {
  const packageRoot = resolve(opts.packageRoot);
  const runsRoot = opts.runsRoot ? resolve(opts.runsRoot) : getRunsRoot(packageRoot);
  const runDir = getRunDir(runsRoot, opts.runId);

  if (!existsSync(join(runDir, 'manifest.json'))) {
    const errors = [
      diagnostic('RUN_MISSING', `Recorded run not found: ${opts.runId}`, {
        path: opts.runId,
      }),
    ];
    return {
      ok: false,
      integrityOk: false,
      errors,
      diagnosticsText: formatDiagnostics(errors),
    };
  }

  let manifest;
  try {
    manifest = loadManifest(runDir);
  } catch (err) {
    const errors = [
      diagnostic('MANIFEST', err instanceof Error ? err.message : String(err)),
    ];
    return {
      ok: false,
      integrityOk: false,
      errors,
      diagnosticsText: formatDiagnostics(errors),
    };
  }

  const integrity = await verifyEvidenceIntegrity(runDir, manifest.evidenceInventory || []);
  if (!integrity.ok) {
    const report = {
      integrityFailure: true,
      integrityErrors: integrity.errors,
      runId: manifest.runId,
      caseId: manifest.caseId,
    };
    return {
      ok: false,
      integrityOk: false,
      errors: integrity.errors,
      diagnosticsText: formatDiagnostics(integrity.errors),
      report,
      text: formatReportText(report),
      outcome: 'INTEGRITY_FAILURE',
    };
  }

  const caseSnapshot = manifest.caseSnapshot;
  if (!caseSnapshot?.criteria) {
    const errors = [
      diagnostic('MANIFEST', 'Recorded manifest missing caseSnapshot.criteria'),
    ];
    return {
      ok: false,
      integrityOk: true,
      errors,
      diagnosticsText: formatDiagnostics(errors),
    };
  }

  const runRecord = {
    schemaVersion: RUN_SCHEMA_VERSION,
    id: manifest.runId,
    scenarioId: manifest.caseId,
    startedAt: manifest.executedAt,
    skillVersion: manifest.skillVersion,
    results: manifest.results,
  };

  // Re-apply G2 aggregation against stored evidence (paths relative to runDir).
  const aggregation = aggregateOutcome(caseSnapshot, runRecord, runDir);

  const evidenceByCriterion = new Map(
    (manifest.results || []).map((r) => [r.criterionId, r.evidence || []]),
  );

  const report = {
    integrityFailure: false,
    runId: manifest.runId,
    caseId: manifest.caseId,
    skillVersion: manifest.skillVersion,
    agent: manifest.agent,
    fixtureRevision: manifest.fixtureRevision,
    executedAt: manifest.executedAt,
    recordedAt: manifest.recordedAt,
    outcome: aggregation.outcome,
    reasons: aggregation.reasons,
    limitations: manifest.limitations || [],
    notes: manifest.notes || '',
    trustNote: manifest.trustNote,
    criteria: aggregation.criteria.map((c) => ({
      ...c,
      evidence: evidenceByCriterion.get(c.criterionId) || [],
    })),
  };

  return {
    ok: true,
    integrityOk: true,
    errors: [],
    diagnosticsText: '',
    outcome: aggregation.outcome,
    report,
    text: formatReportText(report),
  };
}
