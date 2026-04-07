<p align="center">
  <img src="https://img.shields.io/npm/v/@sam-ael/medusa-plugin-mailer?style=flat-square&color=2563EB" alt="npm version" />
  <img src="https://img.shields.io/badge/medusa-v2-0F172A?style=flat-square" alt="Medusa v2" />
  <img src="https://img.shields.io/badge/category-notification-0F766E?style=flat-square" alt="notification plugin" />
  <img src="https://img.shields.io/npm/l/@sam-ael/medusa-plugin-mailer?style=flat-square" alt="license" />
</p>

# @sam-ael/medusa-plugin-mailer

Production-focused email notification plugin for Medusa v2 with event mapping, template rendering, and admin-managed delivery flows.

## Highlights

- Admin-managed event -> template mappings
- Template variable mapping with safe path resolution
- SMTP-based delivery with sender profile support
- Workflow-driven event delivery for worker deployments
- Hardened API responses and stricter payload validation
- `POST /admin/mailer/mappings/:id` as the primary update endpoint
- Temporary deprecated `PUT` compatibility with deprecation headers

## Install

```bash
yarn add @sam-ael/medusa-plugin-mailer nodemailer
```

## Medusa Configuration

```ts
plugins: [
  {
    resolve: "@sam-ael/medusa-plugin-mailer",
    options: {},
  },
]
```

## Environment Variables

```env
MAILER_SMTP_HOST=smtp.gmail.com
MAILER_SMTP_PORT=587
MAILER_SMTP_USER=your-email@example.com
MAILER_SMTP_PASS=your-app-password
MAILER_SMTP_SECURE=false

MAILER_FROM_NAME_1=My Store
MAILER_FROM_ADDRESS_1=no-reply@mystore.com

MAILER_TEMPLATES_DIR=src/email_templates
MAILER_SEND_CONCURRENCY=2
```

## Admin API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/mailer/config` | SMTP and sender profile hints |
| `GET` | `/admin/mailer/templates` | List templates and extracted variables |
| `GET` | `/admin/mailer/mappings` | List mappings (paginated) |
| `POST` | `/admin/mailer/mappings` | Create mapping |
| `POST` | `/admin/mailer/mappings/:id` | Update mapping (primary) |
| `PUT` | `/admin/mailer/mappings/:id` | Deprecated compatibility endpoint |
| `DELETE` | `/admin/mailer/mappings/:id` | Delete mapping |
| `POST` | `/admin/mailer/send` | Manual/test email send |

## Security and Reliability Notes

- Unified error contract: `{ success: false, code, message, details? }`
- Recipient and payload validation at route level
- Mapping updates use direct update flow (no delete/recreate pattern)
- Event-send workflow uses bounded concurrency and per-item failure isolation
- Indexes added for high-frequency lookup fields

## Quality Gates

```bash
yarn typecheck
yarn lint
yarn test
yarn build
```

Smoke tests are available under `src/tests`.

## License

MIT
