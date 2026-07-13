import assert from "node:assert/strict"
import {
  isValidEmail,
  normalizeTemplateVariables,
  parsePagination,
} from "../shared/http"
import {
  getSuggestedDataPathsForEvent,
  MAILER_EVENTS,
} from "../shared/mailer-fields"

assert.equal(isValidEmail("demo@example.com"), true)
assert.equal(isValidEmail("invalid-email"), false)

const vars = normalizeTemplateVariables({
  FirstName: "Sam",
  OrderId: 123,
})
assert.equal(vars.FirstName, "Sam")
assert.equal(vars.OrderId, "123")

const pagination = parsePagination({ limit: "500", offset: "-20" })
assert.equal(pagination.limit, 100)
assert.equal(pagination.offset, 0)

// Hardcoded events include real Medusa shipment/delivery names
assert.ok(MAILER_EVENTS.includes("order.placed"))
assert.ok(MAILER_EVENTS.includes("shipment.created"))
assert.ok(MAILER_EVENTS.includes("delivery.created"))
assert.ok(MAILER_EVENTS.includes("loyalty.points_credited"))

const shipPaths = getSuggestedDataPathsForEvent("shipment.created")
assert.ok(shipPaths.some((p) => p.includes("tracking") || p.startsWith("labels")))

const loyaltyPaths = getSuggestedDataPathsForEvent("loyalty.points_credited")
assert.ok(loyaltyPaths.includes("amount"))

console.log("mm smoke test passed")

