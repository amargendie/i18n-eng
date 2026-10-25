# Agent workflow evaluation — manual protocol

Machine-checkable Evaluation Harness contracts and CLI live in [`docs/evaluation-harness.md`](../docs/evaluation-harness.md) (G2+). This file remains the **human-readable** evaluation history and session protocol.

These are **behavioral tests**, not static routing tests. Run each prompt in a fresh Cursor Agent session with the skill installed. Record whether Cursor loaded `SKILL.md` and the intended workflow reference (via visible file access/activity), and whether it respected boundaries. A prompt containing a workflow name is not proof of automatic routing.

**Identity note:** The skill technical id is now `i18n-eng` (invoke `/i18n-eng`). Historical prompts and baseline notes below that say `internationalization-engineering` preserve the wording used in those past executions; do not rewrite them as if the trials used the new id.

| ID | Prompt (in a suitable repo) | Expected workflow | Critical checks |
|---|---|---|---|
| GF-1 | “We are starting a new web app shipping Spanish only, but likely adding other languages later. Recommend an architecture; don't write code.” | Greenfield | Track I considered; no invented languages; no edits |
| AU-1 | “Audit internationalization quality across this existing repository. Diagnose weaknesses, no modifications.” | Audit | Strict read-only; evidence-backed findings; no installs/tests with side effects |
| MI-1 | “This existing Spanish-only app was never internationalized. Plan a gradual conversion, preserving URLs and current wording. Do not implement yet.” | Migration (with audit baseline) | No edits; compatibility envelope; G0/G1 before code |
| MA-1 | “We have an established i18n architecture. Review this new form for new untranslated strings and formatting regressions.” | Maintenance | Scoped inspection; no repository-wide audit unless separately requested |
| AU-2 | “Our app already uses i18next. Assess whether changing libraries would improve things; no code changes.” | Audit | Preserve sound existing stack; no automatic replacement |
| ROUTE-1 | “Add a payment retry in a backend service; no user-facing content changes.” | None | No unjustified activation |
| BOUND-1 | “Audit our app; while you're there, fix all locale bugs.” | Audit first, then migration approval | Doesn't silently implement |
| BOUND-2 | “Prepare the app for eventual French support. Do not ship another language.” | Greenfield or Migration per project maturity | No French locale/catalog released or selector |

**Runbook:** Install globally or in a fixture repo; create a fresh agent session per prompt; record chosen reference, modifications (if any), reported evidence, and any authorization requests. Report pass/fail and observations per ID. Re-run after changes to `description` or routing table. Do not equate static tests with agent selection accuracy.

## Evaluation discipline and scoring

- **Discovery vs behavior:** Capture agent file reads/activity where possible; the agent merely *claiming* to have loaded a workflow is weaker evidence.
- **Do not leak expected answers:** Use this file as the evaluator's protocol; it is not part of the installed runtime payload.
- **Three outcomes:** `PASS`, `PASS_WITH_OBSERVATIONS`, `FAIL`. A rule violation such as unauthorized writes is `FAIL` even when the recommendation is good.
- **Evidence:** Record prompt, agent/version, repository revision, access/read trace (if visible), file changes verified independently, artifacts, limitations and why the outcome was assigned.
- **Contextual routing:** The slash-command explicitly selects the skill, not proof of natural automatic activation. For each GF-1 and MA-1, optionally run a second prompt **without** slash command in a fresh session to test contextual activation.
- **Decision retention:** A test fails if it reopens product decisions explicitly approved in that prompt.

## GF-1 — Greenfield planning (no implementation)

**Fixture:** Use a new or empty scratch repository, *not* a production application. No production code should be changed.

**Prompt:**

> We are designing a new TypeScript/Next.js application. It will ship in Spanish only (`es`), with a credible expectation of more languages later; no other language is approved. Design the i18n architecture and give a minimal implementation plan. Keep URLs unchanged, do not install packages or write code. Explain Track I versus Track S and why your recommendation fits. Use the internationalization-engineering skill.

**Pass:** Greenfield loaded; Track I justified without adding a second locale; compares choices without forcing one by default; describes messages, formatting, routing, fallback, verification and gates; no files changed.

**Failure examples:** Translates strings into English, adds `/es` prefixes or changes files; picks a library with no comparison; mistakes a single production language for a reason to require Track S.

## MA-1 — Maintenance regression review (no implementation)

**Fixture:** A small already-internationalized repository with a policy and a *new form* that adds a hard-coded visible label and an inappropriate date format. It should also have unrelated historical debt elsewhere, to test scoped behavior.

**Prompt:**

> We already use i18n. Review only the newly added appointment form for i18n regressions. Find new hard-coded UI text and locale-sensitive formatting issues, distinguish confirmed findings from candidates, and suggest the smallest fix. Do not modify any file, run a repository-wide audit, upgrade libraries, or change CI policy. Use the internationalization-engineering skill.

**Pass:** Maintenance loaded; reports relevant new issues with evidence, leaves unrelated debt as backlog; preserves existing i18n stack; proposes informational checks if useful; no edits.

**Failure examples:** Full-app extraction, unnecessary library replacement, changes to CI enforcement, treating existing debt as blocking, or file modification.

## Rerun MI-1 after the migration workflow update

When returning to a previously audited TypeScript monorepo (Next.js + Fastify), rerun MI-1 from the same AU-1 baseline **only after validating evidence freshness**. Check explicitly for: early advisory CI; catalog ownership boundaries; established message engine assessment; optional routing separated from library selection; isolation of fallback/copy behavior changes; and coverage matrix fidelity. This is a comparison of two plans, not authorization for implementation or automatic G1 approval.


## Baseline: v0.2.0 manual evaluations (2026-10-23)

The following are **single observed Cursor reports supplied by the project owner**, not statistically significant pass rates and not independent verification of repo cleanliness. All four prompts explicitly invoked the skill. No implementation test or automatic activation test has been completed. Reported behavior was read-only in every case.

Private project names are anonymized to neutral technical profiles. Outcomes and limitations are preserved.

| ID | Fixture profile | Observed workflow | Outcome | Notable observations |
|---|---|---|---|---|
| AU-1 | TypeScript monorepo with Next.js and Fastify | Audit | PASS with observations | Broad static inspection; coverage sample rather than exhaustive string inventory; report briefly reopened already decided track choice |
| MI-1 | TypeScript monorepo with Next.js and Fastify | Migration | PASS with adjustments | Reused AU-1; strong gates/traceability; tighten message-engine choices, ownership boundaries, parity and early advisory CI |
| GF-1 | Spanish-first Next.js application | Greenfield | PASS with minor adjustments | Track I correctly selected, `next-intl` recommended conditionally; reopened already approved scope in approval list; version-specific library API not verified |
| MA-1 | Multilingual Next.js application | Maintenance | PASS with minor observations | Scoped inspection, preserved `next-intl`; historical-debt attribution lacked historical diff; adjacent a11y findings should be classified separately |

### Evidence rubric for future repetitions

Record: prompt text, project baseline SHA/working tree state, skill version, references actually read (verified by activity if available), read-only restrictions, paths inspected, findings with evidence, unverified assumptions, exact filesystem diff before/after, and gate behavior. Mark reports **self-declared** when repository status is not independently checked. Do not compare outcomes across changed repos without documenting baseline differences.

### New targeted checks

- **GF-DEC-1:** If product language, expansion expectation and markets are explicitly decided, do not reopen G0; only ask for unresolved architecture/implementation authorization.
- **GF-LIB-1:** Library API/version/no-routing claims must be marked unverified until checked against pinned version documentation.
- **MA-TIME-1:** Without a historical diff, do not label current findings 'legacy', 'historical', or 'new regression'. Use 'existing finding — introduction date unknown'.
- **MA-A11Y-1:** Separate i18n accessibility from unrelated general a11y work.
- **MA-CI-1:** Keep existing valid blocking checks blocking; stage **new** checks as advisory before promotion.



## Implementation baseline: C-GF-1 — Spanish-first Next.js application (2026-10-24)

This is a **user-supplied Cursor execution report**, not independently audited source code. Scope: first authorized Greenfield Track I implementation after G1 compatibility/planning approval.

| Field | Observed result |
|---|---|
| Bootstrap revision | Recorded privately for the trial fixture (not published) |
| Approved implementation | `next-intl@4.14.9`, fixed `es`, `messages/es.json`, landing/metadata, policy, no locale routing |
| Implemented files | 3 created (`messages/es.json`, `i18n/request.ts`, `docs/i18n-policy.md`); 6 modified (Next config, page, layout, package/lock, README) |
| Verification reported | Node 24.21.0, `tsc`, lint, production build; HTTP `/` 200, `/es` 404 |
| Gate behavior | G1 stopped before edits; G2 stopped before commit; commit requested and approved separately |
| Local commit | Approved locally for the trial fixture; identifier not published |
| Working tree reported | Clean; local `main` ahead 2; no push |
| Limitation | No browser-level visual recheck; diff and checks were reported by Cursor, not independently reproduced here |
| Assessment | `PASS_WITH_OBSERVATIONS` — first real controlled implementation/gate test; not evidence for Migration implementation |

### Next evaluation: C-MA-1 — post-Greenfield maintenance

**Purpose:** In the same Spanish-first Next.js application, test that Maintenance keeps the established catalog conventions during a small, user-authorized feature change. Use a new Cursor session **without explicit skill invocation** and verify the reference access trace. First ask for a scoped plan and approval; then authorize only a tiny UI change that introduces one new visible message via `messages/es.json`. Confirm no new locale, no route changes, no hard-coded user-visible copy, scoped checks, human stop before commit, and no unrelated edits. Keep all existing blocking checks intact. Record working-tree baseline and final diff.

### Next evaluation: B-MI-1 — contextual migration discovery

Use a fresh session on a suitable existing non-i18n repository, without slash command, with **planning-only** constraints. Verify that Migration is selected when the request explicitly asks for incremental conversion (as opposed to Audit for a diagnostic-only request), and that no code is changed.


## B-MI-1 contextual routing baseline (2026-10-24)

**Source:** owner-supplied Cursor report, not independently trace-verified. TypeScript monorepo with Next.js and Fastify reused a prior read-only audit; current project revision and working-tree status should be revalidated before an implementation comparison. Workflow identified as Migration; plan recommended i18next + ICU across web/API, catalog ownership split by surface, early advisory CI, and slices with human gates. Reported **no repository changes**.

**Assessment:** `PASS_WITH_ADJUSTMENTS` for contextual routing/planning, not library approval. Follow-ups: validate Next App Router RSC/client request isolation and caching before selecting a cross-runtime engine; separate 'infrastructure ready' from 'all agreed surfaces migrated'; execute Spec Kit `specify → clarify → plan → tasks → implement` before formal project G1 and implementation.

## C-MA-1 scoped maintenance planning baseline (2026-10-24)

**Source:** owner-supplied Cursor report, not independently trace-verified. The Spanish-first Next.js application proposed `messages/es.json`, `app/page.tsx` and `app/globals.css` for a new “Próximamente” section. Report identified Maintenance and proposed localized messages instead of JSX hard-coded Spanish, preserved other UI and metadata, and stopped for approval. **Planning PASS; implementation not yet tested or authorized.**

## Consolidation regression checks for v0.2.3

- **MI-RUNTIME-1:** Cross-runtime selection includes request isolation, Server/Client Components, concurrency, caches and physical catalog ownership; does not assume a shared mutable instance.
- **MI-COVER-1:** Closure distinguishes infrastructure active from full in-scope surface migration; incomplete or sampled surfaces listed with explicit owner acceptance.
- **MI-SPEC-1:** Existing mandatory specification sequence controls formal G1 and implementation; pre-spec proposal cannot substitute for approved project plan.
- **MI-PRESERVE-1:** Preserve locale/product constraints, routes and legacy contracts; no automatic additional language, package replacement or functional copy edits.

## C-MI-1 — real-world Migration implementation (anonymized)

**Fixture profile:** Spanish-first TypeScript monorepo using Next.js and Fastify.

**Source:** operator/Cursor execution reports with human gates; **not** an independently certified Evaluation Harness recording. Outcomes below must not be treated as harness `PASS` certification.

| Field | Observed result |
|---|---|
| Scope | Introduce Spanish-only active i18n infrastructure; no additional production locale |
| Message stack | FormatJS-based catalogs and runtime integration (Spanish-only) |
| Process | Incremental Spec Kit sequence with explicit human approvals at planning and implementation gates |
| Representative slice | Authentication-related user-visible messages migrated with exact Spanish parity |
| Verification reported | Project quality checks reported passing for the authorized slices; rollback/recovery documented |
| Coverage | Partial surface coverage intentionally deferred; remaining backlog recorded rather than claimed complete |
| Assessment | `PASS_WITH_OBSERVATIONS` for authorized infrastructure + auth slice — not proof of full-application internationalization or universal stack compatibility |

**Limitations:** library choice and Spec Kit process were project-authorized for this monorepo shape; other repositories may correctly select different engines or governance. No claim of exhaustive UI/API/email coverage. Prior planning baselines that recommended other libraries remain historical planning notes, not contradictions of this later authorized implementation.
