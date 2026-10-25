# Internationalization Engineering (`i18n-eng`)

An [Agent Skill](https://agentskills.io/) that helps coding agents **design, audit, migrate, and maintain** software internationalization (i18n).

**Audience:** engineers and agent operators who need disciplined i18n work in application repositories—not a translation marketplace or unsupervised locale expansion tool.

| | |
| --- | --- |
| **Display name** | Internationalization Engineering |
| **Technical skill id** | `i18n-eng` |
| **Invoke** | `/i18n-eng` (explicit) or contextual discovery from the skill description |
| **Version** | **v0.3.0** (experimental initial public release) |
| **License** | [Apache-2.0](LICENSE) |
| **Intended install** | `npx i18n-eng install` (after npm publication) |
| **Available now** | Git clone + local installer (see below) |

## What it does

| Workflow | Purpose |
| --- | --- |
| **Greenfield** | Plan proportionate i18n for a new app or surface (including Spanish-only, future-ready Track I vs structural Track S). |
| **Audit** | Assess an existing codebase and report gaps—**strictly read-only**. |
| **Migration** | Plan and execute **approved**, incremental i18n change in existing software. |
| **Maintenance** | Prevent regressions and improve an already approved i18n setup without unnecessary rewrites. |

**Useful when:** you are introducing i18n architecture, diagnosing localization debt, migrating legacy UI copy, or reviewing a scoped feature for i18n regressions.

**It does not:** translate your product unsupervised, add languages without authorization, replace sound stacks by default, or treat “tests passed” as human acceptance.

## Discovery versus explicit invocation

Compatible agents typically load skill **name + description** at startup and may activate `i18n-eng` when a task matches (automatic discovery). `/i18n-eng` **forces** selection of this skill. Slash invocation proves the skill was requested; it does **not** by itself prove correct workflow routing or that boundaries were respected. Prefer fresh conversations for evaluation.

## Environments

| Path | Status |
| --- | --- |
| **Cursor** — install under `.cursor/skills/i18n-eng/` (project or `~`) | **Tested** for install layout and primary operator workflow |
| **Generic agents** — `--agent agents` → `.agents/skills/i18n-eng/` | Installation path **supported**; runtime behavior **not** independently certified |

## Prerequisites

- **Node.js 24 LTS or newer** (`package.json` `engines.node: ">=24"`)
- No third-party npm runtime dependencies for install or tests

## Install

### Intended method (after the package is published to npm)

```bash
npx i18n-eng install                 # project-local: .cursor/skills/i18n-eng/
npx i18n-eng install --global        # ~/.cursor/skills/i18n-eng/
npx i18n-eng@0.3.0 install           # pin this release
npx i18n-eng install --dry-run
npx i18n-eng install --force         # replace existing i18n-eng only
npx i18n-eng install --agent agents  # supported path; runtime not certified
i18n-eng --help
```

Until publication completes, `npx i18n-eng` may fail with a registry 404. Use the Git clone method below in the meantime.

### Currently available: Git clone

```bash
git clone https://github.com/amargendie/i18n-eng.git
cd i18n-eng
node bin/install.mjs install
node bin/install.mjs install --global
node bin/install.mjs install --dry-run
node bin/install.mjs install --force
```

The installer copies **only** `SKILL.md` and `references/` into the skills directory. It does **not** install the Evaluation Harness, fixtures, tests, or `eval-runs/`. The folder name always matches frontmatter `name: i18n-eng`.

The npm package (when published) ships the skill payload plus the installer and public docs. The Evaluation Harness remains in the **GitHub repository** for contributors (`npm test`, `npm run eval:structural`).

### Update

Updating a Git clone or reinstalling a newer npm package **does not** refresh an existing skill folder by itself. Re-run install with `--force`:

```bash
npx i18n-eng@0.3.0 install --force
# or from a clone:
node bin/install.mjs install --force
node bin/install.mjs install --global --force
```

### Uninstall

```bash
rm -rf .cursor/skills/i18n-eng
rm -rf ~/.cursor/skills/i18n-eng
```

Do not delete unrelated skills.

### Legacy name (`internationalization-engineering`)

If `.cursor/skills/internationalization-engineering/` (or `.agents/…`) still exists, the installer **reports** it and **does not** modify it. Install `i18n-eng`, verify `/i18n-eng`, then remove the legacy folder manually.

## Repository structure

```text
SKILL.md                 Skill entrypoint (installed)
references/              Workflow docs (installed)
bin/install.mjs          Skill installer (npm bin: i18n-eng)
bin/eval.mjs             Evaluation Harness CLI (GitHub / local clone)
lib/eval/                Harness implementation (not in npm pack)
docs/                    Harness design + examples (not in npm pack)
tests/                   Tests and fixtures (not in npm pack)
assets/                  Optional templates (not installed; not in npm pack)
CHANGELOG.md LICENSE NOTICE
```

## Development and validation

```bash
git clone https://github.com/amargendie/i18n-eng.git
cd i18n-eng
npm test
npm run eval:structural
```

Requires Node.js **24+**. There are no third-party test frameworks.

## Evaluation Harness

Offline tooling for contributors and evaluators (clone the repository). Documented in [`docs/evaluation-harness.md`](docs/evaluation-harness.md).

**Capabilities:** schema validation, structural package checks, synthetic G3 cases, evidence `record` / `report`, SHA-256 integrity, deterministic aggregation.

**Limitations:** the harness **does not** run coding agents, call LLMs, scrape private repos, or prove authenticity of claimed tool traces. Historical notes in [`tests/workflow-evals.md`](tests/workflow-evals.md) are human protocol—not machine-certified pass rates.

```bash
node bin/eval.mjs validate
node bin/eval.mjs record --case NEG-001 --input docs/examples/execution-bundle
node bin/eval.mjs report --run example-neg-001-2026-10-24
```

Imported runs live under gitignored `eval-runs/`.

## Known limitations and non-goals

- Experimental **v0.3.0**; workflow intent stable vs prior 0.2.x guidance; harness is G2–G4 in-repo.
- Not a guarantee of correct automatic skill activation in every agent product.
- Not an endorsement of any single i18n library or framework.
- Not authorization to change product locales, routes, or APIs.
- Optional `assets/i18n-policy.template.md` is for humans copying into projects—not shipped by the installer or npm pack.

## Versioning, changelog, and license

See [`CHANGELOG.md`](CHANGELOG.md) for `v0.3.0` notes.

Licensed under the **Apache License 2.0**. Copyright and notice: [`LICENSE`](LICENSE), [`NOTICE`](NOTICE).

Security reports: see [`SECURITY.md`](SECURITY.md). Contribution expectations: [`CONTRIBUTING.md`](CONTRIBUTING.md).
