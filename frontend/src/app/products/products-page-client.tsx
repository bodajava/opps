"use client"

import { useState, useEffect, useCallback } from "react"
import { SearchBar } from "@/components/search-bar"
import { ProductGrid } from "@/components/product-grid"
import { Pagination } from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getProducts } from "@/lib/api/products"
import type { Category, Product } from "@/lib/types"
import { cn } from "@/lib/utils"
import { SlidersHorizontal, X } from "lucide-react"

interface ProductsPageClientProps {
  categories: Category[]
  initialProducts: Product[]
  initialTotalPages: number
  initialTotal: number
}

const sortOptions = [
  { value: "createdAt:desc", label: "Newest First" },
  { value: "createdAt:asc", label: "Oldest First" },
  { value: "price:asc", label: "Price: Low to High" },
  { value: "price:desc", label: "Price: High to Low" },
  { value: "name:asc", label: "Name: A-Z" },
  { value: "name:desc", label: "Name: Z-A" },
  { value: "sellCount:desc", label: "Best Selling" },
  { value: "rating:desc", label: "Highest Rated" },
]

function ProductsPageClient({
  categories,
  initialProducts,
  initialTotalPages,
  initialTotal,
}: ProductsPageClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [sort, setSort] = useState("createdAt:desc")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [total, setTotal] = useState(initialTotal)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let cancelled = false
    getProducts({
      page,
      limit: 12,
      category: selectedCategory || undefined,
      search: search || undefined,
      sort: sort || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    }).then((res) => {
      if (cancelled) return
      if (res.success) {
        setProducts(res.data)
        setTotalPages(res.meta.totalPages)
        setTotal(res.meta.total)
      } else {
        setError(res.message)
      }
    }).catch((err) => {
      if (cancelled) return
      setError(err instanceof Error ? err.message : "Failed to load products")
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [page, selectedCategory, search, sort, minPrice, maxPrice])

  const fetchProducts = useCallback(() => {
    setError(null)
    getProducts({
      page,
      limit: 12,
      category: selectedCategory || undefined,
      search: search || undefined,
      sort: sort || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    }).then((res) => {
      if (res.success) {
        setProducts(res.data)
        setTotalPages(res.meta.totalPages)
        setTotal(res.meta.total)
      } else {
        setError(res.message)
      }
    }).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load products")
    })
  }, [page, selectedCategory, search, sort, minPrice, maxPrice])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleCategorySelect = (slug: string) => {
    setSelectedCategory(slug === selectedCategory ? "" : slug)
    setPage(1)
  }

  const clearFilters = () => {
    setSearch("")
    setSelectedCategory("")
    setSort("createdAt:desc")
    setMinPrice("")
    setMaxPrice("")
    setPage(1)
  }

  const hasActiveFilters = search || selectedCategory || minPrice || maxPrice

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Search cookies..."
          onSubmit={handleSearch}
          className="w-full lg:max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="mr-1 h-4 w-4" />
            Filters
          </Button>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={cn("flex-col gap-4 lg:flex lg:flex-row", showFilters && "flex")}>
        <aside className={cn("w-full shrink-0 lg:w-56", !showFilters && "hidden lg:block")}>
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Categories</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={clearFilters}>
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.slug)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm transition-colors lg:rounded-md",
                    selectedCategory === cat.slug
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {cat.name}
                  {cat.productCount !== undefined && cat.productCount > 0 && (
                    <span className="ml-1 text-xs opacity-70">({cat.productCount})</span>
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Price Range</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => { setMinPrice(e.target.value); setPage(1) }}
                  className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                  min={0}
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => { setMaxPrice(e.target.value); setPage(1) }}
                  className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                  min={0}
                />
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 space-y-6">
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{total} result{total !== 1 ? "s" : ""}</span>
              {search && (
                <span className="rounded-md bg-muted px-2 py-0.5">
                  Search: &quot;{search}&quot;
                </span>
              )}
            </div>
          )}
          <ProductGrid
            products={products}
            isLoading={isLoading}
            error={error}
            onRetry={fetchProducts}
          />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  )
}

export { ProductsPageClient }
