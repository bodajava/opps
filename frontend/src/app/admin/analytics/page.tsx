"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { mapApiError } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable, type Column } from "@/components/ui/data-table"

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { BarChart3, Download, AlertTriangle, RefreshCcw, FileText, MapPin } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { getAdminAnalytics } from "@/lib/api/admin"

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#64748b"]


function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-sm">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">Revenue: E£ {payload[0]?.value?.toLocaleString()}</p>
        {payload[1] && <p className="text-sm text-muted-foreground">Orders: {payload[1].value}</p>}
      </div>
    )
  }
  return null
}

export default function AdminAnalyticsPage() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-analytics", dateFrom, dateTo],
    queryFn: () => getAdminAnalytics(dateFrom || undefined, dateTo || undefined),
  })

  const prodColumns: Column<{ id: string; name: string; unitsSold: number; revenue: number }>[] = [
    { key: "name", header: "Product", render: (p) => <span className="font-medium">{p.name}</span> },
    { key: "unitsSold", header: "Units Sold", sortable: true, render: (p) => p.unitsSold },
    { key: "revenue", header: "Revenue", sortable: true, render: (p) => formatPrice(p.revenue) },
  ]

  const govColumns: Column<{ governorate: string; orders: number; revenue: number }>[] = [
    { key: "governorate", header: "Governorate", render: (g) => <span className="font-medium">{g.governorate}</span> },
    { key: "orders", header: "Orders", sortable: true, render: (g) => g.orders },
    { key: "revenue", header: "Revenue", sortable: true, render: (g) => formatPrice(g.revenue) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Detailed insights into your store performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <div>
            <Label htmlFor="from" className="sr-only">From</Label>
            <Input id="from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[140px]" />
          </div>
          <span className="text-muted-foreground">-</span>
          <div>
            <Label htmlFor="to" className="sr-only">To</Label>
            <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[140px]" />
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load analytics</h3>
          <p className="mt-1 text-sm text-muted-foreground">{mapApiError(error).message}</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sales Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.salesData || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} name="Revenue" />
                    <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="Orders" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Orders by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data?.ordersByStatus || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {(data?.ordersByStatus || []).map((entry, idx) => (
                        <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.revenueByPayment || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {(data?.revenueByPayment || []).map((entry, idx) => (
                        <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sales by Governorate</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={govColumns}
                  data={data?.salesByGovernorate || []}
                  keyExtractor={(g) => g.governorate}
                  pageSize={5}
                  emptyMessage="No data available."
                  emptyIcon={<MapPin className="h-8 w-8 text-muted-foreground" />}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Product Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={prodColumns}
                data={data?.productPerformance || []}
                keyExtractor={(p) => p.id}
                pageSize={10}
                emptyMessage="No product performance data."
                emptyIcon={<BarChart3 className="h-8 w-8 text-muted-foreground" />}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
