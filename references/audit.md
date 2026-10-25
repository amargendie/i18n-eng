# Internationalization Engineering — Existing Project Audit

**Version:** 1.1.0  
**Status:** Approved  
**Scope:** Read-only assessment of existing software repositories  
**Normative dependency:** [`principles.md`](./principles.md) v1.0.0  
**Related workflow:** [`greenfield.md`](./greenfield.md) v1.1.0

## Objective

Assess the actual state of internationalization (i18n) in an existing project, identify evidenced gaps and risks, and provide a prioritized decision-ready report. **An audit diagnoses; it does not migrate, repair, translate, install, or reconfigure.** The output may inform `migration.md` or `maintenance.md` only after the relevant authorization.

## When to use

Use this workflow when a project already contains application code and the user asks to evaluate i18n readiness, prepare for new languages, assess an existing i18n solution, investigate localization defects, or plan a migration. It applies equally to projects with no i18n, partial adoption, or mature implementations.

If the request concerns a truly new application without an established codebase, use `greenfield.md`. If the user requests a narrowly scoped change to an already approved i18n architecture, assess whether `maintenance.md` is more appropriate; do not use audit to bypass its authorization rules.

## Operating contract and boundaries

- The audit **MUST** be read-only regarding the inspected repository, including source, configuration, documentation, tests, lockfiles, generated artifacts, caches, and ignored files (P04).
- The agent **MUST NOT** run commands or scripts that may implicitly write to the inspected repository: installs, builds, formatters, code generators, test runners that write snapshots/coverage/caches, auto-fix linters, migration tools, or application start commands. A seemingly read-only command must be treated as unsafe if its side effects are unknown.
- The agent **MAY** use clearly read-only searches, file reading, dependency-manifest inspection, version-control status inspection, and non-writing static analysis. If uncertain, inspect the tool first or do not execute it. The audit **MUST NOT** create caches, snapshots, temporary project files, or other side effects as an indirect consequence of inspection.
- Reports **MAY** be produced in the conversation, outside the inspected project, or at an explicitly authorized output location. **Do not** write `docs/i18n-policy.md` or `audit-report.md` into the repository merely because those paths are mentioned as suggested deliverables. An explicitly authorized report export is the only permitted writing exception; it **MUST NOT** be used to run or justify write-capable project inspections.
- Never expose credentials, secret values, patient/customer data, or other unnecessary sensitive content. Prefer path/line references and redacted snippets; obey repository exclusions.
- Do not translate existing strings, add or remove supported locales, choose product language scope, install packages, or alter dependencies during an audit.
- No commit, push, PR, or merge is authorized by this workflow.
- Record the audit's limitations when files, tools, environments, or source access are unavailable. **Not observed is not the same as absent.**

## Inputs and scope declaration

Establish, or explicitly mark unknown:

1. Repository root, branch/revision and audit date; monorepo packages/services included or excluded.
2. Product surfaces and channels: web UI, native/mobile, CLI, server-rendered content, email, notifications, documents/PDFs, exports, API human-facing errors, third-party integrations.
3. Current and intended production locales, if **already approved**; distinguish detected configurations and content from claims of officially supported languages.
4. Stack, rendering modes (SSR/SSG/CSR etc.), runtime boundaries, routing, persistence, deployment constraints, and policy/architecture records.
5. Audit goal and depth: inventory, targeted defect, expansion readiness, or migration feasibility; time/sample constraints.
6. Available quality commands and tooling, **for documentation only** unless a non-writing execution path is established.

Do not block the entire assessment for unknown product decisions: report assumptions and defer conclusions that depend on them. Define the inspected surfaces before giving coverage percentages.

## Audit stages

### A0 — Establish baseline and evidence discipline

- Record revision/context and directory coverage without changing the working tree.
- Locate relevant project instructions, i18n policy/ADRs, framework and package manifests, app entry points, message catalogs, and test organization.
- Define an **evidence ledger**: each finding points to a path and line/range where available, or to a precisely described observation; note how it was obtained.
- Classify each statement as **Observed**, **Inferred**, **Unverified**, or **Not assessed**. Repositories with restricted inspection must not be labeled fully audited.

**Output:** scope/baseline, exclusions, initial inventory, and evidence collection method.

### A1 — Map actual i18n architecture

Inspect, as applicable:

- Libraries/versions and actual runtime usage; avoid inferring architecture from package presence (P03–P05).
- Locale sources, allowed/default locale, canonicalization, detection/negotiation, precedence, persistence, fallback, missing-message behavior and unsupported-locale response.
- Route design and public URL behavior, links, redirects, metadata, canonical/hreflang and cache boundaries when relevant.
- Server/client locale propagation, hydration, streaming, async/background jobs, emails and notifications; cross-service consistency.
- Catalog location/ownership, key conventions, formats, extraction/compilation and translation workflow.
- Distinguish a single-language project with structural readiness from one with active i18n infrastructure; **do not automatically grade structural readiness as a defect** (see `greenfield.md`).

**Output:** architecture map, current effective behavior, explicit unknowns and detected-versus-authorized locale matrix.

### A2 — Inventory user-facing content and formatting

Search relevant presentation surfaces for **candidates**, not presumed errors:

- Hard-coded user-visible copy: UI labels, errors, validation, accessibility attributes, notifications, metadata, emails, exports and documents.
- Concatenated messages, embedded grammar/word order assumptions, dynamic/computed keys and unsafe or incompatible interpolation/rich text.
- Plural/select cases, placeholders, context collisions, catalog duplication, orphaned and missing keys; inspect actual usage when accessible.
- Date/time/time-zone, number, currency, units, sorting, casing, address/name/phone conventions, and parsing versus display boundaries (P07–P09).
- Data semantics: localized display values persisted as canonical values, business-rule coupling between language and currency/time zone, locale propagation to user-visible background outputs.
- Exclude or separately classify test fixtures, mocks, logs, debug output, code identifiers, internal API fields, URLs, brand names and intentionally non-translatable text.

Use bounded sampling where exhaustive inspection is impractical. Record detection method and denominator (files/surfaces scanned). Avoid reporting raw regex hit totals as confirmed defects.

**Output:** categorized inventory with examples, coverage and uncertainty.

### A3 — Review accessibility, international layout, privacy and delivery

Inspect relevant cases for document/subtree `lang`, text direction, accessible names, translated errors, text growth, wrapping/truncation, bidirectional isolation, keyboard/focus behavior and locale-sensitive metadata (P10). RTL implementation is required to be assessed as a release blocker **only when RTL is within approved scope**.

Check whether locale negotiation uses confidential signals or persists user preference, and whether cache/CDN keys, server rendering or shared resources could leak another user's language or content. Consider security of rich-text messages and interpolation without treating every dynamic message as inherently unsafe.

**Output:** scoped accessibility/layout and delivery risks, including relevant non-applicable checks.

### A4 — Assess tests, observability and operational readiness

Review (without running unsafe commands):

- Tests for locale resolution and fallbacks, message integrity, interpolation and pluralization, formatting, routing/SSR/hydration, accessible labels and regressions.
- Whether pseudolocalization, multi-locale E2E and RTL tests are applicable to approved scope.
- CI checks, key/schema validators, missing-message handling, telemetry privacy, translation ownership and release gates.
- Existing policy and consistency between documented decisions and observed implementation (P11–P12).

**Output:** evidence-based coverage assessment. Report **not executed** for any checks not actually run; do not equate presence of a test with a passing test.

### A5 — Synthesize and recommend, without implementing

1. Consolidate duplicate findings by root cause and impact.
2. Separate confirmed defects from candidates and gaps dependent on product choices.
3. Prioritize findings qualitatively using severity, confidence, affected scope, dependencies, and estimated effort; make ranking rationale explicit. Do not calculate a numeric risk or priority score.
4. Identify what should be preserved, what requires targeted correction, and what might justify migration (P05–P06).
5. Compare meaningful paths: **keep as-is**, **targeted maintenance**, **incremental migration**, and **architectural replacement** only when evidence warrants it.
6. If proposed changes qualify as significant migration, mark **plan approval required** before implementation. Do not treat recommendations as permission.

**Output:** audit report, prioritized backlog candidates, decisions needed and recommended next workflow.

## Finding taxonomy

### Type

Use one primary type: `ARCHITECTURE`, `LOCALE_POLICY`, `ROUTING_DELIVERY`, `MESSAGES`, `FORMATTING`, `ACCESSIBILITY_LAYOUT`, `TESTING_OPERATIONS`, `SECURITY_PRIVACY`, or `DOCUMENTATION`.

### Severity (impact, not confidence)

| Level | Meaning |
| --- | --- |
| **Critical** | Evidenced severe security/privacy exposure, data corruption or major production failure related to locale handling; use only with compelling evidence. |
| **High** | Material incorrect behavior for supported product scope, broadly broken accessibility or significant user-facing failure. |
| **Medium** | Meaningful localized UX defect, maintainability/operational risk or partial feature gap within scope. |
| **Low** | Localized inconsistency or limited technical debt with low current impact. |
| **Opportunity** | Possible improvement/future readiness; not a current defect. |

### Confidence (strength of evidence)

- **Confirmed:** directly supported by code/configuration or safely reproduced observable behavior; include exact evidence.
- **Likely:** multiple consistent signals, but not conclusively demonstrated.
- **Unverified:** hypothesis or incomplete inspection; must not be counted as an established defect.

*Severity and confidence are independent.* A high-potential-impact but unverified risk remains unverified. A finding relevant only to a hypothetical future locale is normally `Opportunity`, not a release-blocking defect.

### Effort and priority

Use indicative effort `S` (localized), `M` (multi-file/module), `L` (cross-cutting), or `Unknown`. Do not promise delivery durations. Priority is a qualitative recommendation informed by current impact, exposure, dependencies, confidence and effort; **do not** derive a faux-precise numeric score from heuristic findings.

## Finding record format

Use a stable identifier such as `I18N-AUD-001` for each consolidated finding:

```yaml
id: I18N-AUD-001
title: "<short, specific issue>"
type: MESSAGES
severity: Medium
confidence: Confirmed
effort: S
status: Open
scope: "<surface/feature; approved locale where relevant>"
evidence:
  - location: "path/to/file.tsx:42-48"
    observation: "<what was actually observed, redacted if necessary>"
impact: "<why it matters today or under approved scope>"
recommendation: "<smallest credible remediation or further check>"
validation: "<how a later workflow should prove resolution>"
dependencies: []
product_decision_required: false
```

Fields may be omitted only when genuinely unavailable; mark unknowns rather than inventing values. Evidence locations and counts must always match what was actually inspected. For `Likely` or `Unverified`, explicitly state the verification needed.

## Required audit report

Use the following outline, adapting it to the repository's size:

1. **Executive verdict:** `READY_WITH_EVIDENCE`, `PARTIALLY_READY`, `NOT_READY_FOR_APPROVED_SCOPE`, or `INSUFFICIENT_EVIDENCE`; always state **ready for what**, including locale/surface limits. A repository cannot be declared ready for unapproved or hypothetical languages.
2. **Scope and baseline:** revision, inspected modules/surfaces, exclusions, constraints, tools and commands used, side-effect safeguards, checks not run.
3. **Observed architecture:** stack and actual i18n implementation, locale inventory (detected/configured/approved status separately), content boundaries and routing.
4. **Findings summary:** counts **by confidence and severity**, including distinct candidates/unverified items; list actionable findings with evidence.
5. **Coverage and gaps:** include an explicit **coverage matrix**, proportional to audit size, with columns `surface / boundary`, `inspection status (inspected / partially inspected / not inspected / out of scope)`, `method (static search / targeted file review / exhaustive inventory / runtime)`, `evidence`, and `limitations`. Distinguish architectural inspection of an area from exhaustive inspection of its contents. Do not mark an entire surface fully inspected solely because a few files were sampled. Provide denominator/method for any numeric coverage and avoid misleading percentages from sampling or searches. Name relevant non-UI surfaces (API errors, email, background jobs, exported documents) when present.
6. **What to preserve:** effective patterns/valid existing infrastructure (P05).
7. **Recommendations:** prioritized remediation candidates and feasible alternatives with trade-offs, not automatic library replacement.
8. **Decisions needed:** list only genuinely unresolved product locales, fallback, routing, business formatting or release requirements (P01, P08, product authority). **MUST** retain decisions explicitly approved in the current request or reliable prior context; do not ask their owner to approve them again. Distinguish approval of product scope from approval of migration architecture.
9. **Next step:** no change, targeted maintenance, or migration planning; identify human approvals needed.
10. **Verification statement:** distinguish inspected code, safely run checks, unexecuted tests, inferred behavior and any access limitations.

A short targeted audit MAY use a compressed report, but MUST retain evidence, scope, uncertainty, non-modification, and next-step boundaries.

## Alignment with greenfield readiness

An existing project that began with the `greenfield.md` **structural-readiness** track **MUST NOT** be marked defective solely for lacking message catalogs, a language switcher, or a translation library. Assess it against its documented, approved scope and expansion expectations. If expansion is newly anticipated, identify active infrastructure as a **proposed product/architecture decision**, not as an implicitly authorized migration. Conversely, an **active-infrastructure** project **SHOULD** be evaluated for actual message, formatting, and fallback behavior even when only one production locale is approved. The audit **MUST NOT** change either track or release scope.

## Stop and escalation conditions

Stop the affected inspection or qualify the findings when:

- The only way to verify a claim requires an unapproved write, execution with unknown side effects, access to protected services, or disclosure of sensitive material.
- Project boundaries or permissions are unclear and further exploration could exceed authorization.
- Critical evidence conflicts with project policy or stakeholder claims; report both without silently deciding product scope.
- The request changes from assessment to implementation; switch workflow and obtain appropriate authorization.

An inability to inspect one surface should constrain the verdict for that surface, not cause the agent to invent a conclusion for the rest.

## Anti-patterns

- Running `npm install`, a build, an auto-fix linter, or snapshot-writing tests "just to check" during a read-only audit.
- Treating `package.json` dependency presence as proof of correct locale behavior.
- Reporting every source-language literal, brand term, log line, test assertion or dynamic key as a translation defect.
- Calling a project with one approved production locale incomplete solely because it has no language switcher or multiple catalogs.
- Treating detected locale directories as evidence of languages officially released to users.
- Calling an i18n library replacement "necessary" without comparing targeted remediation and cost.
- Claiming all routes, languages, flows or tests are covered when inspection was sampled or static only.
- Writing a migration patch or `docs/i18n-policy.md` during audit, even as a convenience.

## Compact agent execution checklist

- [ ] Confirm this is an existing-project assessment, not an implementation request.
- [ ] Record scope/revision, authorized locales (or unknowns), exclusions and read-only command policy.
- [ ] Inspect existing policy, actual locale flows, dependencies, messages, formatting and delivery boundaries.
- [ ] Review accessibility, layout, resource integrity, tests and operational behavior as applicable.
- [ ] Record path-level evidence and distinguish Observed/Inferred/Unverified/Not assessed.
- [ ] Classify each consolidated finding by type, severity, confidence, effort and current scope.
- [ ] Identify sound architecture worth retaining and alternatives worth considering.
- [ ] Deliver scoped verdict, evidence/coverage limits, prioritized recommendations and decisions needed.
- [ ] Confirm no repository modifications or unauthorized side effects were performed.

## Related material

- [`principles.md`](./principles.md) — normative rules and authority boundaries (required).
- [`greenfield.md`](./greenfield.md) — adaptive readiness policy; relevant to interpreting single-locale projects.
- `migration.md` — future implementation workflow after authorization.
- `maintenance.md` — future targeted changes within an approved architecture.
