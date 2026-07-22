"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import NextImage from "next/image"
import { apiClient, mapApiError } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  ArrowLeft,
  Printer,
  Package,
  User,
  MapPin,
  CreditCard,
  Clock,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react"
import { formatPrice, formatDate } from "@/lib/utils"
import { OrderStatus } from "@/lib/types"
import { mapOrder, requireDynamicRecord } from "@/lib/api/mappers"

const statusFlow: string[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED]

const statusColorMap: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  processing: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  shipped: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
}

async function fetchOrder(id: string) {
  const { data } = await apiClient.get(`/admin/orders/${id}`)
  const envelope = requireDynamicRecord(data, "GET /admin/orders/:id")
  return mapOrder(requireDynamicRecord(envelope.data, "GET /admin/orders/:id data"))
}

function isOrderStatus(value: string): value is OrderStatus {
  return Object.values(OrderStatus).some((status) => status === value)
}

async function updateOrderStatus(id: string, status: OrderStatus, note?: string) {
  const { data } = await apiClient.patch(`/admin/orders/${id}/status`, { status, note })
  return data
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "")

  const [newStatus, setNewStatus] = useState<OrderStatus | "">("")
  const [statusNote, setStatusNote] = useState("")

  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => fetchOrder(id),
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: ({ status, note }: { status: OrderStatus; note?: string }) =>
      updateOrderStatus(id, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", id] })
      toast.success("Order status updated")
      setNewStatus("")
      setStatusNote("")
    },
    onError: (err) => toast.error(mapApiError(err).message),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h3 className="mt-4 text-lg font-semibold">Failed to load order</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {isError ? mapApiError(error).message : "Order not found"}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  const nextStatuses = statusFlow.slice(statusFlow.indexOf(order.status) + 1)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/orders")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Order #{order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <Badge variant="secondary" className={statusColorMap[order.status]}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <NextImage
                      src={item.image}
                      alt={item.name}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-md object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {item.sku} {item.variantName ? `| ${item.variantName}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">x{item.quantity}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(item.price)}</p>
                    </div>
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
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{formatPrice(order.deliveryFee)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-green-600">-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.statusHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No status history available.</p>
              ) : (
                <div className="space-y-4">
                  {[...order.statusHistory].reverse().map((h, idx) => (
                    <div key={`${h.status}-${h.timestamp}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-2.5 w-2.5 rounded-full ${statusColorMap[h.status]} ring-2 ring-background`} />
                        {idx < order.statusHistory.length - 1 && (
                          <div className="w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium capitalize">{h.status}</p>
                        {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                        <p className="text-xs text-muted-foreground">{formatDate(h.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{order.shippingAddress.fullName}</p>
              <p className="text-muted-foreground">{order.shippingAddress.phone}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{order.shippingAddress.street}</p>
              {order.shippingAddress.building && <p>Building: {order.shippingAddress.building}</p>}
              {order.shippingAddress.apartment && <p>Apartment: {order.shippingAddress.apartment}</p>}
              <p>{order.shippingAddress.district}, {order.shippingAddress.city}</p>
              <p>{order.shippingAddress.governorate}</p>
              {order.shippingAddress.landmark && <p>Landmark: {order.shippingAddress.landmark}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium capitalize">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary">
                  {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">{formatPrice(order.total)}</span>
              </div>
            </CardContent>
          </Card>

          {order.status !== "delivered" && order.status !== "cancelled" && order.status !== "refunded" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="status">New Status</Label>
                  <Select value={newStatus} onValueChange={(value) => { if (isOrderStatus(value)) setNewStatus(value) }}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {nextStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                      <SelectItem value="cancelled">Cancel Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="note">Note (optional)</Label>
                  <Textarea
                    id="note"
                    placeholder="Reason for this update..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!newStatus || statusMutation.isPending}
                  onClick={() => { if (newStatus) statusMutation.mutate({ status: newStatus, note: statusNote || undefined }) }}
                >
                  Update Status
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="Internal notes (not visible to customer)..." />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
