"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { apiClient, mapApiError } from "@/lib/api-client"
import { parsePg } from "@/lib/api-response"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Search, AlertTriangle, RefreshCcw, ShoppingCart } from "lucide-react"
import { formatPrice, formatDate } from "@/lib/utils"
import type { Order } from "@/lib/types"

const statusColorMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  processing: "default",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
  refunded: "outline",
}

const paymentColorMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  paid: "default",
  failed: "destructive",
  refunded: "outline",
}

async function fetchOrders(params: Record<string, string | number | undefined>) {
  const { data } = await apiClient.get("/admin/orders", { params })
  return parsePg<Order>(data?.data, "admin/orders")
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-orders", search, statusFilter, paymentFilter, page, dateFrom, dateTo],
    queryFn: () => fetchOrders({
      search: search || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      paymentStatus: paymentFilter !== "all" ? paymentFilter : undefined,
      page,
      limit: 10,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
  })

  const orders = data?.items ?? []

  const columns: Column<Order>[] = [
    {
      key: "orderNumber",
      header: "Order",
      render: (o) => <span className="font-medium">#{o.orderNumber}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (o) => (
        <div>
          <p className="font-medium">{o.shippingAddress.fullName}</p>
          <p className="text-xs text-muted-foreground">{o.shippingAddress.phone}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (o) => (
        <Badge variant={statusColorMap[o.status] || "secondary"}>
          {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: "paymentStatus",
      header: "Payment",
      render: (o) => (
        <Badge variant={paymentColorMap[o.paymentStatus] || "secondary"}>
          {o.paymentStatus.charAt(0).toUpperCase() + o.paymentStatus.slice(1)}
        </Badge>
      ),
      hideOnMobile: true,
    },
    {
      key: "total",
      header: "Total",
      sortable: true,
      render: (o) => formatPrice(o.total),
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      render: (o) => formatDate(o.createdAt),
      hideOnMobile: true,
    },
  ]

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">Track and manage customer orders.</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm text-muted-foreground">{mapApiError(error).message}</p>
          <Button variant="outline" className="mt-2" onClick={() => refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">Track and manage customer orders.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order #, name, email, phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[140px]" />
          <span className="text-muted-foreground">-</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[140px]" />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        keyExtractor={(o) => o.id}
        loading={isLoading}
        emptyMessage="No orders found."
        emptyIcon={<ShoppingCart className="h-12 w-12 text-muted-foreground" />}
        onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
      />
    </div>
  )
}
