import { ProductCard, ProductCardSkeleton } from "@/components/product-card"
import { ErrorState } from "@/components/error-state"
import { EmptyState } from "@/components/empty-state"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types"

interface ProductGridProps {
  products?: Product[]
  isLoading?: boolean
  error?: string | null
  emptyMessage?: string
  onRetry?: () => void
  className?: string
}

function ProductGrid({
  products,
  isLoading = false,
  error = null,
  emptyMessage = "No products found.",
  onRetry,
  className,
}: ProductGridProps) {
  if (error) {
    return <ErrorState title="Failed to load products" message={error} onRetry={onRetry} />
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
          className
        )}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!products || products.length === 0) {
    return <EmptyState title={emptyMessage} description="Try adjusting your filters or check back later." />
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
        className
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

export { ProductGrid }
