# @sam-ael/medusa-plugin-mailer — notes

## Architecture

- Events: hardcoded in `src/shared/mailer-fields.ts` (`MAILER_EVENTS`)
- Mappings: database only — create in Admin (no seed / no default rows)
- Templates: `email_templates/` (generic) or host `MAILER_TEMPLATES_DIR`

## Release checklist

- [ ] `yarn build`
- [ ] `yarn test`
- [ ] Bump version in package.json
- [ ] Publish npm / yalc
- [ ] Host app: `yarn add @sam-ael/medusa-plugin-mailer@x.y.z`
- [ ] Host app: `npx medusa db:migrate`
- [ ] Host app: create active mappings in Admin → Mailer

## Regenerating bundled templates

```bash
node scripts/generate-bundled-templates.mjs
```
