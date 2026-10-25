# Internationalization Engineering — Core Principles

**Version:** 1.0.0  
**Status:** Approved  
**Scope:** All Internationalization Engineering workflows

## Purpose

These principles govern how coding agents design, audit, migrate, and maintain internationalization (i18n) in software projects. They are framework-agnostic and apply to greenfield, audit, migration, and maintenance workflows.

The skill supports engineering decisions; it does not independently determine product scope.

## Normative language and authority

The terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** express requirements, recommendations, and permitted alternatives, consistent with RFC 2119 and RFC 8174.

- **MUST / MUST NOT:** mandatory within the authorized workflow. Any inability to comply MUST be disclosed; the agent MUST NOT silently ignore the requirement.
- **SHOULD / SHOULD NOT:** strong defaults. Departures require a documented, context-specific reason.
- **MAY:** an option that can be selected when justified by project needs.

These principles operate within the authority granted by the user and project. They do not override higher-priority instructions, security requirements, established project constraints, or explicit authorized decisions. A conflict MUST be surfaced rather than resolved through unauthorized changes.

## Architecture

### P01 — Separate internationalization from localization

- The agent **MUST** distinguish internationalization architecture, translation/message management, locale-sensitive formatting, and regional or cultural adaptation.
- Introducing i18n **MUST NOT** automatically trigger translation or expansion of supported languages.
- The agent **SHOULD** design interfaces and data flows that can support localization without assuming translations already exist.

### P02 — Prefer interoperable standards

- The agent **SHOULD** prefer established standards and platform capabilities where appropriate, including BCP 47 language tags, Unicode, CLDR-backed locale data, and locale-aware platform APIs (such as ECMA-402 in JavaScript environments).
- It **MUST** respect the semantics and limitations of standards it adopts, including the distinction between language tags and regional formatting preferences.
- It **MUST NOT** demand replacement of a working implementation merely because a different library or convention is more fashionable or superficially closer to a standard.
- ICU MessageFormat or equivalent message capabilities **MAY** be recommended when justified by pluralization, selection, or grammar needs; no particular message syntax is universally mandatory.

### P03 — Remain technology-agnostic

- The agent **MUST NOT** prescribe an i18n library, storage format, framework, or deployment pattern before examining relevant project constraints.
- Recommendations **MUST** account for the existing stack, runtime/rendering model, maintenance burden, deployment constraints, and ecosystem compatibility.
- The agent **SHOULD** explain meaningful trade-offs when choosing among viable solutions.

## Assessment and change

### P04 — Inspect before deciding

- For existing projects, the agent **MUST** inspect the relevant implementation, dependencies, locale resources, formatting practices, routing/rendering behavior, tests, and repository conventions before recommending architectural changes.
- The **audit workflow MUST be read-only** with respect to application code, configuration, dependencies, generated files, and project documentation. It **MAY** produce an audit report outside the inspected project or at a user-authorized output location.
- The agent **MUST NOT** infer a complete architecture from the presence or absence of a single package.
- Unknown or unverified findings **MUST** be identified as such.

### P05 — Preserve sound existing solutions

- The agent **MUST NOT** replace a functioning i18n architecture without demonstrated benefits and authorization.
- It **SHOULD** favor targeted improvements and compatibility over unnecessary rewrites.
- Before proposing replacement, the agent **MUST** explain existing limitations, alternatives, migration cost, and likely impact.

### P06 — Migrate incrementally and with explicit authorization

- The agent **MUST** produce an assessment and migration plan before a significant migration and **MUST obtain explicit approval of that plan before implementation**.
- A significant migration includes replacing the i18n library, changing locale-routing or fallback semantics, restructuring message catalogs broadly, or introducing cross-cutting application changes.
- Authorized implementation **SHOULD** proceed in bounded, verifiable increments that minimize unrelated changes and preserve existing behavior unless otherwise approved.
- Each increment **SHOULD** define acceptance criteria and appropriate recovery or rollback steps.
- For small, clearly scoped changes, existing user authorization **MAY** be sufficient without an additional approval gate.
- The agent **MUST NOT** equate implementation completion with verified acceptance.

## Quality

### P07 — Preserve linguistic and semantic context

- Message identifiers and content **SHOULD** preserve enough meaning and context for accurate localization.
- The agent **SHOULD** avoid concatenating translatable fragments or assuming fixed word order.
- Pluralization, interpolation, selection, rich text, and grammatical variation **MUST** be handled correctly where the product requires them.
- Dynamic messages **MUST NOT** be rejected solely for being dynamic; their extractability, safety, and maintainability **SHOULD** be assessed in context.

### P08 — Format semantic values at presentation boundaries

- The agent **MUST** distinguish language, region, time zone, currency, measurement system, and user formatting preferences whenever the distinction affects correctness.
- It **SHOULD** preserve dates, times, numbers, monetary amounts, and measurements as semantic values until presentation, rather than prematurely storing locale-formatted strings.
- Locale-aware platform formatting **SHOULD** be used where supported.
- Changing the interface language **MUST NOT** silently change independent business or user preferences without an explicit product rule.

### P09 — Maintain message-resource integrity

- The agent **SHOULD** validate message catalogs and locale configuration for missing or unexpected keys, malformed syntax, incompatible placeholders, invalid locale identifiers, and broken fallback behavior.
- Hard-coded user-facing text **SHOULD** be identified when inconsistent with the project's approved i18n policy.
- Automated detection **MUST** distinguish confirmed defects, likely candidates, and unresolved findings; the agent **MUST NOT** represent heuristic counts as proven defects.
- Existing resources **MUST NOT** be deleted or mass-rewritten on the basis of unverified heuristics.

### P10 — Treat accessibility and layout as i18n concerns

- Relevant changes **MUST** preserve accessible names, language metadata, localized validation feedback, and usable keyboard/assistive-technology interaction.
- The agent **SHOULD** consider text expansion, truncation, bidirectional text, and layout resilience.
- RTL-specific implementation and tests **SHOULD** be included when RTL locales are in the approved scope; they **MAY** be documented as future readiness work otherwise.
- Translation coverage alone **MUST NOT** be presented as proof of accessibility or localization readiness.

## Governance and validation

### P11 — Persist project-specific decisions

- The agent **MUST** identify and respect the project's existing source of truth for i18n decisions.
- When no adequate policy exists, it **SHOULD** propose a version-controlled policy document, using `docs/i18n-policy.md` as the default path unless project conventions indicate otherwise.
- Creating or modifying that document **MUST** respect the permissions of the active workflow; audit alone does not authorize repository writes.
- The policy **SHOULD** document approved locales, default and fallback behavior, message organization, formatting rules, routing, accessibility expectations, and validation strategy.
- The agent **MUST NOT** create competing policy sources without a stated resolution plan.

### P12 — Verify behavior, not merely configuration

- The agent **MUST** match completion claims to actual evidence.
- Validation **SHOULD** cover the relevant subset of message integrity, formatting, pluralization, locale negotiation/routing, rendering consistency, accessibility, pseudolocalization, RTL, and regression tests.
- Test coverage **MUST** reflect the approved locale and feature scope; unsupported locales **MUST NOT** be represented as validated.
- Installing a package or extracting strings **MUST NOT** be treated as sufficient evidence of i18n readiness.

## Product authority: supported locales

- The project owner or authorized product stakeholder **MUST** determine which languages and locales are supported.
- The agent **MAY** detect existing locales, identify inconsistencies, and recommend additions or removals.
- The agent **MUST NOT** add or remove supported locales, commission or synthesize translations for release, or change the default locale without explicit authorization.
- A locale used only for testing or pseudolocalization **MUST** be clearly distinguished from a supported production locale.

## Workflow permissions

| Workflow | Default permission | Approval requirement |
| --- | --- | --- |
| Greenfield | Design and propose; implement only within authorized scope | Approval for product-locale choices and consequential architecture decisions |
| Audit | Read-only assessment | Explicit authorization required for any repository write |
| Migration | Assess and plan before modifying | Explicit plan approval for significant migrations |
| Maintenance | Perform authorized, scoped fixes and verification | Escalate changes that alter architecture or product locale scope |

No workflow authorizes commits, pushes, pull requests, merges, dependency installation, or other side effects beyond the permissions granted for the task and repository.

## Conflict and deviation protocol

When requirements conflict or a principle cannot be satisfied, the agent **MUST**:

1. Identify the conflicting requirements or constraint.
2. Explain the practical trade-off and affected behavior.
3. Select only an option permitted by the current authority and scope, or request a decision.
4. Document any justified deviation and its validation implications.
5. Avoid claiming compliance or completion without evidence.

Where multiple valid solutions exist, prefer the option that preserves project intent, interoperability, maintainability, and verified behavior without unnecessary change.

## Reference standards

- RFC 2119 / RFC 8174 — Requirement language.
- BCP 47 (RFC 5646 and RFC 4647) — Language tags and matching.
- Unicode / Unicode CLDR (UTS #35) — Text and locale data conventions.
- ECMA-402 — JavaScript internationalization APIs, where applicable.

These references inform implementation choices; they do not mandate a JavaScript stack or a particular translation library.
