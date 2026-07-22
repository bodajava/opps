"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import NextImage from "next/image"
import { apiClient, mapApiError } from "@/lib/api-client"
import { getAdminInventory } from "@/lib/api/admin"
import type { InventoryItem } from "@/lib/api/admin-contracts"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Search, AlertTriangle, RefreshCcw, Warehouse, AlertCircle, Package } from "lucide-react"

async function adjustStock(id: string, quantity: number, note: string) {
  const { data } = await apiClient.post(`/admin/inventory/adjust`, { productId: id, quantity, reason: note })
  return data
}

export default function AdminInventoryPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [adjustQty, setAdjustQty] = useState(0)
  const [adjustNote, setAdjustNote] = useState("")
  const [movementOpen, setMovementOpen] = useState(false)
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null)

  const { data: invData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-inventory", search],
    queryFn: getAdminInventory,
  })

  const adjustMutation = useMutation({
    mutationFn: ({ id, quantity, note }: { id: string; quantity: number; note: string }) =>
      adjustStock(id, quantity, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] })
      toast.success("Stock adjusted")
      setAdjustOpen(false)
      setAdjustQty(0)
      setAdjustNote("")
    },
    onError: (err) => toast.error(mapApiError(err).message),
  })

  const inventoryList = invData?.items ?? []

  const filtered = inventoryList.filter(
    (i) => i.productName.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())
  )

  const columns: Column<InventoryItem>[] = [
    {
      key: "product",
      header: "Product",
      render: (i) => (
        <div className="flex items-center gap-3">
          {i.productImage ? (
            <NextImage src={i.productImage} alt={i.productName} width={40} height={40} className="h-10 w-10 rounded-md object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <span className="font-medium">{i.productName}</span>
        </div>
      ),
    },
    { key: "sku", header: "SKU", render: (i) => <span className="text-muted-foreground">{i.sku}</span>, hideOnMobile: true },
    {
      key: "stock",
      header: "Stock",
      sortable: true,
      render: (i) => (
        <div className="flex items-center gap-2">
          <span className={`font-bold ${i.currentStock === 0 ? "text-destructive" : i.currentStock <= i.lowStockThreshold ? "text-yellow-600" : ""}`}>
            {i.currentStock}
          </span>
          {i.currentStock > 0 && i.currentStock <= i.lowStockThreshold && (
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          )}
        </div>
      ),
    },
    { key: "threshold", header: "Low Threshold", render: (i) => i.lowStockThreshold, hideOnMobile: true },
    {
      key: "status",
      header: "Status",
      render: (i) => {
        if (i.currentStock === 0) return <Badge variant="destructive">Out of Stock</Badge>
        if (i.currentStock <= i.lowStockThreshold) return <Badge variant="secondary">Low Stock</Badge>
        return <Badge>In Stock</Badge>
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (i) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedItem(i); setAdjustOpen(true) }}
          >
            Adjust Stock
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setMovementItem(i); setMovementOpen(true) }}
          >
            History
          </Button>
        </div>
      ),
      className: "text-right",
    },
  ]

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Manage product stock levels.</p>
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
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="text-sm text-muted-foreground">Manage product stock levels.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by product or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(i) => i.productId}
        loading={isLoading}
        emptyMessage="No inventory items found."
        emptyIcon={<Warehouse className="h-12 w-12 text-muted-foreground" />}
      />

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {selectedItem?.productName} - Current stock: <strong>{selectedItem?.currentStock}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="qty">Quantity Change</Label>
              <Input
                id="qty"
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
                placeholder="Positive to add, negative to remove"
              />
              <p className="text-xs text-muted-foreground mt-1">Use positive numbers for additions, negative for removals.</p>
            </div>
            <div>
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Reason for adjustment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={adjustQty === 0 || adjustMutation.isPending}
              onClick={() => selectedItem && adjustMutation.mutate({ id: selectedItem.productId, quantity: adjustQty, note: adjustNote })}
            >
              Save Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Movement History</DialogTitle>
            <DialogDescription>{movementItem?.productName}</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-3 overflow-auto">
            <p className="text-sm text-muted-foreground text-center py-4">
              Movement history is available from the inventory movements endpoint.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
