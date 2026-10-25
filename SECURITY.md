# Security

## Supported versions

Security fixes are considered for the latest published source on the default branch of this repository (currently the **v0.3.0** experimental line).

## Reporting a vulnerability

Please **do not** open a public issue for security-sensitive reports.

Email the maintainer via the contact method listed on the GitHub profile that owns [this repository](https://github.com/amargendie/i18n-eng), and include:

- A description of the issue and impact
- Steps to reproduce or a proof of concept if available
- Whether the issue affects the installed skill payload, the installer, or the Evaluation Harness

## Scope notes

- The Evaluation Harness executes **no** agent code from evidence bundles; treat operator-supplied evidence as untrusted input for path/size handling only.
- Do not submit secrets, credentials, or private customer data in issues, PRs, or evaluation bundles.
