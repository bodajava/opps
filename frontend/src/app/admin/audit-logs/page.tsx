"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient, mapApiError } from "@/lib/api-client"
import { parsePg } from "@/lib/api-response"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollText, Search, AlertTriangle, RefreshCcw } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface AuditLog {
  id: string
  action: string
  entity: string
  entityId: string
  user: { firstName: string; lastName: string; email: string }
  ip: string
  createdAt: string
  metadata?: DynamicRecord
}

async function fetchAuditLogs(params: Record<string, string | number | undefined>) {
  const { data } = await apiClient.get("/admin/audit-logs", { params })
  return parsePg<AuditLog>(data?.data, "admin/audit-logs")
}

const actionOptions = ["all", "create", "update", "delete", "login", "logout", "archive", "restore"]
const entityOptions = ["all", "product", "order", "category", "coupon", "user", "payment", "setting", "inventory"]

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [entityFilter, setEntityFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-audit-logs", search, actionFilter, entityFilter, dateFrom, dateTo, page],
    queryFn: () => fetchAuditLogs({
      search: search || undefined,
      action: actionFilter !== "all" ? actionFilter : undefined,
      entity: entityFilter !== "all" ? entityFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit: 20,
    }),
  })

  const logs = data?.items ?? []

  const columns: Column<AuditLog>[] = [
    {
      key: "action",
      header: "Action",
      render: (l) => (
        <Badge variant={l.action === "delete" ? "destructive" : l.action === "create" ? "default" : "secondary"}>
          {l.action.charAt(0).toUpperCase() + l.action.slice(1)}
        </Badge>
      ),
    },
    { key: "entity", header: "Entity", render: (l) => <span className="capitalize">{l.entity}</span> },
    { key: "entityId", header: "Entity ID", render: (l) => <code className="text-xs text-muted-foreground">{l.entityId.slice(0, 12)}...</code>, hideOnMobile: true },
    {
      key: "user",
      header: "User",
      render: (l) => (
        <div>
          <p className="text-sm font-medium">{l.user.firstName} {l.user.lastName}</p>
          <p className="text-xs text-muted-foreground">{l.user.email}</p>
        </div>
      ),
    },
    { key: "createdAt", header: "Date", sortable: true, render: (l) => formatDate(l.createdAt), hideOnMobile: true },
    { key: "ip", header: "IP", render: (l) => l.ip, hideOnMobile: true },
  ]

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Track all admin actions and changes.</p>
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
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Track all admin actions and changes.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by entity ID or user..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8"
          />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            {actionOptions.map((o) => (
              <SelectItem key={o} value={o}>{o === "all" ? "All Actions" : o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            {entityOptions.map((o) => (
              <SelectItem key={o} value={o}>{o === "all" ? "All Entities" : o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>
            ))}
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
        data={logs}
        keyExtractor={(l) => l.id}
        loading={isLoading}
        emptyMessage="No audit logs found."
        emptyIcon={<ScrollText className="h-12 w-12 text-muted-foreground" />}
      />
    </div>
  )
}
