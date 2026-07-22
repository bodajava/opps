import { z } from "zod"

type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})

const envelope = <T extends z.ZodType>(schema: T) =>
  z.object({
    success: z.literal(true),
    statusCode: z.number().int(),
    message: z.string(),
    data: schema,
    timestamp: z.string(),
  })

export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  parentId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const categoryListEnvelopeSchema = envelope(
  z.object({ items: z.array(categorySchema), meta: paginationMetaSchema }),
)

const productCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
})

export const adminProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  shortDescription: z.string().optional(),
  fullDescription: z.string().optional(),
  category: z.union([z.string(), productCategorySchema]).nullish(),
  images: z.array(z.string()),
  regularPrice: z.number().finite().nonnegative(),
  salePrice: z.number().finite().nonnegative().optional(),
  stock: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative(),
  sku: z.string().min(1),
  tags: z.array(z.string()),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  inStock: z.boolean(),
  status: z.string(),
  isArchived: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

const productPaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})

export const adminProductListEnvelopeSchema = envelope(
  z.object({ items: z.array(adminProductSchema), pagination: productPaginationSchema }),
)
export const adminProductEnvelopeSchema = envelope(adminProductSchema)
export const adminCategoryEnvelopeSchema = envelope(categorySchema)
export const deletedEnvelopeSchema = envelope(z.object({ deleted: z.literal(true) }))

export const inventoryItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  productImage: z.string().optional(),
  sku: z.string(),
  variantId: z.string().optional(),
  variantName: z.string().optional(),
  currentStock: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative(),
  inStock: z.boolean(),
  isActive: z.boolean(),
  lastMovementAt: z.string().optional(),
})

export const inventoryListEnvelopeSchema = envelope(
  z.object({ items: z.array(inventoryItemSchema), meta: paginationMetaSchema }),
)

const salesPointSchema = z.object({
  period: z.string(),
  sales: z.number().finite().nonnegative(),
  orders: z.number().int().nonnegative(),
  discounts: z.number().finite().nonnegative(),
})
const orderStatusSchema = z.object({
  status: z.string().min(1),
  count: z.number().int().nonnegative(),
})
const paymentMetricSchema = z.object({
  paymentMethod: z.string().min(1),
  revenue: z.number().finite().nonnegative(),
  orders: z.number().int().nonnegative(),
})
const productMetricSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  quantitySold: z.number().int().nonnegative(),
  revenue: z.number().finite().nonnegative(),
})
const governorateMetricSchema = z.object({
  governorate: z.string().min(1),
  sales: z.number().finite().nonnegative(),
  orders: z.number().int().nonnegative(),
})

export const salesEnvelopeSchema = envelope(z.array(salesPointSchema))
export const ordersByStatusEnvelopeSchema = envelope(
  z.object({
    items: z.array(orderStatusSchema),
    total: z.number().int().nonnegative(),
  }),
)
export const revenueByPaymentEnvelopeSchema = envelope(z.array(paymentMetricSchema))
export const productPerformanceEnvelopeSchema = envelope(z.array(productMetricSchema))
export const salesByGovernorateEnvelopeSchema = envelope(z.array(governorateMetricSchema))

export type AdminCategory = z.infer<typeof categorySchema>
export type AdminProduct = z.infer<typeof adminProductSchema>
export type InventoryItem = z.infer<typeof inventoryItemSchema>
export type PaginationMeta = z.infer<typeof paginationMetaSchema>

export class ApiContractError extends Error {
  constructor(context: string, issue: string) {
    super(`API Contract Error [${context}]: ${issue}`)
    this.name = "ApiContractError"
  }
}

export function validateContract<T>(schema: z.ZodType<T>, input: JsonValue, context: string): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new ApiContractError(context, result.error.issues.map((issue) => issue.message).join("; "))
  }
  return result.data
}
