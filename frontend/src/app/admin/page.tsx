"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface SalesDataPoint {
  period: string
  sales: number
  orders: number
}

interface OrdersByStatusItem {
  status: string
  count: number
}

interface RevenueByPaymentItem {
  paymentMethod: string
  revenue: number
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from "lucide-react"

const COLORS = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  processing: "#8b5cf6",
  shipped: "#06b6d4",
  delivered: "#22c55e",
  cancelled: "#ef4444",
  refunded: "#64748b",
}

const PAYMENT_COLORS = {
  cod: "#f59e0b",
  online: "#22c55e",
  wallet: "#8b5cf6",
}

interface OverviewStats {
  totalRevenue: number
  netSales: number
  grossProfitEstimate: number
  totalOrders: number
  pendingOrders: number
  confirmedOrders: number
  deliveredOrders: number
  cancelledOrders: number
  averageOrderValue: number
  totalProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  activeCoupons: number
  newCustomers: number
  guestOrders: number
  onlinePaymentTotal: number
  cashOnDeliveryTotal: number
}

async function fetchOverview(): Promise<OverviewStats> {
  const { data } = await apiClient.get("/admin/analytics/overview")
  return data.data
}

function StatCard({ title, value, icon: Icon, trend, loading }: {
  title: string
  value: string
  icon: React.ElementType
  trend?: { value: number; positive: boolean }
  loading?: boolean
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-20" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <span className={`flex items-center text-xs font-medium ${trend.positive ? "text-green-600" : "text-red-600"}`}>
              {trend.positive ? <ArrowUpRight className="mr-0.5 h-3 w-3" /> : <ArrowDownRight className="mr-0.5 h-3 w-3" />}
              {trend.value}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-sm">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          Revenue: E£ {payload[0].value.toLocaleString()}
        </p>
        {payload[1] && (
          <p className="text-sm text-muted-foreground">
            Orders: {payload[1].value}
          </p>
        )}
      </div>
    )
  }
  return null
}

async function fetchSales(period: string): Promise<SalesDataPoint[]> {
  const { data } = await apiClient.get(`/admin/analytics/sales?period=${period}`)
  return data.data
}

async function fetchOrdersByStatus(): Promise<OrdersByStatusItem[]> {
  const { data } = await apiClient.get("/admin/analytics/orders-by-status")
  return data.data.items
}

async function fetchRevenueByPayment(): Promise<RevenueByPaymentItem[]> {
  const { data } = await apiClient.get("/admin/analytics/revenue-by-payment")
  return data.data
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState<"daily" | "monthly">("daily")

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: fetchOverview,
  })

  const { data: salesData = [] } = useQuery({
    queryKey: ["admin-sales", period],
    queryFn: () => fetchSales(period),
    enabled: !!data,
  })

  const { data: ordersByStatus = [] } = useQuery({
    queryKey: ["admin-orders-by-status"],
    queryFn: fetchOrdersByStatus,
    enabled: !!data,
  })

  const { data: revenueByPayment = [] } = useQuery({
    queryKey: ["admin-revenue-by-payment"],
    queryFn: fetchRevenueByPayment,
    enabled: !!data,
  })

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h3 className="mt-4 text-lg font-semibold">Failed to load dashboard</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "An unexpected error occurred"}
        </p>
        <Button onClick={() => refetch()} className="mt-4" variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">Your store performance at a glance.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard title="Total Revenue" value={data ? `E£ ${data.totalRevenue.toLocaleString()}` : ""} icon={DollarSign} loading={isLoading} />
        <StatCard title="Net Sales" value={data ? `E£ ${data.netSales.toLocaleString()}` : ""} icon={TrendingUp} loading={isLoading} />
        <StatCard title="Total Orders" value={data ? data.totalOrders.toLocaleString() : ""} icon={ShoppingCart} loading={isLoading} />
        <StatCard title="Pending Orders" value={data ? data.pendingOrders.toLocaleString() : ""} icon={ShoppingCart} loading={isLoading} />
        <StatCard title="Delivered Orders" value={data ? data.deliveredOrders.toLocaleString() : ""} icon={Package} loading={isLoading} />
        <StatCard title="Cancelled Orders" value={data ? data.cancelledOrders.toLocaleString() : ""} icon={Package} loading={isLoading} />
        <StatCard title="Avg. Order Value" value={data ? `E£ ${data.averageOrderValue.toLocaleString()}` : ""} icon={Wallet} loading={isLoading} />
        <StatCard title="Total Products" value={data ? data.totalProducts.toLocaleString() : ""} icon={Package} loading={isLoading} />
        <StatCard title="Active Coupons" value={data ? data.activeCoupons.toLocaleString() : ""} icon={AlertTriangle} loading={isLoading} />
        <StatCard title="Low Stock Items" value={data ? data.lowStockProducts.toLocaleString() : ""} icon={AlertTriangle} loading={isLoading} />
        <StatCard title="Out of Stock" value={data ? data.outOfStockProducts.toLocaleString() : ""} icon={AlertTriangle} loading={isLoading} />
        <StatCard title="New Customers" value={data ? data.newCustomers.toLocaleString() : ""} icon={AlertTriangle} loading={isLoading} />
        <StatCard title="Confirmed Orders" value={data ? data.confirmedOrders.toLocaleString() : ""} icon={Package} loading={isLoading} />
      </div>

      <Tabs defaultValue="daily" onValueChange={(value) => { if (value === "daily" || value === "monthly") setPeriod(value) }}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={period} className="space-y-6 mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sales Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesData.map(d => ({ ...d, date: d.period }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="sales" stroke="#22c55e" strokeWidth={2} name="Revenue" />
                      <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="Orders" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Orders by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={ordersByStatus.map(item => ({ name: item.status, value: item.count }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {ordersByStatus.map((entry) => (
                          <Cell key={entry.status} fill={Object.entries(COLORS).find(([status]) => status === entry.status)?.[1] || "#64748b"} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Revenue by Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByPayment.map(item => ({ name: item.paymentMethod, value: item.revenue }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {revenueByPayment.map((entry) => (
                          <Cell key={entry.paymentMethod} fill={Object.entries(PAYMENT_COLORS).find(([method]) => method === entry.paymentMethod)?.[1] || "#64748b"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
