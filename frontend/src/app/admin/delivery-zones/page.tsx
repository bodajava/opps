"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient, mapApiError } from "@/lib/api-client"
import { parseArr } from "@/lib/api-response"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Plus, Edit, Trash2, AlertTriangle, RefreshCcw, Truck } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import type { DeliveryZone } from "@/lib/types"

async function fetchZones() {
  const { data } = await apiClient.get("/admin/delivery-zones")
  return parseArr<DeliveryZone>(data?.data, "admin/delivery-zones")
}

async function toggleZone(id: string, isActive: boolean) {
  const { data } = await apiClient.patch(`/admin/delivery-zones/${id}`, { isActive })
  return data
}

async function deleteZone(id: string) {
  const { data } = await apiClient.delete(`/admin/delivery-zones/${id}`)
  return data
}

export default function AdminDeliveryZonesPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

  const { data: zones, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-delivery-zones"],
    queryFn: fetchZones,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleZone(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-zones"] })
      toast.success("Zone updated")
    },
    onError: (err) => toast.error(mapApiError(err).message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteZone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-zones"] })
      toast.success("Zone deleted")
    },
    onError: (err) => toast.error(mapApiError(err).message),
  })

  const zoneList = zones ?? []

  const columns: Column<DeliveryZone>[] = [
    { key: "governorate", header: "Governorate", sortable: true, render: (z) => <span className="font-medium">{z.governorate}</span> },
    { key: "cities", header: "Cities", render: (z) => z.cities.length, hideOnMobile: true },
    { key: "deliveryFee", header: "Fee", sortable: true, render: (z) => formatPrice(z.deliveryFee) },
    { key: "freeDeliveryThreshold", header: "Free Threshold", sortable: true, render: (z) => z.freeDeliveryThreshold ? formatPrice(z.freeDeliveryThreshold) : "No minimum" },
    {
      key: "codAvailable",
      header: "COD",
      render: (z) => <Badge variant="secondary">{z.codAvailable ? "Yes" : "No"}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (z) => (
        <Switch
          checked={z.isActive}
          onCheckedChange={(checked) => toggleMutation.mutate({ id: z.id, isActive: checked })}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (z) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(z.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: "text-right",
    },
  ]

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Delivery Zones</h1>
            <p className="text-sm text-muted-foreground">Configure delivery areas and fees.</p>
          </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Delivery Zones</h1>
          <p className="text-sm text-muted-foreground">Configure delivery areas and fees.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Zone</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Delivery Zone</DialogTitle>
              <DialogDescription>Add a new delivery zone.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Governorate Name</Label>
                <Input id="name" placeholder="Cairo" />
              </div>
              <div>
                <Label htmlFor="fee">Delivery Fee (E£)</Label>
                <Input id="fee" type="number" placeholder="40" />
              </div>
              <div>
                <Label htmlFor="freeThreshold">Free Delivery Threshold</Label>
                <Input id="freeThreshold" type="number" placeholder="200" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button>Create Zone</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={zoneList}
        keyExtractor={(z) => z.id}
        loading={isLoading}
        emptyMessage="No delivery zones configured."
        emptyIcon={<Truck className="h-12 w-12 text-muted-foreground" />}
      />
    </div>
  )
}
