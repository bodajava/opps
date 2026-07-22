import { expect, test } from "@playwright/test"
import {
  ApiContractError,
  ordersByStatusEnvelopeSchema,
  validateContract,
} from "../../src/lib/api/admin-contracts"

const baseEnvelope = {
  success: true,
  statusCode: 200,
  message: "Operation successful",
  timestamp: "2026-07-22T00:00:00.000Z",
}

test("orders-by-status accepts a populated typed payload", () => {
  const result = validateContract(
    ordersByStatusEnvelopeSchema,
    { ...baseEnvelope, data: { items: [{ status: "pending", count: 2 }], total: 2 } },
    "orders-by-status",
  )
  expect(result.data.items).toEqual([{ status: "pending", count: 2 }])
})

test("orders-by-status distinguishes a valid empty response", () => {
  const result = validateContract(
    ordersByStatusEnvelopeSchema,
    { ...baseEnvelope, data: { items: [], total: 0 } },
    "orders-by-status",
  )
  expect(result.data.items).toEqual([])
})

test("orders-by-status rejects a malformed object instead of faking empty data", () => {
  expect(() =>
    validateContract(
      ordersByStatusEnvelopeSchema,
      { ...baseEnvelope, data: { items: { pending: 2 }, total: 2 } },
      "orders-by-status",
    ),
  ).toThrow(ApiContractError)
})
