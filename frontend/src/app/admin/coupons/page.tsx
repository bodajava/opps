"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getCoupons, createCoupon, updateCoupon, deleteCoupon, getCouponUsage, type CouponPayload } from "@/lib/api/coupons"
import { apiClient, mapApiError } from "@/lib/api-client"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Plus, Search, Edit, Trash2, AlertTriangle, RefreshCcw, TicketPercent, Eye } from "lucide-react"
import { formatPrice, formatDate } from "@/lib/utils"
import type { Coupon, CouponUsage } from "@/lib/types"

type CouponForm = {
  code: string;
  description: string;
  type: "percentage" | "fixed";
  value: string;
  maxDiscount: string;
  minOrderValue: string;
  startDate: string;
  expirationDate: string;
  usageLimit: string;
  perCustomerLimit: string;
  applicableProducts: string;
  applicableCategories: string;
  isFirstOrderOnly: boolean;
  audience: "all" | "new_customers" | "returning" | "high_value" | "inactive" | "specific";
  minOrders: string;
  minSpent: string;
  inactiveDays: string;
  customerEmails: string;
}

const defaultForm: CouponForm = {
  code: "",
  description: "",
  type: "percentage",
  value: "",
  maxDiscount: "",
  minOrderValue: "",
  startDate: "",
  expirationDate: "",
  usageLimit: "",
  perCustomerLimit: "1",
  applicableProducts: "",
  applicableCategories: "",
  isFirstOrderOnly: false,
  audience: "all",
  minOrders: "",
  minSpent: "",
  inactiveDays: "",
  customerEmails: "",
}

function CouponFormFields({ form, onChange }: { form: CouponForm; onChange: (f: CouponForm) => void }) {
  const set = (key: keyof CouponForm, value: DynamicValue) => onChange({ ...form, [key]: value })

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Info</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input id="code" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="SUMMER20" />
          </div>
          <div>
            <Label htmlFor="type">Type *</Label>
            <Select value={form.type} onValueChange={(v: "percentage" | "fixed") => set("type", v)}>
              <SelectTrigger id="type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount (E£)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional description" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="value">Value *</Label>
            <Input id="value" type="number" value={form.value} onChange={(e) => set("value", e.target.value)} min={0} placeholder={form.type === "percentage" ? "20" : "50"} />
          </div>
          {form.type === "percentage" && (
            <div>
              <Label htmlFor="maxDiscount">Max Discount Amount</Label>
              <Input id="maxDiscount" type="number" value={form.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} min={0} placeholder="Unlimited" />
            </div>
          )}
          {form.type === "fixed" && <div />}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Limits</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="minOrderValue">Min Order Value</Label>
            <Input id="minOrderValue" type="number" value={form.minOrderValue} onChange={(e) => set("minOrderValue", e.target.value)} min={0} placeholder="No minimum" />
          </div>
          <div>
            <Label htmlFor="usageLimit">Total Usage Limit</Label>
            <Input id="usageLimit" type="number" value={form.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} min={1} placeholder="Unlimited" />
          </div>
          <div>
            <Label htmlFor="perCustomerLimit">Per Customer Limit</Label>
            <Input id="perCustomerLimit" type="number" value={form.perCustomerLimit} onChange={(e) => set("perCustomerLimit", e.target.value)} min={1} placeholder="1" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Schedule</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Start Date *</Label>
            <Input id="startDate" type="datetime-local" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="expirationDate">Expiration Date *</Label>
            <Input id="expirationDate" type="datetime-local" value={form.expirationDate} onChange={(e) => set("expirationDate", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Applicability</h3>
        <div className="flex items-center gap-2">
          <Switch id="isFirstOrderOnly" checked={form.isFirstOrderOnly} onCheckedChange={(v) => set("isFirstOrderOnly", v)} />
          <Label htmlFor="isFirstOrderOnly">First order only</Label>
        </div>
        <div>
          <Label htmlFor="applicableProducts">Applicable Product IDs (comma-separated)</Label>
          <Input id="applicableProducts" value={form.applicableProducts} onChange={(e) => set("applicableProducts", e.target.value)} placeholder="e.g. id1, id2" />
        </div>
        <div>
          <Label htmlFor="applicableCategories">Applicable Category IDs (comma-separated)</Label>
          <Input id="applicableCategories" value={form.applicableCategories} onChange={(e) => set("applicableCategories", e.target.value)} placeholder="e.g. id1, id2" />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Audience</h3>
        <div>
          <Label htmlFor="audience">Target Audience</Label>
          <Select value={form.audience} onValueChange={(v: CouponForm["audience"]) => set("audience", v)}>
            <SelectTrigger id="audience"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              <SelectItem value="new_customers">New Customers (first order)</SelectItem>
              <SelectItem value="returning">Returning Customers</SelectItem>
              <SelectItem value="high_value">High Value Customers</SelectItem>
              <SelectItem value="inactive">Inactive Customers</SelectItem>
              <SelectItem value="specific">Specific Customers (email list)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.audience === "high_value" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minOrders">Minimum Orders</Label>
              <Input id="minOrders" type="number" value={form.minOrders} onChange={(e) => set("minOrders", e.target.value)} min={1} />
            </div>
            <div>
              <Label htmlFor="minSpent">Minimum Total Spent</Label>
              <Input id="minSpent" type="number" value={form.minSpent} onChange={(e) => set("minSpent", e.target.value)} min={0} />
            </div>
          </div>
        )}
        {form.audience === "inactive" && (
          <div>
            <Label htmlFor="inactiveDays">Days Since Last Order</Label>
            <Input id="inactiveDays" type="number" value={form.inactiveDays} onChange={(e) => set("inactiveDays", e.target.value)} min={1} placeholder="e.g. 30" />
          </div>
        )}
        {form.audience === "specific" && (
          <div>
            <Label htmlFor="customerEmails">Customer Emails (comma-separated)</Label>
            <Textarea id="customerEmails" value={form.customerEmails} onChange={(e) => set("customerEmails", e.target.value)} placeholder="user1@email.com, user2@email.com" />
          </div>
        )}
      </div>
    </div>
  )
}

function formToDto(form: CouponForm): CouponPayload {
  const dto: CouponPayload = {
    code: form.code,
    type: form.type,
    value: Number(form.value),
    description: form.description || undefined,
    startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
    expirationDate: form.expirationDate ? new Date(form.expirationDate).toISOString() : undefined,
    isFirstOrderOnly: form.isFirstOrderOnly,
    audience: form.audience,
  }
  if (form.maxDiscount) dto.maxDiscount = Number(form.maxDiscount)
  if (form.minOrderValue) dto.minOrderValue = Number(form.minOrderValue)
  if (form.usageLimit) dto.usageLimit = Number(form.usageLimit)
  if (form.perCustomerLimit) dto.perCustomerLimit = Number(form.perCustomerLimit)
  if (form.applicableProducts) dto.applicableProducts = form.applicableProducts.split(",").map((s) => s.trim()).filter(Boolean)
  if (form.applicableCategories) dto.applicableCategories = form.applicableCategories.split(",").map((s) => s.trim()).filter(Boolean)
  if (form.minOrders) dto.minOrders = Number(form.minOrders)
  if (form.minSpent) dto.minSpent = Number(form.minSpent)
  if (form.inactiveDays) dto.inactiveDays = Number(form.inactiveDays)
  if (form.customerEmails) dto.customerEmails = form.customerEmails.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  return dto
}

function couponToForm(c: Coupon): CouponForm {
  return {
    code: c.code,
    description: c.description || "",
    type: c.type,
    value: String(c.value),
    maxDiscount: c.maxDiscount ? String(c.maxDiscount) : "",
    minOrderValue: c.minOrderValue ? String(c.minOrderValue) : "",
    startDate: c.startDate ? c.startDate.slice(0, 16) : "",
    expirationDate: c.expirationDate ? c.expirationDate.slice(0, 16) : "",
    usageLimit: c.usageLimit ? String(c.usageLimit) : "",
    perCustomerLimit: String(c.perCustomerLimit || 1),
    applicableProducts: (c.applicableProducts || []).join(", "),
    applicableCategories: (c.applicableCategories || []).join(", "),
    isFirstOrderOnly: c.isFirstOrderOnly || false,
    audience: c.audience || "all",
    minOrders: c.minOrders ? String(c.minOrders) : "",
    minSpent: c.minSpent ? String(c.minSpent) : "",
    inactiveDays: c.inactiveDays ? String(c.inactiveDays) : "",
    customerEmails: (c.customerEmails || []).join(", "),
  }
}

export default function AdminCouponsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [usageOpen, setUsageOpen] = useState(false)
  const [usageCoupon, setUsageCoupon] = useState<Coupon | null>(null)
  const [form, setForm] = useState<CouponForm>(defaultForm)

  const { data: couponsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-coupons", page],
    queryFn: () => getCoupons({ page, limit: 20, search: search || undefined }),
  })

  const coupons = couponsData?.data?.items ?? []
  const pagination = couponsData?.data?.pagination

  const { data: usageData } = useQuery({
    queryKey: ["coupon-usage", usageCoupon?.id],
    queryFn: () => getCouponUsage(usageCoupon!.id),
    enabled: !!usageCoupon,
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await apiClient.patch(`/admin/coupons/${id}`, { isActive })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] })
      toast.success("Coupon updated")
    },
    onError: (err) => toast.error(mapApiError(err).message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] })
      toast.success("Coupon deleted")
    },
    onError: (err) => toast.error(mapApiError(err).message),
  })

  const createMutation = useMutation({
    mutationFn: (dto: CouponPayload) => createCoupon(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] })
      toast.success("Coupon created")
      setCreateOpen(false)
      setForm(defaultForm)
    },
    onError: (err) => toast.error(mapApiError(err).message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CouponPayload }) =>
      updateCoupon(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] })
      toast.success("Coupon updated")
      setEditOpen(false)
      setEditId(null)
      setForm(defaultForm)
    },
    onError: (err) => toast.error(mapApiError(err).message),
  })

  function openEdit(coupon: Coupon) {
    setEditId(coupon.id)
    setForm(couponToForm(coupon))
    setEditOpen(true)
  }

  function openUsage(coupon: Coupon) {
    setUsageCoupon(coupon)
    setUsageOpen(true)
  }

  const columns: Column<Coupon>[] = [
    {
      key: "code",
      header: "Code",
      render: (c) => <code className="rounded bg-muted px-2 py-0.5 text-sm font-medium">{c.code}</code>,
    },
    {
      key: "type",
      header: "Type",
      render: (c) => <Badge variant="secondary">{c.type === "percentage" ? "%" : "E£"}</Badge>,
    },
    {
      key: "value",
      header: "Value",
      sortable: true,
      render: (c) => (c.type === "percentage" ? `${c.value}%` : formatPrice(c.value)),
    },
    {
      key: "minOrderValue",
      header: "Min Order",
      render: (c) => (c.minOrderValue ? formatPrice(c.minOrderValue) : "-"),
      hideOnMobile: true,
    },
    {
      key: "audience",
      header: "Audience",
      render: (c) => {
        const labels: Record<string, string> = {
          all: "All",
          new_customers: "New",
          returning: "Returning",
          high_value: "High Value",
          inactive: "Inactive",
          specific: "Specific",
        }
        return <Badge variant="outline">{labels[c.audience] || c.audience}</Badge>
      },
    },
    {
      key: "usage",
      header: "Used/Total",
      render: (c) => `${c.usedCount}${c.usageLimit ? ` / ${c.usageLimit}` : " / ∞"}`,
    },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <Switch
          checked={c.isActive}
          onCheckedChange={(checked) =>
            toggleMutation.mutate({ id: c.id, isActive: checked })
          }
        />
      ),
    },
    {
      key: "dates",
      header: "Dates",
      render: (c) => (
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">Start: {formatDate(c.startDate)}</p>
          <p className="text-xs text-muted-foreground">Expires: {formatDate(c.expirationDate)}</p>
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: "actions",
      header: "Actions",
      render: (c) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openUsage(c)} title="View usage">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => deleteMutation.mutate(c.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: "text-right",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coupons</h1>
          <p className="text-sm text-muted-foreground">Create and manage discount coupons with audience targeting.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Coupon</DialogTitle>
              <DialogDescription>Set up a new coupon with audience targeting.</DialogDescription>
            </DialogHeader>
            <CouponFormFields form={form} onChange={setForm} />
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(defaultForm) }}>
                Cancel
              </Button>
              <Button onClick={() => createMutation.mutate(formToDto(form))} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Coupon"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by code..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-8"
        />
      </div>

      <DataTable
        columns={columns}
        data={coupons}
        keyExtractor={(c) => c.id}
        loading={isLoading}
        emptyMessage="No coupons found."
        emptyIcon={<TicketPercent className="h-12 w-12 text-muted-foreground" />}
      />

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm text-muted-foreground">{mapApiError(error).message}</p>
          <Button variant="outline" className="mt-2" onClick={() => refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setEditId(null); setForm(defaultForm) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Coupon</DialogTitle>
            <DialogDescription>Update coupon settings and audience targeting.</DialogDescription>
          </DialogHeader>
          <CouponFormFields form={form} onChange={setForm} />
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => { setEditOpen(false); setEditId(null); setForm(defaultForm) }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => editId && updateMutation.mutate({ id: editId, dto: formToDto(form) })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage Dialog */}
      <Dialog open={usageOpen} onOpenChange={(open) => { setUsageOpen(open); if (!open) setUsageCoupon(null) }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Coupon Usage</DialogTitle>
            <DialogDescription>Usage history for <strong>{usageCoupon?.code}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(usageData?.data?.items ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No usage records yet.</p>
            )}
            {(usageData?.data?.items ?? []).map((record: CouponUsage) => (
              <div key={record.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">{record.email || "Guest"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(record.createdAt)}</p>
                </div>
                <span className="font-medium">{formatPrice(record.discountAmount)}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
