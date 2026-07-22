"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, type PieLabelRenderProps, type TooltipValueType } from "recharts"
import { Download, TrendingUp, Package, Users, BarChart3, AlertTriangle, RefreshCcw } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { parseTyped } from "@/lib/api-response"

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

interface OverviewData {
  totalRevenue: number;
  netSales: number;
  grossProfitEstimate: number;
  totalOrders: number;
  averageOrderValue: number;
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  onlinePaymentTotal: number;
  cashOnDeliveryTotal: number;
}

interface SalesDataPoint {
  period: string;
  sales: number;
  orders: number;
  discounts: number;
}

interface ProductPerformance {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
  orderCount: number;
}

interface CustomerReport {
  newCustomers: number;
  returningCustomers: number;
  guestOrders: number;
  totalUnique: number;
}

interface ProfitabilityReport {
  grossSales: number;
  discounts: number;
  netRevenue: number;
  estimatedCOGS: number;
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: number;
  operatingProfit: number;
  netProfitMarginPercent: number;
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  )
}

function OverviewCards({ data }: { data: OverviewData }) {
  const cards = [
    { title: "Total Revenue", value: formatPrice(data.totalRevenue), subtitle: "All time" },
    { title: "Net Sales", value: formatPrice(data.netSales), subtitle: "After discounts" },
    { title: "Average Order", value: formatPrice(data.averageOrderValue), subtitle: "Per order" },
    { title: "Total Orders", value: data.totalOrders.toLocaleString(), subtitle: "All statuses" },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardDescription>{card.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SalesChart({ data }: { data: SalesDataPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sales Over Time</CardTitle>
        <CardDescription>Monthly sales and order count</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} name="Sales" />
              <Bar dataKey="discounts" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Discounts" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function PaymentPie({ online, cod }: { online: number; cod: number }) {
  const pieLabel = (entry: PieLabelRenderProps) => `${entry.name ?? ""} ${(Number(entry.percent) * 100).toFixed(0)}%`
  const tooltipFormat = (value: TooltipValueType | undefined) => formatPrice(Number(Array.isArray(value) ? value[0] : value ?? 0))

  const data = [
    { name: "Online Payment", value: online },
    { name: "Cash on Delivery", value: cod },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment Methods</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={pieLabel}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={tooltipFormat} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function ProductTable({ data }: { data: ProductPerformance[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Best Selling Products</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 font-medium text-right">Sold</th>
                <th className="pb-2 font-medium text-right">Revenue</th>
                <th className="pb-2 font-medium text-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.productId} className="border-b last:border-0">
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="py-2 text-right">{p.quantitySold}</td>
                  <td className="py-2 text-right">{formatPrice(p.revenue)}</td>
                  <td className="py-2 text-right">{p.orderCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function CustomersCard({ data }: { data: CustomerReport }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>New Customers</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-blue-600">{data.newCustomers}</p>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Returning Customers</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-600">{data.returningCustomers}</p>
          <p className="text-xs text-muted-foreground">More than 1 order</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Guest Orders</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-orange-600">{data.guestOrders}</p>
          <p className="text-xs text-muted-foreground">No account required</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Unique</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.totalUnique}</p>
          <p className="text-xs text-muted-foreground">Unique customers</p>
        </CardContent>
      </Card>
    </div>
  )
}

function ProfitabilityCard({ data }: { data: ProfitabilityReport }) {
  const items = [
    { label: "Gross Sales", value: data.grossSales, color: "text-blue-600" },
    { label: "Discounts", value: -data.discounts, color: "text-red-600" },
    { label: "Net Revenue", value: data.netRevenue, color: "text-green-600" },
    { label: "Est. COGS", value: -data.estimatedCOGS, color: "text-orange-600" },
    { label: "Gross Profit", value: data.grossProfit, color: "text-green-700", bold: true },
    { label: "Operating Expenses", value: -data.operatingExpenses, color: "text-red-500" },
    { label: "Operating Profit", value: data.operatingProfit, color: "text-green-800", bold: true },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profit & Loss</CardTitle>
        <CardDescription>Gross margin: {data.grossMarginPercent.toFixed(1)}% | Net margin: {data.netProfitMarginPercent.toFixed(1)}%</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between border-b pb-1 last:border-0">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className={`text-sm font-medium ${item.bold ? "font-bold" : ""} ${item.color}`}>
                {formatPrice(Math.abs(item.value))}
                {item.value < 0 && " (expense)"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))

  const overviewQuery = useQuery({
    queryKey: ["admin-reports-overview"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/analytics/overview")
      return parseTyped<OverviewData>(data.data)
    },
  })

  const salesQuery = useQuery({
    queryKey: ["admin-reports-sales", startDate, endDate],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/analytics/sales", {
        params: { period: "month", startDate, endDate },
      })
      return parseTyped<SalesDataPoint[]>(data.data)
    },
  })

  const productsQuery = useQuery({
    queryKey: ["admin-reports-products", startDate, endDate],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/analytics/product-performance", {
        params: { startDate, endDate },
      })
      return parseTyped<ProductPerformance[]>(data.data)
    },
  })

  const customersQuery = useQuery({
    queryKey: ["admin-reports-customers"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/analytics/customers-new-vs-returning")
      return parseTyped<CustomerReport>(data.data)
    },
  })

  const profitabilityQuery = useQuery({
    queryKey: ["admin-reports-profitability", startDate, endDate],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/financial/profitability", {
        params: { startDate, endDate },
      })
      return parseTyped<ProfitabilityReport>(data.data)
    },
  })

  function exportCSV() {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api"}/admin/orders/export/csv`, "_blank")
  }

  const isLoading = overviewQuery.isLoading || salesQuery.isLoading || productsQuery.isLoading || customersQuery.isLoading || profitabilityQuery.isLoading
  const isError = overviewQuery.isError || salesQuery.isError || productsQuery.isError || customersQuery.isError || profitabilityQuery.isError

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="mt-2 text-sm text-muted-foreground">Failed to load report data.</p>
        <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Store performance analytics and reports.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div>
              <Label htmlFor="startDate" className="text-xs">From</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 w-36" />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-xs">To</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 w-36" />
            </div>
          </div>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <ReportsSkeleton />
      ) : (
        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sales"><TrendingUp className="mr-2 h-4 w-4" /> Sales</TabsTrigger>
            <TabsTrigger value="products"><Package className="mr-2 h-4 w-4" /> Products</TabsTrigger>
            <TabsTrigger value="customers"><Users className="mr-2 h-4 w-4" /> Customers</TabsTrigger>
            <TabsTrigger value="financial"><BarChart3 className="mr-2 h-4 w-4" /> Financial</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-6">
            {overviewQuery.data && <OverviewCards data={overviewQuery.data} />}
            {overviewQuery.data && (
              <PaymentPie online={overviewQuery.data.onlinePaymentTotal} cod={overviewQuery.data.cashOnDeliveryTotal} />
            )}
            {salesQuery.data && salesQuery.data.length > 0 && <SalesChart data={salesQuery.data} />}
            {(!salesQuery.data || salesQuery.data.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">No sales data for the selected period.</p>
            )}
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            {productsQuery.data && productsQuery.data.length > 0 ? (
              <ProductTable data={productsQuery.data} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No product performance data for the selected period.</p>
            )}
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            {customersQuery.data && <CustomersCard data={customersQuery.data} />}
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {profitabilityQuery.data && <ProfitabilityCard data={profitabilityQuery.data} />}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
