<p align="center">
  <img src="https://img.shields.io/npm/v/@sam-ael/medusa-plugin-mailer?style=flat-square&color=3B82F6" alt="npm version" />
  <img src="https://img.shields.io/badge/medusa-v2-7C3AED?style=flat-square" alt="Medusa v2" />
  <img src="https://img.shields.io/badge/nodemailer-v6.9-3B82F6?style=flat-square" alt="Nodemailer" />
  <img src="https://img.shields.io/npm/l/@sam-ael/medusa-plugin-mailer?style=flat-square" alt="license" />
</p>

# @sam-ael/medusa-plugin-mailer

A **MedusaJS v2 plugin** for sending email notifications on store events with a dashboard-managed templating system.

Instead of hardcoding email templates into your application code, this plugin allows store administrators to map Medusa events directly to local HTML templates, pass dynamic entity variables, and manage multiple sender profiles—all from an intuitive admin UI. 

Built with **Nodemailer** and structured to run safely with Medusa worker mode for non-blocking background email delivery.

---

## Features

- 🗺️ **Admin UI Mapping** — Map Medusa events (like `order.placed`) to specific `.html` templates directly from the admin dashboard.
- 📦 **Dynamic Variables** — Easily pass order, customer, or fulfillment data to templates using simple `{{ .VarName }}` placeholders.
- 🧑‍💼 **Multi-Sender Profiles** — Configure up to 5 distinct sender profiles (Name & Email from address) and assign them per event to ensure the right email comes from the right department (e.g., Support vs Sales).
- 📞 **Flexible Routing** — Choose who receives the email: the customer, the order billing/shipping address, or a custom internal notification email.
- ⚙️ **Workflow-Based Delivery** — Event subscribers trigger a Medusa workflow, so email delivery can run on your dedicated worker instance instead of blocking API requests.
- 🧪 **Manual Sending** — A test utility in the admin UI to send one-off HTML template emails based on dynamic data.
- 🗄️ **No DB Clutter** — Connects to SMTP via secure environment variables. Does not create bulky log tables in your database (relies on Medusa’s core logger).
- 🔒 **Safer Template Loading** — Template paths are constrained to the configured templates directory or the bundled fallback templates.

---

## Supported Events

The plugin natively intercepts the following core Medusa events for entity data enrichment. You can also type in any custom event name in the admin UI.

| Category | Events |
|---|---|
| **Orders** | `order.placed` · `order.completed` · `order.canceled` · `order.updated` · `order.fulfillment_created` |
| **Fulfillment** | `fulfillment.created` · `fulfillment.shipment_created` · `fulfillment.delivery_created` |
| **Customers** | `customer.created` · `customer.updated` |
| **Returns & Claims** | `return.created` · `return.received` · `claim.created` · `exchange.created` |

*(Custom events can also be entered into the UI manually, though deeply nested automatic entity lookups are optimized for the standard events above.)*

---

## Prerequisites

- **MedusaJS v2** (`>= 2.12.x`)
- An SMTP server/service (e.g., Gmail, SendGrid, Amazon SES) for sending emails

---

## Installation

```bash
yarn add @sam-ael/medusa-plugin-mailer nodemailer
```

Or with npm:

```bash
npm install @sam-ael/medusa-plugin-mailer nodemailer
```

---

## Configuration

### 1. Add the plugin to `medusa-config.ts`

```ts
plugins: [
  // ...
  {
    resolve: "@sam-ael/medusa-plugin-mailer",
    options: {}
  }
],
```

### 2. Set environment variables

SMTP configuration and Sender Profiles are managed safely via environment variables. Add the following to your `.env` file:

```env
# SMPT Settings
MAILER_SMTP_HOST=smtp.gmail.com
MAILER_SMTP_PORT=587
MAILER_SMTP_USER=your-email@example.com
MAILER_SMTP_PASS=your-secure-app-password
MAILER_SMTP_SECURE=false

# Sender Profiles (Up to 5)
MAILER_FROM_NAME_1=My Store
MAILER_FROM_ADDRESS_1=no-reply@mystore.com

MAILER_FROM_NAME_2=My Store Support
MAILER_FROM_ADDRESS_2=support@mystore.com

# Template Directory (Relative to project root)
MAILER_TEMPLATES_DIR=src/email_templates
```

### 3. Run migrations

Run migrations to create the required mapping table:

```bash
npx medusa db:migrate
```

### 4. Start Medusa

```bash
npx medusa develop
```

---

## Templates

Create a directory in your project root to store your `.html` template files. If `MAILER_TEMPLATES_DIR` is not set or does not exist, the plugin falls back to the bundled `email_templates` shipped with the package.

When defining a mapping in the Admin UI, you assign specific data fields to variable names. Use those variable names in your template files (and subject lines) using the syntax `{{ .VarName }}`.

**Example `welcome.html`:**
```html
<div>
  <h1>Welcome to our store, {{ .first_name }}!</h1>
  <p>We are so glad you joined us.</p>
</div>
```

---

## Admin Setup & Usage

After installation, start your Medusa development server and visit the admin dashboard. Look for the **Email Mailer** icon in the sidebar.

Using the Admin UI, you can:
1. Verify that your SMTP and Sender Profiles are loading properly from your `.env` file.
2. Click **Add Mapping** to create a new event mapping.
3. Select an event (e.g. `order.placed`).
4. Select the template file from your specified template directory.
5. Create variables (e.g. name `first_name` reading from `shipping_address.first_name`).

That's it. When the Medusa event fires, the plugin subscriber triggers a workflow, the workflow fetches the necessary entity data, resolves the email address, injects variables into the chosen HTML template, and dispatches the email through SMTP.

---

## Production Deployment

For production, run this plugin with Medusa's Redis Event Module enabled and use a dedicated worker instance for background tasks.

Recommended setup:

1. **API instance:**
   - serves store/admin HTTP traffic
   - publishes events
2. **Worker instance:**
   - runs Medusa in worker mode
   - executes subscribers, workflows, scheduled jobs, and email delivery

Why:
- Email sending should not slow down checkout, account, or admin API requests
- Workflow execution is easier to scale horizontally on workers
- Transient SMTP failures stay isolated from request handling

The plugin's event subscriber only triggers a workflow. The actual SMTP delivery is handled inside the workflow step, which is the intended deployment model for worker mode.

---

## Operational Notes

- Run a dedicated Medusa worker in production for this plugin.
- Manual test sends from the admin API still execute immediately so you can verify SMTP credentials.
- Event-driven emails are best handled by worker instances, not your API server.
- If SMTP is not configured, the plugin logs and skips event delivery.

---

## API Routes

The plugin exposes the following admin API routes (all require authentication):

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/mailer/config` | Get current SMTP and sender configuration |
| `GET` | `/admin/mailer/mappings` | List all event → template mappings |
| `POST` | `/admin/mailer/mappings` | Create a new event mapping |
| `PUT` | `/admin/mailer/mappings/:id` | Update an existing mapping |
| `DELETE` | `/admin/mailer/mappings/:id` | Delete a mapping |
| `GET` | `/admin/mailer/templates` | List available HTML templates |
| `POST` | `/admin/mailer/send` | Send a manual/test email |

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

MIT
