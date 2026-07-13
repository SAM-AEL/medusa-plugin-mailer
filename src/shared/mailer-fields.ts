const prefixPaths = (prefix: string, paths: string[]) =>
  paths.map((path) => `${prefix}.${path}`)

const unique = (paths: string[]) => Array.from(new Set(paths))

/**
 * Events the plugin subscriber listens for.
 * Hardcoded — no DB seed. Admins map active event→template rows themselves.
 *
 * Includes real Medusa v2 workflow names (shipment.created / delivery.created)
 * plus legacy aliases and optional custom domain events hosts may emit.
 */
export const MAILER_EVENTS = [
  // Order lifecycle
  "order.placed",
  "order.completed",
  "order.canceled",
  "order.updated",
  "order.fulfillment_created",
  "order.fulfillment_canceled",
  "order.return_received",
  "order.return_requested",

  // Fulfillment — real Medusa core-flows names
  "shipment.created",
  "delivery.created",

  // Legacy / alternate fulfillment names (harmless if never emitted)
  "fulfillment.created",
  "fulfillment.shipment_created",
  "fulfillment.delivery_created",

  // Customer
  "customer.created",
  "customer.updated",

  // Returns / claims / exchanges
  "return.created",
  "return.received",
  "claim.created",
  "exchange.created",

  // Custom domain events (host app emits; payload usually already flat)
  "loyalty.points_credited",
  "loyalty.points_debited",
  "wallet.credited",
  "wallet.debited",
  "membership.tier_changed",
]

export const ORDER_QUERY_FIELDS = [
  "id",
  "display_id",
  "custom_display_id",
  "status",
  "payment_status",
  "fulfillment_status",
  "region_id",
  "sales_channel_id",
  "customer_id",
  "email",
  "currency_code",
  "metadata",
  "canceled_at",
  "created_at",
  "updated_at",
  "total",
  "subtotal",
  "tax_total",
  "discount_total",
  "shipping_total",
  "gift_card_total",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.phone",
  "shipping_address.company",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "shipping_address.city",
  "shipping_address.province",
  "shipping_address.postal_code",
  "shipping_address.country_code",
  "billing_address.first_name",
  "billing_address.last_name",
  "billing_address.phone",
  "billing_address.company",
  "billing_address.address_1",
  "billing_address.address_2",
  "billing_address.city",
  "billing_address.province",
  "billing_address.postal_code",
  "billing_address.country_code",
  "customer.id",
  "customer.email",
  "customer.has_account",
  "customer.company_name",
  "customer.first_name",
  "customer.last_name",
  "customer.phone",
  "items.id",
  "items.title",
  "items.subtitle",
  "items.thumbnail",
  "items.product_title",
  "items.product_description",
  "items.product_handle",
  "items.variant_id",
  "items.variant_title",
  "items.variant_sku",
  "items.quantity",
  "items.unit_price",
  "items.total",
  "shipping_methods.id",
  "shipping_methods.name",
  "shipping_methods.description",
  "shipping_methods.amount",
  "transactions.id",
  "transactions.amount",
  "transactions.currency_code",
  "transactions.reference",
  "transactions.reference_id",
]

export const CUSTOMER_QUERY_FIELDS = [
  "id",
  "email",
  "has_account",
  "default_billing_address_id",
  "default_shipping_address_id",
  "company_name",
  "first_name",
  "last_name",
  "phone",
  "metadata",
  "created_by",
  "created_at",
  "updated_at",
  "addresses.id",
  "addresses.first_name",
  "addresses.last_name",
  "addresses.phone",
  "addresses.company",
  "addresses.address_1",
  "addresses.address_2",
  "addresses.city",
  "addresses.province",
  "addresses.postal_code",
  "addresses.country_code",
  "groups.id",
  "groups.name",
]

export const FULFILLMENT_QUERY_FIELDS = [
  "id",
  "location_id",
  "packed_at",
  "shipped_at",
  "delivered_at",
  "canceled_at",
  "marked_shipped_by",
  "created_by",
  "provider_id",
  "shipping_option_id",
  "data",
  "metadata",
  "items.id",
  "items.title",
  "items.quantity",
  "items.sku",
  "items.barcode",
  "items.line_item_id",
  "labels.id",
  "labels.tracking_number",
  "labels.tracking_url",
  "labels.label_url",
  // Linked order (when query graph exposes the link)
  "order.id",
  "order.display_id",
  "order.email",
  "order.currency_code",
  "order.total",
  "order.customer.id",
  "order.customer.email",
  "order.customer.first_name",
  "order.customer.last_name",
  "order.shipping_address.first_name",
  "order.shipping_address.last_name",
  "order.shipping_address.phone",
  "order.shipping_address.address_1",
  "order.shipping_address.city",
  "order.shipping_address.province",
  "order.shipping_address.postal_code",
  "order.shipping_address.country_code",
]

export const RETURN_QUERY_FIELDS = [
  "id",
  "display_id",
  "status",
  "refund_amount",
  "order_id",
  "exchange_id",
  "claim_id",
  "location_id",
  "no_notification",
  "created_by",
  "metadata",
  "items.id",
  "items.item_id",
  "items.reason_id",
  "items.quantity",
  "items.received_quantity",
  "shipping_methods.id",
  "shipping_methods.name",
  "shipping_methods.amount",
  "transactions.id",
  "transactions.amount",
  "transactions.currency_code",
  "transactions.reference",
]

export const CLAIM_QUERY_FIELDS = [
  "id",
  "type",
  "order_id",
  "order_version",
  "display_id",
  "return_id",
  "no_notification",
  "refund_amount",
  "created_by",
  "metadata",
  "created_at",
  "updated_at",
  "claim_items.id",
  "claim_items.item_id",
  "claim_items.quantity",
  "additional_items.id",
  "additional_items.item_id",
  "additional_items.quantity",
  "shipping_methods.id",
  "shipping_methods.name",
  "shipping_methods.amount",
  "transactions.id",
  "transactions.amount",
  "transactions.currency_code",
]

export const EXCHANGE_QUERY_FIELDS = [
  "id",
  "order_id",
  "order_version",
  "display_id",
  "return_id",
  "difference_due",
  "allow_backorder",
  "no_notification",
  "created_by",
  "metadata",
  "created_at",
  "updated_at",
  "additional_items.id",
  "additional_items.item_id",
  "additional_items.quantity",
  "shipping_methods.id",
  "shipping_methods.name",
  "shipping_methods.amount",
  "transactions.id",
  "transactions.amount",
  "transactions.currency_code",
]

/** Flat fields commonly present on custom domain event payloads */
export const CUSTOM_EVENT_PATHS = [
  "customer_id",
  "email",
  "first_name",
  "amount",
  "balance",
  "description",
  "reference_id",
  "currency_code",
  "wallet_id",
  "type",
  "membership_id",
  "membership_name",
  "previous_membership_id",
  "previous_membership_name",
  "reason",
  "source",
]

export function getSuggestedDataPathsForEvent(eventName: string) {
  if (
    eventName === "order.fulfillment_created" ||
    eventName === "order.fulfillment_canceled"
  ) {
    return ORDER_QUERY_FIELDS
  }

  if (eventName.startsWith("order.")) {
    return ORDER_QUERY_FIELDS
  }

  if (eventName.startsWith("customer.")) {
    return CUSTOMER_QUERY_FIELDS
  }

  if (
    eventName === "shipment.created" ||
    eventName === "delivery.created" ||
    eventName.startsWith("fulfillment.")
  ) {
    return unique([
      ...FULFILLMENT_QUERY_FIELDS,
      ...prefixPaths("order", ORDER_QUERY_FIELDS),
      "labels.0.tracking_number",
      "labels.0.tracking_url",
      "labels.0.label_url",
      "data.awb",
      "data.tracking_url",
      "data.courier_name",
    ])
  }

  if (
    eventName.startsWith("return.") ||
    eventName === "order.return_received" ||
    eventName === "order.return_requested"
  ) {
    return unique([
      ...RETURN_QUERY_FIELDS,
      ...prefixPaths("order", ORDER_QUERY_FIELDS),
    ])
  }

  if (eventName.startsWith("claim.")) {
    return unique([
      ...CLAIM_QUERY_FIELDS,
      ...prefixPaths("order", ORDER_QUERY_FIELDS),
      ...prefixPaths("return", RETURN_QUERY_FIELDS),
    ])
  }

  if (eventName.startsWith("exchange.")) {
    return unique([
      ...EXCHANGE_QUERY_FIELDS,
      ...prefixPaths("order", ORDER_QUERY_FIELDS),
      ...prefixPaths("return", RETURN_QUERY_FIELDS),
    ])
  }

  if (
    eventName.startsWith("loyalty.") ||
    eventName.startsWith("wallet.") ||
    eventName.startsWith("membership.")
  ) {
    return CUSTOM_EVENT_PATHS
  }

  return ORDER_QUERY_FIELDS
}
