"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuthStore } from "@/store/auth-store"
import { apiClient } from "@/lib/api-client"
import type { Address } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  Home,
  Briefcase,
} from "lucide-react"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

const labelIcons: Record<string, typeof Home> = {
  home: Home,
  work: Briefcase,
  other: MapPin,
}

const governorates = [
  "Cairo",
  "Alexandria",
  "Giza",
  "Qalyubia",
  "Port Said",
  "Suez",
  "Dakahlia",
  "Sharqia",
  "Beheira",
  "Minya",
  "Asyut",
  "Sohag",
  "Beni Suef",
  "Fayoum",
  "Monufia",
  "Gharbia",
  "Kafr El Sheikh",
  "Damietta",
  "Ismailia",
  "South Sinai",
  "North Sinai",
  "Red Sea",
  "New Valley",
  "Matrouh",
  "Luxor",
  "Aswan",
  "Qena",
]

const labelOptions = [
  { value: "home", label: "Home" },
  { value: "work", label: "Work" },
  { value: "other", label: "Other" },
]

interface AddressFormData {
  label: string
  fullName: string
  phone: string
  street: string
  building: string
  apartment: string
  district: string
  city: string
  governorate: string
  landmark: string
  deliveryNotes: string
  isDefault: boolean
}

const emptyForm: AddressFormData = {
  label: "home",
  fullName: "",
  phone: "",
  street: "",
  building: "",
  apartment: "",
  district: "",
  city: "",
  governorate: "",
  landmark: "",
  deliveryNotes: "",
  isDefault: false,
}

export default function AddressesPage() {
  const user = useAuthStore((s) => s.user)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AddressFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadAddresses = useCallback(() => {
    fetchProfile().then(() => {
      const currentUser = useAuthStore.getState().user
      setAddresses(currentUser?.addresses || [])
    }).catch(() => {
      toast.error("Failed to load addresses")
    }).finally(() => {
      setLoading(false)
    })
  }, [fetchProfile])

  useEffect(() => {
    loadAddresses()
  }, [loadAddresses])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, fullName: user?.fullName || "", phone: user?.phone || "" })
    setDialogOpen(true)
  }

  const openEdit = (address: Address) => {
    setEditingId(address.id)
    setForm({
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      street: address.street,
      building: address.building || "",
      apartment: address.apartment || "",
      district: address.district,
      city: address.city,
      governorate: address.governorate,
      landmark: address.landmark || "",
      deliveryNotes: address.deliveryNotes || "",
      isDefault: address.isDefault,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingId) {
        await apiClient.put(`/addresses/${editingId}`, form)
        toast.success("Address updated")
      } else {
        await apiClient.post("/addresses", form)
        toast.success("Address added")
      }
      setDialogOpen(false)
      setSaving(false)
      await loadAddresses()
    } catch {
      toast.error("Failed to save address")
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/addresses/${id}`)
      toast.success("Address deleted")
      await loadAddresses()
    } catch {
      toast.error("Failed to delete address")
    }
  }

  const setDefault = async (id: string) => {
    try {
      await apiClient.patch(`/addresses/${id}/default`)
      toast.success("Default address updated")
      await loadAddresses()
    } catch {
      toast.error("Failed to set default address")
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  const LabelIcon = (label: string) => {
    const Icon = labelIcons[label] || MapPin
    return <Icon className="h-4 w-4" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Saved Addresses</h2>
          <p className="text-sm text-muted-foreground">
            {addresses.length > 0
              ? `${addresses.length} address${addresses.length !== 1 ? "es" : ""} saved`
              : "No addresses saved yet"}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">No addresses saved</p>
              <p className="text-sm text-muted-foreground">
                Add a delivery address to speed up checkout.
              </p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Address
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <Card key={address.id} className={address.isDefault ? "ring-2 ring-primary" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {LabelIcon(address.label)}
                    <span className="text-sm font-medium capitalize">{address.label}</span>
                    {address.isDefault && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <Star className="h-3 w-3 fill-primary" />
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(address)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    {!address.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(address.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    )}
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="space-y-1 text-sm">
                  <p className="font-medium">{address.fullName}</p>
                  <p className="text-muted-foreground">{address.phone}</p>
                  <p className="text-muted-foreground">
                    {address.street}
                    {address.building && `, ${address.building}`}
                    {address.apartment && `, Apt ${address.apartment}`}
                  </p>
                  <p className="text-muted-foreground">
                    {address.district}, {address.city}
                  </p>
                  <p className="text-muted-foreground">{address.governorate}</p>
                  {address.landmark && (
                    <p className="text-muted-foreground">Landmark: {address.landmark}</p>
                  )}
                </div>

                {!address.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setDefault(address.id)}
                  >
                    <Star className="mr-2 h-3.5 w-3.5" />
                    Set as Default
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Address" : "Add Address"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update your delivery address." : "Add a new delivery address."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="label">Label</Label>
              <Select
                value={form.label}
                onValueChange={(v) => setForm({ ...form, label: v })}
              >
                <SelectTrigger id="label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {labelOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="street">Street</Label>
              <Input
                id="street"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="building">Building</Label>
                <Input
                  id="building"
                  value={form.building}
                  onChange={(e) => setForm({ ...form, building: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apartment">Apartment</Label>
                <Input
                  id="apartment"
                  value={form.apartment}
                  onChange={(e) => setForm({ ...form, apartment: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="district">District</Label>
              <Input
                id="district"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="governorate">Governorate</Label>
              <Select
                value={form.governorate}
                onValueChange={(v) => setForm({ ...form, governorate: v })}
              >
                <SelectTrigger id="governorate">
                  <SelectValue placeholder="Select governorate" />
                </SelectTrigger>
                <SelectContent>
                  {governorates.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="landmark">Landmark (optional)</Label>
              <Input
                id="landmark"
                value={form.landmark}
                onChange={(e) => setForm({ ...form, landmark: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deliveryNotes">Delivery Notes (optional)</Label>
              <Textarea
                id="deliveryNotes"
                value={form.deliveryNotes}
                onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isDefault" className="text-sm font-normal">
                Set as default address
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
