# Changelog

All notable changes to this project are documented in this file.

## [0.3.0] — 2026-10-25

Experimental **initial public** release of **Internationalization Engineering** (`i18n-eng`).

### Skill

- Four workflows: **Greenfield**, **Audit**, **Migration**, **Maintenance**, with shared principles and human authorization gates.
- Technical skill id and install folder: `i18n-eng` (invoke `/i18n-eng`).
- Display name remains Internationalization Engineering.
- Installer copies only `SKILL.md` and `references/` to project or global Cursor skills; supports `--dry-run`, `--force`, `--global`, and `--agent cursor|agents`.
- Legacy installs named `internationalization-engineering` are detected and left untouched.
- CLI requires an explicit `install` subcommand; `--help` / bare invocation print usage (compatible with `npx i18n-eng install`).

### Distribution

- Intended public install: `npx i18n-eng install` / `npx i18n-eng@0.3.0 install` (after npm publication).
- npm package allowlist: skill payload + installer + public docs/license (Evaluation Harness remains GitHub-only).
- Git clone + `node bin/install.mjs install` remains supported.

### Evaluation Harness

- Offline G2–G4 core in the repository: structural validation, synthetic G3 cases, evidence `record` / `report`.
- Does **not** execute coding agents or authenticate tool traces; SHA-256 proves stored-byte integrity after import.
- Native `node:test` suite; Node.js **24+**; no third-party runtime dependencies.

### Validation performed (release candidate)

- `npm test` (including npm pack / isolated HOME installer coverage)
- `npm run eval:structural`
- `npm pack` / `npm pack --dry-run` content inspection
- Isolated installer checks for `.cursor/skills/i18n-eng/` payload contents

### Known limitations

- Experimental quality; not a certified multi-agent compatibility matrix.
- `.agents` install path is supported for layout only; runtime not independently certified.
- Public documentation uses anonymized evaluation profiles; do not treat historical notes as statistical pass rates.
