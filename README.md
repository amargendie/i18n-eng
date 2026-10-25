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
| **Distribution** | GitHub clone + local installer (**not** published to npm) |

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
- Git clone of this repository
- No third-party npm runtime dependencies for install or tests

## Install (from a Git clone)

This package is marked `"private": true`. **Do not** expect `npm install -g i18n-eng` or a public npm package. Install the Cursor payload from a clone:

```bash
git clone https://github.com/amargendie/i18n-eng.git
cd i18n-eng

# Project-local: <cwd>/.cursor/skills/i18n-eng/
node bin/install.mjs install

# Global Cursor skills: ~/.cursor/skills/i18n-eng/
node bin/install.mjs install --global

# Preview destination without writing
node bin/install.mjs install --dry-run

# Replace an existing i18n-eng install only
node bin/install.mjs install --force
# (add --global if updating the home-directory install)

# Optional alternate skills root (supported, not runtime-certified)
node bin/install.mjs install --agent agents
```

Equivalent: `npm run install:skill` runs `node bin/install.mjs` (same defaults as calling the installer with no extra flags—writes under the **current working directory** unless you pass `--global`).

The installer copies **only** `SKILL.md` and `references/`. It does **not** install the Evaluation Harness, fixtures, tests, or `eval-runs/`. The folder name always matches frontmatter `name: i18n-eng`.

### Update

Pulling or updating a Git clone of this repository **does not** refresh existing skill installations under `.cursor/skills/` or `~/.cursor/skills/`. Re-run the installer with `--force` after you want the installed payload to match the clone:

```bash
# From the updated clone — project-local install
node bin/install.mjs install --force

# Global Cursor install
node bin/install.mjs install --global --force
```

### Uninstall

Remove the skill directory manually (the installer does not delete skills):

```bash
rm -rf .cursor/skills/i18n-eng          # project-local
rm -rf ~/.cursor/skills/i18n-eng        # global Cursor
```

Do not delete unrelated skills.

### Legacy name (`internationalization-engineering`)

If `.cursor/skills/internationalization-engineering/` (or `.agents/…`) still exists, the installer **reports** it and **does not** modify it.

1. Install `i18n-eng` as above.  
2. Confirm `/i18n-eng` loads the new folder and frontmatter `name: i18n-eng`.  
3. Manually remove the legacy folder when ready.  

Existence of `i18n-eng` alone does not complete migration while the legacy folder remains.

## Repository structure

```text
SKILL.md                 Skill entrypoint (installed)
references/              Workflow docs (installed)
assets/                  Optional templates (not installed)
bin/install.mjs          Skill installer
bin/eval.mjs             Evaluation Harness CLI
lib/eval/                Harness implementation
docs/                    Harness design + synthetic examples
tests/                   Unit/structural tests, G3 cases, fixtures
CHANGELOG.md             Release notes
LICENSE / NOTICE         Apache-2.0
```

## Development and validation

```bash
npm test                 # native node:test suite
npm run eval:structural  # read-only structural validate (G2 + G3 packaging)
```

Requires Node.js **24+**. There are no third-party test frameworks.

## Evaluation Harness

Offline tooling for contributors and evaluators. Documented in [`docs/evaluation-harness.md`](docs/evaluation-harness.md).

**Capabilities:** schema validation, structural package checks, synthetic G3 cases (`GF-001`, `AU-001`, `MI-001`, `MA-001`, `NEG-001`), import of operator-prepared evidence bundles, SHA-256 integrity, deterministic outcome aggregation, `record` / `report` CLI.

**Limitations:** the harness **does not** run coding agents, call LLMs, scrape private repos, or prove authenticity of claimed tool traces. Hashes prove **stored-byte integrity** after import. Historical notes in [`tests/workflow-evals.md`](tests/workflow-evals.md) are human protocol—not machine-certified pass rates.

```bash
# 1) Structural validation (read-only)
node bin/eval.mjs validate

# 2) Import a prepared bundle (does not launch agents)
node bin/eval.mjs record --case NEG-001 --input docs/examples/execution-bundle

# 3) Report the recorded run id from the bundle (after record succeeds)
node bin/eval.mjs report --run example-neg-001-2026-10-24
node bin/eval.mjs report --run example-neg-001-2026-10-24 --json
```

The synthetic example under `docs/examples/execution-bundle/` is **illustrative**. A machine `PASS` from that example is **not** an independently verified agent execution. Keep real `INCONCLUSIVE` recordings as inconclusive.

Imported runs live under gitignored `eval-runs/`.

## Known limitations and non-goals

- Experimental **v0.3.0**; workflow intent stable vs prior 0.2.x guidance, harness is G2–G4.
- Not a guarantee of correct automatic skill activation in every agent product.
- Not an endorsement of any single i18n library or framework.
- Not authorization to change product locales, routes, or APIs.
- npm publication is **out of scope**; use Git clone + installer.
- Optional `assets/i18n-policy.template.md` is for humans copying into projects—not shipped by the installer.

## Versioning, changelog, and license

See [`CHANGELOG.md`](CHANGELOG.md) for `v0.3.0` notes.

Licensed under the **Apache License 2.0**. Copyright and notice: [`LICENSE`](LICENSE), [`NOTICE`](NOTICE).

Security reports: see [`SECURITY.md`](SECURITY.md). Contribution expectations: [`CONTRIBUTING.md`](CONTRIBUTING.md).
