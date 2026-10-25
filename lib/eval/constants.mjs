/** Stable Evaluation Harness (EH-001) contract identifiers — G2. */

export const SCENARIO_SCHEMA_VERSION = 'eh.scenario.v1';
export const RUN_SCHEMA_VERSION = 'eh.run.v1';
export const CRITERION_RESULT_SCHEMA_VERSION = 'eh.criterion_result.v1';
export const EVIDENCE_REF_SCHEMA_VERSION = 'eh.evidence_ref.v1';
export const BUNDLE_SCHEMA_VERSION = 'eh.bundle.v1';
export const RECORDED_RUN_SCHEMA_VERSION = 'eh.recorded_run.v1';

/** Default relative store for imported evaluation runs (gitignored). */
export const DEFAULT_RUNS_DIRNAME = 'eval-runs';

/** Conservative max size per evidence file (10 MiB). Checked via stat before hash/copy. */
export const MAX_EVIDENCE_FILE_BYTES = 10 * 1024 * 1024;

export const MODES = Object.freeze(['structural', 'behavioral', 'integration']);
export const SEVERITIES = Object.freeze(['critical', 'major', 'minor']);
export const VERIFICATION_METHODS = Object.freeze([
  'static',
  'trace',
  'git_diff',
  'command',
  'human_review',
]);
export const CRITERION_STATUSES = Object.freeze([
  'pass',
  'fail',
  'inconclusive',
  'not_run',
  'not_applicable',
]);
export const EVIDENCE_KINDS = Object.freeze([
  'agent_report',
  'tool_trace',
  'git_diff',
  'command_result',
  'file_snapshot',
  'human_attestation',
]);
export const GLOBAL_OUTCOMES = Object.freeze([
  'PASS',
  'PASS_WITH_LIMITATIONS',
  'FAIL',
  'INCONCLUSIVE',
  'INVALID',
]);

/**
 * Explicit verification ↔ evidence compatibility for a *verified* pass.
 * `agent_report` alone never verifies trace / git_diff / command.
 */
export const VERIFIED_PASS_EVIDENCE = Object.freeze({
  static: Object.freeze(['file_snapshot', 'git_diff', 'command_result']),
  trace: Object.freeze(['tool_trace']),
  git_diff: Object.freeze(['git_diff']),
  command: Object.freeze(['command_result']),
  human_review: Object.freeze(['human_attestation']),
});

export const REQUIRED_SKILL_FILES = Object.freeze([
  'SKILL.md',
  'references/principles.md',
  'references/greenfield.md',
  'references/audit.md',
  'references/migration.md',
  'references/maintenance.md',
  'bin/install.mjs',
]);

export const REQUIRED_WORKFLOW_REFS = Object.freeze([
  'references/principles.md',
  'references/greenfield.md',
  'references/audit.md',
  'references/migration.md',
  'references/maintenance.md',
]);
