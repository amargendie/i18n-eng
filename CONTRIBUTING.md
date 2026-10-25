# Contributing

Thanks for your interest in **i18n-eng**.

## Development

1. Use **Node.js 24 LTS** or newer.
2. Clone this repository (the package is not published to npm).
3. Run `npm test` and `npm run eval:structural` before proposing changes.
4. Do not expand product scope of the skill (new locales, workflow redesign) without an explicit maintainer decision.

## Pull requests

- Keep changes focused; prefer documentation and test updates with clear rationale.
- Preserve Audit read-only rules, migration human gates, and Evaluation Harness semantics unless a dedicated change is approved.
- Do not commit `eval-runs/`, secrets, private project names, or personal absolute paths.
- Installer must continue to deploy only `SKILL.md` and `references/` unless maintainers approve a payload change.

## License

By contributing, you agree that your contributions are licensed under the Apache License 2.0 (see `LICENSE`).
