# Internationalization Engineering — Greenfield Workflow

**Version:** 1.1.0  
**Status:** Approved — adaptive readiness policy  
**Scope:** New applications and new bounded application surfaces without established i18n architecture  
**Normative dependency:** [`principles.md`](./principles.md) (v1.0.0)

## Objective

Establish a proportionate, coherent, testable internationalization foundation **before UI and data contracts harden**, without inventing supported locales, translating content without authorization, or overengineering for hypothetical requirements.

**Adaptive readiness policy (approved):**

- **Structural readiness** is the default when there is **no credible product expectation of adding languages**. Establish low-cost conventions and locale-safe semantic boundaries; a translation library, catalogs, and locale resolver are **not required** solely for future-proofing.
- **Active i18n infrastructure** is preferred from the start when the owner confirms a **credible expectation of adding languages**, even if production initially supports one locale. Establish a real message system and relevant runtime integration, but do **not** manufacture translations, locale switchers, or public URL variants.
- **Multilingual release** is a distinct release requirement: ship only locales expressly authorized and sufficiently translated/validated. Infrastructure readiness does not imply production support for additional locales.

The owner or authorized product stakeholder confirms the expansion expectation and supported locales. Repository evidence can support a recommendation but does not give the agent authority to choose new product scope. If future expansion is uncertain, present both tracks and the cost of deferring infrastructure; do not silently assume expansion.

**Definition of success:** an approved readiness track, a documented scope and locale policy proportionate to that track, implementation consistent with the runtime and the approved work, verified acceptance checks for that track, and actionable guidance for subsequent features. **An end-to-end message-driven UI slice is required only for active i18n infrastructure, not structural readiness.**

This workflow is *not* a license to internationalize unrelated services, add languages, redesign routing, or install dependencies without authorization.

## When to use

Use when a new project or isolated new application surface needs an i18n foundation and no operative i18n policy or implementation exists for that scope.

**Do not use this workflow as a shortcut for an established codebase.** If relevant i18n exists, inspect it and preserve sound choices (P04–P05); use `audit.md` when assessment of an existing app is needed. A new feature inside an established localized app normally follows that app's policy and `maintenance.md`, not greenfield.

## Operating contract

- Follow [`principles.md`](./principles.md); its normative requirements take precedence over recommendations here.
- **Discovery and proposal are read-only** by default. Implementation begins only when the user has authorized the scope and the consequential choices below are resolved.
- The owner determines supported production locales and the default locale. **Do not infer additional supported locales from business location, browser settings, source language, or common market expectations.**
- Explicitly separate *production locale support*, *future capability*, and *test-only pseudo-locales*. Select the readiness track on evidence and product intent, not a generic rule that every project needs a translation library.
- Reuse the repository's conventions for packages, testing, documentation, and app structure. Avoid new abstractions unless they solve an approved need.
- No implicit installation, commit, push, PR, merge, or deployment. Follow task-specific authorization for every side effect.
- If information is missing, record assumptions and their risk. Do not silently convert assumptions into product requirements.

## Inputs to inspect

Inspect only what exists and is relevant; do not demand exhaustive questionnaires when repository evidence or the task already answers the question.

| Area | Minimum questions |
| --- | --- |
| Product scope | Which user-facing surfaces are in scope? Which production locales, including default, are authorized? Is multilingual release needed now? Is additional-language support credibly expected later, not expected, or uncertain? |
| Stack | Frameworks, runtimes, rendering model (SSR/SSG/CSR/native), APIs, package manager, repository conventions? |
| Content | UI strings, validation/errors, emails, notifications, PDFs, server-generated content, accessibility names? Which are in scope now? |
| Routing and negotiation | Localized URLs needed? Who selects locale—user, URL, account, browser? What is the precedence and persistence rule? |
| Data | What must remain locale-neutral? Are any localized persisted fields actually required? |
| Formats | Date/time and time-zone rules, decimal and currency semantics, numbers, units, sorting/search? |
| Operations | Translators or message-review process, deployment constraints, tests, analytics/SEO requirements? |
| Compatibility | Existing organizational conventions, shared libraries, deployment and browser/runtime support? |

Where the answers affect a concrete architectural decision and cannot be inferred reliably, **ask one focused decision question or present explicitly labeled options** rather than guessing.

## Decision gates

**G0 — Scope and product authority (required before implementation)**

Record: approved production locales, default locale, surfaces in scope, the **readiness track** (**structural** or **active infrastructure**), and the **release scope** (**single-locale** or **multilingual-now**). These are **independent axes**: active infrastructure can support a single production locale; multilingual release requires active infrastructure. Record why the chosen track matches a credible expansion expectation (or its absence). Neither track authorizes translating or releasing unapproved locales. If the default or supported production locales are undecided and implementation depends on them, stop for a product decision.

**G1 — Architecture decision (required before consequential implementation)**

Present a proportionate recommendation, including the **structural-versus-active** trade-off. Where active infrastructure applies, cover library/approach, message structure, locale selection/propagation and fallback; for both tracks cover routing impact (if any), semantic formatting boundaries, and the cost of future expansion. Obtain approval of consequential decisions, especially URL contracts, persisted preference semantics, or shared cross-service conventions. Small, uncontroversial implementation details may follow general task authorization.

**G2 — Implementation acceptance (required before declaring complete)**

Report actual checks, observed behavior, remaining limitations, and whether the agreed acceptance criteria passed. Passing tests is not equivalent to product acceptance if manual validation was requested.

## Workflow

### Phase 1 — Discover and classify

1. Inspect project configuration, relevant sources and repository rules.
2. Identify UI delivery paths (browser/client, server, API error surfaces, outbound messages) and scope boundaries.
3. Determine whether any effective i18n policy/stack already exists; if so, preserve it or switch workflows.
4. Determine whether language expansion is a credible product expectation, absent, or uncertain; recommend a readiness track without inventing product plans.
5. Capture approved locale scope and unresolved decisions under G0.

**Output:** short discovery summary with evidence, scope, constraints, and explicit unknowns. **No code edits.**

### Phase 2 — Establish requirements and boundaries

1. Specify where locale originates and where it must travel (request, server-rendered page, client state, background job, outbound notification).
2. Decide whether language and formatting preferences are separate; do not equate UI language with time zone, currency, or business jurisdiction (P08).
3. Enumerate content channels actually in scope and decide which are translatable vs intentionally invariant (e.g., product identifiers, log keys, protocol values).
4. Identify whether locale-specific URLs, `lang`/`dir` metadata, SEO alternates, RTL, localized content fields, and translation workflows are required **now** or explicitly deferred.
5. For **active infrastructure**, choose a missing-message strategy appropriate to approved locales and deployment: predictable fallback, diagnostics, and visible failure policy where necessary. Do not mask missing production translations silently. For **structural readiness**, record that catalog fallback is not yet applicable and define only relevant current-locale presentation behavior.

**Output:** requirements and non-goals; decision log and G0 resolution.

### Phase 3 — Compare approaches and propose architecture

First compare **structural readiness** against **active i18n infrastructure** based on the confirmed expansion expectation and expected migration cost. Only then evaluate platform-native facilities and viable ecosystem options **when multiple approaches are credible**. Avoid forcing a dependency for structural readiness; do not use a single production locale alone as a reason to reject active infrastructure when expansion is credible.

Judge options against:

- Rendering/runtime compatibility (including server/client boundaries).
- Message semantics: interpolation, pluralization, grammatical selection, rich text, safe rendering.
- Locale negotiation and propagation; routing and fallback determinism.
- Catalog organization and extraction tooling, type safety if appropriate.
- Accessibility, metadata and layout implications.
- Bundle/performance, dependency/maintenance, deployment and developer ergonomics.
- Testing capability and compatibility with the team's established practices.

Recommend **one** architecture, note plausible alternatives and explain why they were not selected. Avoid promises about third-party library versions or APIs without verifying against the project's actual dependency versions and docs.

**Output:** Architecture Decision Record (ADR or repository equivalent), implementation outline, and G1 approval request.

### Phase 4 — Implement the approved readiness track

Only after relevant authorization and gates:

**Track S — Structural readiness (no credible language expansion planned)**

1. Record the approved application language and any current locale/formatting requirements in the project's policy; do not introduce additional production locales.
2. Preserve semantic date/time, number, currency and measurement values until presentation, using relevant locale-aware platform formatting as needed (P08).
3. Keep user-facing text identifiable and avoid gratuitous concatenation or deeply embedded presentation assumptions; **do not require a message catalog or translation keys for all labels**.
4. Keep language metadata, accessible names, and current-language errors correct; avoid unsupported routing, locale state, switchers or fallback abstractions.
5. Document an upgrade trigger (e.g., approved second-language roadmap), the likely migration touchpoints and deferred checks. Add only proportionate tests for current behavior.

**Track I — Active i18n infrastructure (credible future expansion or approved multilingual release)**

1. Establish the approved locale configuration and the smallest necessary integration points.
2. Define message ownership and catalog organization appropriate to the codebase. Prefer stable, contextual identifiers; avoid word-by-word concatenation (P07).
3. Implement locale resolution and propagation at the chosen boundaries; make precedence explicit and testable.
4. Implement predictable missing-message and fallback behavior; include observable diagnostics where appropriate without leaking personal data.
5. Introduce locale-aware presentation formatting for at least one relevant semantic value. Do not persist localized display strings as canonical data.
6. Wire one representative UI flow with real messages in the **approved** locale set, including labels, accessible names, errors and relevant server/client paths.
7. Add document language metadata and direction handling only as required by approved scope; ensure UI remains resilient to text expansion.
8. Integrate appropriate validation into established project quality commands; keep scripts and tooling focused.

**Both tracks:** Reuse project conventions; document approved decisions in the existing source of truth or, with authorization, `docs/i18n-policy.md` (P11). Do not install dependencies or edit unrelated surfaces without authorization.

**Implementation guardrails:**

- Do not add a locale switcher unless multiple locales and the selection UX are approved.
- Do not ship empty placeholder translations or auto-generated translations as validated release content.
- Do not add locale-prefixed routes merely to be "future-proof" if their URL and SEO impact is not approved.
- Do not internationalize internal logging, machine-readable API fields, or database identifiers by default. Human-facing API errors may need localization at a defined boundary.
- Do not construct a generic translation platform, translation management integration, or custom ICU parser without demonstrated need.
- Treat user-provided message content as data: follow escaping and rich-text safety practices; do not interpolate arbitrary HTML.

**Output:** bounded implementation with changed-file inventory and test evidence.

### Phase 5 — Verify and hand off

Execute checks supported by the repo and approved scope. **Apply only the checks relevant to the selected track**; mark non-applicable checks N/A rather than failing structural readiness for intentionally absent catalogs or locale-routing infrastructure:

| Verification | Expected evidence |
| --- | --- |
| Locale configuration | Approved application language/default and no unapproved locales; verify fallback only when active infrastructure provides it |
| Representative messages | **Track I:** identifiers resolve; interpolations and plural cases behave as intended where used. **Track S:** current-language labels/errors are usable; message catalogs N/A |
| Formatting | Semantic number/date/time/currency example respects independently defined preferences |
| Delivery paths | Approved language and formatting behavior across implemented paths; locale resolution/routing and SSR/hydration checked where applicable |
| Accessibility | Language metadata and accessible UI text preserved for the implemented slice |
| Resource integrity | **Track I:** catalog syntax and missing-key checks; **Track S:** N/A unless catalogs already exist |
| Regression | Unit/integration/E2E checks available for the implemented path |
| Documentation | Policy matches chosen track, justified expectation, upgrade trigger and intentional deferrals |

Pseudolocalization and RTL tests are **conditional**: add them when scope justifies them; otherwise record as optional future-readiness activities. Do not claim coverage for unsupported production locales (P12).

Produce a handoff report that separates **implemented**, **verified**, **deferred**, and **unverified** items, plus follow-up rules for engineers introducing new UI and messages.

## Required outputs

1. **Discovery note:** evidence-backed stack/scope summary and unknowns.
2. **Decision record:** approved locales, readiness track and rationale, release scope, routing/selection and formatting boundaries; for Track I also library/approach, message convention and fallback. Record meaningful alternatives and future upgrade trigger for Track S.
3. **Implementation plan:** bounded work, risks, tests, rollback/recovery when relevant, and implementation authorization state.
4. **Project policy:** existing source of truth updated, or `docs/i18n-policy.md` created only when authorized.
5. **Verification report:** what actually ran, outcomes, known gaps, and human acceptance status.

Outputs may be combined within existing repo conventions; do not create five documents merely to satisfy a checklist. During design-only tasks, deliver proposals without editing the repository.

## Decision closure and technical verification (GF-1 lessons)

- **MUST** distinguish *confirmed owner requirements* from *recommended technical choices*. Do not reopen approved product language, credible expansion expectation, market, currency, routing, or readiness goals merely to seek a redundant gate. The agent **MAY** recommend Track I based on confirmed expansion; record the track selection with its justification and reserve G1 for unresolved architecture and implementation authorization.
- **MUST** keep the message language tag (`es`) distinct from regional formatting (`es-ES` or other approved formatting preference), tax jurisdiction, time zone, and currency. Do not infer the presentation format solely from the catalog language.
- **MUST** validate the selected library's actual package version, framework compatibility, supported no-routing configuration, and relevant server/client APIs against dependable documentation before installing or implementing. A planning-stage recommendation **MAY** remain conditional, with the verification named as a pre-implementation gate.
- **MUST NOT** claim a selected library forces locale-prefixed URLs solely because its examples feature localized routing; assess configuration options separately.

## Stop and escalation rules

Stop before the affected change and request a decision when:

- Supported/default production locales have not been decided and implementation depends on them.
- A locale change expands product scope or requires new release translations.
- Routing, public URLs, account preferences or data contracts would change without approval.
- A proposed dependency or implementation conflicts with repository policies or deployment constraints.
- Existing i18n is found and replacement would be material: switch to assessment/audit and migration planning.
- Verification cannot establish an essential acceptance criterion: report the blocker; do not assert readiness.

## Anti-patterns

- "Next.js means next-intl" (or any framework-to-library reflex).
- "Spanish-speaking users means `es-ES`" without product authorization.
- "We support 12 languages" because 12 empty catalogs were generated.
- Translating labels while leaving validation errors, accessible names and outbound messages outside the explicitly agreed scope without recording gaps.
- Building a translation service, locale router, or switching UX for hypothetical locales.
- Installing message infrastructure solely because a project uses one language, without a credible expansion expectation or other justified requirement.
- Rejecting message infrastructure solely because the initial release has one language, despite an approved credible expansion plan.
- Using formatted strings as canonical monetary/date data, or assuming language determines currency/time zone.
- Calling installed dependencies or extracted strings a completed i18n implementation.

## Compact agent execution checklist

- [ ] Confirm that greenfield is applicable; otherwise change workflow.
- [ ] Identify authorized production locales/default and credible expansion expectation; distinguish readiness track from release support.
- [ ] Inspect relevant runtime/rendering and content delivery boundaries.
- [ ] Document scope, non-goals, locale resolution, fallback, formatting policy and unknowns.
- [ ] Choose structural or active infrastructure based on authorized product intent; explain deferral/upgrade cost and secure G1 approval when consequential.
- [ ] Implement only the authorized track: structural conventions **or** active message-driven slice, plus project policy.
- [ ] Verify actual behavior and report evidence, deferrals and acceptance status.

## Related material

- [`principles.md`](./principles.md) — normative policy (mandatory).
- `audit.md` — existing-system assessment (when available).
- `migration.md` — changes to an established i18n architecture (when available).
- `maintenance.md` — ongoing feature development under existing policy (when available).
