"use client"

import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Image from "next/image"
import {
  archiveAdminProduct,
  createAdminProduct,
  getAdminCategories,
  getAdminProducts,
  updateAdminProduct,
} from "@/lib/api/admin"
import type { AdminProduct } from "@/lib/api/admin-contracts"
import { mapApiError } from "@/lib/api-client"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { AlertTriangle, Archive, CheckCircle2, Edit, Image as ImageIcon, Package, Plus, RefreshCcw, Search, XCircle } from "lucide-react"

interface ProductFormState {
  name: string
  sku: string
  regularPrice: string
  stock: string
  lowStockThreshold: string
  category: string
  shortDescription: string
  image: string
  isActive: boolean
}

const emptyForm: ProductFormState = {
  name: "",
  sku: "",
  regularPrice: "",
  stock: "0",
  lowStockThreshold: "5",
  category: "none",
  shortDescription: "",
  image: "",
  isActive: true,
}

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock"

function isStockFilter(value: string): value is StockFilter {
  return value === "all" || value === "in_stock" || value === "low_stock" || value === "out_of_stock"
}

function productCategoryName(product: AdminProduct): string {
  return product.category && typeof product.category === "object" ? product.category.name : "-"
}

function productCategoryId(product: AdminProduct): string {
  if (typeof product.category === "string") return product.category
  return product.category?.id ?? "none"
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [stockStatus, setStockStatus] = useState<StockFilter>("all")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminProduct | null>(null)
  const [pendingArchive, setPendingArchive] = useState<AdminProduct | null>(null)
  const [form, setForm] = useState<ProductFormState>(emptyForm)
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set())

  const productsQuery = useQuery({
    queryKey: ["admin-products", search, stockStatus, page],
    queryFn: () => getAdminProducts({
      search: search.trim() || undefined,
      status: stockStatus === "all" ? undefined : stockStatus,
      page,
      limit: 10,
    }),
  })

  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: getAdminCategories,
  })

  const refreshProducts = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-products"] })
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        regularPrice: Number(form.regularPrice),
        stock: Number(form.stock),
        lowStockThreshold: Number(form.lowStockThreshold),
        category: form.category === "none" ? undefined : form.category,
        shortDescription: form.shortDescription.trim() || undefined,
        images: form.image.trim() ? [form.image.trim()] : [],
        isActive: form.isActive,
      }
      return editing ? updateAdminProduct(editing.id, payload) : createAdminProduct(payload)
    },
    onSuccess: async () => {
      await refreshProducts()
      setFormOpen(false)
      setEditing(null)
      setForm(emptyForm)
      toast.success(editing ? "Product updated" : "Product created")
    },
    onError: (mutationError) => toast.error(mapApiError(mutationError).message),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateAdminProduct(id, { isActive }),
    onSuccess: async () => {
      await refreshProducts()
      toast.success("Product status updated")
    },
    onError: (mutationError) => toast.error(mapApiError(mutationError).message),
  })

  const archiveMutation = useMutation({
    mutationFn: archiveAdminProduct,
    onSuccess: async () => {
      await refreshProducts()
      setPendingArchive(null)
      toast.success("Product archived")
    },
    onError: (mutationError) => toast.error(mapApiError(mutationError).message),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (product: AdminProduct) => {
    setEditing(product)
    setForm({
      name: product.name,
      sku: product.sku,
      regularPrice: String(product.regularPrice),
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
      category: productCategoryId(product),
      shortDescription: product.shortDescription ?? "",
      image: product.images[0] ?? "",
      isActive: product.isActive,
    })
    setFormOpen(true)
  }

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const price = Number(form.regularPrice)
    const stock = Number(form.stock)
    const threshold = Number(form.lowStockThreshold)
    if (!form.name.trim() || !form.sku.trim()) {
      toast.error("Name and SKU are required")
      return
    }
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(threshold) || threshold < 1) {
      toast.error("Enter a valid price, stock, and low-stock threshold")
      return
    }
    if (form.image.trim() && !form.image.trim().startsWith("/")) {
      toast.error("Product images must use a local public path beginning with /")
      return
    }
    saveMutation.mutate()
  }

  const products = productsQuery.data?.items ?? []
  const columns: Column<AdminProduct>[] = [
    {
      key: "image",
      header: "Image",
      render: (product) => product.images[0]?.startsWith("/") && !imgErrors.has(product.id) ? (
        <Image src={product.images[0]} alt={product.name} width={40} height={40} className="h-10 w-10 rounded-md object-cover" onError={() => setImgErrors((current) => new Set(current).add(product.id))} />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
      ),
    },
    { key: "name", header: "Name", sortable: true, render: (product) => <span className="font-medium">{product.name}</span> },
    { key: "sku", header: "SKU", render: (product) => <span className="text-muted-foreground">{product.sku}</span>, hideOnMobile: true },
    { key: "category", header: "Category", render: (product) => <span className="text-muted-foreground">{productCategoryName(product)}</span>, hideOnMobile: true },
    { key: "regularPrice", header: "Price", sortable: true, render: (product) => <span>E£ {product.regularPrice.toFixed(2)}</span> },
    { key: "stock", header: "Stock", sortable: true, render: (product) => <Badge variant={product.stock === 0 ? "destructive" : product.stock < product.lowStockThreshold ? "secondary" : "default"}>{product.stock}</Badge> },
    { key: "status", header: "Status", render: (product) => <Badge variant={product.isActive ? "default" : "secondary"}>{product.isActive ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions",
      header: "Actions",
      render: (product) => (
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label={`${product.isActive ? "Deactivate" : "Activate"} ${product.name}`} disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: product.id, isActive: !product.isActive })}>
            {product.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${product.name}`} onClick={() => openEdit(product)}><Edit className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="text-destructive" aria-label={`Archive ${product.name}`} onClick={() => setPendingArchive(product)}><Archive className="h-4 w-4" /></Button>
        </div>
      ),
      className: "text-right",
    },
  ]

  if (productsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Failed to load products</h1>
        <p className="mt-1 text-sm text-muted-foreground">{mapApiError(productsQuery.error).message}</p>
        <Button variant="outline" className="mt-4" onClick={() => productsQuery.refetch()}><RefreshCcw className="mr-2 h-4 w-4" />Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Products</h1><p className="text-sm text-muted-foreground">Manage your product catalog.</p></div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Product</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <form onSubmit={submitForm}>
              <DialogHeader><DialogTitle>{editing ? "Edit Product" : "Create Product"}</DialogTitle><DialogDescription>Enter the product’s catalog and inventory details.</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="product-name">Name</Label><Input id="product-name" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="product-sku">SKU</Label><Input id="product-sku" required value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="product-price">Regular price</Label><Input id="product-price" type="number" min="0" step="0.01" required value={form.regularPrice} onChange={(event) => setForm((current) => ({ ...current, regularPrice: event.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="product-stock">Stock</Label><Input id="product-stock" type="number" min="0" step="1" required value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="product-threshold">Low-stock threshold</Label><Input id="product-threshold" type="number" min="1" step="1" required value={form.lowStockThreshold} onChange={(event) => setForm((current) => ({ ...current, lowStockThreshold: event.target.value }))} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="product-category">Category</Label><Select value={form.category} onValueChange={(category) => setForm((current) => ({ ...current, category }))}><SelectTrigger id="product-category"><SelectValue placeholder="No category" /></SelectTrigger><SelectContent><SelectItem value="none">No category</SelectItem>{categoriesQuery.data?.items.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="product-description">Short description</Label><Input id="product-description" value={form.shortDescription} onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="product-image">Local image path</Label><Input id="product-image" placeholder="/products/example.webp" value={form.image} onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))} /></div>
                <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2"><Label htmlFor="product-active">Active</Label><Switch id="product-active" checked={form.isActive} onCheckedChange={(isActive) => setForm((current) => ({ ...current, isActive }))} /></div>
              </div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search products" placeholder="Search products..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} className="pl-8" /></div>
        <Select value={stockStatus} onValueChange={(value) => { if (isStockFilter(value)) setStockStatus(value); setPage(1) }}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Stock status" /></SelectTrigger><SelectContent><SelectItem value="all">All stock</SelectItem><SelectItem value="in_stock">In stock</SelectItem><SelectItem value="low_stock">Low stock</SelectItem><SelectItem value="out_of_stock">Out of stock</SelectItem></SelectContent></Select>
      </div>

      <DataTable columns={columns} data={products} keyExtractor={(product) => product.id} loading={productsQuery.isLoading} emptyMessage="No products found." emptyIcon={<Package className="h-12 w-12 text-muted-foreground" />} />

      <Dialog open={pendingArchive !== null} onOpenChange={(open) => !open && setPendingArchive(null)}>
        <DialogContent><DialogHeader><DialogTitle>Archive product?</DialogTitle><DialogDescription>“{pendingArchive?.name}” will disappear from the storefront and active catalog.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setPendingArchive(null)}>Cancel</Button><Button variant="destructive" disabled={archiveMutation.isPending || !pendingArchive} onClick={() => pendingArchive && archiveMutation.mutate(pendingArchive.id)}>{archiveMutation.isPending ? "Archiving..." : "Archive"}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  )
}
