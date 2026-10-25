import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { RECORDED_RUN_SCHEMA_VERSION, RUN_SCHEMA_VERSION } from './constants.mjs';
import { diagnostic, formatDiagnostics } from './diagnostics.mjs';
import { validateBundle } from './bundle.mjs';
import { validateCase } from './case.mjs';
import { aggregateOutcome } from './aggregate.mjs';
import { validateEvidenceList } from './evidence.mjs';
import { sha256File } from './hash.mjs';
import {
  atomicPublishRun,
  getRunsRoot,
  normalizeEvidenceDest,
  runExists,
  stageEvidenceFiles,
  writeManifest,
} from './store.mjs';

/**
 * Load a G3 case by ID from packageRoot/tests/cases/<id>.json
 * @param {string} packageRoot
 * @param {string} caseId
 */
export function loadCaseDefinition(packageRoot, caseId) {
  const path = join(packageRoot, 'tests', 'cases', `${caseId}.json`);
  if (!existsSync(path)) {
    return {
      ok: false,
      errors: [
        diagnostic('CASE_MISSING', `Case definition not found: tests/cases/${caseId}.json`, {
          path: `tests/cases/${caseId}.json`,
        }),
      ],
    };
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    return {
      ok: false,
      errors: [
        diagnostic('SCENARIO_JSON', `Invalid case JSON: ${caseId}`, {
          detail: String(err),
        }),
      ],
    };
  }
  return validateCase(raw, { path: `tests/cases/${caseId}.json`, packageRoot });
}

/**
 * Collect unique evidence refs from bundle results.
 * @param {import('./bundle.mjs').ExecutionBundle} bundle
 */
function collectEvidenceRefs(bundle) {
  /** @type {Array<{ kind: string, path: string }>} */
  const refs = [];
  const seen = new Set();
  for (const result of bundle.results) {
    for (const ev of result.evidence) {
      const key = `${ev.kind}::${ev.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push({ kind: ev.kind, path: ev.path });
    }
  }
  return refs;
}

/**
 * Record an execution bundle into the local run store.
 *
 * @param {{
 *   packageRoot: string,
 *   caseId: string,
 *   bundleDir: string,
 *   runsRoot?: string,
 *   hooks?: { failBeforePublish?: () => void },
 * }} opts
 */
export async function recordExecution(opts) {
  const packageRoot = resolve(opts.packageRoot);
  const bundleDir = resolve(opts.bundleDir);
  const runsRoot = opts.runsRoot ? resolve(opts.runsRoot) : getRunsRoot(packageRoot);

  const caseResult = loadCaseDefinition(packageRoot, opts.caseId);
  if (!caseResult.ok || !caseResult.case) {
    return { ok: false, errors: caseResult.errors, diagnosticsText: formatDiagnostics(caseResult.errors) };
  }
  const evalCase = caseResult.case;

  const bundlePath = join(bundleDir, 'bundle.json');
  if (!existsSync(bundlePath)) {
    const errors = [
      diagnostic('BUNDLE_MISSING', 'bundle.json not found in input directory', {
        path: 'bundle.json',
      }),
    ];
    return { ok: false, errors, diagnosticsText: formatDiagnostics(errors) };
  }

  let bundleRaw;
  try {
    bundleRaw = JSON.parse(readFileSync(bundlePath, 'utf8'));
  } catch (err) {
    const errors = [
      diagnostic('BUNDLE_JSON', 'Invalid bundle.json', { detail: String(err) }),
    ];
    return { ok: false, errors, diagnosticsText: formatDiagnostics(errors) };
  }

  const bundleResult = validateBundle(bundleRaw);
  if (!bundleResult.ok || !bundleResult.bundle) {
    return {
      ok: false,
      errors: bundleResult.errors,
      diagnosticsText: formatDiagnostics(bundleResult.errors),
    };
  }
  const bundle = bundleResult.bundle;

  if (bundle.caseId !== opts.caseId) {
    const errors = [
      diagnostic(
        'CASE_MISMATCH',
        `Bundle caseId "${bundle.caseId}" does not match --case "${opts.caseId}"`,
      ),
    ];
    return { ok: false, errors, diagnosticsText: formatDiagnostics(errors) };
  }

  // Criterion IDs must belong to the case.
  /** @type {import('./diagnostics.mjs').Diagnostic[]} */
  const idErrors = [];
  const caseCriterionIds = new Set(evalCase.criteria.map((c) => c.id));
  for (const r of bundle.results) {
    if (!caseCriterionIds.has(r.criterionId)) {
      idErrors.push(
        diagnostic(
          'UNKNOWN_CRITERION',
          `Result references unknown criterion "${r.criterionId}" for case ${opts.caseId}`,
          { path: r.criterionId },
        ),
      );
    }
  }
  if (idErrors.length) {
    return { ok: false, errors: idErrors, diagnosticsText: formatDiagnostics(idErrors) };
  }

  // Validate evidence existence under the bundle root (do not execute files).
  for (const [i, r] of bundle.results.entries()) {
    const ev = validateEvidenceList(r.evidence, bundleDir, `results[${i}].evidence`);
    if (!ev.ok) {
      return { ok: false, errors: ev.errors, diagnosticsText: formatDiagnostics(ev.errors) };
    }
  }

  if (runExists(runsRoot, bundle.runId)) {
    const errors = [
      diagnostic('RUN_EXISTS', `Run ID already exists: ${bundle.runId}`, {
        path: bundle.runId,
      }),
    ];
    return { ok: false, errors, diagnosticsText: formatDiagnostics(errors) };
  }

  // Evaluate using G2 semantics against the bundle root as evaluation root.
  const runRecord = {
    schemaVersion: RUN_SCHEMA_VERSION,
    id: bundle.runId,
    scenarioId: bundle.caseId,
    startedAt: bundle.executedAt,
    skillVersion: bundle.skillVersion,
    results: bundle.results.map((r) => ({
      criterionId: r.criterionId,
      status: r.status,
      evidence: r.evidence,
      ...(r.notes ? { notes: r.notes } : {}),
      ...(r.notApplicableJustification
        ? { notApplicableJustification: r.notApplicableJustification }
        : {}),
    })),
  };

  const aggregation = aggregateOutcome(evalCase, runRecord, bundleDir);

  const refs = collectEvidenceRefs(bundle);

  const published = await atomicPublishRun(
    runsRoot,
    bundle.runId,
    async (staging) => {
      const staged = await stageEvidenceFiles(refs, bundleDir, staging);
      if (!staged.ok) {
        throw Object.assign(new Error(formatDiagnostics(staged.errors)), {
          code: 'EVIDENCE_STAGE',
          errors: staged.errors,
        });
      }

      // Remap result evidence paths to stored relative paths.
      const results = bundle.results.map((r) => ({
        criterionId: r.criterionId,
        status: r.status,
        evidence: r.evidence.map((e) => {
          const dest = normalizeEvidenceDest(e.path);
          return {
            kind: e.kind,
            path: dest.ok ? dest.destRel : e.path,
          };
        }),
        ...(r.notes ? { notes: r.notes } : {}),
        ...(r.notApplicableJustification
          ? { notApplicableJustification: r.notApplicableJustification }
          : {}),
      }));

      // Re-aggregate against staging so stored aggregation matches staged files.
      const stagedRun = {
        ...runRecord,
        results,
      };
      const stagedAgg = aggregateOutcome(evalCase, stagedRun, staging);

      /** @type {object} */
      const manifest = {
        schemaVersion: RECORDED_RUN_SCHEMA_VERSION,
        runId: bundle.runId,
        caseId: bundle.caseId,
        skillVersion: bundle.skillVersion,
        agent: {
          product: bundle.agent.product ?? 'unknown',
          model: bundle.agent.model ?? 'unknown',
        },
        executedAt: bundle.executedAt,
        fixtureRevision: bundle.fixtureRevision,
        recordedAt: new Date().toISOString(),
        notes: bundle.notes ?? '',
        limitations: bundle.limitations ?? [],
        trustNote:
          'Evidence kinds, paths and SHA-256 hashes prove integrity of stored bytes after import. They do not prove authenticity of claimed agent actions, tool traces, or that an agent actually performed the described work. Operators must sanitize traces/logs before ingestion.',
        results,
        aggregation: {
          outcome: stagedAgg.outcome,
          reasons: stagedAgg.reasons,
          criteria: stagedAgg.criteria,
        },
        evidenceInventory: staged.inventory,
        caseSnapshot: {
          id: evalCase.id,
          title: evalCase.title,
          mode: evalCase.mode,
          expectedWorkflow: evalCase.expectedWorkflow,
          criteria: evalCase.criteria,
        },
      };

      // Verify inventory hashes still match staged files before publish.
      for (const item of staged.inventory) {
        const abs = join(staging, item.storedPath);
        const actual = await sha256File(abs);
        if (actual !== item.sha256) {
          throw Object.assign(new Error(`Hash mismatch while staging ${item.storedPath}`), {
            code: 'INTEGRITY',
          });
        }
      }

      writeManifest(staging, manifest);
    },
    opts.hooks,
  );

  if (!published.ok) {
    // Prefer staging evidence errors when present
    const errors = published.errors;
    return { ok: false, errors, diagnosticsText: formatDiagnostics(errors) };
  }

  return {
    ok: true,
    errors: [],
    runId: bundle.runId,
    runDir: published.runDir,
    outcome: aggregation.outcome,
    diagnosticsText: '',
  };
}
