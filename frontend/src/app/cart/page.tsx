"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { QuantitySelector } from "@/components/quantity-selector"
import { useCartStore } from "@/store/cart-store"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { CartItemSkeleton } from "@/components/loading-skeleton"
import { formatPrice } from "@/lib/utils"
import { ShoppingBag, Trash2, ArrowLeft, Loader2, Tag } from "lucide-react"
import { toast } from "sonner"

function CartPage() {
  const {
    items,
    subtotal,
    deliveryFee,
    discount,
    total,
    couponCode,
    removeItem,
    updateQuantity,
    applyCoupon,
    removeCoupon,
  } = useCartStore()

  const [couponInput, setCouponInput] = useState("")
  const [isApplying, setIsApplying] = useState(false)
  const [isLoading] = useState(false)

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return
    setIsApplying(true)
    setTimeout(() => {
      applyCoupon(couponInput.toUpperCase(), subtotal * 0.1)
      setIsApplying(false)
      setCouponInput("")
      toast.success("Coupon applied successfully!")
    }, 500)
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CartItemSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Breadcrumb items={[{ label: "Cart" }]} className="mb-6" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 rounded-full bg-muted p-8">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Your Cart is Empty</h1>
          <p className="mt-2 text-muted-foreground">
            Looks like you haven&apos;t added any cookies yet.
          </p>
          <Button asChild className="mt-6">
            <Link href="/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Start Shopping
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Breadcrumb items={[{ label: "Cart" }]} className="mb-6" />
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Shopping Cart</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 rounded-lg border p-4"
            >
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted">
                    <span className="text-2xl text-muted-foreground/30">{item.name[0]}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/products/${item.sku}`}
                        className="font-medium hover:text-primary"
                      >
                        {item.name}
                      </Link>
                      {item.variantName && (
                        <p className="text-sm text-muted-foreground">{item.variantName}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        removeItem(item.id)
                        toast.success("Item removed from cart")
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <QuantitySelector
                    value={item.quantity}
                    onChange={(q) => updateQuantity(item.id, q)}
                    min={1}
                    max={99}
                  />
                  <span className="text-lg font-semibold tabular-nums">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-lg border p-4 space-y-4">
            <h2 className="font-semibold">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="tabular-nums">
                  {deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatPrice(discount)}</span>
                </div>
              )}
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
            <Button asChild className="w-full" size="lg">
              <Link href="/checkout">Proceed to Checkout</Link>
            </Button>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Coupon Code</h3>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleApplyCoupon}
                disabled={isApplying || !couponInput.trim()}
              >
                {isApplying ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
            {couponCode && (
              <div className="flex items-center justify-between rounded-md bg-primary/5 px-3 py-2">
                <span className="text-sm font-medium text-primary">Code: {couponCode}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={removeCoupon}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage
