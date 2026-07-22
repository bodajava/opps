"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import NextImage from "next/image"
import { getMyOrders } from "@/lib/api/orders"
import { formatDate, formatPrice } from "@/lib/utils"
import type { Order } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Package, ShoppingBag, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "secondary",
  processing: "default",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
  refunded: "secondary",
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    getMyOrders()
      .then((res) => setOrders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">No orders yet</p>
            <p className="text-sm text-muted-foreground">
              You haven&apos;t placed any orders yet. Start shopping!
            </p>
          </div>
          <Button asChild>
            <Link href="/products">Browse Products</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>
            You have placed {orders.length} order{orders.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
      </Card>

      {orders.map((order) => (
        <Card key={order.id}>
          <button
            onClick={() => toggleExpand(order.id)}
            className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <p className="font-medium">#{order.orderNumber}</p>
                <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
              </div>
              <Badge variant={statusVariant[order.status] || "outline"}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
              <span className="font-medium">{formatPrice(order.total)}</span>
              <span className="text-sm text-muted-foreground">
                {order.items.length} item{order.items.length !== 1 ? "s" : ""}
              </span>
            </div>
            {expandedId === order.id ? (
              <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
          </button>

          {expandedId === order.id && (
            <div className="border-t px-6 py-4">
              <div className="mb-3 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Payment:</span>{" "}
                  {order.paymentMethod.toUpperCase()} &middot;{" "}
                  {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                </p>
                <p>
                  <span className="text-muted-foreground">Delivery:</span>{" "}
                  {order.shippingAddress.street}, {order.shippingAddress.city}
                </p>
              </div>

              <div className="mb-4 space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.image ? (
                        <NextImage
                          src={item.image}
                          alt={item.name}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      {item.variantName && (
                        <p className="text-xs text-muted-foreground">{item.variantName}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <span className="whitespace-nowrap">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <Button size="sm" asChild>
                <Link href={`/account/orders/${order.orderNumber}`}>
                  View Details
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
