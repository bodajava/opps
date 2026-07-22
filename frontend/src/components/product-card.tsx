"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PriceDisplay } from "@/components/price-display"
import { StarRating } from "@/components/star-rating"
import { Skeleton } from "@/components/ui/skeleton"
import { useCartStore } from "@/store/cart-store"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types"
import { ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

interface ProductCardProps {
  product: Product
  className?: string
}

function ProductCard({ product, className }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const [imgError, setImgError] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const isOnSale =
    product.compareAtPrice !== undefined && product.compareAtPrice !== null && product.compareAtPrice > product.price

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsAdding(true)
    addItem({
      id: `temp-${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      image: product.images[0] || "",
      price: product.compareAtPrice || product.price,
      quantity: 1,
      sku: product.slug,
    })
    toast.success(`${product.name} added to cart`)
    setTimeout(() => setIsAdding(false), 300)
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md",
        className
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-t-xl">
        {product.images[0] && !imgError ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <span className="text-3xl text-muted-foreground/30">{product.name[0]}</span>
          </div>
        )}
        {isOnSale && (
          <Badge variant="destructive" className="absolute left-2 top-2">
            Sale
          </Badge>
        )}
        {product.isBestSeller && (
          <Badge variant="secondary" className="absolute right-2 top-2">
            Best Seller
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-1 text-sm font-medium">{product.name}</h3>
        {product.shortDescription && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{product.shortDescription}</p>
        )}
        <div className="flex items-center gap-1">
          <StarRating rating={product.rating} size="sm" />
          {product.reviewCount > 0 && (
            <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <PriceDisplay
            price={product.price}
            salePrice={product.compareAtPrice}
            size="sm"
          />
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 shrink-0"
            onClick={handleAddToCart}
            disabled={isAdding}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Link>
  )
}

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border bg-card shadow-sm">
      <Skeleton className="aspect-square rounded-t-xl" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  )
}

export { ProductCard, ProductCardSkeleton }
