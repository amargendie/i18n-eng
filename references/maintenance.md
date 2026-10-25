# Internationalization Engineering — Maintenance & Regression Prevention

**Version:** 1.2.0  
**Status:** Approved — incremental CI, baseline-aware debt control, contextual activation  
**Scope:** Existing projects with structural i18n readiness, active i18n infrastructure, or released multilingual experiences  
**Normative dependency:** [`principles.md`](./principles.md) v1.0.0  
**Related workflows:** [`audit.md`](./audit.md) v1.1.0; [`greenfield.md`](./greenfield.md) v1.1.0; [`migration.md`](./migration.md) v1.1.0

## Objective

Keep an approved internationalization architecture reliable as the product changes, while reducing regression risk and continuously improving real deficiencies. **Maintenance is not permission to redesign the architecture, introduce additional languages, translate unrelated content, or migrate entire subsystems.** It applies equally to a single-language application with active i18n infrastructure and a mature multilingual product.

**Success:** changes stay within the authorized scope; existing languages, routes, data and behavior remain compatible; new user-facing features follow the established policy; applicable checks produce evidence; deviations and residual risks are visible.

## Activation and scope policy (approved)

**Contextual activation:** Agents **SHOULD** select this workflow when the authorized development task touches user-visible UI, validation/error messages, notifications, emails, exports, message resources, locale negotiation, or locale-sensitive formatting—even when the user does not explicitly say “i18n.” This is *task routing*, not standing authorization to modify code. A user request for diagnosis only continues to invoke `audit.md` (strict read-only).

- **MUST** inspect only the relevant changed surfaces and their immediate i18n dependencies by default; **MUST NOT** launch a whole-repository audit merely because a component displays text.
- **MUST** respect the currently approved readiness track. Track S calls for low-cost readiness conventions, **not** retroactive extraction or a new library. Track I calls for consistent use of its existing infrastructure in changed user-facing surfaces. Released multilingual apps follow their approved locale-coverage obligations.
- **MUST** treat a new production locale, major routing/fallback change, or broad refactor as a separate authorization/`migration.md` concern.
- **MAY** perform a scoped, read-only impact check when authorization to edit is absent; **MUST NOT** turn contextual activation into implicit write permissions.

## Routing: maintenance, audit, or migration?

- **Use maintenance** for a bounded bug fix, feature increment, resource change, tooling improvement, policy compliance update, or targeted regression check within the existing approved architecture.
- **Use audit** for a diagnostic-only request, uncertain system-wide quality, or a broad assessment without authorization to edit. Audit is strictly read-only, including no indirect writes.
- **Use migration** for a significant change of i18n architecture, replacement of a library, a large-scale message extraction, new persisted locale semantics, public URL strategy changes, or cross-application adoption. A maintenance request MUST NOT bypass migration's product/architecture approvals.
- **Use greenfield** only for a truly new application or an independent new surface without established i18n policy; new modules in an existing application SHOULD follow the existing policy instead.

If the boundary is unclear, inspect read-only, describe the smallest safe path, and request the missing authorization before making consequential changes. Existing migration/audit evidence MAY be reused only after checking freshness and scope.

## Non-negotiable operating contract

1. **MUST** follow P01–P12 and the repository's current i18n policy, coding conventions, authorization rules, and security/privacy constraints. Identify conflicting or obsolete policy rather than silently overruling it.
2. **MUST NOT** expand the list of supported production locales, translate unspecified material, expose unfinished locales, or add a language switcher without explicit product authorization. Pseudolocales MAY be used in isolated tests without release exposure.
3. **MUST** preserve existing URLs, deep links, redirects, locale negotiation, authentication, cookies, APIs, persisted data, content meaning, and existing languages unless a change is approved. Do not treat snapshots or passing compilation as proof of compatibility.
4. **MUST** inspect impacted surfaces and capture relevant baseline before editing. Unlike the audit workflow, authorized maintenance MAY run write-capable tools (tests, build, codegen) only when the allowed scope and side effects are understood.
5. **MUST** never overwrite unrelated dirty working-tree changes or commit/push/open PR/merge/deploy without separately applicable authorization. A local commit is not implicit permission and is not a human quality gate.
6. **SHOULD** preserve sound architecture and established resource patterns; introduce a new abstraction or dependency only where the benefits and migration implications are justified.
7. **MUST** keep potential defects separate from confirmed defects; distinguish tool output, interpretation, and verified reproduction. A hard-coded string is not automatically a defect, and an untranslated string is not automatically a release blocker for a single-language product.
8. **MUST** redact secrets and sensitive or regulated user data in reports, fixtures, log samples, translations and third-party tooling.

## Input and maintenance context (K0)

Collect or infer from authorized project evidence:

- Requested change or symptom; impacted feature, channels, package(s), and deployment environment.
- Current project policy and **readiness track**: structural-only (Track S), active i18n with one or more approved locales (Track I), or multilingual released behavior. Track I with Spanish only is valid.
- Approved locale list, default locale, fallback, language/region/time-zone/currency rules, routing and content ownership; unsupported locale behavior.
- Existing resources, formatting utilities, build/test tooling, pseudo-localization strategy, and relevant existing audit findings.
- Baseline (current behavior and relevant checks), repository state/dirty files, known pre-existing failures, and authorization limits.

If needed evidence is missing, limit work to evidence-supported recommendations or a safe isolated change; do not manufacture requirements.

## Existing-debt policy (approved)

Prevent new regressions without requiring unrelated historical debt to be paid down in every change:

1. **MUST** identify the relevant baseline when feasible, distinguishing pre-existing findings from newly introduced ones and from findings whose origin cannot be established.
2. **MUST** treat **new confirmed violations** against the approved project policy as defects in the current change; fix them within authorization or report a blocked/unaccepted outcome. **Likely/Unverified candidates** require confirmation before being called violations or made blocking.
3. **MUST NOT** fail unrelated work solely because unrelated, pre-existing i18n debt remains open. Record that debt and recommend a separate bounded follow-up when useful.
4. **SHOULD** correct pre-existing issues directly touched by the change when safe and proportionate, but **MUST NOT** silently expand the authorized scope. If correction is too broad, document and defer.
5. **MUST** preserve security, privacy, critical accessibility, and user-visible correctness obligations: the debt policy does not exempt an agent from flagging a severe existing issue with real impact. Escalate urgent issues through the project's incident/security process without making unrelated changes autonomously.
6. **MUST NOT** manufacture a clean baseline by suppressing findings or automatically accepting altered snapshots; document uncertain or incomplete baseline comparisons.

## Temporal evidence and finding provenance (MA-1 lessons)

- **MUST** classify a finding as a **new regression** only when supported by a diff, dated baseline, reproducible before/after behavior, or equivalent evidence. Current-state observation alone does not establish when a defect was introduced.
- **MUST** classify a finding as **pre-existing debt** only when there is evidence predating the change under review. When origin is unknown, label it **existing finding — introduction date unknown**, not historical debt or new regression.
- **MUST** distinguish evidence gathered by actually running checks from static inspection of checks and resources. Never equate a validator's existence with successful execution.
- **SHOULD** distinguish i18n-specific accessibility issues (language metadata, translated accessible names, translated errors) from broader accessibility improvements (`aria-live`, focus, status alerts). Report applicable non-i18n issues as adjacent findings; avoid using them to expand a localized maintenance scope without authorization.
- **MUST** preserve already validated blocking CI checks. Newly proposed checks enter an advisory/calibration phase unless the user explicitly authorizes enforcement after assessing false positives.

## Maintenance stages

### K1 — Classify change and impact (read-only before edits)

Assign one category:

- **Feature compliance:** new UI, message, error, email, export, notification, or API-rendered content must use approved i18n conventions.
- **Regression repair:** existing locale selection, fallback, message integrity, presentation, accessibility, or layout has failed.
- **Resource hygiene:** stale/unused keys, missing values, interpolation mismatch, obsolete locale data, or terminology drift.
- **Quality improvement:** tests, lint/static checks, pseudolocalization, documentation, automated resource validation.
- **Architectural request:** potentially significant; route to migration rather than silently implementing.

Map impacted server/client boundaries and delivery channels. Identify possible SSR/hydration, cache-key, locale isolation, date/number formatting, directionality, email/export, error rendering, search/indexing, accessibility and SEO effects where applicable. Prefer bounded inspection, not an automatic full-repository audit.

### K2 — Propose the smallest safe change

State the problem, evidence, expected user behavior, affected locales/surfaces, non-goals, compatibility invariants, proposed files/dependencies, test approach, and recovery steps.

**Approval rule:** routine scoped changes MAY proceed under an explicit development authorization that covers them and the repository's workflow. **MUST** request a new human decision before introducing a supported locale, changing fallback or URL semantics, replacing an i18n framework, modifying persisted locale contracts, making a broad cross-module refactor, or deviating materially from current policy. Such significant changes SHOULD be routed through `migration.md` with its gates.

For a reported production regression, prioritize containment and minimizing blast radius; do not rush an unapproved broad refactor. If the authorized fix is insufficient, stop and present options.

### K3 — Implement within the authorized boundary

- Reuse existing message stores, naming conventions, typed keys, extraction tooling, and approved ownership; preserve contextual descriptions for translators.
- Keep user-visible messages complete and grammatically translatable; avoid fragile concatenation, constructing keys from unbounded runtime data, or unreviewed interpolation of HTML.
- Keep numbers, dates, durations, currencies and units as semantic values until presentation; respect language, locale, time zone, regional preferences and numeric precision separately.
- Validate parameters, plurals/selectors and rich-text placeholders; do not silently drop keys or swallow missing messages unless the policy explicitly defines that behavior.
- Preserve fallback and error behavior without hiding missing catalog coverage in a supposedly released locale.
- Verify accessible names, announcements, document/element language, text growth, RTL/bidi behavior and logical layout when relevant; test with representative strings, not only short English samples.
- Avoid globally mutable locale state across requests, cache poisoning or cross-user locale leakage. Revalidate SSR/client consistency when affected.
- Never place private personal/medical/legal/business data in public catalogs, logs, screenshots or external translation services.

**Track S:** enforce low-cost conventions without requiring catalogs or a locale switcher. **Track I:** require messages and formatting to use the approved live infrastructure on the surfaces being changed; do not infer authorization for another locale. **Multilingual release:** ensure all affected released locales meet the project's coverage/quality rules, or explicitly escalate any intentional release gap.

### K4 — Validate and assess regressions

Run only checks authorized for this task. Prefer the closest, fast checks first; expand where impact is cross-cutting. Consider:

| Layer | Evidence to collect when relevant |
| --- | --- |
| Code & resources | Types/lint; key completeness; ICU/message parse; interpolation/plural/select consistency; intentional unused keys |
| Runtime | Fallback/missing-key behavior; locale precedence and persistence; SSR/hydration; cross-request isolation |
| Formatting | Dates, time zones, numbers, currencies, units, precision; edge cases, not just happy paths |
| UI & accessibility | Label and validation text; language metadata; long-text/pseudolocale overflow; RTL/bidi and keyboard behavior |
| Contracts & navigation | URL/deep-link parity, redirects, cache variants, API/email/export compatibility and SEO where applicable |
| Delivery | Build/CI, representative visual review, supported-locale coverage, rollback readiness |

Compare against baseline and existing production-locale behavior. Unrun checks MUST be labelled **not run**; non-applicable checks labelled **not applicable** with reason. Distinguish automated PASS from human product, accessibility and linguistic acceptance. Never fix test failures by weakening assertions or blindly updating snapshots without justification and approval.

### K5 — Report and hand off

Provide a concise report appropriate to scope:

1. **Change type and scope:** maintenance vs. audit/migration, readiness track and authorized locales.
2. **Evidence and implementation:** baseline, files touched, changes made (or recommendations only), existing behavior preserved.
3. **Verification:** commands/checks and actual outcomes, locale-specific coverage, manual review status; distinguish advisory checks from approved blocking gates and report baseline changes.
4. **Remaining issues:** newly introduced vs. pre-existing vs. indeterminate findings, plus severity (Critical/High/Medium/Low/Opportunity), confidence (Confirmed/Likely/Unverified), effort (S/M/L/Unknown), known limitations and deferred work; do not invent numeric risk scores.
5. **Decision:** `PASS`, `PASS_WITH_LIMITATIONS`, or `BLOCKED`; whether human acceptance remains pending. Unrelated baseline debt is reported, not automatically treated as failure of the scoped change.
6. **Policy impact:** any approved update to the existing i18n source of truth (P11), or a proposed policy change awaiting authorization.

Avoid a second competing policy file. Documentation changes inside the repository require task authorization. Do not declare a migration complete merely because a maintenance ticket passes.

## Regression prevention / CI guidance — incremental rollout (approved)

**CI controls are introduced progressively, not automatically as blocking checks.** Any new check **MUST** begin in *informational / advisory mode* unless an existing approved policy already requires it. The following conditions **MUST** be satisfied before promotion to mandatory CI: (1) establish a trustworthy baseline; (2) measure false positives and refine detection; (3) define exceptions and ownership; (4) confirm the check runs reliably in the project environment; (5) get explicit engineering approval for the blocking threshold and rollout. **MUST NOT** change CI enforcement level solely because this skill is activated.

A recommended adoption sequence is **observe → calibrate → enforce newly introduced confirmed regressions → expand carefully**, while leaving historical findings on an explicit backlog or accepted baseline. Checks that cannot reliably distinguish new and existing violations **SHOULD** remain informational until that is resolved.

For an **active i18n migration**, add basic key/catalog checks as soon as a catalog is introduced (foundation or first end-to-end slice); keep them informational while evidence and false-positive rates are established. The final migration phase consolidates and may propose enforcement, but MUST NOT be the first point at which resource integrity is checked. A migration must route architecture changes through `migration.md`, not sneak them into routine maintenance.

Establish lightweight checks that can run on touched files and progressively expand to repository-level coverage:

1. Catalog syntax and placeholder consistency across approved released locales.
2. Key/namespace conventions and clear unused-key policy; count uncertain hard-coded text candidates separately from violations.
3. Unit tests for pluralization, default locale fallback, date/time/number formatting and error paths.
4. Representative UI smoke test with a long-string/pseudolocale fixture; add RTL checks only if relevant to supported languages or explicit future requirements.
5. Documentation of how contributors add messages and verify changes.

CI gate severity MUST reflect actual product guarantees: for Track S do not fail on missing catalogs; for Spanish-only Track I do not fail on missing English; for multilingual release distinguish approved coverage requirements from nonblocking best practices. Do not block unrelated CI for pre-existing findings; exceptions, suppressions, and thresholds MUST be documented and reviewable. Mandatory gates require explicit engineering approval and a measured rollout, never silent auto-promotion.

## Known tricky cases and stop conditions

- **Incomplete or stale evidence:** recheck the affected assumptions or stop with a gap statement.
- **A release locale missing a message:** follow documented fallback and escalation; do not mask a substantial user-facing gap as resolved.
- **Stale formatted or cached output:** test invalidation, key variance, and request isolation before changing fallback or cache architecture.
- **User-authored content or legally fixed text:** do not translate or transform without a product/legal decision; separate system UI from authored content.
- **Locale-tag or time-zone ambiguity:** preserve source semantics, normalize only where valid, and disclose unknowns.
- **Pre-existing hard-coded content:** do not expand a bounded ticket into unauthorized full-app extraction; inventory technical debt separately.
- **Cross-cutting architecture, routing, storage, or additional production language:** STOP; invoke migration planning and approvals.
- **Tests reveal unrelated failures or dirty changes:** report baseline and isolate; never reset another contributor's work.
- **Sensitive data exposure risk:** STOP and contain/report according to project policy rather than using real records for tests.

## Cross-workflow consistency

- **`principles.md`:** P04 inspection and P05 preservation precede change; P06 gates apply to significant migration; P09 requires evidence-backed resource integrity; P11 preserves a single policy source of truth; P12 requires verification. Contextual activation does not override task authorization.
- **`greenfield.md`:** the approved adaptive readiness policy remains in force: Track S is valid without catalogs, Track I may ship a single locale, and release locale expansion always requires product authorization.
- **`audit.md`:** a requested diagnostic-only exercise stays strictly read-only. Maintenance permits side effects only within separately authorized implementation tasks; its initial inspection is not permission to run audit-unsafe commands during `audit.md`.
- **`migration.md`:** broad extractions, architecture replacement, URL/fallback/persistence contract changes, and additional release locales are escalated to migration planning with the relevant approvals, not performed as incidental maintenance. The draft migration workflow's gates remain authoritative for that workflow.

## Validation profiles — illustrative shapes, not prescriptions

### TypeScript monorepo with Next.js and Fastify (after approved Spanish-only migration)

- **Expected condition:** Spanish-only product with active i18n infrastructure after migration; future locales are not yet approved.
- **Maintenance challenge:** new feature, admin, and API-adjacent surfaces must use the established Spanish message/formatting system, while retaining Spanish URLs, APIs and user workflows.
- **Desired checks:** newly introduced hard-coded UI candidates; message-key/parameter consistency; Spanish parity; locale-safe formatting; SSR/hydration and accessible labels. Never require English catalogs simply because the architecture supports expansion.
- **Process:** follow the repository's approved specification/planning gates for significant new capabilities and local commit rules; no push/PR/merge without authorization.

### Multilingual Next.js application (already internationalized)

- **Expected condition:** inspect the actual existing policy and architecture before judging quality; do not assume its library or coverage.
- **Maintenance challenge:** identify targeted improvements in catalog integrity, content context, formatting, SSR/client consistency, tests and CI without unnecessary framework replacement.
- **First safe exercise:** a read-only `audit.md` assessment; then authorize individual maintenance fixes backed by evidence. A broad redesign belongs to `migration.md`.

These profiles are examples and MUST NOT become global requirements of the skill.

## Acceptance checklist

- [ ] Request correctly routed to maintenance, audit, or migration.
- [ ] Current policy, readiness track, approved locales and baseline established.
- [ ] Change and side-effect permissions respected; no unauthorized product expansion or version-control action.
- [ ] Existing routes, contracts, content meaning, formatting semantics and supported locale behavior preserved or separately approved.
- [ ] Appropriate checks executed with actual results; unrun/manual checks explicitly labelled; advisory and blocking status not conflated.
- [ ] New confirmed regressions separated from historic debt and uncertain candidates; unrelated debt not used to block a bounded change.
- [ ] No sensitive data leakage; no unrelated dirty changes overwritten.
- [ ] Outcome, residual findings and policy/documentation impacts reported.

## Example invocation

> Review the i18n impact of the changed UI and backend messages in this feature. Follow the repository's approved locale policy, keep production languages and routes unchanged, fix only the explicitly authorized scope, run the relevant existing checks, and report regressions and unverified surfaces. Do not commit, push, open a PR, merge or deploy without separate authorization.
