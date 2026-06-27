# @sam-ael/medusa-plugin-mailer

A production-focused email notification plugin for **Medusa v2** featuring custom event mapping, dynamic template rendering, and SMTP-based delivery flows.

[Medusa Website](https://medusajs.com/) | [Medusa Repository](https://github.com/medusajs/medusa)

---

## Features

- **Admin-Managed Mappings:** Map any Medusa store event to specific email templates and sender profiles directly from the admin panel.
- **Template Variable Resolution:** Automatically extracts and maps event payload variables to email templates safely.
- **SMTP-Based Delivery:** Standard SMTP client integration supporting TLS/SSL and authentication protocols.
- **Multiple Sender Profiles:** Set up different "From" sender profiles for different events (e.g., Support vs. Orders).
- **Workflow-Driven Execution:** Uses bounded concurrency and event-send workflows to handle high-volume transactional mailers.
- **Robust Failure Isolation:** Isolates delivery failures on a per-email level to prevent workflow disruption.

---

## Prerequisites

- [Node.js v18 or greater](https://nodejs.org/en)
- [A Medusa v2 backend](https://docs.medusajs.com/v2)
- An SMTP server (e.g., Gmail SMTP, SendGrid, Amazon SES, Mailgun) and valid credentials

---

## Installation

Run the following command to install the plugin and nodemailer in your Medusa project:

```bash
yarn add @sam-ael/medusa-plugin-mailer nodemailer
```

---

## Configuration

### 1. Register in `medusa-config.ts`

Add the plugin to your `medusa-config.ts` file:

```ts
const plugins = [
  // ... other plugins
  {
    resolve: "@sam-ael/medusa-plugin-mailer",
    options: {},
  },
]
```

### 2. Environment Variables

Define the SMTP connection and config options in your `.env` file:

```env
MAILER_SMTP_HOST=smtp.gmail.com
MAILER_SMTP_PORT=587
MAILER_SMTP_USER=your-email@example.com
MAILER_SMTP_PASS=your-app-password
MAILER_SMTP_SECURE=false

# Sender Profiles (Prefix with MAILER_FROM_NAME_ and MAILER_FROM_ADDRESS_ followed by ID)
MAILER_FROM_NAME_1="My Store Support"
MAILER_FROM_ADDRESS_1=support@mystore.com
MAILER_FROM_NAME_2="My Store Orders"
MAILER_FROM_ADDRESS_2=orders@mystore.com

# Template directory relative to project root
MAILER_TEMPLATES_DIR=src/email_templates

# Queue and concurrency controls
MAILER_SEND_CONCURRENCY=2
```

### 3. Run Migrations

To initialize the email mapping and log schemas in your database, run:

```bash
npx medusa db:migrate
```

---

## Webhooks & API Reference

Email notifications are outbound triggers fired by internal Medusa events. This plugin does not accept incoming webhooks.

### Admin API Endpoints

Programmatic control is provided through the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/mailer/config` | View active SMTP configuration hints and sender profiles |
| `GET` | `/admin/mailer/templates` | List available HTML templates and extracted variables |
| `GET` | `/admin/mailer/mappings` | List registered event-to-template mappings (paginated) |
| `POST` | `/admin/mailer/mappings` | Create a new event mapping |
| `POST` | `/admin/mailer/mappings/:id` | Update an existing mapping (primary endpoint) |
| `DELETE` | `/admin/mailer/mappings/:id` | Delete a mapping |
| `POST` | `/admin/mailer/send` | Manually dispatch/test an email send |

---

## Test the Plugin

1. Start your Medusa backend.
2. In your templates directory (e.g. `src/email_templates`), create a basic template file called `welcome.html`.
3. In the Medusa Admin panel, navigate to the Mailer Settings page.
4. Create an event mapping for `customer.created` pointing to `welcome.html`.
5. Run a test send using the Admin API or the **Test Send** button in the dashboard, specifying a test recipient email.
6. Verify receipt of the email in the recipient's inbox.
