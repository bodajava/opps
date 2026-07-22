"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { trackOrder } from "@/lib/api/orders"
import { formatPrice, formatDate } from "@/lib/utils"
import { OrderStatus, type Order } from "@/lib/types"
import {
  Search,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  RotateCcw,
  Loader2,
} from "lucide-react"

const statusConfig: Record<OrderStatus, { label: string; icon: typeof Clock; color: string }> = {
  [OrderStatus.PENDING]: { label: "Order Placed", icon: Clock, color: "text-yellow-500" },
  [OrderStatus.CONFIRMED]: { label: "Confirmed", icon: CheckCircle2, color: "text-blue-500" },
  [OrderStatus.PROCESSING]: { label: "Baking", icon: Package, color: "text-indigo-500" },
  [OrderStatus.SHIPPED]: { label: "Out for Delivery", icon: Truck, color: "text-purple-500" },
  [OrderStatus.DELIVERED]: { label: "Delivered", icon: CheckCircle2, color: "text-green-500" },
  [OrderStatus.CANCELLED]: { label: "Cancelled", icon: XCircle, color: "text-red-500" },
  [OrderStatus.REFUNDED]: { label: "Refunded", icon: RotateCcw, color: "text-orange-500" },
}

const statusOrder: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
]

const statusBadgeVariant: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  [OrderStatus.PENDING]: "secondary",
  [OrderStatus.CONFIRMED]: "default",
  [OrderStatus.PROCESSING]: "default",
  [OrderStatus.SHIPPED]: "default",
  [OrderStatus.DELIVERED]: "default",
  [OrderStatus.CANCELLED]: "destructive",
  [OrderStatus.REFUNDED]: "outline",
}

function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("")
  const [email, setEmail] = useState("")
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTrack = async () => {
    if (!orderNumber.trim() || !email.trim()) return
    setIsLoading(true)
    setError(null)
    setOrder(null)
    try {
      const res = await trackOrder(orderNumber.trim(), email.trim())
      if (res.success) {
        setOrder(res.data)
      } else {
        setError(res.message || "Order not found")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to track order")
    } finally {
      setIsLoading(false)
    }
  }

  const currentStatusIndex = order ? statusOrder.indexOf(order.status) : -1

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Track Your Order</h1>
        <p className="mt-2 text-muted-foreground">
          Enter your order number to check the status of your delivery.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Enter order number (e.g. OPPS-2026-000001)"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTrack()}
            className="pl-9"
          />
        </div>
        <Input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleTrack()}
        />
        <Button onClick={handleTrack} disabled={isLoading || !orderNumber.trim() || !email.trim()} className="w-full">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Track"}
        </Button>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {order && (
        <div className="mt-8 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Order #{order.orderNumber}</CardTitle>
                <Badge variant={statusBadgeVariant[order.status]}>
                  {statusConfig[order.status].label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Placed on {formatDate(order.createdAt)}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                {statusOrder.map((status, idx) => {
                  const config = statusConfig[status]
                  const isCompleted = idx <= currentStatusIndex
                  const isCurrent = idx === currentStatusIndex
                  const Icon = config.icon

                  return (
                    <div key={status} className="flex gap-4 pb-6 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            isCompleted
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        {idx < statusOrder.length - 1 && (
                          <div
                            className={`mt-1 h-full w-0.5 ${
                              isCompleted && idx < currentStatusIndex
                                ? "bg-primary"
                                : "bg-muted"
                            }`}
                          />
                        )}
                      </div>
                      <div className="pt-1">
                        <p
                          className={`text-sm font-medium ${
                            isCompleted ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {config.label}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-muted-foreground">Current status</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    {item.variantName && (
                      <span className="text-muted-foreground">({item.variantName})</span>
                    )}
                    <span className="text-muted-foreground">x{item.quantity}</span>
                  </div>
                  <span className="tabular-nums">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="tabular-nums">{order.deliveryFee === 0 ? "Free" : formatPrice(order.deliveryFee)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span className="tabular-nums">-{formatPrice(order.discount)}</span>
                  </div>
                )}
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(order.total)}</span>
              </div>
            </CardContent>
          </Card>

          {order.shippingAddress && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Delivery Address</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p>{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.phone}</p>
                <p>{order.shippingAddress.street}</p>
                {order.shippingAddress.building && <p>Building: {order.shippingAddress.building}</p>}
                {order.shippingAddress.apartment && <p>Apartment: {order.shippingAddress.apartment}</p>}
                <p>
                  {order.shippingAddress.district}, {order.shippingAddress.city},{" "}
                  {order.shippingAddress.governorate}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default TrackOrderPage
