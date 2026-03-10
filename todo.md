# @sam-ael/medusa-plugin-mailer — Build TODO

A Medusa v2 email plugin with dashboard-managed event→template mappings, 
5 sender profiles, in-memory caching, and nodemailer transport.

---

## Phase 1: Foundation

- [ ] Add `nodemailer` + `@types/nodemailer` deps to `package.json`
- [ ] Update package.json metadata (description, author)

## Phase 2: Module (Database)

- [ ] Create `src/modules/mailer/models/mailer_event_mapping.ts`
  - Fields: event_name, template_name, sender_index, template_variables (JSON),
    recipient_type, recipient_email, subject, active
- [ ] Create `src/modules/mailer/service.ts` (MedusaService)
- [ ] Create `src/modules/mailer/index.ts` (Module registration as "mailer")
- [ ] Generate migration: `npx medusa plugin:build && npx medusa migration:generate --module mailer`

## Phase 3: API Routes

- [ ] `src/api/admin/mailer/config/route.ts`
  - GET: return SMTP status + 5 sender profiles from env vars
- [ ] `src/api/admin/mailer/mappings/route.ts`
  - GET: list all mappings
  - POST: create mapping + invalidate cache
- [ ] `src/api/admin/mailer/mappings/[id]/route.ts`
  - PUT: update mapping + invalidate cache
  - DELETE: delete mapping + invalidate cache
- [ ] `src/api/admin/mailer/templates/route.ts`
  - GET: scan MAILER_TEMPLATES_DIR, return .html filenames
- [ ] `src/api/admin/mailer/send/route.ts`
  - POST: manual email send (template + recipient + variables)

## Phase 4: Subscriber (Event Handler)

- [ ] Create `src/subscribers/mailer-event-handler.ts`
  - Subscribe to: order.placed, order.completed, order.canceled, order.updated,
    order.fulfillment_created, fulfillment.created, fulfillment.shipment_created,
    fulfillment.delivery_created, customer.created, customer.updated,
    return.created, return.received, claim.created, exchange.created
  - In-memory cache for mappings (24h TTL, invalidate on CRUD)
  - Entity data enrichment via query.graph
  - Resolve recipient email (customer_email / order_email / custom)
  - Load HTML template, replace {{ .VarName }} placeholders
  - Send via nodemailer with selected sender profile
  - Log to Medusa logger (no DB logs)

## Phase 5: Admin Dashboard UI

- [ ] Create `src/admin/routes/mailer/page.tsx`
  - Config section: read-only SMTP status + sender profiles display
  - Mappings section: table + add/edit/delete form
    - Event name: datalist with presets + custom input
    - Template: dropdown from /templates API
    - Sender profile: select 1-5
    - Recipient type: customer_email / order_email / custom
    - Subject line input
    - Template variable rows (key → data path)
  - Send Email modal (manual test send)

## Phase 6: Build & Test

- [ ] Run `npm run build` — verify compilation
- [ ] Install in huetana-admin via yalc/link
- [ ] Register plugin in medusa-config.ts
- [ ] Run migrations
- [ ] Test admin UI: config display, mapping CRUD, template dropdown
- [ ] Test manual email send
- [ ] Test event subscription (e.g. order.placed → email sent)

---

## Env Vars Required

```env
MAILER_SMTP_HOST=smtp.gmail.com
MAILER_SMTP_PORT=587
MAILER_SMTP_USER=your-email@gmail.com
MAILER_SMTP_PASS=your-app-password
MAILER_SMTP_SECURE=false

MAILER_FROM_NAME_1=Huetana
MAILER_FROM_ADDRESS_1=no-reply@huetana.com
MAILER_FROM_NAME_2=Huetana Orders
MAILER_FROM_ADDRESS_2=orders@huetana.com
MAILER_FROM_NAME_3=Huetana Support
MAILER_FROM_ADDRESS_3=support@huetana.com

MAILER_TEMPLATES_DIR=src/email_templates
```

## Architecture Notes

- **No DB config model** — SMTP creds from env only (secure, simple)
- **No email logs table** — avoids DB bloat, errors go to Medusa logger
- **In-memory mapping cache** — 24h TTL or invalidate on any mapping CRUD
- **5 sender profiles** — pick per mapping via env vars
- **Template rendering** — simple `{{ .VarName }}` → value string replacement
