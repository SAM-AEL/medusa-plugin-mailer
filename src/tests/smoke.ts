import assert from "node:assert/strict"
import {
  isValidEmail,
  normalizeTemplateVariables,
  parsePagination,
} from "../shared/http"

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

console.log("mm smoke test passed")
