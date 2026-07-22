"use client"

import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  updateAdminCategory,
} from "@/lib/api/admin"
import type { AdminCategory } from "@/lib/api/admin-contracts"
import { mapApiError } from "@/lib/api-client"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { AlertTriangle, Edit, Plus, RefreshCcw, Search, Tags, Trash2 } from "lucide-react"

interface CategoryFormState {
  name: string
  description: string
  sortOrder: string
  isActive: boolean
}

const emptyForm: CategoryFormState = {
  name: "",
  description: "",
  sortOrder: "0",
  isActive: true,
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminCategory | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AdminCategory | null>(null)
  const [form, setForm] = useState<CategoryFormState>(emptyForm)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: getAdminCategories,
  })

  const refreshCategories = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-categories"] })
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
      }
      return editing
        ? updateAdminCategory(editing.id, payload)
        : createAdminCategory(payload)
    },
    onSuccess: async () => {
      await refreshCategories()
      setFormOpen(false)
      setEditing(null)
      setForm(emptyForm)
      toast.success(editing ? "Category updated" : "Category created")
    },
    onError: (mutationError) => toast.error(mapApiError(mutationError).message),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAdminCategory(id, { isActive }),
    onSuccess: async () => {
      await refreshCategories()
      toast.success("Category status updated")
    },
    onError: (mutationError) => toast.error(mapApiError(mutationError).message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAdminCategory,
    onSuccess: async () => {
      await refreshCategories()
      setPendingDelete(null)
      toast.success("Category deleted")
    },
    onError: (mutationError) => toast.error(mapApiError(mutationError).message),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (category: AdminCategory) => {
    setEditing(category)
    setForm({
      name: category.name,
      description: category.description ?? "",
      sortOrder: String(category.sortOrder),
      isActive: category.isActive,
    })
    setFormOpen(true)
  }

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim()) {
      toast.error("Category name is required")
      return
    }
    if (!Number.isInteger(Number(form.sortOrder)) || Number(form.sortOrder) < 0) {
      toast.error("Sort order must be a non-negative whole number")
      return
    }
    saveMutation.mutate()
  }

  const categories = data?.items.filter((category) => {
    const term = search.trim().toLowerCase()
    return !term || category.name.toLowerCase().includes(term) || category.slug.toLowerCase().includes(term)
  }) ?? []

  const columns: Column<AdminCategory>[] = [
    { key: "name", header: "Name", sortable: true, render: (category) => <span className="font-medium">{category.name}</span> },
    { key: "slug", header: "Slug", render: (category) => <code className="text-xs text-muted-foreground">{category.slug}</code>, hideOnMobile: true },
    {
      key: "status",
      header: "Status",
      render: (category) => (
        <Switch
          aria-label={`Toggle ${category.name}`}
          checked={category.isActive}
          disabled={toggleMutation.isPending}
          onCheckedChange={(isActive) => toggleMutation.mutate({ id: category.id, isActive })}
        />
      ),
    },
    { key: "sortOrder", header: "Sort Order", sortable: true, render: (category) => category.sortOrder, hideOnMobile: true },
    {
      key: "actions",
      header: "Actions",
      render: (category) => (
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${category.name}`} onClick={() => openEdit(category)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="text-destructive" aria-label={`Delete ${category.name}`} onClick={() => setPendingDelete(category)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: "text-right",
    },
  ]

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <h1 className="mt-3 text-xl font-semibold">Categories are unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{mapApiError(error).message}</p>
        <Button variant="outline" className="mt-3" onClick={() => refetch()}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">Organize your products into categories.</p>
        </div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={submitForm}>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Category" : "Create Category"}</DialogTitle>
                <DialogDescription>{editing ? "Update category details." : "Add a new product category."}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Name</Label>
                  <Input id="category-name" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-description">Description</Label>
                  <Input id="category-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-sort">Sort order</Label>
                  <Input id="category-sort" type="number" min="0" step="1" required value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label htmlFor="category-active">Active</Label>
                  <Switch id="category-active" checked={form.isActive} onCheckedChange={(isActive) => setForm((current) => ({ ...current, isActive }))} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input aria-label="Search categories" placeholder="Search categories..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-8" />
      </div>

      <DataTable columns={columns} data={categories} keyExtractor={(category) => category.id} loading={isLoading} emptyMessage="No categories found." emptyIcon={<Tags className="h-12 w-12 text-muted-foreground" />} />

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>This permanently deletes “{pendingDelete?.name}”. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending || !pendingDelete} onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
