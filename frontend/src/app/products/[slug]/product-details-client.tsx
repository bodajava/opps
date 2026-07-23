"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuantitySelector } from "@/components/quantity-selector"
import { PriceDisplay } from "@/components/price-display"
import { StarRating } from "@/components/star-rating"
import { ProductGrid } from "@/components/product-grid"
import { useCartStore } from "@/store/cart-store"
import { cn, formatPrice } from "@/lib/utils"
import type { Product } from "@/lib/types"
import { ShoppingCart, Check, Clock, Package, Shield } from "lucide-react"
import { toast } from "sonner"
import { useAuthStore } from "@/store/auth-store"
import { useRouter } from "next/navigation"

interface ProductDetailsClientProps {
  product: Product
  relatedProducts: Product[]
}

function ProductDetailsClient({ product, relatedProducts }: ProductDetailsClientProps) {
  const addProduct = useCartStore((s) => s.addProduct)
  const authStatus = useAuthStore((s) => s.authStatus)
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const [selectedImage, setSelectedImage] = useState(0)
  const [erroredImages, setErroredImages] = useState<Set<number>>(new Set())

  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(product.variants?.[0]?.id)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  const selectedVariant = product.variants?.find((v) => v.id === selectedVariantId)
  const displayPrice = selectedVariant?.price ?? product.price
  const displayCompareAt = selectedVariant?.compareAtPrice ?? product.compareAtPrice
  const stock = selectedVariant?.stock ?? 0
  const inStock = stock > 0
  const isOnSale = displayCompareAt !== undefined && displayCompareAt !== null && displayCompareAt > displayPrice

  const breadcrumbItems = [
    { label: "Products", href: "/products" },
    ...(product.category
      ? [
          {
            label: product.category.name,
            href: `/products?category=${product.category.slug}`,
          },
        ]
      : []),
    { label: product.name },
  ]

  const canUseCart = authStatus === "authenticated" && !!user && user.accountStatus !== "pending_verification"

  const handleAddToCart = async () => {
    if (!canUseCart) {
      const destination = authStatus === "registration_pending_verification" ? "/verify-account" : "/login"
      router.push(`${destination}?returnTo=${encodeURIComponent(`/products/${product.slug}`)}`)
      return
    }
    setIsAdding(true)
    try {
      await addProduct(product.id, selectedVariantId, quantity)
      toast.success(`${product.name} added to cart`)
    } catch {
      toast.error("We couldn't add this item. Please try again.")
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Breadcrumb items={breadcrumbItems} className="mb-6" />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
            {product.images[selectedImage] && !erroredImages.has(selectedImage) ? (
              <Image
                src={product.images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
                onError={() => setErroredImages((prev) => new Set(prev).add(selectedImage))}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-6xl text-muted-foreground/30">{product.name[0]}</span>
              </div>
            )}
            {isOnSale && (
              <Badge variant="destructive" className="absolute left-3 top-3">
                Sale
              </Badge>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((img, i) => (
                <button
                  key={img}
                  onClick={() => setSelectedImage(i)}
                  className={cn(
                    "relative h-20 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                    selectedImage === i ? "border-primary" : "border-transparent hover:border-muted-foreground/30",
                  )}
                >
                  <Image src={img} alt={`${product.name} ${i + 1}`} fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {product.category && (
                <Link href={`/products?category=${product.category.slug}`} className="hover:text-foreground">
                  {product.category.name}
                </Link>
              )}
              {product.sellCount > 0 && (
                <>
                  <span>·</span>
                  <span>{product.sellCount} sold</span>
                </>
              )}
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{product.name}</h1>
            {product.shortDescription && <p className="mt-2 text-muted-foreground">{product.shortDescription}</p>}
            <div className="mt-3 flex items-center gap-2">
              <StarRating rating={product.rating} size="sm" />
              {product.reviewCount > 0 && <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>}
            </div>
          </div>

          <div>
            <PriceDisplay price={displayPrice} salePrice={displayCompareAt} size="lg" />
          </div>

          {product.variants && product.variants.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Variant</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariantId(variant.id)}
                    disabled={!variant.isActive || variant.stock === 0}
                    className={cn(
                      "rounded-md border px-4 py-2 text-sm transition-colors",
                      selectedVariantId === variant.id
                        ? "border-primary bg-primary/5 font-medium text-primary"
                        : "border-input hover:border-muted-foreground/30",
                      (!variant.isActive || variant.stock === 0) && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {variant.name}
                    {variant.price !== product.price && <span className="ml-1 text-xs text-muted-foreground">({formatPrice(variant.price)})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <QuantitySelector value={quantity} onChange={setQuantity} min={1} max={inStock ? Math.min(stock, 99) : 0} />
            <Button size="lg" className="flex-1 gap-2" onClick={handleAddToCart} disabled={(canUseCart && !inStock) || isAdding}>
              <ShoppingCart className="h-4 w-4" />
              {isAdding ? "Adding..." : !canUseCart ? "Sign in to add to cart" : inStock ? "Add to Cart" : "Out of Stock"}
            </Button>
          </div>

          {inStock && stock <= 10 && <p className="text-sm text-amber-600">Only {stock} left in stock</p>}

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Estimated prep time: 24-48 hours</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>Freshly baked to order</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>100% premium ingredients</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4" />
              <span>Free delivery on orders E£200+</span>
            </div>
          </div>

          <Tabs defaultValue="description">
            <TabsList className="w-full">
              <TabsTrigger value="description" className="flex-1">
                Description
              </TabsTrigger>
              <TabsTrigger value="ingredients" className="flex-1">
                Ingredients
              </TabsTrigger>
              <TabsTrigger value="allergens" className="flex-1">
                Allergens
              </TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="prose prose-sm max-w-none text-muted-foreground">
              {product.description}
            </TabsContent>
            <TabsContent value="ingredients" className="text-sm text-muted-foreground">
              <p>
                Premium wheat flour, butter, sugar, eggs, vanilla extract, chocolate chips (cocoa mass, sugar, cocoa butter, emulsifier: soy lecithin), baking
                powder, sea salt.
              </p>
            </TabsContent>
            <TabsContent value="allergens" className="text-sm text-muted-foreground">
              <p>Contains: Wheat (gluten), Dairy (butter), Eggs, Soy. May contain traces of nuts and peanuts.</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-semibold">You May Also Like</h2>
          <ProductGrid products={relatedProducts} />
        </section>
      )}
    </div>
  )
}

export { ProductDetailsClient }
