"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { QuantitySelector } from "@/components/quantity-selector"
import { useCartStore } from "@/store/cart-store"
import { cn, formatPrice } from "@/lib/utils"
import { ShoppingBag, X, Trash2, Loader2 } from "lucide-react"

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, subtotal, deliveryFee, discount, total, couponCode, removeItem, updateQuantity, applyCoupon, removeCoupon } = useCartStore()

  const [couponInput, setCouponInput] = useState("")
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return
    setIsApplyingCoupon(true)
    try {
      await applyCoupon(couponInput.toUpperCase())
      setCouponInput("")
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  const handleQuantityChange = (itemId: string, quantity: number) => {
    void updateQuantity(itemId, quantity)
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Cart {items.length > 0 && `(${items.length})`}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
            <div className="rounded-full bg-muted p-6">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold">Your cart is empty</h3>
              <p className="mt-1 text-sm text-muted-foreground">Looks like you haven&apos;t added anything yet.</p>
            </div>
            <Button asChild onClick={onClose}>
              <Link href="/products">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 rounded-lg border p-3">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-muted">
                          <span className="text-lg text-muted-foreground/30">{item.name[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-medium leading-tight">{item.name}</h4>
                            {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <QuantitySelector value={item.quantity} onChange={(q) => handleQuantityChange(item.id, q)} min={1} max={99} />
                        <span className="text-sm font-semibold tabular-nums">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t px-4 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input placeholder="Coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="flex-1" />
                <Button variant="secondary" size="sm" onClick={handleApplyCoupon} disabled={isApplyingCoupon || !couponInput.trim()}>
                  {isApplyingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
                </Button>
              </div>

              {couponCode && (
                <div className="flex items-center justify-between rounded-md bg-primary/5 px-3 py-2">
                  <span className="text-sm font-medium text-primary">Code: {couponCode}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeCoupon}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="tabular-nums">{deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}</span>
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

              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1" onClick={onClose}>
                  <Link href="/cart">View Cart</Link>
                </Button>
                <Button asChild className="flex-1" onClick={onClose}>
                  <Link href="/checkout">Checkout</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export { CartDrawer }
