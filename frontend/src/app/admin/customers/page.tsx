"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient, mapApiError } from "@/lib/api-client"
import { parsePg } from "@/lib/api-response"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Search, AlertTriangle, RefreshCcw, Users, Ban, CheckCircle2 } from "lucide-react"
import { formatPrice, formatDate } from "@/lib/utils"


interface CustomerItem {
  id: string
  fullName: string
  email: string
  phone?: string
  isActive: boolean
  ordersCount: number
  totalSpent: number
  lastOrder?: string
  createdAt: string
}

async function fetchCustomers(params: Record<string, string | number | undefined>) {
  const { data } = await apiClient.get("/admin/customers", { params })
  return parsePg<CustomerItem>(data?.data, "admin/customers")
}

async function toggleCustomerBlock(id: string, block: boolean) {
  const endpoint = block ? "block" : "unblock"
  const { data } = await apiClient.post(`/admin/customers/${id}/${endpoint}`)
  return data
}

export default function AdminCustomersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-customers", search, page],
    queryFn: () => fetchCustomers({ search: search || undefined, page, limit: 10 }),
  })

  const customers = data?.items ?? []

  const toggleMutation = useMutation({
    mutationFn: ({ id, block }: { id: string; block: boolean }) => toggleCustomerBlock(id, block),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] })
      toast.success("Customer status updated")
    },
    onError: (err) => toast.error(mapApiError(err).message),
  })

  const columns: Column<CustomerItem>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (c) => (
        <div>
          <p className="font-medium">{c.fullName}</p>
          <p className="text-xs text-muted-foreground">{c.email}</p>
        </div>
      ),
    },
    { key: "phone", header: "Phone", render: (c) => c.phone || "-", hideOnMobile: true },
    { key: "ordersCount", header: "Orders", sortable: true, render: (c) => c.ordersCount, hideOnMobile: true },
    { key: "totalSpent", header: "Total Spent", sortable: true, render: (c) => formatPrice(c.totalSpent), hideOnMobile: true },
    { key: "lastOrder", header: "Last Order", render: (c) => c.lastOrder ? formatDate(c.lastOrder) : "Never", hideOnMobile: true },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <Badge variant={c.isActive ? "default" : "secondary"}>
          {c.isActive ? "Active" : "Blocked"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (c) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleMutation.mutate({ id: c.id, block: c.isActive })}
        >
          {c.isActive ? <Ban className="mr-1 h-3 w-3" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
          {c.isActive ? "Block" : "Unblock"}
        </Button>
      ),
      className: "text-right",
    },
  ]

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">View and manage your customers.</p>
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
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">View and manage your customers.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-8"
        />
      </div>

      <DataTable
        columns={columns}
        data={customers}
        keyExtractor={(c) => c.id}
        loading={isLoading}
        emptyMessage="No customers found."
        emptyIcon={<Users className="h-12 w-12 text-muted-foreground" />}
      />
    </div>
  )
}
