# Medusa Plugin Mailer

Send transactional emails from your Medusa v2 store when things happen — orders placed, shipments created, customers signed up, and more.

You pick which events matter, point them at HTML templates, and the plugin delivers over SMTP. Nothing is sent until **you** create an active mapping in the admin.

[Medusa Website](https://medusajs.com/) | [Medusa Repository](https://github.com/medusajs/medusa) | [Medusa Documentation](https://docs.medusajs.com/)

## Features

- Listen to a fixed set of Medusa events (orders, shipments, customers, returns, and optional custom events).
- Map each event to a template, subject line, and variable paths in the **admin UI**.
- Store mappings in the database — no seeds, no hidden defaults.
- Ship generic HTML templates out of the box, or point to your own folder.
- Send through SMTP with one or more “from” profiles.
- Test sends from the admin without waiting for a real order.
- Load order, fulfillment, and customer data automatically when resolving template variables.

---

## Prerequisites

- [Node.js v20 or greater](https://nodejs.org/en)
- [A Medusa v2 backend](https://docs.medusajs.com/learn/installation)
- An SMTP provider (e.g. your host’s mail relay, Brevo, Amazon SES, Postmark, Gmail app password, etc.)
- Optional: a storefront URL and logo URL for branding in templates

---

## How to Install

1. In your Medusa backend directory, install the plugin and Nodemailer:

   ```bash
   npm install @sam-ael/medusa-plugin-mailer nodemailer
   # or
   yarn add @sam-ael/medusa-plugin-mailer nodemailer
   ```

2. Add the plugin to your `medusa-config` plugins list:

   ```ts
   // medusa-config.ts
   module.exports = defineConfig({
     // ...
     plugins: [
       // ...
       {
         resolve: "@sam-ael/medusa-plugin-mailer",
         options: {},
       },
     ],
   })
   ```

3. Set environment variables in `.env` (see [Configuration](#configuration) for the full list):

   ```bash
   MAILER_SMTP_HOST=smtp.example.com
   MAILER_SMTP_PORT=587
   MAILER_SMTP_USER=your-user
   MAILER_SMTP_PASS=your-password
   MAILER_SMTP_SECURE=false

   MAILER_FROM_NAME_1=My Store
   MAILER_FROM_ADDRESS_1=no-reply@example.com

   MAILER_TEMPLATES_DIR=src/email_templates

   STORE_NAME=My Store
   STORE_URL=https://www.example.com
   ```

4. Run migrations so the mapping table exists:

   ```bash
   npx medusa db:migrate
   ```

   This creates an empty `mailer_event_mapping` table. It does **not** insert any mappings for you.

5. Start the backend and open the admin. You should see **Mailer** in the sidebar.

6. Create at least one **active** mapping (event → template → variables). Until you do that, the plugin will not send mail for that event.

---

## Configuration

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MAILER_SMTP_HOST` | Yes (to send) | SMTP host |
| `MAILER_SMTP_PORT` | No (default `587`) | SMTP port |
| `MAILER_SMTP_USER` | Yes (to send) | SMTP username |
| `MAILER_SMTP_PASS` | Yes (to send) | SMTP password |
| `MAILER_SMTP_SECURE` | No | Set `true` for port 465 |
| `MAILER_FROM_NAME_1` | Yes (to send) | Display name for sender profile 1 |
| `MAILER_FROM_ADDRESS_1` | Yes (to send) | From address for sender profile 1 |
| `MAILER_FROM_NAME_2` … `_5` | No | Extra sender profiles (pick by index in a mapping) |
| `MAILER_FROM_ADDRESS_2` … `_5` | No | |
| `MAILER_TEMPLATES_DIR` | Recommended | Folder of `.html` templates (relative to process cwd or absolute). Falls back to bundled templates if missing |
| `STORE_NAME` | Recommended | Used as `{{ .StoreName }}` in templates |
| `STORE_URL` or `STOREFRONT_URL` | Recommended | Used as `{{ .SiteURL }}` / `{{ .StoreURL }}` |
| `MAILER_LOGO_URL` | No | Absolute image URL for `{{ .LogoURL }}` |
| `MAILER_SEND_CONCURRENCY` | No (default `2`) | Parallel sends when several mappings match one event |
| `MAILER_SMTP_DEBUG` | No | Set `true` for Nodemailer debug logs |
| `MAILER_SMTP_NAME` | No | EHLO / HELO hostname |

If SMTP is incomplete, the plugin logs a warning and skips sending instead of crashing.

### How events and mappings fit together

Think of two layers:

1. **What the plugin listens for** — a fixed list of event names in the plugin code (`MAILER_EVENTS`). You cannot turn listening on/off in the database; you only map the ones you care about.
2. **What actually gets emailed** — rows you create in Admin (or via API). Each row ties an event name to a template file, subject, variable map, recipient rule, and an **active** flag.

No active mapping ⇒ no email, even if the event fires.

### Template placeholders

Templates use Go-style variables:

```html
<p>Hi {{ .first_name }},</p>
<p>Order #{{ .display_id }} is confirmed.</p>
```

Always available without mapping:

| Placeholder | Source |
|-------------|--------|
| `{{ .StoreName }}` | `STORE_NAME` |
| `{{ .SiteURL }}` / `{{ .StoreURL }}` | `STORE_URL` or `STOREFRONT_URL` |
| `{{ .RecipientEmail }}` | resolved recipient |
| `{{ .Subject }}` | mapping subject (after substitution) |
| `{{ .LogoURL }}` | `MAILER_LOGO_URL` (optional) |
| `{{ .reason }}` | default text if you do not map it |

Your mapping’s **template variables** object maps each name to a **data path** on the loaded entity, for example:

```json
{
  "first_name": "customer.first_name",
  "display_id": "display_id",
  "total": "total"
}
```

Unmatched `{{ .Something }}` placeholders are removed before the message is sent.

### Recipient types

| Type | Behavior |
|------|----------|
| `customer_email` | Prefer email from the order/customer graph |
| `order_email` | Prefer the order’s `email` field |
| `custom` | Use the fixed address on the mapping |

---

## Events the plugin listens to

These names are hardcoded. Map only the ones you need.

### Orders

| Event | Typical use |
|-------|-------------|
| `order.placed` | Order confirmation |
| `order.completed` | Order finished |
| `order.canceled` | Cancellation notice |
| `order.updated` | Use sparingly (can be noisy) |
| `order.fulfillment_created` | “We’re packing your order” |
| `order.fulfillment_canceled` | Fulfillment canceled |
| `order.return_requested` | Return started |
| `order.return_received` | Return received / refund note |

### Fulfillment

Prefer the **Medusa core-flows** names:

| Event | Typical use |
|-------|-------------|
| `shipment.created` | Shipped + tracking |
| `delivery.created` | Delivered |

Legacy aliases still listen if something emits them: `fulfillment.created`, `fulfillment.shipment_created`, `fulfillment.delivery_created`.

### Customers & RMA

| Event |
|-------|
| `customer.created`, `customer.updated` |
| `return.created`, `return.received` |
| `claim.created`, `exchange.created` |

### Optional custom events

Your app can emit these; the plugin will handle them if you add mappings. Payloads are not graph-hydrated — put the fields you need on the event data and map paths like `amount` → `amount`.

| Event | Example fields on `data` |
|-------|---------------------------|
| `loyalty.points_credited` | `email`, `amount`, `balance`, `description`, `reference_id` |
| `loyalty.points_debited` | same |
| `wallet.credited` / `wallet.debited` | `email`, `amount`, `balance`, `currency_code`, `description` |
| `membership.tier_changed` | `email`, `membership_name`, `previous_membership_name`, `reason` |

Example emit from your backend:

```ts
import { Modules } from "@medusajs/framework/utils"

const eventBus = container.resolve(Modules.EVENT_BUS)

await eventBus.emit({
  name: "loyalty.points_credited",
  data: {
    email: "customer@example.com",
    amount: 100,
    balance: 500,
    description: "Thanks for your order",
  },
})
```

### What gets loaded for common events

| Event pattern | Hydrated data |
|---------------|----------------|
| `order.*` (most) | Full order (addresses, customer, items, totals, …) |
| `order.fulfillment_created` | Order via `order_id` |
| `shipment.created` / `delivery.created` | Fulfillment + linked order (including tracking labels when present) |
| Custom loyalty / wallet / membership | Event payload only |

---

## Bundled templates

The package ships plain, unbranded HTML under `email_templates/`. Use them as-is or copy them into your `MAILER_TEMPLATES_DIR` and redesign.

| Template file | Good starting point for |
|---------------|-------------------------|
| `order_placed.html` | `order.placed` |
| `order_confirmed.html` | Alternate order confirmation |
| `order_fulfilled.html` | `order.fulfillment_created` |
| `order_shipped.html` | `shipment.created` |
| `order_delivered.html` | `delivery.created` |
| `order_canceled.html` | `order.canceled` |
| `order_completed.html` | `order.completed` |
| `refund_confirmed.html` | Returns / refunds |
| `customer_welcome.html` | `customer.created` |
| `customer_confirmation.html` | Email confirmation flows |
| `account_deleted.html` | Account removal |
| `points_credited.html` / `points_debited.html` | Loyalty custom events |
| `store_credit_credited.html` / `store_credit_debited.html` | Wallet custom events |
| `membership_tier_changed.html` | Membership custom event |
| `generic_notification.html` / `custom_template.html` | Free-form messages |

Brand with `STORE_NAME` and optional `MAILER_LOGO_URL`. Regenerate the defaults from the plugin repo with:

```bash
node scripts/generate-bundled-templates.mjs
```

---

## Suggested mapping examples

### Order confirmation

- **Event:** `order.placed`
- **Template:** `order_placed.html`
- **Subject:** `Order #{{ .display_id }} confirmed`
- **Recipient:** Order email
- **Variables:**

  | Name | Path |
  |------|------|
  | `first_name` | `customer.first_name` |
  | `display_id` | `display_id` |
  | `total` | `total` |

### Shipment

- **Event:** `shipment.created`
- **Template:** `order_shipped.html`
- **Subject:** `Your order is on the way`
- **Variables:**

  | Name | Path |
  |------|------|
  | `first_name` | `order.customer.first_name` |
  | `display_id` | `order.display_id` |
  | `tracking_number` | `labels.0.tracking_number` |
  | `tracking_url` | `labels.0.tracking_url` |
  | `carrier` | `provider_id` |

---

## Test the Plugin

1. Run your Medusa backend:

   ```bash
   npm run dev
   # or
   npx medusa develop
   ```

2. Open Admin → **Mailer** and check that SMTP shows as configured.

3. Create an active mapping for `order.placed` → `order_placed.html` (or your own template).

4. Either:
   - Place a test order in a storefront / Store API, **or**
   - Use **Send email** in the Mailer admin with a test address and sample variables.

5. Confirm the message arrives and that placeholders look correct.

If nothing arrives: check SMTP env vars, that the mapping is **active**, and that the event name matches the list above (for shipping, prefer `shipment.created`).

---

## Admin API (optional)

Useful for automation or custom UIs. All routes require an authenticated admin user.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/mailer/config` | SMTP status and sender profiles |
| `GET` | `/admin/mailer/templates` | Template files and detected variables |
| `GET` | `/admin/mailer/mappings` | List mappings |
| `POST` | `/admin/mailer/mappings` | Create mapping |
| `POST` | `/admin/mailer/mappings/:id` | Update mapping |
| `DELETE` | `/admin/mailer/mappings/:id` | Delete mapping |
| `POST` | `/admin/mailer/send` | Manual / test send |

You can also trigger the same pipeline from code:

```ts
import { sendEventEmailsWorkflow } from "@sam-ael/medusa-plugin-mailer/workflows"

await sendEventEmailsWorkflow(container).run({
  input: {
    event_name: "order.placed",
    event_data: { id: orderId },
  },
})
```

---

## Troubleshooting

| What you see | What to check |
|--------------|----------------|
| No emails ever | SMTP env incomplete; Admin still says not configured |
| Event fires, no email | No **active** mapping for that exact event name |
| Shipment email never sends | Map **`shipment.created`**, not only older fulfillment aliases |
| Empty fields in the body | Variable path wrong for that event’s data shape |
| Wrong “to” address | Guest orders use order email; adjust recipient type |
| Two emails for one action | Another subscriber in your app is also sending — turn one off |

---

## Develop this repository

```bash
yarn install
yarn build      # produces .medusa/server
yarn typecheck
yarn test
```

Peer dependencies should match your host Medusa version as closely as practical.

---

## Additional Resources

- [Medusa documentation](https://docs.medusajs.com/)
- [Medusa events & subscribers](https://docs.medusajs.com/learn/fundamentals/events-and-subscribers)
- [Medusa plugins](https://docs.medusajs.com/learn/fundamentals/plugins)
- [Nodemailer](https://nodemailer.com/)

---

## License

MIT
