"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient, mapApiError } from "@/lib/api-client"
import { parsePg } from "@/lib/api-response"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { toast } from "sonner"
import { AlertTriangle, RefreshCcw, CreditCard, ArrowUpRight } from "lucide-react"
import { formatPrice, formatDate } from "@/lib/utils"

interface PaymentItem {
  id: string
  orderId: string
  orderNumber: string
  method: string
  amount: number
  status: string
  transactionId?: string
  paidAt?: string
  createdAt: string
}

async function fetchPayments(params: Record<string, string | number | undefined>) {
  const { data } = await apiClient.get("/admin/payments", { params })
  return parsePg<PaymentItem>(data?.data, "admin/payments")
}

async function updatePaymentStatus(id: string, status: string) {
  const { data } = await apiClient.patch(`/admin/payments/${id}`, { status })
  return data
}

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-payments", statusFilter, methodFilter, page],
    queryFn: () => fetchPayments({
      status: statusFilter !== "all" ? statusFilter : undefined,
      method: methodFilter !== "all" ? methodFilter : undefined,
      page,
      limit: 10,
    }),
  })

  const payments = data?.items ?? []

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updatePaymentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] })
      toast.success("Payment updated")
    },
    onError: (err) => toast.error(mapApiError(err).message),
  })

  const statusColorMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    paid: "default",
    failed: "destructive",
    refunded: "outline",
  }

  const columns: Column<PaymentItem>[] = [
    {
      key: "order",
      header: "Order",
      render: (p) => <span className="font-medium">#{p.orderNumber}</span>,
    },
    {
      key: "method",
      header: "Method",
      render: (p) => <span className="capitalize">{p.method}</span>,
    },
    { key: "amount", header: "Amount", sortable: true, render: (p) => formatPrice(p.amount) },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (p) => (
        <Badge variant={statusColorMap[p.status] || "secondary"}>
          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
        </Badge>
      ),
    },
    { key: "transactionId", header: "Reference", render: (p) => p.transactionId ? <code className="text-xs">{p.transactionId.slice(0, 16)}...</code> : "-", hideOnMobile: true },
    { key: "date", header: "Date", sortable: true, render: (p) => formatDate(p.createdAt), hideOnMobile: true },
    {
      key: "actions",
      header: "Actions",
      render: (p) => (
        <div className="flex items-center gap-1">
          {p.status === "pending" && (
            <>
              <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: p.id, status: "paid" })}>
                Mark Paid
              </Button>
              <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: p.id, status: "failed" })}>
                Mark Failed
              </Button>
            </>
          )}
          {p.status === "paid" && (
            <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: p.id, status: "refunded" })}>
              <ArrowUpRight className="mr-1 h-3 w-3" /> Refund
            </Button>
          )}
        </div>
      ),
      className: "text-right",
    },
  ]

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">Track and manage payment transactions.</p>
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
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">Track and manage payment transactions.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="cod">Cash on Delivery</SelectItem>
            <SelectItem value="online">Online Payment</SelectItem>
            <SelectItem value="wallet">Wallet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        keyExtractor={(p) => p.id}
        loading={isLoading}
        emptyMessage="No payments found."
        emptyIcon={<CreditCard className="h-12 w-12 text-muted-foreground" />}
      />
    </div>
  )
}
