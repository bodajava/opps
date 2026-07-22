"use client"

import Link from "next/link"
import { use } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, ShoppingBag, Package, Mail } from "lucide-react"

function OrderSuccessPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params)

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Order Confirmed!</h1>
        <p className="mt-3 text-muted-foreground">
          Thank you for your order. We&apos;ll start baking your cookies right away!
        </p>
      </div>

      <div className="mt-8 rounded-lg border p-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Order Number</p>
          <p className="mt-1 text-2xl font-bold tracking-wider text-primary">{orderNumber}</p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">Confirmation Email Sent</p>
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a confirmation email with your order details. Please check your inbox.
            </p>
          </div>
        </div>
        <Separator />
        <div className="flex items-start gap-3">
          <Package className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">Estimated Preparation Time</p>
            <p className="text-sm text-muted-foreground">
              Your order is being prepared and will be ready within 24-48 hours.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Button asChild size="lg" className="w-full">
          <Link href="/track-order">
            <Package className="mr-2 h-4 w-4" />
            Track Your Order
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/products">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>
      </div>
    </div>
  )
}

export default OrderSuccessPage
