---
name: i18n-eng
description: >-
  Design, audit, migrate, and maintain software internationalization (i18n).
  Use for new applications planning future languages; existing applications with
  hard-coded UI text, locale formatting, routing, or translation debt; reviews of
  existing i18n architectures; and changes to UI messages, catalogs, locale-aware
  formatting, accessibility, or localization CI. Supports greenfield, read-only
  audit, incremental brownfield migration, and regression prevention. Do not
  activate for unrelated programming work.
---

# Internationalization Engineering

Use this skill to choose and execute an appropriate i18n engineering workflow. It is **not** a generic translation service, and its activation is **not** authorization to change code or supported languages.

## Read in this order

1. Read [`references/principles.md`](references/principles.md) before making any i18n recommendation or change. Treat its MUST/SHOULD/MAY rules as the normative contract, subject to user and repository constraints.
2. Identify the requested outcome, scope, existing architecture, and authorized actions. Honor repository instructions, security restrictions, and existing project conventions.
3. Select **one primary workflow** from the routing table. Read its reference file before proceeding. Read other workflow files only when a handoff is required.
4. If the task is ambiguous, undertake only non-mutating discovery within the authorized scope. Ask for product or change authorization when necessary; do not infer approval.

## Choose the workflow

| Situation / intent | Primary workflow | Read |
|---|---|---|
| New application or newly planned architecture, before an established implementation | **Greenfield** | [`references/greenfield.md`](references/greenfield.md) |
| Existing application needs a comprehensive i18n assessment, gap analysis, or improvement diagnosis | **Audit** | [`references/audit.md`](references/audit.md) |
| Existing application needs to introduce or significantly restructure i18n, or systematically externalize legacy UI | **Migration** | [`references/migration.md`](references/migration.md) |
| Application already has an approved i18n approach and a scoped feature, fix, resource change, or regression check is requested | **Maintenance** | [`references/maintenance.md`](references/maintenance.md) |

When the user requests an **audit and migration**, run the read-only audit first, then hand its evidence to migration planning. Do not treat the audit as permission to implement. If a maintenance task uncovers a cross-cutting architectural issue, report it and propose audit/migration separately; finish only the authorized maintenance work.

Do not route solely by framework, dependency name, or presence of translation files. A mature product can still need an audit; a single-locale product can legitimately be internationalization-ready.

## Non-negotiable boundaries

- **Product scope:** Never add supported locales, translations, language selectors, route prefixes, or change language/fallback behavior without product authorization. The project owner determines supported locales. Do not conflate language, region, time zone, currency, or formatting preference.
- **Read-only audit:** During Audit, do not modify application files, configuration, dependencies, documentation, caches, snapshots, or generated outputs. Avoid commands with possible side effects. Write a report only outside the inspected project or to an explicitly authorized output location, as allowed by the audit reference.
- **Migration gates:** Inspect and plan before significant change. Present architecture alternatives, impact, slice boundaries, verification, and recovery. Obtain explicit approval of the migration plan before implementation. Stop at each required human gate; tests passing do not imply acceptance.
- **Preservation:** Prefer a sound existing implementation over replacement. Preserve observable behavior, URLs, APIs, locale behavior, and repository conventions unless their change is explicitly approved.
- **Scoped maintenance:** Prevent new debt in modified surfaces. Record unrelated pre-existing debt without forcing cleanup. Roll out CI checks informatively first, promoting to blocking only after validation and approval.
- **Execution authority:** Do not install dependencies, run potentially mutating commands, edit files, or create commits without permission appropriate to the task and repository instructions. Never push, open PRs, or merge without authorization.
- **Evidence:** Distinguish confirmed findings, probable candidates, and unknowns. Report what was inspected, what was not, what tests actually ran, and any deviations. Never invent validation outcomes.

## Shared execution pattern

1. **Context** — Identify project state, repo conventions, existing i18n policy (prefer `docs/i18n-policy.md` if no equivalent exists), authorized locales, and the precise requested deliverable.
2. **Baseline** — For existing projects, inspect architecture and relevant surfaces before recommending changes. Reuse prior audit evidence only after checking its freshness and scope.
3. **Decision** — Choose the smallest sound approach. Compare meaningful alternatives when architecture changes are proposed. For a single-locale greenfield app, follow the adaptive readiness policy in `greenfield.md`.
4. **Gate** — Obtain any required authorization before a significant migration or product-scope change. A read-only investigation does not authorize subsequent edits.
5. **Execute** — Perform only the approved phase/slice. Keep unrelated refactors out of scope.
6. **Verify and report** — Provide evidence, remaining risks, unchanged contracts, requested approvals, and the next permissible step. Treat implementation status and human acceptance as separate facts.

## Required handoff format

Use a concise project-sized summary, covering:

- **Workflow and scope:** selected mode, requested locales, affected areas, and any exclusions.
- **Baseline and evidence:** architecture observed, relevant file paths or commands, confidence and unverified areas.
- **Decision / outcome:** proposal or completed slice, with reasons and trade-offs.
- **Compatibility and risk:** user-visible behavior, routes, APIs, formatting, fallback, accessibility, and outstanding debt as relevant.
- **Verification:** exact checks performed and their results; do not claim unexecuted checks passed.
- **Authorization / next step:** gates reached, approvals still needed, and work expressly not performed.

## Example triggers

- “We're starting a multilingual-ready Next.js app, but shipping Spanish only.” → Greenfield.
- “Review our existing i18n and propose improvements without touching code.” → Audit.
- “This legacy app wasn't designed for localization; plan an incremental migration.” → Migration planning, with read-only discovery/audit first.
- “I added an orders screen; ensure its labels and formatting comply with our i18n policy.” → Maintenance.

For detailed steps, gate definitions, finding taxonomy, and acceptance criteria, **follow the selected reference**; do not improvise substitutes. No framework or library is mandated by this entrypoint.
