# @sam-ael/medusa-plugin-mailer

Transactional email for **Medusa v2**: listen to store events, render HTML templates, send via SMTP.

| | |
|---|---|
| **npm** | `@sam-ael/medusa-plugin-mailer` |
| **Version** | `0.2.1` |
| **Medusa** | v2 (peer: `@medusajs/framework`, `@medusajs/medusa`) |
| **License** | MIT |

---

## How it works

```
Medusa emits event  →  plugin subscriber (hardcoded event list)
                    →  load active rows from mailer_event_mapping (DB)
                    →  hydrate order / fulfillment / customer (or use custom payload)
                    →  map template variables from data paths
                    →  render HTML ({{ .VarName }})
                    →  send with Nodemailer (SMTP)
```

| Concern | Source of truth |
|---------|-----------------|
| **Which events are handled** | Hardcoded in `MAILER_EVENTS` (plugin code) |
| **What email to send** | Database mappings you create in Admin (template, subject, variables, recipient, active) |
| **HTML files** | `MAILER_TEMPLATES_DIR` or bundled `email_templates/` |
| **SMTP / from address** | Environment variables |

There is **no seed** and **no default mappings**. After migrate, the mapping table is empty until you configure Admin → **Mailer**.

If an event fires and there is **no active mapping**, the plugin does nothing (no email).

---

## Install

### 1. Package

```bash
yarn add @sam-ael/medusa-plugin-mailer nodemailer
# or
npm install @sam-ael/medusa-plugin-mailer nodemailer
```

### 2. Register the plugin

```ts
// medusa-config.ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  // ...
  plugins: [
    {
      resolve: "@sam-ael/medusa-plugin-mailer",
      options: {},
    },
  ],
})
```

No special module entry is required; the plugin registers its `mailer` module, API routes, admin UI, and subscriber.

### 3. Migrate

```bash
npx medusa db:migrate
```

This creates the `mailer_event_mapping` table (and indexes). It does **not** insert mapping rows.

### 4. Environment

```env
# Required for sending
MAILER_SMTP_HOST=smtp.example.com
MAILER_SMTP_PORT=587
MAILER_SMTP_USER=your-user
MAILER_SMTP_PASS=your-password
MAILER_SMTP_SECURE=false

# Sender profile #1 (required for normal sends)
MAILER_FROM_NAME_1=My Store
MAILER_FROM_ADDRESS_1=no-reply@example.com

# Optional additional senders (Admin "Sender profile" index 2–5)
# MAILER_FROM_NAME_2=Orders
# MAILER_FROM_ADDRESS_2=orders@example.com

# Templates directory (relative to process.cwd() or absolute)
MAILER_TEMPLATES_DIR=src/email_templates

# Branding used in built-in template variables
STORE_NAME=My Store
STORE_URL=https://www.example.com
# or STOREFRONT_URL=https://www.example.com

# Optional logo for {{ .LogoURL }} in templates
# MAILER_LOGO_URL=https://cdn.example.com/logo.png

# Optional
# MAILER_SEND_CONCURRENCY=2
# MAILER_SMTP_DEBUG=true
# MAILER_SMTP_NAME=mail.example.com
```

If SMTP is not fully configured, the plugin **skips** sends and logs a warning (it will not crash the event).

### 5. Configure mappings (Admin)

1. Start Medusa and open the admin dashboard.
2. Open **Mailer** in the sidebar.
3. Confirm SMTP status is **Configured**.
4. Click **Add mapping** for each event you want emails for:
   - **Event** — e.g. `order.placed` (must be in the hardcoded list)
   - **Template** — e.g. `order_placed.html`
   - **Subject** — may use `{{ .display_id }}` etc.
   - **Template variables** — map `first_name` → `customer.first_name`, …
   - **Recipient** — customer email / order email / custom address
   - **Active** — only active mappings send

### 6. Custom templates (recommended for production)

Point `MAILER_TEMPLATES_DIR` at your app’s folder (e.g. `src/email_templates`) and put your own `.html` files there.  
If the directory is missing, the plugin falls back to bundled templates under the package’s `email_templates/`.

---

## Architecture

```
@sam-ael/medusa-plugin-mailer
├── modules/mailer          # Medusa module: MailerEventMapping CRUD
├── subscribers/            # Listens to MAILER_EVENTS → workflow
├── workflows/              # send-event-emails (concurrency-safe)
├── api/admin/mailer/       # config, templates, mappings, send
├── admin/routes/mailer/    # Admin UI
├── shared/                 # SMTP, render, entity fetch, field paths
└── email_templates/        # Generic bundled HTML (unbranded)
```

### Delivery pipeline

1. **Subscriber** receives an event name + payload.
2. **Workflow step** loads all `active` mappings with that `event_name`.
3. **Entity hydrate** loads order/fulfillment/customer when applicable (see below).
4. **Recipient** is resolved from order/customer/custom fields.
5. **Variables** are filled by walking mapping paths on the hydrated object.
6. **Template** is loaded from disk; `{{ .Key }}` placeholders are replaced.
7. **SMTP** sends HTML + text fallback.

Built-in variables (always available, no mapping required):

| Variable | Source |
|----------|--------|
| `{{ .StoreName }}` | `STORE_NAME` |
| `{{ .StoreURL }}` / `{{ .SiteURL }}` | `STORE_URL` or `STOREFRONT_URL` |
| `{{ .RecipientEmail }}` | resolved recipient |
| `{{ .Subject }}` | mapping subject (after variable substitution) |
| `{{ .LogoURL }}` | `MAILER_LOGO_URL` (optional; empty logo tags are stripped) |
| `{{ .reason }}` | defaults if unmapped |

Template syntax is Go-style: **`{{ .VariableName }}`** (dot required). Unmatched placeholders are removed before send.

---

## Hardcoded events

Defined in `src/shared/mailer-fields.ts` as `MAILER_EVENTS`. The subscriber only listens to these names.

### Orders

| Event | Typical payload | Notes |
|-------|-----------------|--------|
| `order.placed` | `{ id }` | Checkout complete |
| `order.completed` | `{ id }` | |
| `order.canceled` | `{ id }` | |
| `order.updated` | `{ id }` | Often noisy; map only if needed |
| `order.fulfillment_created` | `{ order_id, fulfillment_id }` | Uses `order_id` for hydrate |
| `order.fulfillment_canceled` | `{ order_id, fulfillment_id }` | |
| `order.return_received` | `{ order_id, return_id }` | |
| `order.return_requested` | `{ order_id, return_id }` | |

### Fulfillment (Medusa core-flows)

| Event | Typical payload | Notes |
|-------|-----------------|--------|
| **`shipment.created`** | `{ id }` = fulfillment id | **Prefer this** for “shipped” emails |
| **`delivery.created`** | `{ id }` = fulfillment id | **Prefer this** for “delivered” |
| `fulfillment.created` | `{ id }` | |
| `fulfillment.shipment_created` | legacy alias | Kept for compatibility |
| `fulfillment.delivery_created` | legacy alias | Kept for compatibility |

### Customer & RMA

| Event |
|-------|
| `customer.created`, `customer.updated` |
| `return.created`, `return.received` |
| `claim.created`, `exchange.created` |

### Custom domain events (your app must emit)

These are optional extension points. The plugin listens; your application emits:

| Event | Suggested flat payload fields |
|-------|-------------------------------|
| `loyalty.points_credited` | `customer_id`, `email`, `amount`, `balance`, `description`, `reference_id` |
| `loyalty.points_debited` | same |
| `wallet.credited` | `customer_id`, `email`, `amount`, `balance`, `currency_code`, `description`, `reference_id` |
| `wallet.debited` | same |
| `membership.tier_changed` | `customer_id`, `email`, `membership_name`, `previous_membership_name`, `reason` |

Emit example:

```ts
import { Modules } from "@medusajs/framework/utils"

const eventBus = container.resolve(Modules.EVENT_BUS)

await eventBus.emit({
  name: "loyalty.points_credited",
  data: {
    customer_id: "cus_...",
    email: "customer@example.com", // recommended for recipient resolution
    amount: 100,
    balance: 450,
    description: "Order reward",
    reference_id: "order_...",
  },
})
```

For custom events, map template vars to the **same keys** (`amount` → path `amount`). No graph hydrate is applied; the payload is used as-is.

---

## Entity hydration & mapping paths

### How variables are resolved

Each mapping stores `template_variables` as JSON:

```json
{
  "first_name": "customer.first_name",
  "display_id": "display_id",
  "total": "total"
}
```

Keys become `{{ .first_name }}` in HTML. Values are **dot paths** on the hydrated object (or raw event data).

Admin UI suggests paths via `getSuggestedDataPathsForEvent(eventName)`.

### Suggested paths (common)

**`order.placed` → `order_placed.html`**

| Template var | Data path |
|--------------|-----------|
| `first_name` | `customer.first_name` |
| `display_id` | `display_id` |
| `total` | `total` |
| `email` | `email` |
| `currency_code` | `currency_code` |

**`shipment.created` → `order_shipped.html`**

| Template var | Data path |
|--------------|-----------|
| `first_name` | `order.customer.first_name` |
| `display_id` | `order.display_id` |
| `tracking_number` | `labels.0.tracking_number` |
| `tracking_url` | `labels.0.tracking_url` |
| `carrier` | `provider_id` |

**Recipient types**

| Value | Behavior |
|-------|----------|
| `customer_email` | Prefer order/customer email from hydrated data |
| `order_email` | `data.email` / order email |
| `custom` | Fixed `recipient_email` on the mapping |

---

## Bundled templates

Generic, unbranded HTML in `email_templates/`. Override with `MAILER_TEMPLATES_DIR`.

| File | Typical event |
|------|----------------|
| `order_placed.html` | `order.placed` |
| `order_confirmed.html` | `order.placed` (alternate copy) |
| `order_fulfilled.html` | `order.fulfillment_created` |
| `order_shipped.html` | `shipment.created` |
| `order_delivered.html` | `delivery.created` |
| `order_canceled.html` | `order.canceled` |
| `order_completed.html` | `order.completed` |
| `refund_confirmed.html` | `order.return_received` / returns |
| `customer_welcome.html` | `customer.created` |
| `customer_confirmation.html` | custom confirmation flows |
| `account_deleted.html` | account removal flows |
| `points_credited.html` / `points_debited.html` | loyalty custom events |
| `store_credit_credited.html` / `store_credit_debited.html` | wallet custom events |
| `membership_tier_changed.html` | membership custom event |
| `generic_notification.html` / `custom_template.html` | free-form |

Regenerate bundled files:

```bash
node scripts/generate-bundled-templates.mjs
```

Design notes: white background, `{{ .StoreName }}` branding, optional `{{ .LogoURL }}` (empty logo images are removed at send time).

---

## Admin API

Base path: `/admin/mailer` (authenticated admin session/bearer).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/config` | SMTP status + sender profiles from env |
| `GET` | `/templates` | List `.html` files + extracted `{{ .Var }}` names |
| `GET` | `/mappings` | List mappings (`limit`, `offset`) |
| `POST` | `/mappings` | Create mapping |
| `POST` | `/mappings/:id` | Update mapping (primary) |
| `PUT` | `/mappings/:id` | Deprecated; prefer POST |
| `DELETE` | `/mappings/:id` | Delete mapping |
| `POST` | `/send` | Manual/test send (template + variables + to) |

### Create mapping body (example)

```json
{
  "event_name": "order.placed",
  "template_name": "order_placed.html",
  "subject": "Order #{{ .display_id }} confirmed",
  "sender_index": 1,
  "recipient_type": "order_email",
  "recipient_email": null,
  "active": true,
  "template_variables": {
    "first_name": "customer.first_name",
    "display_id": "display_id",
    "total": "total"
  }
}
```

Errors use a consistent shape:

```json
{
  "success": false,
  "code": "INVALID_PAYLOAD",
  "message": "event_name and template_name are required"
}
```

---

## Programmatic send (workflow)

You can invoke the same pipeline without an event:

```ts
import { sendEventEmailsWorkflow } from "@sam-ael/medusa-plugin-mailer/workflows"

await sendEventEmailsWorkflow(container).run({
  input: {
    event_name: "order.placed",
    event_data: { id: orderId },
  },
})
```

This still only sends if active mappings exist for `event_name`.

---

## Database

Module name: **`mailer`**.

Model: **`mailer_event_mapping`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | id | Primary key |
| `event_name` | text | Must match a listened event |
| `template_name` | text | HTML filename |
| `subject` | text | Subject line (supports placeholders) |
| `template_variables` | json | `{ templateVar: "data.path" }` |
| `recipient_type` | text | `customer_email` \| `order_email` \| `custom` |
| `recipient_email` | text? | Required when type is `custom` |
| `sender_index` | number | Selects `MAILER_FROM_NAME_N` / `MAILER_FROM_ADDRESS_N` |
| `active` | boolean | Inactive mappings are ignored |

Migrations ship with the plugin; run `medusa db:migrate` after install or upgrade.

---

## Operations checklist

- [ ] Plugin in `medusa-config` `plugins` array  
- [ ] `db:migrate` applied  
- [ ] SMTP env vars set (Admin shows **Configured**)  
- [ ] `MAILER_TEMPLATES_DIR` points at your templates (or use bundled)  
- [ ] `STORE_NAME` / `STORE_URL` set for branding  
- [ ] At least one **active** mapping per email you want  
- [ ] Test with Admin **Send email** or a real `order.placed`  
- [ ] Worker/server process includes subscribers (standard Medusa start)  

### Common issues

| Symptom | Likely cause |
|---------|----------------|
| No emails at all | SMTP not configured, or no **active** mapping |
| SMTP configured but silent | Event name not in `MAILER_EVENTS`, or mapping inactive |
| Shipped email never fires | Map **`shipment.created`**, not only legacy fulfillment names |
| Empty variables | Wrong data path for that event’s hydrated shape |
| Wrong recipient | Check `recipient_type` / guest checkout `email` on order |
| Double emails | Host app has its own subscriber also sending — disable one path |

---

## Develop this plugin

```bash
# from the plugin repository
yarn install
yarn build          # medusa plugin:build → .medusa/server
yarn typecheck
yarn test           # smoke tests
yarn dev            # plugin develop mode (optional)
```

Publish:

```bash
yarn build
npm publish
# or: yalc publish  →  yalc add @sam-ael/medusa-plugin-mailer in a host app
```

Peer dependencies: Medusa **2.x** packages aligned with your host app. Adjust `peerDependencies` / install versions if your monorepo uses a newer Medusa minor.

---

## Security notes

- Admin routes require an authenticated admin actor (Medusa defaults).
- Recipient emails are validated before send.
- Template paths are constrained to the templates directory (no path traversal).
- SMTP credentials live only in environment variables, never in mappings.

---

## License

MIT

---

## Changelog (recent)

### 0.2.1

- Hardcoded event list includes real Medusa `shipment.created` / `delivery.created`
- Correct hydration for `order.fulfillment_created` and shipment/delivery payloads
- Custom domain events: loyalty / wallet / membership
- Generic bundled templates for the above events
- Optional `MAILER_LOGO_URL` / `{{ .LogoURL }}`
- Documented model: **no seed, mappings only in DB**
