import { expect, test } from "@playwright/test"
import {
  ApiContractError,
  inventoryListEnvelopeSchema,
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

test("inventory accepts complete canonical boolean fields", () => {
  const result = validateContract(
    inventoryListEnvelopeSchema,
    {
      ...baseEnvelope,
      data: {
        items: [{
          productId: "product-1",
          productName: "Inventory Product",
          sku: "INV-1",
          currentStock: 7,
          lowStockThreshold: 3,
          inStock: true,
          isActive: true,
        }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    },
    "GET /admin/inventory",
  )
  expect(result.data.items[0].isActive).toBe(true)
})

test("inventory rejects missing canonical boolean fields", () => {
  expect(() =>
    validateContract(
      inventoryListEnvelopeSchema,
      {
        ...baseEnvelope,
        data: {
          items: [{
            productId: "product-1",
            productName: "Inventory Product",
            sku: "INV-1",
            currentStock: 7,
            lowStockThreshold: 3,
            inStock: true,
          }],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      },
      "GET /admin/inventory",
    ),
  ).toThrow(ApiContractError)
})
