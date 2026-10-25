# i18n policy (template)

> Optional repository template for product teams. **Not** part of the installed Cursor skill payload (`SKILL.md` + `references/` only). Copy into a project (for example `docs/i18n-policy.md`) and fill in approved decisions. Do not invent locales or routing without product authorization.

## Supported locales

- **Production locales:** _(list BCP 47 tags; example: `es`)_
- **Authorized but not shipped:** _(none / list)_
- **Explicitly out of scope:** _(example: no additional locales without product approval)_

## Locale selection

- **Default locale:** _
- **Resolution order:** _(URL → cookie → Accept-Language → default — or “fixed single locale”)_
- **User-visible language switcher:** _(yes / no; authorization required to add)_
- **URL / routing policy:** _(unchanged paths / locale prefix / other — record the approved choice)_

## Message ownership

- **UI copy owner:** _(app package / team)_
- **API / domain human-readable errors:** _(package and contract rules)_
- **Email / PDF / other channels:** _(owner per channel)_
- **Shared keys vs surface-local catalogs:** _(state the boundary)_

## Catalog and key conventions

- **Catalog format / location:** _(example: `messages/es.json`)_
- **Key naming:** _(dot paths, namespaces, casing)_
- **Interpolation / plurals / rich text:** _(engine capabilities in use)_
- **Source language for keys and copy:** _

## Missing-message behavior

- **Development:** _(error / warning / show key)_
- **Production:** _(fallback locale / last resort string / fail closed)_
- **Fallback locale:** _(if any; must be product-approved)_

## Formatting versus language

- **Dates, numbers, currency, lists:** use locale-aware formatters; do not hand-roll with string concatenation.
- **Time zone:** _(user preference / fixed business zone / server local — document authority)_
- **Currency and units:** _(display formatting vs conversion; conversion needs explicit product rules)_
- **Do not conflate** language, region, time zone, and currency preference.

## Regional and business rules

- **Legal / regulatory copy:** _(owner and review process)_
- **Market-specific behavior** beyond translation: _(list or “none authorized”)_

## Verification and rollout

- **Required checks before merge:** _(typecheck, lint, i18n CI advisory/blocking)_
- **Advisory vs blocking CI:** _(new checks start advisory until approved)_
- **Rollout / recovery:** _(feature flags, rollback of catalogs, ownership of incidents)_
- **Change control:** product locales, routing, and fallback changes require explicit approval.
