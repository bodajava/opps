"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import NextImage from "next/image"
import { trackOrder } from "@/lib/api/orders"
import { useAuthStore } from "@/store/auth-store"
import { formatDate, formatPrice } from "@/lib/utils"
import { OrderStatus, type Order } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Package,
  ChevronLeft,
  MapPin,
  CreditCard,
  Truck,
  CheckCircle2,
  Circle,
  XCircle,
} from "lucide-react"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "secondary",
  processing: "default",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
  refunded: "secondary",
}

const statusSteps: string[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
]

const statusLabels: Record<string, string> = {
  pending: "Order Placed",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
}

export default function OrderDetailPage() {
  const params = useParams()
  const orderNumber = Array.isArray(params.orderNumber) ? params.orderNumber[0] : (params.orderNumber ?? "")
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userEmail = useAuthStore((s) => s.user?.email)

  useEffect(() => {
    if (!orderNumber || !userEmail) return
    trackOrder(orderNumber, userEmail)
      .then((res) => setOrder(res.data))
      .catch(() => setError("Order not found"))
      .finally(() => setLoading(false))
  }, [orderNumber, userEmail])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <XCircle className="h-12 w-12 text-destructive" />
          <div>
            <p className="text-lg font-medium">Order not found</p>
            <p className="text-sm text-muted-foreground">{error || "This order does not exist."}</p>
          </div>
          <Button asChild>
            <Link href="/account/orders">Back to Orders</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const currentStepIndex = statusSteps.indexOf(order.status)
  const isCancelled = order.status === "cancelled"
  const isRefunded = order.status === "refunded"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/account/orders">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Order #{order.orderNumber}</h2>
          <p className="text-sm text-muted-foreground">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <Badge variant={statusVariant[order.status] || "outline"} className="ml-auto">
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5" />
              Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.image ? (
                      <NextImage
                        src={item.image}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.name}</p>
                    {item.variantName && (
                      <p className="text-sm text-muted-foreground">{item.variantName}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      SKU: {item.sku} &middot; Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-right">
                    {formatPrice(item.price)}<br />
                    <span className="text-sm text-muted-foreground">
                      &times;{item.quantity}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span>{formatPrice(order.deliveryFee)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-green-600">-{formatPrice(order.discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">{order.paymentMethod.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={statusVariant[order.paymentStatus] || "outline"}>
                  {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">{order.shippingAddress.fullName}</p>
              <p className="text-muted-foreground">{order.shippingAddress.phone}</p>
              <p className="mt-1 text-muted-foreground">
                {order.shippingAddress.street}
                {order.shippingAddress.building && `, ${order.shippingAddress.building}`}
                {order.shippingAddress.apartment && `, Apt ${order.shippingAddress.apartment}`}
              </p>
              <p className="text-muted-foreground">
                {order.shippingAddress.district}, {order.shippingAddress.city}
              </p>
              <p className="text-muted-foreground">{order.shippingAddress.governorate}</p>
              {order.shippingAddress.landmark && (
                <p className="mt-1 text-muted-foreground">
                  Landmark: {order.shippingAddress.landmark}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-5 w-5" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isCancelled || isRefunded ? (
                <div className="space-y-4">
                  {statusSteps.map((step, index) => {
                    const historyEntry = order.statusHistory.find((h) => h.status === step)
                    const isPast = index <= currentStepIndex
                    return (
                      <div key={step} className="flex gap-3">
                        {isPast ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                        ) : (
                          <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/40" />
                        )}
                        <div>
                          <p className={isPast ? "font-medium" : "text-muted-foreground"}>
                            {statusLabels[step]}
                          </p>
                          {historyEntry && (
                            <p className="text-xs text-muted-foreground">
                              {formatDate(historyEntry.timestamp)}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <Separator />
                  <div className="flex gap-3">
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">
                        {statusLabels[order.status]}
                      </p>
                      {(() => {
                        const entry = order.statusHistory.find(
                          (h) => h.status === order.status,
                        )
                        return entry ? (
                          <p className="text-xs text-muted-foreground">
                            {formatDate(entry.timestamp)}
                          </p>
                        ) : null
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {statusSteps.map((step, index) => {
                    const historyEntry = order.statusHistory.find((h) => h.status === step)
                    const isPast = index <= currentStepIndex
                    const isCurrent = index === currentStepIndex
                    return (
                      <div key={step} className="flex gap-3">
                        {isPast ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                        ) : (
                          <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/40" />
                        )}
                        <div>
                          <p
                            className={
                              isCurrent
                                ? "font-medium text-primary"
                                : isPast
                                  ? "font-medium"
                                  : "text-muted-foreground"
                            }
                          >
                            {statusLabels[step]}
                          </p>
                          {historyEntry && (
                            <p className="text-xs text-muted-foreground">
                              {formatDate(historyEntry.timestamp)}
                              {historyEntry.note && ` — ${historyEntry.note}`}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
