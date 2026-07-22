"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { useCartStore } from "@/store/cart-store"
import { createOrder } from "@/lib/api/checkout"
import { formatPrice } from "@/lib/utils"
import { PaymentMethodType } from "@/lib/types"
import {
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CreditCard,
  Wallet,
  Banknote,
  Truck,
} from "lucide-react"
import { toast } from "sonner"

const checkoutSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  secondaryPhone: z.string().optional(),
  governorate: z.string().min(1, "Governorate is required"),
  city: z.string().min(1, "City is required"),
  district: z.string().min(1, "District is required"),
  street: z.string().min(1, "Street is required"),
  building: z.string().min(1, "Building number is required"),
  floor: z.string().optional(),
  apartment: z.string().optional(),
  landmark: z.string().optional(),
  deliveryNotes: z.string().optional(),
  paymentMethod: z.enum(["cod", "online", "wallet"]),
})

type CheckoutFormValues = z.infer<typeof checkoutSchema>

const steps = [
  { id: 1, title: "Contact Info" },
  { id: 2, title: "Delivery Address" },
  { id: 3, title: "Payment Method" },
  { id: 4, title: "Review Order" },
]

const paymentMethods: { value: PaymentMethodType; label: string; icon: typeof CreditCard; description: string }[] = [
  { value: PaymentMethodType.COD, label: "Cash on Delivery", icon: Banknote, description: "Pay when you receive your order" },
  { value: PaymentMethodType.ONLINE, label: "Pay Online", icon: CreditCard, description: "Credit/Debit card or Fawry" },
  { value: PaymentMethodType.WALLET, label: "Wallet", icon: Wallet, description: "Pay using your account wallet" },
]

function isPaymentMethod(value: string): value is PaymentMethodType {
  return value === PaymentMethodType.COD || value === PaymentMethodType.ONLINE || value === PaymentMethodType.WALLET
}

function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, deliveryFee, discount, total, couponCode } = useCartStore()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      secondaryPhone: "",
      governorate: "",
      city: "",
      district: "",
      street: "",
      building: "",
      floor: "",
      apartment: "",
      landmark: "",
      deliveryNotes: "",
      paymentMethod: PaymentMethodType.COD,
    },
  })

  const formValues = useWatch({ control })

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mb-6 rounded-full bg-muted p-8 mx-auto w-fit">
          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Your Cart is Empty</h1>
        <p className="mt-2 text-muted-foreground">Add some items to your cart before checking out.</p>
        <Button asChild className="mt-6">
          <Link href="/products">Browse Products</Link>
        </Button>
      </div>
    )
  }

  const paymentMethod = formValues.paymentMethod
  const canProceedStep1 = formValues.fullName && formValues.email && formValues.phone
  const canProceedStep2 =
    formValues.governorate && formValues.city && formValues.district && formValues.street

  const onSubmit = async (data: CheckoutFormValues) => {
    setIsSubmitting(true)
    try {
      const verificationProof = sessionStorage.getItem("checkout_verification_id")
      const verifiedEmail = sessionStorage.getItem("checkout_verified_email")
      if (data.email.toLowerCase().trim() !== (verifiedEmail || "")) {
        toast.error("Email has changed. Please verify your new email.")
        setIsSubmitting(false)
        return
      }
      const res = await createOrder({
        customerName: data.fullName,
        customerEmail: data.email,
        customerPhone: data.phone,
        secondaryPhone: data.secondaryPhone || undefined,
        shippingAddress: {
          governorate: data.governorate,
          city: data.city,
          district: data.district,
          street: data.street,
          buildingNumber: data.building,
          floor: data.floor || undefined,
          apartment: data.apartment || undefined,
          landmark: data.landmark || undefined,
          deliveryNotes: data.deliveryNotes || undefined,
        },
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId || undefined,
          quantity: i.quantity,
        })),
        paymentMethod: data.paymentMethod,
        couponCode: couponCode || undefined,
        customerNotes: data.deliveryNotes || undefined,
        verificationProof: verificationProof || undefined,
      })
      if (res.success) {
        useCartStore.getState().clearCart()
        sessionStorage.removeItem("checkout_verification_id")
        sessionStorage.removeItem("checkout_verified_email")
        toast.success("Order placed successfully!")
        router.push(`/order-success/${res.data.orderNumber}`)
      } else {
        toast.error(res.message || "Failed to place order")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Breadcrumb items={[{ label: "Checkout" }]} className="mb-6" />

      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  s.id === step
                    ? "bg-primary text-primary-foreground"
                    : s.id < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s.id < step ? "✓" : s.id}
              </div>
              <span className={`hidden text-sm font-medium sm:inline ${s.id === step ? "text-foreground" : "text-muted-foreground"}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 h-1 w-full rounded-full bg-muted">
          <div
            className="h-1 rounded-full bg-primary transition-all"
            style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {step === 1 && (
              <div className="space-y-4 rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Contact Information</h2>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" placeholder="John Doe" {...register("fullName")} />
                  {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="your@email.com" {...register("email")} />
                  {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" placeholder="010xxxxxxx" {...register("phone")} />
                    {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="secondaryPhone">Secondary Phone (optional)</Label>
                    <Input id="secondaryPhone" type="tel" placeholder="Another number" {...register("secondaryPhone")} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Delivery Address</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="governorate">Governorate</Label>
                  <Input id="governorate" placeholder="e.g. Cairo" {...register("governorate")} />
                  {errors.governorate && <p className="mt-1 text-xs text-destructive">{errors.governorate.message}</p>}
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="e.g. New Cairo" {...register("city")} />
                  {errors.city && <p className="mt-1 text-xs text-destructive">{errors.city.message}</p>}
                </div>
                <div>
                  <Label htmlFor="district">District</Label>
                  <Input id="district" placeholder="e.g. Fifth Settlement" {...register("district")} />
                  {errors.district && <p className="mt-1 text-xs text-destructive">{errors.district.message}</p>}
                </div>
                <div>
                  <Label htmlFor="street">Street Name</Label>
                  <Input id="street" placeholder="Street name" {...register("street")} />
                  {errors.street && <p className="mt-1 text-xs text-destructive">{errors.street.message}</p>}
                </div>
                <div>
                  <Label htmlFor="building">Building (optional)</Label>
                  <Input id="building" placeholder="Building number" {...register("building")} />
                </div>
                <div>
                  <Label htmlFor="floor">Floor (optional)</Label>
                  <Input id="floor" placeholder="Floor number" {...register("floor")} />
                </div>
                <div>
                  <Label htmlFor="apartment">Apartment (optional)</Label>
                  <Input id="apartment" placeholder="Apartment number" {...register("apartment")} />
                </div>
                <div>
                  <Label htmlFor="landmark">Landmark (optional)</Label>
                  <Input id="landmark" placeholder="Nearby landmark" {...register("landmark")} />
                </div>
              </div>
              <div>
                <Label htmlFor="deliveryNotes">Delivery Notes (optional)</Label>
                <Textarea id="deliveryNotes" placeholder="Any special instructions..." {...register("deliveryNotes")} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Payment Method</h2>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) => { if (isPaymentMethod(value)) setValue("paymentMethod", value) }}
                className="grid gap-3"
              >
                {paymentMethods.map((method) => (
                  <Label
                    key={method.value}
                    htmlFor={method.value}
                    className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent ${
                      paymentMethod === method.value ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <RadioGroupItem value={method.value} id={method.value} />
                    <method.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{method.label}</p>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Review Your Order</h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {item.variantName && (
                        <span className="text-muted-foreground">({item.variantName})</span>
                      )}
                      <span className="text-muted-foreground">x{item.quantity}</span>
                    </div>
                    <span className="tabular-nums">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <Separator />
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
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(total)}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
            {step < 4 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={step === 1 ? !canProceedStep1 : step === 2 ? !canProceedStep2 : false}
              >
                Continue
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <Truck className="mr-2 h-4 w-4" />
                    Place Order
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold">Order Summary</h3>
            <div className="space-y-2 text-sm">
              {items.slice(0, 4).map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="truncate text-muted-foreground">
                    {item.name} x{item.quantity}
                  </span>
                  <span className="tabular-nums shrink-0">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              {items.length > 4 && (
                <p className="text-xs text-muted-foreground">+{items.length - 4} more items</p>
              )}
            </div>
            <Separator />
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
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default CheckoutPage
