import * as nodemailer from "nodemailer"
import type { SentMessageInfo, Transporter } from "nodemailer"
import {
  CLAIM_QUERY_FIELDS,
  CUSTOMER_QUERY_FIELDS,
  EXCHANGE_QUERY_FIELDS,
  FULFILLMENT_QUERY_FIELDS,
  ORDER_QUERY_FIELDS,
  RETURN_QUERY_FIELDS,
} from "./mailer-fields"
import { readTemplate, stripHtml } from "./template-utils"

export function getSmtpConfig() {
  const host = process.env.MAILER_SMTP_HOST
  const port = Number(process.env.MAILER_SMTP_PORT) || 587
  const user = process.env.MAILER_SMTP_USER
  const pass = process.env.MAILER_SMTP_PASS
  const secure = process.env.MAILER_SMTP_SECURE === "true"
  const debug = process.env.MAILER_SMTP_DEBUG === "true"

  return {
    host,
    port,
    user,
    pass,
    secure,
    debug,
    configured: !!(host && user && pass),
  }
}

export function createTransporter(
  config = getSmtpConfig()
): Transporter<SentMessageInfo> | null {
  if (!config.host || !config.user || !config.pass) {
    return null
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    name: process.env.MAILER_SMTP_NAME || undefined,
    requireTLS: !config.secure,
    logger: config.debug,
    debug: config.debug,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    tls: {
      servername: config.host,
      minVersion: "TLSv1.2",
    },
  })
}

export function resolveDataPath(data: any, pathValue: string): any {
  return pathValue.split(".").reduce((obj, key) => obj?.[key], data)
}

export function resolveEmail(
  data: any,
  eventName: string,
  recipientType: string,
  recipientEmail?: string | null
): string | null {
  if (recipientType === "custom") {
    return recipientEmail || null
  }

  if (recipientType === "order_email") {
    return data.email || data.order?.email || null
  }

  if (
    eventName.startsWith("order.") ||
    eventName.startsWith("fulfillment.") ||
    eventName === "shipment.created" ||
    eventName === "delivery.created"
  ) {
    const orderEmail = data.email || data.order?.email
    const customerEmail =
      data.customer?.email || data.order?.customer?.email
    return orderEmail || customerEmail || null
  }

  if (eventName.startsWith("customer.")) {
    return data.email || null
  }

  // Custom domain events: host should put email on the payload when possible
  const orderEmail = data.order?.email || data.email
  const customerEmail = data.order?.customer?.email || data.customer?.email
  return orderEmail || customerEmail || null
}

export function buildRenderedMessage({
  templateName,
  subject,
  variables,
  recipientEmail,
}: {
  templateName: string
  subject: string
  variables?: Record<string, any>
  recipientEmail: string
}) {
  const templateFile = readTemplate(templateName)

  if (!templateFile) {
    return null
  }

  let html = templateFile.html

  const builtInVars: Record<string, any> = {
    StoreName: process.env.STORE_NAME || "Our Store",
    StoreURL: process.env.STORE_URL || process.env.STOREFRONT_URL || "",
    SiteURL: process.env.STORE_URL || process.env.STOREFRONT_URL || "",
    RecipientEmail: recipientEmail,
    Subject: subject || "",
    // Optional; empty → empty img tags removed below. Templates always show StoreName.
    LogoURL: process.env.MAILER_LOGO_URL || "",
  }

  const mergedVariables: Record<string, any> = {
    ...builtInVars,
    ...(variables || {}),
  }

  if (!mergedVariables.reason) {
    mergedVariables.reason = "Contact Support for more Info."
  }

  for (const [key, value] of Object.entries(mergedVariables)) {
    const regex = new RegExp(`\\{\\{\\s*\\.${key}\\s*\\}\\}`, "g")
    html = html.replace(regex, String(value ?? ""))
  }

  let resolvedSubject = subject || ""
  for (const [key, value] of Object.entries(mergedVariables)) {
    const regex = new RegExp(`\\{\\{\\s*\\.${key}\\s*\\}\\}`, "g")
    resolvedSubject = resolvedSubject.replace(regex, String(value ?? ""))
  }

  html = html.replace(/\{\{\s*\.[A-Za-z0-9_]+\s*\}\}/g, "")
  resolvedSubject = resolvedSubject.replace(
    /\{\{\s*\.[A-Za-z0-9_]+\s*\}\}/g,
    ""
  )

  // Drop empty logo images when MAILER_LOGO_URL is not set
  html = html.replace(/<img\b[^>]*\bsrc=["']\s*["'][^>]*>/gi, "")

  return {
    html,
    subject: resolvedSubject,
    text: stripHtml(html) || resolvedSubject || templateName,
    templatePath: templateFile.templatePath,
    templatesDir: templateFile.templatesDir,
  }
}

async function loadOrder(query: any, orderId: string) {
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ORDER_QUERY_FIELDS,
    filters: { id: orderId },
  })
  return orders?.[0] || null
}

async function loadFulfillmentWithOrder(
  query: any,
  fulfillmentId: string,
  eventData: any
) {
  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: FULFILLMENT_QUERY_FIELDS,
    filters: { id: fulfillmentId },
  })
  const fulfillment = fulfillments?.[0] || {}

  let orderId =
    eventData.order_id ||
    fulfillment.order_id ||
    fulfillment.order?.id ||
    eventData.order?.id

  if (!orderId) {
    try {
      const { data: links } = await query.graph({
        entity: "order_fulfillment",
        fields: ["order_id", "fulfillment_id"],
        filters: { fulfillment_id: fulfillmentId },
      })
      orderId = links?.[0]?.order_id
    } catch {
      /* link entity may not be queryable in all setups */
    }
  }

  if (orderId && !fulfillment.order?.id) {
    const order = await loadOrder(query, orderId)
    return { ...eventData, ...fulfillment, order: order || {} }
  }

  return { ...eventData, ...fulfillment }
}

export async function fetchEntityData(
  data: any,
  eventName: string,
  query: any,
  logger: any
): Promise<Record<string, any>> {
  try {
    // Payload: { order_id, fulfillment_id } — not always { id }
    if (
      eventName === "order.fulfillment_created" ||
      eventName === "order.fulfillment_canceled"
    ) {
      const orderId = data.order_id || data.id
      if (!orderId) return data
      return (await loadOrder(query, orderId)) || data
    }

    if (eventName.startsWith("order.")) {
      const orderId = data.id || data.order_id
      if (!orderId) return data
      return (await loadOrder(query, orderId)) || data
    }

    // Real Medusa: shipment.created / delivery.created → { id: fulfillmentId }
    if (
      eventName === "shipment.created" ||
      eventName === "delivery.created" ||
      eventName.startsWith("fulfillment.")
    ) {
      const fulfillmentId = data.id || data.fulfillment_id
      if (!fulfillmentId) return data
      return await loadFulfillmentWithOrder(query, fulfillmentId, data)
    }

    if (eventName.startsWith("customer.")) {
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: CUSTOMER_QUERY_FIELDS,
        filters: { id: data.id },
      })
      return customers?.[0] || data
    }

    if (
      eventName.startsWith("return.") ||
      eventName === "order.return_received" ||
      eventName === "order.return_requested"
    ) {
      // Host may only pass order_id
      if (data.order_id && !data.id && !data.return_id) {
        return (await loadOrder(query, data.order_id)) || data
      }

      const returnId = data.id || data.return_id
      if (!returnId) {
        if (data.order_id) {
          return (await loadOrder(query, data.order_id)) || data
        }
        return data
      }

      const { data: returns } = await query.graph({
        entity: "return",
        fields: RETURN_QUERY_FIELDS,
        filters: { id: returnId },
      })
      const ret = returns?.[0] || {}
      const orderId = data.order_id || ret.order_id

      if (orderId) {
        const order = await loadOrder(query, orderId)
        return { ...ret, order: order || {} }
      }

      return { ...data, ...ret }
    }

    if (eventName.startsWith("claim.") || eventName.startsWith("exchange.")) {
      const entity = eventName.startsWith("claim.") ? "claim" : "exchange"
      const fields = eventName.startsWith("claim.")
        ? CLAIM_QUERY_FIELDS
        : EXCHANGE_QUERY_FIELDS

      const { data: items } = await query.graph({
        entity,
        fields,
        filters: { id: data.id },
      })

      const item = items?.[0] || {}
      const orderId = data.order_id || item.order_id

      if (orderId) {
        const order = await loadOrder(query, orderId)
        return { ...item, order: order || {} }
      }

      return { ...data, ...item }
    }

    // Custom domain events (loyalty / wallet / membership): use payload as-is
    return data
  } catch (err: any) {
    logger.warn(
      `[Mailer] Could not fetch entity data for ${eventName}: ${err.message}`
    )
    return data
  }
}
