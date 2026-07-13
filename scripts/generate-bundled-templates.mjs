/**
 * Generic, unbranded transactional templates shipped with the plugin.
 * Placeholders: {{ .VarName }} — StoreName / SiteURL / LogoURL / RecipientEmail are built-in.
 *
 * Run: node scripts/generate-bundled-templates.mjs
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dir = path.join(__dirname, "..", "email_templates")

function shell({ title, tag, heading, bodyHtml, ctaLabel, ctaHref, footerNote }) {
  const cta = ctaLabel
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;"><tr>
<td style="border-radius:8px;background:#111827;"><a href="${ctaHref}" style="display:inline-block;padding:12px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff !important;text-decoration:none;border-radius:8px;">${ctaLabel}</a></td>
</tr></table>`
    : ""

  const note = footerNote
    ? `<p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">${footerNote}</p>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    body{margin:0!important;padding:0!important;width:100%!important;background:#ffffff!important;}
    img{border:0;outline:none;text-decoration:none;}
    @media only screen and (max-width:620px){
      .wrap{width:100%!important;}
      .px{padding-left:20px!important;padding-right:20px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;">${tag} · {{ .StoreName }}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
    <tr><td align="center" style="padding:0;background:#ffffff;">
      <table role="presentation" class="wrap" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;">
        <tr>
          <td class="px" style="padding:40px 32px 24px;background:#ffffff;">
            <!-- Optional logo (set MAILER_LOGO_URL). Store name is always shown as brand fallback. -->
            <a href="{{ .SiteURL }}" style="text-decoration:none;color:#111827;display:inline-block;">
              <img src="{{ .LogoURL }}" alt="" width="120" style="display:block;max-height:36px;width:auto;border:0;margin:0 0 10px 0;" />
              <span style="font-size:17px;font-weight:600;letter-spacing:-0.02em;color:#111827;">{{ .StoreName }}</span>
            </a>
          </td>
        </tr>
        <tr>
          <td class="px" style="padding:0 32px;background:#ffffff;">
            <div style="height:1px;background:#f3f4f6;line-height:1px;font-size:0;">&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td class="px" style="padding:28px 32px 36px;background:#ffffff;">
            <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">${tag}</p>
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;line-height:1.3;color:#111827;letter-spacing:-0.02em;">${heading}</h1>
            <div style="font-size:15px;line-height:1.65;color:#4b5563;">
              ${bodyHtml}
            </div>
            ${cta}
          </td>
        </tr>
        <tr>
          <td class="px" style="padding:0 32px 40px;background:#ffffff;">
            <div style="height:1px;background:#f3f4f6;line-height:1px;font-size:0;margin-bottom:20px;">&nbsp;</div>
            <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">
              &copy; {{ .StoreName }}
              <span style="color:#e5e7eb;"> · </span>
              {{ .RecipientEmail }}
            </p>
            ${note}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`
}

function box(rows) {
  const body = rows
    .map(
      (r, i) => `<tr>
  <td style="padding:${i ? "10px" : "0"} 0 ${i === rows.length - 1 ? "0" : "10px"};font-size:13px;color:#9ca3af;${i ? "border-top:1px solid #f3f4f6;" : ""}">${r[0]}</td>
  <td align="right" style="padding:${i ? "10px" : "0"} 0 ${i === rows.length - 1 ? "0" : "10px"};font-size:14px;font-weight:600;color:#111827;${i ? "border-top:1px solid #f3f4f6;" : ""}">${r[1]}</td>
</tr>`
    )
    .join("")
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 20px;border:1px solid #f3f4f6;border-radius:10px;"><tr><td style="padding:16px 18px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table></td></tr></table>`
}

const p = (t) => `<p style="margin:0 0 14px;">${t}</p>`

const templates = {
  "order_placed.html": shell({
    title: "{{ .Subject }}",
    tag: "Order",
    heading: "Order confirmed",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("Thanks for your order. We’ve received it and will start processing shortly.") +
      box([
        ["Order", "#{{ .display_id }}"],
        ["Total", "{{ .total }}"],
      ]) +
      p("We’ll notify you when it ships."),
    ctaLabel: "View order",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "",
  }),
  "order_confirmed.html": shell({
    title: "{{ .Subject }}",
    tag: "Order",
    heading: "Your order is confirmed",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("Your order is confirmed and is being prepared.") +
      box([
        ["Order", "#{{ .display_id }}"],
        ["Total", "{{ .total }}"],
      ]),
    ctaLabel: "View order",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "",
  }),
  "order_fulfilled.html": shell({
    title: "{{ .Subject }}",
    tag: "Fulfillment",
    heading: "Your order is being packed",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("Order <strong style=\"color:#111827;\">#{{ .display_id }}</strong> is now in fulfillment.") +
      box([
        ["Order", "#{{ .display_id }}"],
        ["Status", "Packing"],
      ]),
    ctaLabel: "View order",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "",
  }),
  "order_shipped.html": shell({
    title: "{{ .Subject }}",
    tag: "Shipping",
    heading: "Your order is on the way",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("Order <strong style=\"color:#111827;\">#{{ .display_id }}</strong> has shipped.") +
      box([
        ["Tracking", "{{ .tracking_number }}"],
        ["Carrier", "{{ .carrier }}"],
      ]),
    ctaLabel: "Track shipment",
    ctaHref: "{{ .tracking_url }}",
    footerNote: "Tracking may take a short time to update.",
  }),
  "order_delivered.html": shell({
    title: "{{ .Subject }}",
    tag: "Delivered",
    heading: "Your order was delivered",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("Order <strong style=\"color:#111827;\">#{{ .display_id }}</strong> has been marked as delivered.") +
      box([
        ["Order", "#{{ .display_id }}"],
        ["Tracking", "{{ .tracking_number }}"],
      ]),
    ctaLabel: "View order",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "",
  }),
  "order_canceled.html": shell({
    title: "{{ .Subject }}",
    tag: "Canceled",
    heading: "Order canceled",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("Order <strong style=\"color:#111827;\">#{{ .display_id }}</strong> has been canceled.") +
      box([["Order", "#{{ .display_id }}"]]),
    ctaLabel: "Visit store",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "If you didn’t request this, contact support.",
  }),
  "order_completed.html": shell({
    title: "{{ .Subject }}",
    tag: "Complete",
    heading: "Order complete",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("Order <strong style=\"color:#111827;\">#{{ .display_id }}</strong> is complete. Thank you.") +
      box([
        ["Order", "#{{ .display_id }}"],
        ["Total", "{{ .total }}"],
      ]),
    ctaLabel: "Shop again",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "",
  }),
  "refund_confirmed.html": shell({
    title: "{{ .Subject }}",
    tag: "Refund",
    heading: "Refund update",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("A refund update is available for order <strong style=\"color:#111827;\">#{{ .display_id }}</strong>.") +
      box([
        ["Amount", "{{ .total }}"],
        ["Note", "{{ .reason }}"],
      ]),
    ctaLabel: "View account",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "Bank processing times may vary.",
  }),
  "customer_welcome.html": shell({
    title: "{{ .Subject }}",
    tag: "Welcome",
    heading: "Welcome",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("Thanks for joining {{ .StoreName }}. We’re glad you’re here."),
    ctaLabel: "Start shopping",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "",
  }),
  "customer_confirmation.html": shell({
    title: "{{ .Subject }}",
    tag: "Account",
    heading: "Confirm your email",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("Please confirm your email address to finish setting up your account.") +
      p('<a href="{{ .ActionURL }}" style="color:#111827;word-break:break-all;">{{ .action_url }}</a>'),
    ctaLabel: "Confirm email",
    ctaHref: "{{ .ActionURL }}",
    footerNote: "If you didn’t create an account, you can ignore this message.",
  }),
  "account_deleted.html": shell({
    title: "{{ .Subject }}",
    tag: "Account",
    heading: "Account removed",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("Your account associated with <strong style=\"color:#111827;\">{{ .Email }}</strong> has been removed."),
    ctaLabel: "Visit store",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "",
  }),
  "points_credited.html": shell({
    title: "{{ .Subject }}",
    tag: "Loyalty",
    heading: "Points added",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("Loyalty points were added to your account.") +
      box([
        ["Points added", "+{{ .amount }}"],
        ["Balance", "{{ .balance }}"],
        ["Note", "{{ .description }}"],
      ]),
    ctaLabel: "View account",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "Ref: {{ .reference_id }}",
  }),
  "points_debited.html": shell({
    title: "{{ .Subject }}",
    tag: "Loyalty",
    heading: "Points used",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("Loyalty points were deducted from your account.") +
      box([
        ["Points used", "−{{ .amount }}"],
        ["Balance", "{{ .balance }}"],
        ["Note", "{{ .description }}"],
      ]),
    ctaLabel: "View account",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "Ref: {{ .reference_id }}",
  }),
  "store_credit_credited.html": shell({
    title: "{{ .Subject }}",
    tag: "Store credit",
    heading: "Store credit added",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("Store credit was added to your wallet.") +
      box([
        ["Credited", "{{ .amount }}"],
        ["Balance", "{{ .balance }}"],
        ["Note", "{{ .description }}"],
      ]),
    ctaLabel: "Shop now",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "Ref: {{ .reference_id }}",
  }),
  "store_credit_debited.html": shell({
    title: "{{ .Subject }}",
    tag: "Store credit",
    heading: "Store credit used",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("Store credit was deducted from your wallet.") +
      box([
        ["Used", "{{ .amount }}"],
        ["Balance", "{{ .balance }}"],
        ["Note", "{{ .description }}"],
      ]),
    ctaLabel: "View account",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "Ref: {{ .reference_id }}",
  }),
  "membership_tier_changed.html": shell({
    title: "{{ .Subject }}",
    tag: "Membership",
    heading: "Membership updated",
    bodyHtml:
      p("Hi {{ .first_name }},") +
      p("Your membership tier has changed.") +
      box([
        ["New tier", "{{ .membership_name }}"],
        ["Previous", "{{ .previous_membership_name }}"],
        ["Note", "{{ .reason }}"],
      ]),
    ctaLabel: "View account",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "",
  }),
  "generic_notification.html": shell({
    title: "{{ .Subject }}",
    tag: "Notice",
    heading: "{{ .header }}",
    bodyHtml: '<p style="margin:0;white-space:pre-wrap;">{{ .body }}</p>',
    ctaLabel: "Open store",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "{{ .reason }}",
  }),
  "custom_template.html": shell({
    title: "{{ .Subject }}",
    tag: "Update",
    heading: "{{ .header }}",
    bodyHtml: '<p style="margin:0;white-space:pre-wrap;">{{ .body }}</p>',
    ctaLabel: "Visit store",
    ctaHref: "{{ .SiteURL }}",
    footerNote: "",
  }),
}

fs.mkdirSync(dir, { recursive: true })
for (const [name, html] of Object.entries(templates)) {
  fs.writeFileSync(path.join(dir, name), html, "utf8")
  console.log("wrote", name)
}
console.log("done:", Object.keys(templates).length)
