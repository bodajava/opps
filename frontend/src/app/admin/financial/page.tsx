"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient, mapApiError } from "@/lib/api-client"
import { parseObj, parsePg } from "@/lib/api-response"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { PiggyBank, Target, TrendingUp, AlertTriangle, RefreshCcw, Plus, Trash2 } from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface ExpenseRecord {
  id: string
  category: string
  description: string
  amount: number
  date: string
}

interface FinancialData {
  fixedCosts: number
  variableCostPerUnit: number
  pricePerUnit: number
  breakEvenUnits: number
  breakEvenRevenue: number
  currentRevenue: number
  targetProfit: number
  revenueForTarget: number
  progressPercent: number
  isProfitable: boolean
  expenses: ExpenseRecord[]
}

async function fetchFinancials(): Promise<FinancialData> {
  const { data: beData } = await apiClient.get("/admin/financial/break-even")
  const { data: expensesData } = await apiClient.get("/admin/financial/expenses", { params: { limit: 100 } })
  const be = parseObj<DynamicRecord>(beData?.data, "admin/financial/break-even")
  const expParsed = parsePg<ExpenseRecord>(expensesData?.data, "admin/financial/expenses")

  return {
    fixedCosts: Number(be.totalMonthlyFixedCosts) || 0,
    variableCostPerUnit: Number(be.averageContributionMargin) || 0,
    pricePerUnit: Number(be.averageOrderValue) || 0,
    breakEvenUnits: Number(be.breakEvenOrderCount) || 0,
    breakEvenRevenue: Number(be.breakEvenRevenue) || 0,
    currentRevenue: Number(be.currentRevenue) || 0,
    targetProfit: Number(be.targetProfit) || 0,
    revenueForTarget: Number(be.targetRevenue) || 0,
    progressPercent: Number(be.progressPercent) || 0,
    isProfitable: (Number(be.currentRevenue) || 0) >= (Number(be.breakEvenRevenue) || 0),
    expenses: expParsed.items,
  }
}

async function updateFinancialSetting(key: string, value: number) {
  const { data } = await apiClient.post("/admin/financial/settings", { key, value, type: "fixed" })
  return data
}

export default function AdminFinancialPage() {
  const queryClient = useQueryClient()
  const initDone = useRef(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-financial"],
    queryFn: fetchFinancials,
  })

  const [fixedCosts, setFixedCosts] = useState("")
  const [targetProfit, setTargetProfit] = useState("")
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (data && !initDone.current) {
      initDone.current = true
      setFixedCosts(String(data.fixedCosts))
      setTargetProfit(String(data.targetProfit))
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: number }) => updateFinancialSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-financial"] })
      toast.success("Setting saved")
    },
    onError: (err) => toast.error(mapApiError(err).message),
  })

  const handleSave = () => {
    const promises: Promise<DynamicValue>[] = []
    if (fixedCosts) {
      promises.push(mutation.mutateAsync({ key: "total_monthly_fixed_costs", value: Number(fixedCosts) }))
    }
    if (targetProfit) {
      promises.push(mutation.mutateAsync({ key: "target_profit", value: Number(targetProfit) }))
    }
    Promise.allSettled(promises).then(() => {
      setDirty(false)
      initDone.current = false
      queryClient.invalidateQueries({ queryKey: ["admin-financial"] })
    })
  }

  const canSave = dirty && (fixedCosts !== "" || targetProfit !== "") && !mutation.isPending

  const expenseColumns: Column<ExpenseRecord>[] = [
    { key: "category", header: "Category", render: (e) => <span className="font-medium">{e.category}</span> },
    { key: "description", header: "Description", render: (e) => e.description, hideOnMobile: true },
    { key: "amount", header: "Amount", sortable: true, render: (e) => formatPrice(e.amount) },
    { key: "date", header: "Date", render: (e) => new Date(e.date).toLocaleDateString(), hideOnMobile: true },
    {
      key: "actions",
      header: "",
      render: () => (
        <Button variant="ghost" size="icon" className="text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h3 className="mt-4 text-lg font-semibold">Failed to load financial data</h3>
        <p className="mt-1 text-sm text-muted-foreground">{mapApiError(error).message}</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financial Planning</h1>
        <p className="text-sm text-muted-foreground">Break-even analysis and profitability tracking.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Break-Even Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Break-Even Units (orders)</p>
                  <p className="text-2xl font-bold">{data.breakEvenUnits.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Break-Even Revenue</p>
                  <p className="text-2xl font-bold">{formatPrice(data.breakEvenRevenue)}</p>
                </div>
              </div>
            </div>

            {data.breakEvenRevenue > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress to Break-Even</span>
                  <span className="font-medium">{data.progressPercent.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(data.progressPercent, 100)} />
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className={`h-4 w-4 ${data.isProfitable ? "text-green-600" : "text-red-600"}`} />
              <span className={data.isProfitable ? "text-green-600" : "text-red-600"}>
                {data.isProfitable ? "Profitable" : "Below break-even point"}
              </span>
            </div>

            <Separator />

            <div className="text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Revenue</span>
                <span className="font-medium">{formatPrice(data.currentRevenue)}</span>
              </div>
              {data.targetProfit > 0 && (
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Revenue for Target Profit</span>
                  <span className="font-medium">{formatPrice(data.revenueForTarget)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PiggyBank className="h-4 w-4" />
              Cost Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fixedCosts">Fixed Costs (E£ / month)</Label>
              <Input
                id="fixedCosts"
                type="number"
                value={fixedCosts}
                onChange={(e) => { setFixedCosts(e.target.value); setDirty(true) }}
                placeholder="e.g. 50000"
              />
            </div>
            <div>
              <Label htmlFor="targetProfit">Target Profit (E£)</Label>
              <Input
                id="targetProfit"
                type="number"
                value={targetProfit}
                onChange={(e) => { setTargetProfit(e.target.value); setDirty(true) }}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={!canSave}
            >
              {mutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
            {dirty && <p className="text-xs text-muted-foreground text-center">Unsaved changes</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Expense Records
            </span>
            <Button size="sm">
              <Plus className="mr-1 h-3 w-3" /> Add Expense
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={expenseColumns}
            data={data.expenses}
            keyExtractor={(e) => e.id}
            emptyMessage="No expense records. Add your first expense above."
            loading={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}
