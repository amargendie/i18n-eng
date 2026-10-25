# Internationalization Engineering — Brownfield Migration

**Version:** 1.1.0  
**Status:** Approved — significant architecture and slice plans require explicit G1 human approval before implementation  

**Scope:** Incremental introduction, extension, or repair of i18n in existing software  
**Normative dependency:** [`principles.md`](./principles.md) v1.0.0  
**Upstream workflow:** [`audit.md`](./audit.md) v1.1.0  
**Related workflow:** [`greenfield.md`](./greenfield.md) v1.1.0

## Objective

Transform an existing application toward an **explicitly approved** internationalization target without disrupting established behavior, corrupting data, expanding product language scope, or replacing sound infrastructure unnecessarily. Deliver small, reviewable, independently verifiable increments. **A migration is not a bulk string-replacement operation.**

## Entry conditions and routing

Use this workflow when the project already has production-relevant code and the user authorizes planning or implementing an i18n change that spans existing surfaces. If the user requests only an assessment, use `audit.md` (strictly read-only). If a mature i18n implementation only needs a narrowly scoped change, use `maintenance.md` when available. New applications use `greenfield.md`.

A prior audit report is **preferred but not mandatory**. Where no reusable audit exists, the agent **MUST** perform a bounded, read-only baseline assessment using the evidence discipline of `audit.md` before proposing changes. A focused request does not automatically require a repository-wide audit. Where the product owner explicitly requests a repository-wide audit, the agent **MUST** audit all in-scope application packages and delivery surfaces before migration planning; sampling is permitted for estimating repetitive findings, but uncovered areas **MUST** be identified and must not be represented as inspected. If the existing report is stale or incomplete, verify only the affected assumptions and identify the gap; never present old evidence as current. Prior audit authorization **does not** authorize migration.

## Operating contract

1. **MUST** respect all principles, especially P01 (i18n ≠ translation), P04 (inspect before deciding), P05 (preserve sound solutions), P06 (incremental recovery), P08 (semantic formatting), P09 (resource integrity), P11 (policy), and P12 (verification).
2. **MUST NOT** introduce an additional supported production locale, translate content, configure translation vendors, or widen localization scope without explicit product authorization. Pseudolocales used only in isolated verification **MAY** be employed without being presented or shipped as supported languages.
3. **MUST NOT** treat detection of a hard-coded string as proof that it must be externalized. Verify user visibility, ownership, intended scope, and context.
4. **MUST** preserve specified public behavior unless a change is separately approved. This includes route/link semantics, redirects, cookies, session behavior, API contracts, persisted fields, caching, hydration, emails, exports, and accessibility—not only visible UI text.
5. **MUST** declare which repositories/packages/surfaces may be modified. **MUST NOT** install dependencies, rewrite existing frameworks, change deployment configuration, execute data migrations, or run commands with side effects outside the approved scope.
6. **MUST NOT** commit, push, open a PR, merge, or deploy absent explicit authorization for that action. Local commits are distinct from gate approval and are never implicit.
7. **MUST** stop at significant unresolved product decisions, unexpected security/data risks, and material changes to approved architecture or scope. Present alternatives; do not silently choose.
8. **SHOULD** preserve existing language and locale for users throughout a staged migration. **MUST** provide a tested behavior for untranslated areas (for example, default-language presentation) and avoid mixed-language output when an approved requirement prohibits it.
9. **SHOULD** avoid introducing a large abstraction layer merely to make every feature look i18n-ready. Prefer the least disruptive coherent design that meets the approved target.

## Inputs and baseline record (M0)

Collect and identify confirmed versus unknown information:

- Repository identity, revision, working-tree state, package boundaries, owners, and target environments.
- Business reason for migration; **approved** current/target locales and audiences; whether the goal is **structural-only** preparation or **active i18n** (the adaptive distinction from `greenfield.md`). Existing content language does not itself authorize a new supported locale.
- Audit report ID/date/revision and relevant finding IDs, where available; known limitations and unsupported surfaces.
- Stack, rendering boundaries, routing, authentication, persistence, server-generated text, background jobs, notifications, documents, mobile/native clients, third-party integrations, accessibility requirements.
- Existing translation mechanisms, terminology, message catalogs, formatting practices, tests, CI, and established decision documentation.
- Explicit scope, exclusions, dependency-change constraints, approval process, release constraints, rollback limits, and any regulatory/data retention obligations.

**Baseline safety:** Record pre-existing test failures, dirty files, known UI defects, and deployed behavior before attributing failures to the migration. The agent **MUST NOT** overwrite unrelated work or reset a dirty working tree. Evidence gathering before authorization follows `audit.md` read-only rules; writing/running side-effecting checks requires its own applicable authorization.

**Output:** Migration baseline with source revision, evidence, confidence, scope and assumptions.

## Migration stages and human gates

### M1 — Define the target and non-goals

Specify the target state independently from how it will be implemented:

- Structural-only versus active i18n; document the reason and future transition conditions. Do not force catalogs or locale routing on structural-only work.
- Supported production locales (only when authorized), default locale, fallback hierarchy, locale resolution priority, preference persistence, and user-facing switcher requirements, if any.
- Routing and SEO behavior when relevant: existing URL preservation, locale prefixes/domains, canonical/hreflang decisions, redirects, deep links, sitemap, bots.
- Semantic formatting boundaries (language vs region vs time zone vs currency vs measurement conventions); server/client consistency and data model implications.
- Catalog ownership, key conventions, message interpolation/plurals, rich text, missing-message behavior, accessibility and RTL only where relevant.
- Explicit non-goals: translation, vendor integration, content migration, additional channels, locale-switching UI, etc., unless approved.

**G0 — Product scope gate (mandatory):** Product owner approves the target scope and any new languages. An explicitly approved future-expansion goal with a single current language generally indicates **active i18n infrastructure** (Track I), not structural-only preparation (Track S); do not equate Track I with shipping a second language. Unknown languages remain **unapproved**, not inferred. If product intent is uncertain, produce a conditional plan and stop before implementing affected changes.

### M2 — Choose a preservation-first strategy

Evaluate viable alternatives including **retaining and improving the existing mechanism**. Assess integration cost, runtime support, SSR/CSR boundary, operational complexity, testability, and compatibility. Explicitly compare a low-risk facade/adapter strategy with invasive replacement if replacement is proposed.

Identify cross-cutting contracts (routes, shared types, APIs, storage, cookies, search indexes, caches, mobile integrations), release topology, reversibility, and the **compatibility envelope**: behavior that must remain intact in each intermediate state.

**Library and ownership decision:** When selecting a message engine, **SHOULD** evaluate maintained standards-capable options and their real support for the required runtimes, ICU/plurals, types, SSR and operational needs before implementing custom interpolation, plural logic or a bespoke framework. A small project-specific adapter **MAY** wrap a proven engine. Distinguish **shared message contracts, keys and conventions** from **physical catalog ownership**: UI copy can live with the web app, email templates with the service, and domain error codes in shared packages. **MUST NOT** centralize all UI copy in a shared package without a demonstrated reason. A framework library's optional locale routing **MUST NOT** be mistaken for compulsory routing: evaluate message/format capabilities separately and explicitly verify route-preserving configuration. Do not automatically disqualify an existing viable library.

**Runtime integration evidence (required for cross-runtime proposals):** Before recommending a single engine across frameworks/services, **MUST** describe server request isolation, lifecycle and concurrency, Server Components vs. Client Components, caching/hydration, and catalog-loading boundaries for each runtime. A shared message contract **does not require** a shared mutable i18n instance or the same rendering adapter. Keep domain/geometry packages free of React and i18n runtime dependencies unless a demonstrable boundary requires otherwise. Compare complexity and actual compatibility of shortlisted libraries; label unresolved version-specific behavior as requiring a spike or documented check before installation. Never treat optional framework routing as mandatory.

**G1 — Migration architecture and plan gate (mandatory before significant migration):** Present the proposed architecture, slices, validation evidence, risks, and recovery strategy. Obtain explicit approval before dependency/framework replacement, URL changes, persisted locale semantics, data migrations, shared API changes, or other significant changes. General permission to “add i18n” is not approval to make every consequential design choice.

### M3 — Build a dependency-aware migration plan

Divide the implementation into bounded vertical slices, not a giant cross-repository rewrite. Prefer foundational wiring and one representative end-to-end slice before mass extraction. An illustrative progression for **active i18n**:

1. Infrastructure and message/locale resolution with existing production language preserved.
2. Representative feature slice exercising server/client rendering, interpolation, formatting, and error states.
3. Shared UI/navigation and forms, preserving public paths and validation semantics.
4. Feature-by-feature extraction of eligible content and consistent format handling.
5. Non-UI surfaces if in scope: emails, background notifications, PDFs, exports, API human-readable errors.
6. Locale expansion **only after separately authorized locale content, coverage and rollout conditions**.

For **structural-only** migration, plan seams, semantic values, approved conventions and tests; do not require catalogs, a language switcher or plural-locale tests.

**Early validation:** Establish format/locale/time-zone semantics during foundational design, reusing existing correct domain formatting without premature mass refactoring. Introduce lightweight catalog integrity tests and **informational** CI checks as soon as catalogs are used, typically in the foundation or representative slice; defer promotion to blocking until calibration and explicit approval under `maintenance.md`. Do not defer every integrity check to the final migration phase.

**Behavior separation:** Extraction/re-keying with equivalent source-language text and changes to user-visible wording, fallbacks, error messages, formatting or status displays are distinct change types. **MUST** isolate any intentional behavior correction in a separately described, approved slice; fixing a raw-enum fallback while extracting messages is not automatically behavior-preserving.

**Completion versus coverage:** Define distinct milestones for (a) infrastructure operational, (b) representative slice validated, and (c) agreed surface coverage completed. **MUST NOT** report a migration as fully complete while in-scope UI, emails, documents, exports, API messaging, or other surfaces remain uninventoried or unaccounted for. A partial rollout **MAY** be accepted when the owner explicitly accepts the remaining backlog; record coverage by surface and the exact acceptance scope, not a fabricated global percentage.

**Coverage handoff:** Include a migration coverage matrix with `surface`, `audited (method/evidence)`, `planned increment`, `deferred + reason`, and `excluded + reason`. Explicitly distinguish inspected, sampled, planned, migrated and unverified surfaces; do not turn sampled audit evidence into full coverage claims.

Each slice **MUST** specify:

| Field | Required record |
|---|---|
| ID / dependencies | Stable slice identifier; prerequisites and affected packages |
| Baseline links | Relevant audit finding IDs and evidence; fresh checks where needed |
| Intended change | Exact bounded files/surfaces and exclusions |
| Behavior invariant | Observable behavior that must not regress |
| Verification | Unit/integration/e2e/manual checks relevant to the slice |
| Recovery | Revert, feature-flag, compatibility mode, or forward-fix plan, with limits |
| Exit criteria | Acceptance thresholds, open issues, decision owner, approval state |

Do not equate a “slice” with a fixed number of files or strings. Prefer ownership boundaries and behaviors that can be tested together.

### Spec-first project workflow integration

When the repository mandates a specification workflow (e.g., Spec Kit), an exploratory migration proposal is **research input**, **not** an approved implementation plan. **MUST** preserve the repository's sequence, normally `specify → clarify (if needed) → plan → tasks → implement`, including human review gates. The feature specification is created as a new numbered feature when required, without rewriting completed historical specs; confirm the next free number. Architectural G1 is formally decided against the resulting project plan after its required review, not solely against an external pre-spec report. Consent to start `specify` does not authorize package installation or implementation. If a project uses a different governance sequence, follow that documented process instead.

### M4 — Implement one approved slice at a time

**Before edits:** verify the working tree, current baseline, scope approval, and any project-specific instructions. Do not start editing merely because G0 established the product goal; G1 must approve the architecture and slice plan first for significant migrations. If commands may write, ensure implementation authorization covers them. Work only on the current slice.

During implementation:

- Preserve source-language wording and existing display behavior unless translation/copy changes are explicitly authorized.
- Externalize **eligible** user-facing messages with stable, context-aware identifiers; preserve punctuation and meaning. Do not translate logs, metrics identifiers, protocol values, database enum codes, internal exceptions, or brand strings without an explicit reason.
- Use robust plural, variable and rich-text interpolation. Do not compose translated sentences from fragments when grammar changes by language.
- Keep semantic dates/numbers/currencies and distinguish user locale, regional preferences and time zone (P08).
- Ensure the rendering layer receives the correct locale/context; test hydration, caching and request isolation. Do not leak one user's locale into another request or a shared cache key.
- Maintain accessibility (e.g., labels, language metadata, localized errors, focus behavior) and avoid untranslated hidden UI.
- Keep fallback behavior explicit. Never silently pretend an unreviewed translation is production-ready.
- Change only authorized contracts; document migration compatibility shims and their retirement conditions.

**No uncontrolled auto-extraction or auto-translation.** Scripts may generate candidate inventories, but an agent **MUST** review false positives and semantic contexts before editing. Generated changes require the same validation as manual edits.

### M5 — Verify and decide the slice outcome

Run the authorized quality checks, including where relevant: types, lint, tests, catalog/key validation, interpolation integrity, plural cases, locale negotiation, fallback, accessibility, SSR/hydration, formatting, default-language visual/behavioral regression, deep links, and privacy/cache isolation. Use pseudolocalization to catch layout assumptions where feasible, without treating pseudolocales as supported languages.

For legacy behavior, distinguish **exact text/contract parity** (e.g., specified API payloads, email copy and approved critical messages) from **functional/visual parity** (UI semantics, accessibility and rendering). Specify which applies per surface and do not silently accept changed output. Include explicit **before/after parity assertions**; a new locale passing tests does not prove the old experience is unchanged. Document tests **not run** and why. Do not treat absent tests as passing. Where manual visual review or realistic translation review is required, mark it **pending**, not complete.

**Per-slice gate — Human acceptance:** Report `PASS`, `PASS_WITH_LIMITATIONS`, or `BLOCKED` with evidence, changed files, risks, unverified surfaces, and recommended next action. For significant migrations, **MUST** obtain human acceptance before proceeding to the next slice. Do not advance when approval has not been received. A technical pass is not equivalent to product/UX acceptance.

If verification fails, stop, localize the change, and apply the approved recovery procedure or request a revised plan. Never hide regressions behind new snapshot acceptance or by lowering test coverage without approval.

### M6 — Close out and hand off

When all authorized slices are accepted:

- Confirm target behavior and documented exclusions against G0 and G1.
- Update the repository's existing i18n source of truth, or create `docs/i18n-policy.md` **only with authorization**, covering locales, resolution/fallback, message organization, formatting, routing, validation, and ownership (P11).
- Produce a migration summary: baseline revision, approved decisions, completed slices, evidence, unresolved issues, rollback/forward recovery, and operational instructions.
- Hand off recurring checks and new-feature conventions to `maintenance.md` when available.
- Do not declare full multi-language readiness if only architecture is in place, if translations are incomplete, or if critical surfaces remain untested. State the accepted **infrastructure milestone**, **migrated coverage**, and **deferred/uninventoried surfaces** separately.

**G2 — Final acceptance:** Request explicit acceptance of the delivered migration. No deployment or release follows automatically.

## Trial profile — Spanish-first TypeScript monorepo (Next.js + Fastify)

This section records an **illustrative validation scenario** for exercising this workflow, not a mandate for other projects. Verify repository facts during the audit rather than assuming they are current.

- **Primary goal:** make an existing Spanish-language application ready for future locales by introducing justified active i18n infrastructure (**Track I**). **No translation or additional production locale is authorized.** Do not downgrade to Track S merely because only Spanish is live.
- **Audit scope:** the entire application, including relevant frontend, backend, shared packages and non-UI outputs. Record inspected and uninspected surfaces; audit remains strictly read-only. The audit report must precede the migration plan and identify baseline revision and evidence.
- **Compatibility envelope:** keep the existing Spanish wording, URLs/routes, redirects, authentication/session behavior, API contracts, data semantics and end-user workflows intact. Any change requires **separate explicit approval**. No locale-prefixed routing, language switcher, translated copy or new locale solely for demonstration.
- **Project process:** apply the repository's approved specification/planning conventions, including a new numbered specification for a substantial new capability when required. Do not rewrite executed historical specifications. Treat technical validation and human product/UX acceptance as distinct gates.
- **Implementation sequence:** audit → product-scope record (G0) → architecture and dependency-aware slices (G1) → one representative end-to-end slice → gated incremental expansion → final acceptance (G2). Do not execute modifications during the initial audit or planning exercise.
- **Version-control actions:** do not commit, push, create a PR, merge or deploy without the corresponding explicit authorization; local commits may be separately approved per slice or gate.

**Acceptance evidence for this scenario:** current Spanish UI and accessible messages retain intended wording; legacy URLs/deep links and navigation behave as before; SSR/client output and locale state remain consistent; errors and formatting at inspected API/UI boundaries preserve contracts; applicable tests run with actual results; unconverted surfaces are inventoried and either migrated or explicitly deferred. A lone Spanish catalog is not sufficient evidence of migration completion.

### Planning-only trial output

Before any code modification, return:

1. Repository-wide read-only audit (or a current, complete audit report) with inspected scope and omissions.
2. Confirmed vs. unverified baseline facts, with revision and dirty-tree status.
3. Proposed message strategy and runtime/SSR boundaries, including what **will not** change in URL handling.
4. Ordered migration slices covering UI, shared components, API-facing human text and non-UI channels as applicable, each with invariants, checks and rollback.
5. Explicit unresolved decisions and G1 approval request. **Stop here** until authorized to implement.

## Risk catalogue — required inspection prompts

Examine the applicable risks; mark irrelevant ones **Not applicable**, not silently absent:

- **URL/SEO compatibility:** previously indexed routes, canonical/hreflang, redirect chains, bookmarks, deep links.
- **Persisted preferences:** locale precedence, malformed/stale values, backward-compatible schema and migrations.
- **SSR and request isolation:** inconsistent locale, hydration warnings, server cache/CDN variants and cross-user leakage.
- **Contracts:** user-facing error text vs. stable machine-readable codes; APIs, webhooks, CSV/PDF/email formats and integrations.
- **Message correctness:** missing keys, fallback loops, plurals, interpolation, context collisions, XSS-prone rendering.
- **Cultural/formatting assumptions:** parsing localized display strings as data, currency conversion confused with formatting, dates/time zones and measurements.
- **Accessibility/layout:** programmatic language, screen-reader strings, truncation, pseudo-localization, bidi/RTL if approved.
- **Operational dependencies:** runtime versions, package lockfile changes, deployment shape, extraction tooling, catalog review ownership.
- **Rollout/recovery:** nonreversible data transforms, toggle limits, old/new app versions running simultaneously, irreversible external publications.

## Failure and stop conditions

Stop before implementation or further slices when any of the following occurs:

- G0 or required G1 authorization is missing; a new locale or translation scope is assumed.
- Current repository differs materially from the validated baseline; unexpected dirty work is at risk.
- An unapproved contract, data model, dependency, deployment or release change becomes necessary.
- A significant regression is detected, verification evidence is insufficient for an applicable exit criterion, or recovery is not credible for a high-impact change.
- The agent cannot distinguish potentially sensitive content from user-visible messages safely.

When blocked, report **what is known, what remains uncertain, viable options, and the exact decision needed**. Do not invent acceptance or proceed silently.

## Required deliverables

Keep documentation proportionate to the migration's size. The standard handoff contains:

1. **Baseline:** revision, scope, evidence sources, existing infrastructure, findings reused or newly validated.
2. **Decision record:** structural vs. active; locales and non-goals; chosen architecture, alternatives and G0/G1 outcomes.
3. **Slice plan:** dependencies, scope, invariants, tests, recovery and required approvals.
4. **Slice evidence:** actual changes, tests run and not run, before/after parity, limitations and acceptance stamps.
5. **Final report:** completed vs. deferred, known risks, policy updates and G2 outcome.

An existing project convention can be used instead of creating new files. Do not create `docs/` or reports in the repository unless authorized. Avoid speculative percentages; coverage denominators must correspond to inspected, defined surfaces.

## Acceptance checklist

- [ ] Source revision, inspected scope, baseline defects and audit evidence recorded.
- [ ] Product target and locale additions explicitly authorized (G0); structural/active approach justified.
- [ ] Existing sound solutions evaluated for preservation; architectural trade-offs and significant changes approved (G1).
- [ ] Each slice defines bounded modifications, invariants, verification, and recovery.
- [ ] Cross-runtime engine choice documents request isolation, RSC/client boundaries, cache/hydration and catalog ownership without leaking framework dependencies into pure domain code.
- [ ] Completion claim distinguishes functional infrastructure from migration coverage and explicitly accepted backlog.
- [ ] Existing specification governance and formal architecture approval gates are followed in order.
- [ ] Current production language and public interfaces retain agreed behavior during migration.
- [ ] Translation is not conflated with internationalization; no unsupported locale is exposed as supported.
- [ ] Locale context, server/client behavior, formatting and resource integrity are tested as applicable.
- [ ] Privacy, accessibility and non-UI channels are accounted for within agreed scope.
- [ ] Test failures, skipped checks, manual validation needs and limitations are reported truthfully.
- [ ] No unauthorized installs, data migrations, commits, pushes, PRs, merges or deployments occurred.
- [ ] Final policy and ongoing verification ownership are documented when authorized.
- [ ] G2 acceptance is recorded separately from technical completion.

## Example invocation

> Audit the existing internationalization implementation in this repository first, reusing any current audit evidence. Propose an incremental migration plan that keeps the current production language and routes unchanged. Do not edit code until I approve the target scope and significant architectural changes. Do not commit, push, open a PR, merge or deploy without separate authorization.
