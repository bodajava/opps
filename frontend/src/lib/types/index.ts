// ─── Enums ────────────────────────────────────────────────

export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum PaymentMethodType {
  COD = "cod",
  ONLINE = "online",
  WALLET = "wallet",
}

// ─── Core Domain ──────────────────────────────────────────

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image?: string
  parentId?: string
  children?: Category[]
  productCount?: number
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductVariant {
  id: string
  name: string
  sku: string
  price: number
  compareAtPrice?: number
  stock: number
  isActive: boolean
  attributes: Record<string, string>
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  shortDescription?: string
  price: number
  compareAtPrice?: number
  images: string[]
  categoryId: string
  category?: Category
  variants?: ProductVariant[]
  tags: string[]
  stock: number
  inStock: boolean
  status: string
  lowStockThreshold?: number
  sku?: string
  isActive: boolean
  isFeatured: boolean
  isBestSeller: boolean
  sellCount: number
  rating: number
  reviewCount: number
  seoTitle?: string
  seoDescription?: string
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  fullName: string
  phone?: string
  avatar?: string
  role: string | { name: string; [key: string]: DynamicValue }
  isActive: boolean
  isBlocked?: boolean
  accountStatus?: "pending_verification" | "verified" | "blocked" | "disabled"
  emailVerifiedAt?: string
  addresses: Address[]
  permissions?: string[]
  lastLoginAt?: string
  marketingConsent?: boolean
  marketingConsentAt?: string
  marketingConsentSource?: string
  marketingUnsubscribedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Address {
  id: string
  label: string
  fullName: string
  phone: string
  street: string
  building?: string
  apartment?: string
  district: string
  city: string
  governorate: string
  landmark?: string
  isDefault: boolean
  deliveryNotes?: string
}

export interface CartItem {
  id: string
  productId: string
  variantId?: string
  name: string
  image: string
  price: number
  quantity: number
  variantName?: string
  sku: string
  subtotal?: number
}

export interface Cart {
  id: string
  user?: string
  items: CartItem[]
  couponCode?: string
  discount: number
  subtotal: number
  deliveryFee: number
  total: number
  itemCount: number
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  productId: string
  variantId?: string
  name: string
  image: string
  price: number
  quantity: number
  variantName?: string
  sku: string
}

export interface OrderStatusHistory {
  status: OrderStatus
  note?: string
  timestamp: string
}

export interface Order {
  id: string
  orderNumber: string
  userId?: string
  sessionId?: string
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  couponCode?: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethodType
  shippingAddress: Address
  statusHistory: OrderStatusHistory[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Coupon {
  id: string
  code: string
  description?: string
  type: "percentage" | "fixed"
  value: number
  maxDiscount?: number
  minOrderValue?: number
  startDate: string
  expirationDate: string
  isActive: boolean
  usageLimit?: number
  perCustomerLimit: number
  usedCount: number
  applicableProducts?: string[]
  applicableCategories?: string[]
  isFirstOrderOnly?: boolean
  audience: "all" | "new_customers" | "returning" | "high_value" | "inactive" | "specific"
  minOrders?: number
  minSpent?: number
  inactiveDays?: number
  customerEmails?: string[]
  createdAt: string
}

export interface CouponValidation {
  valid: boolean
  coupon?: Coupon
  discount: number
  message?: string
}

export interface CouponUsage {
  id: string
  coupon: string
  order?: string
  user?: string
  email?: string
  discountAmount: number
  createdAt: string
}

export interface Payment {
  id: string
  orderId: string
  method: PaymentMethodType
  status: PaymentStatus
  amount: number
  transactionId?: string
  paidAt?: string
  createdAt: string
}

export interface DeliveryZone {
  id: string
  governorate: string
  cities: string[]
  deliveryFee: number
  freeDeliveryThreshold: number | null
  estimatedDeliveryDays: string
  isActive: boolean
  codAvailable: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// ─── API Responses ────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  statusCode: number
  message: string
  data: T
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  success: boolean
  statusCode: number
  message: string
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiError {
  success: false
  statusCode: number
  message: string
  errors?: Record<string, string[]>
}

// ─── Checkout ─────────────────────────────────────────────

export interface CheckoutQuote {
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  couponCode?: string
  deliveryZone?: DeliveryZone
  estimatedDelivery?: string
}

export interface CheckoutFormData {
  shippingAddress: Address
  paymentMethod: PaymentMethodType
  couponCode?: string
  notes?: string
  email?: string
  phone?: string
}

// ─── Auth ─────────────────────────────────────────────────

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface RegistrationPendingResponse {
  status: "pending_verification"
  verificationChannel: "email"
  maskedDestination: string
  expiresInSeconds: number
  resendAfterSeconds: number
  verificationFlowId: string
}

export interface VerifyRegistrationResponse extends AuthResponse {
  status: "verified_authenticated"
}

// ─── Admin ────────────────────────────────────────────────

export interface AdminOverview {
  totalOrders: number
  totalRevenue: number
  totalCustomers: number
  totalProducts: number
  pendingOrders: number
  ordersToday: number
  revenueToday: number
  averageOrderValue: number
  conversionRate: number
}

export interface SalesDataPoint {
  date: string
  revenue: number
  orders: number
}

export interface BreakEvenData {
  fixedCosts: number
  variableCostPerUnit: number
  pricePerUnit: number
  breakEvenUnits: number
  breakEvenRevenue: number
}
