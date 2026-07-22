"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient, mapApiError } from "@/lib/api-client"
import { parseArr } from "@/lib/api-response"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Save, AlertTriangle, RefreshCcw, RotateCcw } from "lucide-react"

interface SettingValues {
  storeName: string
  storeLogo: string
  contactEmail: string
  contactPhone: string
  businessHours: string
  currency: string
  currencySymbol: string
  walletInstructions: string
  deliveryNote: string
  maintenanceMode: boolean
  paymentCodEnabled: boolean
  paymentOnlineEnabled: boolean
  paymentWalletEnabled: boolean
}

type SettingKey = keyof SettingValues

const defaultSettings: SettingValues = {
  storeName: "",
  storeLogo: "",
  contactEmail: "",
  contactPhone: "",
  businessHours: "",
  currency: "EGP",
  currencySymbol: "E£",
  walletInstructions: "",
  deliveryNote: "",
  maintenanceMode: false,
  paymentCodEnabled: true,
  paymentOnlineEnabled: false,
  paymentWalletEnabled: false,
}

const settingKeyToApi: Record<SettingKey, { key: string; group: string }> = {
  storeName: { key: "store_name", group: "store" },
  storeLogo: { key: "store_logo", group: "store" },
  contactEmail: { key: "contact_email", group: "store" },
  contactPhone: { key: "contact_phone", group: "store" },
  businessHours: { key: "business_hours", group: "store" },
  currency: { key: "currency", group: "currency" },
  currencySymbol: { key: "currency_symbol", group: "currency" },
  walletInstructions: { key: "wallet_instructions", group: "wallet" },
  deliveryNote: { key: "delivery_note", group: "delivery" },
  maintenanceMode: { key: "maintenance_mode", group: "general" },
  paymentCodEnabled: { key: "payment_cod_enabled", group: "payment" },
  paymentOnlineEnabled: { key: "payment_online_enabled", group: "payment" },
  paymentWalletEnabled: { key: "payment_wallet_enabled", group: "payment" },
}

function isSettingKey(value: string): value is SettingKey {
  return value in defaultSettings
}

const settingKeys = Object.keys(defaultSettings).filter(isSettingKey)

async function fetchAllSettings(): Promise<SettingValues> {
  const { data } = await apiClient.get("/admin/settings")
  const raw = parseArr<{ key: string; value: string }>(data?.data, "admin/settings")
  const map = new Map(raw.map((s) => [s.key, s.value]))
  return {
    storeName: map.get("store_name") || "",
    storeLogo: map.get("store_logo") || "",
    contactEmail: map.get("contact_email") || "",
    contactPhone: map.get("contact_phone") || "",
    businessHours: map.get("business_hours") || "",
    currency: map.get("currency") || "EGP",
    currencySymbol: map.get("currency_symbol") || "E£",
    walletInstructions: map.get("wallet_instructions") || "",
    deliveryNote: map.get("delivery_note") || "",
    maintenanceMode: map.get("maintenance_mode") === "true",
    paymentCodEnabled: map.get("payment_cod_enabled") !== "false",
    paymentOnlineEnabled: map.get("payment_online_enabled") === "true",
    paymentWalletEnabled: map.get("payment_wallet_enabled") === "true",
  }
}

async function updateSetting(key: string, value: string, group: string) {
  const { data } = await apiClient.put(`/admin/settings/${key}`, { value, group })
  return data
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient()
  const initDone = useRef(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: fetchAllSettings,
  })

  const [form, setForm] = useState<SettingValues>(defaultSettings)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (data && !initDone.current) {
      initDone.current = true
      setForm({ ...data })
    }
  }, [data])

  function updateField(key: SettingKey, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const mutation = useMutation({
    mutationFn: ({ apiKey, value, group }: { apiKey: string; value: string; group: string }) =>
      updateSetting(apiKey, value, group),
    onSuccess: () => {
      toast.success(`Setting saved`)
    },
    onError: (err) => {
      toast.error(mapApiError(err).message)
    },
  })

  async function handleSave() {
    const changed = settingKeys.filter((sk) => {
      const current = String(form[sk])
      const original = data ? String(data[sk]) : String(defaultSettings[sk])
      return current !== original
    })
    if (changed.length === 0) {
      toast.info("No changes to save")
      return
    }
    const results = await Promise.allSettled(
      changed.map((sk) =>
        mutation.mutateAsync({ apiKey: settingKeyToApi[sk].key, value: String(form[sk]), group: settingKeyToApi[sk].group })
      )
    )
    const allOk = results.every((r) => r.status === "fulfilled")
    if (allOk) {
      setDirty(false)
      initDone.current = false
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] })
    }
  }

  function handleReset() {
    if (data) {
      setForm({ ...data })
      setDirty(false)
    }
  }

  const hasChanges = settingKeys.some((sk) => {
    const current = String(form[sk])
    const original = data ? String(data[sk]) : String(defaultSettings[sk])
    return current !== original
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h3 className="mt-4 text-lg font-semibold">Failed to load settings</h3>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your store configuration.</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <Button variant="outline" size="sm" onClick={handleReset} disabled={mutation.isPending}>
              <RotateCcw className="mr-1 h-3 w-3" /> Reset
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || mutation.isPending}>
            <Save className="mr-1 h-3 w-3" />
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Store Information</CardTitle>
          <CardDescription>Basic store details and contact information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="storeName">Store Name</Label>
              <Input id="storeName" value={form.storeName} onChange={(e) => updateField("storeName", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="storeLogo">Logo URL</Label>
              <Input id="storeLogo" value={form.storeLogo} placeholder="https://..." onChange={(e) => updateField("storeLogo", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input id="contactEmail" type="email" value={form.contactEmail} onChange={(e) => updateField("contactEmail", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input id="contactPhone" value={form.contactPhone} onChange={(e) => updateField("contactPhone", e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="businessHours">Business Hours</Label>
            <Textarea id="businessHours" value={form.businessHours} onChange={(e) => updateField("businessHours", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Currency Settings</CardTitle>
          <CardDescription>Set your store currency and formatting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="currency">Currency Code</Label>
              <Input id="currency" value={form.currency} placeholder="EGP" onChange={(e) => updateField("currency", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="currencySymbol">Currency Symbol</Label>
              <Input id="currencySymbol" value={form.currencySymbol} placeholder="E£" onChange={(e) => updateField("currencySymbol", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Methods</CardTitle>
          <CardDescription>Enable or disable payment methods for checkout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { method: "cod", desc: "Cash on Delivery", checked: form.paymentCodEnabled, onChange: (v: boolean) => updateField("paymentCodEnabled", v) },
            { method: "online", desc: "Online card payment", checked: form.paymentOnlineEnabled, onChange: (v: boolean) => updateField("paymentOnlineEnabled", v) },
            { method: "wallet", desc: "Wallet balance", checked: form.paymentWalletEnabled, onChange: (v: boolean) => updateField("paymentWalletEnabled", v) },
          ].map(({ method, desc, checked, onChange }) => (
            <div key={method} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium capitalize">{method.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch checked={checked} onCheckedChange={onChange} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wallet Payment Instructions</CardTitle>
          <CardDescription>Instructions shown to customers who choose wallet payment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={form.walletInstructions} rows={4} placeholder="Explain how customers can pay via wallet..." onChange={(e) => updateField("walletInstructions", e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery Settings</CardTitle>
          <CardDescription>Default delivery note and policies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="deliveryNote">Delivery Note</Label>
            <Textarea id="deliveryNote" value={form.deliveryNote} rows={3} placeholder="Delivery information for customers..." onChange={(e) => updateField("deliveryNote", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maintenance Mode</CardTitle>
          <CardDescription>When enabled, only admins can view the store.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Maintenance Mode</p>
            <p className="text-xs text-muted-foreground">
              {form.maintenanceMode ? "Your store is currently in maintenance mode" : "Your store is publicly accessible"}
            </p>
          </div>
          <Switch checked={form.maintenanceMode} onCheckedChange={(v) => updateField("maintenanceMode", v)} />
        </CardContent>
      </Card>
    </div>
  )
}
