# Evaluation Harness (EH-001) — G2 Core

Offline, deterministic evaluation core for Internationalization Engineering. It validates contracts, evidence provenance, and outcome aggregation. It does **not** run agents, call LLMs, or score quality as a percentage.

**Runtime:** Node.js **24 LTS** minimum (`engines.node >=24`) and native **`node:test`** only — no third-party test or schema frameworks. Supported release verification target is Node 24 LTS.

## Generic core vs i18n-specific scenarios

| Layer | Role |
| --- | --- |
| **Generic evaluation core** | Schema validation, evidence path safety, verification-method compatibility, deterministic outcome aggregation, structural package checks, CLI. Domain-agnostic contracts (`eh.scenario.v1`, `eh.run.v1`, evidence kinds, global outcomes). |
| **i18n-specific scenarios** | Case definitions under `tests/cases/`, prompts under `tests/prompts/`, synthetic fixtures under `tests/fixtures/`, and evaluator-only guides under `tests/guides/`. |

G2 shipped the generic core. **G3** adds the i18n scenario suite (synthetic only — no private project copies).

## Architecture and responsibilities

| Layer | Responsibility |
| --- | --- |
| `lib/eval/scenario.mjs` | Scenario + criterion schema validation |
| `lib/eval/run.mjs` | Run records + per-criterion result schema |
| `lib/eval/evidence.mjs` | Evidence kinds, path safety, verification compatibility |
| `lib/eval/aggregate.mjs` | Deterministic global outcomes |
| `lib/eval/structural.mjs` | Read-only skill package structural checks |
| `lib/eval/case.mjs` | G3 case packaging (`expectedWorkflow`, prompt/fixture paths) on top of `eh.scenario.v1` |
| `lib/eval/bundle.mjs` | G4 execution-bundle schema (`eh.bundle.v1`) |
| `lib/eval/store.mjs` | G4 run store, staging, SHA-256 inventory, atomic publish |
| `lib/eval/record.mjs` | G4 `record` orchestration |
| `lib/eval/report.mjs` | G4 integrity check + deterministic report |
| `bin/eval.mjs` | CLI (`validate`, `record`, `report`, `--help`) |

The installed Cursor skill payload remains `SKILL.md` + `references/` only (via `bin/install.mjs`). The harness lives in the package repository for maintainers and CI.

## Human approval gates (G1–G5)

EH-001 advances only with explicit human approval at each gate. Do not start the next gate without authorization.

| Gate | Purpose |
| --- | --- |
| **G1** | Technical specification and approved design decisions |
| **G2** | Deterministic evaluation core (this document’s implementation scope) |
| **G3** | Synthetic i18n scenario fixtures (still offline; no private repos) |
| **G4** | Evidence recording & reporting (`record` / `report`) |
| **G5** | Final validation, packaging, and release readiness |

**v0.3.0 constraint:** no autonomous agent execution in the harness through G5. Agents may be evaluated externally; the harness does not drive them.

## Schema examples

Stable versions:

- Scenario: `eh.scenario.v1`
- Run: `eh.run.v1`
- Criterion result: `eh.criterion_result.v1` (optional on each result)
- Evidence ref: `eh.evidence_ref.v1` (optional on each ref)

### Scenario

```json
{
  "schemaVersion": "eh.scenario.v1",
  "id": "GF-PLAN-1",
  "title": "Greenfield planning stays read-only",
  "mode": "behavioral",
  "description": "Synthetic scenario example",
  "criteria": [
    {
      "id": "GF-PLAN-1.READONLY",
      "description": "Working tree unchanged",
      "severity": "critical",
      "verificationMethod": "git_diff"
    },
    {
      "id": "GF-PLAN-1.TRACE",
      "description": "Greenfield reference was read",
      "severity": "major",
      "verificationMethod": "trace"
    }
  ]
}
```

Modes: `structural` | `behavioral` | `integration`  
Severities: `critical` | `major` | `minor`  
Verification methods: `static` | `trace` | `git_diff` | `command` | `human_review`

`mandatory` defaults to `true` for critical/major and `false` for minor.

### Run record

```json
{
  "schemaVersion": "eh.run.v1",
  "id": "run-001",
  "scenarioId": "GF-PLAN-1",
  "startedAt": "2026-10-24T12:00:00Z",
  "skillVersion": "0.2.3",
  "results": [
    {
      "criterionId": "GF-PLAN-1.READONLY",
      "status": "pass",
      "evidence": [
        { "kind": "git_diff", "path": "evidence/tree.diff" }
      ]
    }
  ]
}
```

Criterion statuses: `pass` | `fail` | `inconclusive` | `not_run` | `not_applicable`

## Evidence provenance

Evidence is mandatory for verified outcomes. Kinds: `agent_report` | `tool_trace` | `git_diff` | `command_result` | `file_snapshot` | `human_attestation`

Rules:

- Every reference has an explicit `kind` and relative `path`.
- Paths are resolved under an evaluation root; missing files are rejected.
- Paths that escape the root (including symlink traversal) are rejected.
- Unknown kinds are rejected.
- Evidence file contents are never executed.
- An agent report claiming an action is **not** treated as proof that the action occurred.
- A declared `pass` without compatible evidence is not a verified pass.

### Verified-pass compatibility (explicit policy, not a score)

| Method | Compatible evidence for verified `pass` |
| --- | --- |
| `static` | `file_snapshot`, `git_diff`, `command_result` |
| `trace` | `tool_trace` |
| `git_diff` | `git_diff` |
| `command` | `command_result` |
| `human_review` | `human_attestation` |

A declared `pass` backed only by `agent_report` is **not** a verified pass for `trace`, `git_diff`, or `command`.

## Outcome aggregation

Global outcomes (no numeric quality scores):

| Outcome | Meaning |
| --- | --- |
| `PASS` | All applicable criteria verified pass |
| `PASS_WITH_LIMITATIONS` | Critical criteria verified pass; minor failures or noncritical incomplete checks documented |
| `FAIL` | Confirmed failure of a critical or major criterion |
| `INCONCLUSIVE` | Missing/insufficient evidence for a critical criterion (and no confirmed critical/major fail) |
| `INVALID` | Invalid scenario/run/evidence structure, or mandatory `not_applicable` without valid use |

Ordering of criteria does not affect the outcome. `not_applicable` requires justification and must not conceal mandatory criteria.

## CLI usage

Always **`record` before `report`** for a given `runId`. `report` alone fails with `RUN_MISSING` if that run was never imported into the run store (default `eval-runs/`).

```bash
node bin/eval.mjs --help
node bin/eval.mjs validate
node bin/eval.mjs validate --root /path/to/package

# Import then report (order matters)
node bin/eval.mjs record --case NEG-001 --input docs/examples/execution-bundle
node bin/eval.mjs report --run example-neg-001-2026-10-24
node bin/eval.mjs report --run example-neg-001-2026-10-24 --json

npm run eval:structural
npm test
```

`validate` is read-only. `record` / `report` never execute agents. Nonzero exit codes on failure. Tests use native `node:test`.

The synthetic bundle under `docs/examples/execution-bundle/` may aggregate to a machine **`PASS`**. That outcome is **illustrative only**—it is not an independently verified coding-agent execution. Do not treat it as certification. Preserve real operator recordings that are `INCONCLUSIVE` or `FAIL` as recorded.

## G4 — Evidence recording and reporting

### Execution bundle (`eh.bundle.v1`)

Operator-prepared directory containing `bundle.json` plus evidence files. Paths in the bundle are relative to the bundle directory. Synthetic example: `docs/examples/execution-bundle/`.

Required fields: `runId`, `caseId`, `skillVersion`, `agent` (`product`/`model` or `"unknown"`), `executedAt`, `fixtureRevision`, `results[]` with per-criterion `status` and `evidence[]` (`kind` + `path`).

A bundle must **not** be treated as an automatic PASS based on the agent’s final narrative alone.

### Import workflow

1. Manually run a G3 case (fresh conversation; collect sanitized evidence).
2. Build a bundle directory with statuses and evidence references.
3. `node bin/eval.mjs record --case <ID> --input <bundle-dir>`
4. Harness validates case + bundle, checks evidence paths, applies G2 aggregation, copies evidence into a staging directory with SHA-256 inventory, writes `manifest.json`, then atomically publishes `eval-runs/<runId>/`.
5. Duplicate `runId` is rejected without modifying the existing run.
6. Failures clean staging; no partial published run.

### Report workflow

1. `node bin/eval.mjs report --run <runId>` (add `--json` for machine-readable output).
2. Loads `eval-runs/<runId>/manifest.json`.
3. Re-verifies every inventory SHA-256. On mismatch → **integrity failure** (no stale PASS).
4. Re-applies G2 aggregation against stored evidence.
5. Prints outcome, every criterion, evidence kinds/paths, limitations, and the trust note.

### Storage layout

```text
eval-runs/                 # gitignored local store
  <runId>/
    manifest.json          # eh.recorded_run.v1
    evidence/...           # imported files (never executed)
```

Override with `--runs-dir` for tests or alternate stores.

### Integrity and provenance model

- SHA-256 is computed at import (streaming) and checked on report.
- Each evidence file must be ≤ **10 MiB** (`MAX_EVIDENCE_FILE_BYTES`); size is checked via `stat` before hash/copy so oversized files are rejected without loading the whole file into memory.
- Labels (`tool_trace`, etc.) describe claimed evidence kind; they are **not** proof of authenticity.
- `agent_report` alone cannot verify `trace` / `git_diff` / `command` criteria.
- Operators must sanitize traces/logs before ingestion; the harness does not call networks or scrape private repos.
- Report re-aggregates from stored results + evidence; editing `manifest.json` outcome fields alone cannot resurrect a verified PASS if evidence/compatibility rules disagree. Tampered evidence bytes fail integrity checks.

### Trust limitations

No telemetry, no external services, no shell execution from bundles, no automatic import of private project trees. Sanitize before ingest.

**Residual risks (accepted for v0.3.0):** concurrent `record` of the same `runId` relies on exists-check + atomic rename (no cross-process lock file); a rare race could theoretically collide on exotic filesystems — operators should not parallelize identical run IDs. Evidence size caps mitigate local DoS; they are not a sandbox. Hashes prove stored-byte integrity after import, not that an agent truly produced the artifact.

## G3 scenario inventory

Cases use `eh.scenario.v1` plus packaging fields: `expectedWorkflow`, `promptPath`, `fixturePath`, optional `evaluatorGuidePath`.

| ID | Expected workflow | Fixture | Focus |
| --- | --- | --- | --- |
| `GF-001` | `greenfield` | `tests/fixtures/GF-001` | New Next.js app; Track I planning; read-only |
| `AU-001` | `audit` | `tests/fixtures/AU-001` | Hard-coded UI / formatting / errors; read-only audit |
| `MI-001` | `migration` | `tests/fixtures/MI-001` | Web + API + contracts monorepo; plan only |
| `MA-001` | `maintenance` | `tests/fixtures/MA-001` | Established catalog; small enhancement plan + approval gate |
| `NEG-001` | `none` | `tests/fixtures/NEG-001` | TS/ESLint review; skill must not activate |

Evaluator guides in `tests/guides/` document intentional defects. **Do not** give guides to the evaluated agent as an answer key. Historical human trials remain in `tests/workflow-evals.md`.

**G3 does not execute coding agents and does not certify their behavior.** Cases are prepared for manual runs; record/report are G4. No scenario is pre-marked PASS.

### Manual execution procedure

1. Install the skill into an isolated project if needed (`node bin/install.mjs install` in a temp cwd — not required to mutate the global install).
2. Open a **fresh** agent conversation (no prior chat context).
3. Set the workspace / cwd to the case fixture directory (`tests/fixtures/<ID>`), or copy the fixture to a disposable sandbox.
4. Paste **only** the corresponding `tests/prompts/<ID>.md` content as the user message. Do not paste the evaluator guide.
5. Allow the agent to work under the prompt constraints (read-only unless a later approved phase says otherwise).
6. When finished, collect evidence for G4 (do not invent pass/fail without it):
   - Tool / file-read **trace** (which skill/workflow files were opened).
   - Independent **`git status` / `git diff`** of the fixture (or sandbox) before vs after.
   - Relevant **command outputs** if any were authorized.
   - Agent report text as `agent_report` (supporting, not sole proof for `trace` / `git_diff` / `command`).
   - Human attestation notes for `human_review` criteria.
7. Assemble an `eh.bundle.v1` directory and import with `record`; produce the report with `report`.

Automatic activation / non-activation claims require a **tool_trace**, not the agent’s word alone.

## Limitations (G2–G4)

- No autonomous agent execution (also forbidden for v0.3.0 through G5).
- No LLM judges or external services.
- G3 prepares cases/fixtures; G4 imports operator bundles and reports — neither certifies agents by itself.
- Historical human protocol remains in `tests/workflow-evals.md` (not imported as machine results).
- Evidence integrity ≠ authenticity of agent actions.

## G5 readiness requirements

G5 is the harness program gate for **final validation, packaging, and release readiness** of the Evaluation Harness itself. The skill's **v0.3.0 experimental GitHub release** may ship while G5 checklist items continue to be reviewed; do not equate a git tag with closed G5 unless maintainers explicitly say so.

Before treating G5 as closed, require human approval after G4 and confirm:

- Documented operator workflow for sanitize → record → report.
- Gitignored `eval-runs/` not shipped as skill payload (`install.mjs` still copies only `SKILL.md` + `references/`).
- No autonomous execution in release packaging.
- Version/release checklist separate from evaluation outcomes.
