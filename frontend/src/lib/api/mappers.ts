import { OrderStatus, PaymentMethodType, PaymentStatus, type Category, type Order, type Product } from "@/lib/types"

function text(value: DynamicValue, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function optionalText(value: DynamicValue): string | undefined {
  return typeof value === "string" ? value : undefined
}

function numeric(value: DynamicValue, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function optionalNumber(value: DynamicValue): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function booleanValue(value: DynamicValue, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function isDynamicRecord(value: DynamicValue): value is DynamicRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function dynamicRecord(value: DynamicValue): DynamicRecord {
  return isDynamicRecord(value) ? value : {}
}

function dynamicRecords(value: DynamicValue): DynamicRecord[] {
  return Array.isArray(value) ? value.filter(isDynamicRecord) : []
}

export function requireDynamicRecord(value: DynamicValue, context: string): DynamicRecord {
  if (!isDynamicRecord(value)) throw new Error(`API Contract Error [${context}]: expected an object`)
  return value
}

export function requireDynamicRecords(value: DynamicValue, context: string): DynamicRecord[] {
  if (!Array.isArray(value) || !value.every(isDynamicRecord)) {
    throw new Error(`API Contract Error [${context}]: expected an array of objects`)
  }
  return value
}

function strings(value: DynamicValue): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function stringMap(value: DynamicValue): Record<string, string> {
  if (!isDynamicRecord(value)) return {}
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
}

function entityId(value: DynamicValue, fallback?: DynamicValue): string {
  if (isDynamicRecord(value)) return text(value.id ?? value._id)
  return text(value ?? fallback)
}

function orderStatus(value: DynamicValue): OrderStatus {
  return Object.values(OrderStatus).find((status) => status === value) ?? OrderStatus.PENDING
}

function paymentStatus(value: DynamicValue): PaymentStatus {
  return Object.values(PaymentStatus).find((status) => status === value) ?? PaymentStatus.PENDING
}

function paymentMethod(value: DynamicValue): PaymentMethodType {
  return Object.values(PaymentMethodType).find((method) => method === value) ?? PaymentMethodType.COD
}

function sanitizeImage(url: string): string {
  return url.startsWith("/") ? url : ""
}

function sanitizeImages(urls: string[]): string[] {
  return urls.filter((url) => sanitizeImage(url))
}

export function mapProduct(raw: DynamicRecord): Product {
  const category = dynamicRecord(raw.category)
  const variants = dynamicRecords(raw.variants)
  return {
    id: entityId(raw.id, raw._id),
    name: text(raw.name),
    slug: text(raw.slug),
    description: text(raw.fullDescription ?? raw.description),
    shortDescription: text(raw.shortDescription),
    price: numeric(raw.regularPrice ?? raw.price),
    compareAtPrice: optionalNumber(raw.salePrice ?? raw.compareAtPrice),
    images: sanitizeImages(strings(raw.images)),
    categoryId: entityId(raw.category, raw.categoryId),
    category: Object.keys(category).length > 0 ? mapCategory(category) : undefined,
    variants: variants.length > 0 ? variants.map((variant) => ({
      id: entityId(variant.id, variant._id),
      name: text(variant.name),
      sku: text(variant.sku),
      price: numeric(variant.price ?? variant.unitPrice),
      compareAtPrice: optionalNumber(variant.compareAtPrice),
      stock: numeric(variant.stock),
      isActive: booleanValue(variant.isActive, true),
      attributes: stringMap(variant.attributes),
    })) : undefined,
    stock: numeric(raw.stock),
    inStock: booleanValue(raw.inStock, true),
    status: text(raw.status, "in_stock"),
    lowStockThreshold: optionalNumber(raw.lowStockThreshold),
    sku: text(raw.sku),
    tags: strings(raw.tags),
    isActive: booleanValue(raw.isActive, true),
    isFeatured: booleanValue(raw.isFeatured, false),
    isBestSeller: booleanValue(raw.isBestSeller, false),
    sellCount: numeric(raw.sellCount),
    rating: numeric(raw.ratingAverage ?? raw.rating),
    reviewCount: numeric(raw.ratingCount ?? raw.reviewCount),
    createdAt: text(raw.createdAt),
    updatedAt: text(raw.updatedAt),
  }
}

export function mapCategory(raw: DynamicRecord): Category {
  const image = optionalText(raw.image)
  return {
    id: entityId(raw.id, raw._id),
    name: text(raw.name),
    slug: text(raw.slug),
    description: optionalText(raw.description),
    image: image ? sanitizeImage(image) : undefined,
    parentId: optionalText(raw.parentId),
    productCount: numeric(raw.productCount),
    sortOrder: numeric(raw.sortOrder),
    isActive: booleanValue(raw.isActive, true),
    createdAt: text(raw.createdAt),
    updatedAt: text(raw.updatedAt),
  }
}

export function mapOrder(raw: DynamicRecord): Order {
  const shipping = dynamicRecord(raw.shippingAddress)
  return {
    id: entityId(raw.id, raw._id),
    orderNumber: text(raw.orderNumber),
    userId: entityId(raw.user, raw.userId) || undefined,
    sessionId: optionalText(raw.sessionId),
    items: dynamicRecords(raw.items).map((item) => ({
      id: entityId(item.id, item._id),
      productId: entityId(item.product, item.productId),
      variantId: entityId(item.variant, item.variantId) || undefined,
      name: text(item.name),
      image: sanitizeImage(text(item.image)),
      price: numeric(item.unitPrice ?? item.price),
      quantity: numeric(item.quantity, 1),
      variantName: optionalText(item.variantName),
      sku: text(item.sku),
    })),
    subtotal: numeric(raw.subtotal),
    deliveryFee: numeric(raw.deliveryFee),
    discount: numeric(raw.discount),
    total: numeric(raw.total),
    couponCode: optionalText(raw.couponCode),
    status: orderStatus(raw.orderStatus ?? raw.status),
    paymentStatus: paymentStatus(raw.paymentStatus),
    paymentMethod: paymentMethod(raw.paymentMethod),
    shippingAddress: {
      id: entityId(shipping.id, shipping._id),
      label: text(shipping.label),
      fullName: text(raw.customerName ?? shipping.fullName),
      phone: text(raw.customerPhone ?? shipping.phone),
      street: text(shipping.street),
      building: optionalText(shipping.building),
      apartment: optionalText(shipping.apartment),
      district: text(shipping.district ?? shipping.city),
      city: text(shipping.city),
      governorate: text(shipping.state ?? shipping.governorate),
      landmark: optionalText(shipping.landmark),
      isDefault: booleanValue(shipping.isDefault, false),
    },
    statusHistory: dynamicRecords(raw.statusHistory).map((history) => ({
      status: orderStatus(history.newStatus ?? history.status),
      note: optionalText(history.note),
      timestamp: text(history.changedAt ?? history.timestamp),
    })),
    notes: optionalText(raw.customerNotes ?? raw.notes),
    createdAt: text(raw.createdAt),
    updatedAt: text(raw.updatedAt),
  }
}

export function mapPaginatedResponse<T>(
  raw: DynamicRecord,
  mapper: (item: DynamicRecord) => T,
): { success: boolean; statusCode: number; message: string; data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } } {
  const pagination = dynamicRecord(raw.pagination)
  return {
    success: true,
    statusCode: 200,
    message: "Operation successful",
    data: dynamicRecords(raw.items).map(mapper),
    meta: {
      page: numeric(pagination.page, 1),
      limit: numeric(pagination.limit, 20),
      total: numeric(pagination.total),
      totalPages: numeric(pagination.totalPages),
    },
  }
}
