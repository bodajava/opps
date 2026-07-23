"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuthStore } from "@/store/auth-store"
import { GuestOnlyGuard } from "@/components/auth/guest-only-guard"
import { Loader2, Eye, EyeOff, UserPlus } from "lucide-react"
import { toast } from "sonner"

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().regex(/^01[0-9]{9}$/, "Please enter a valid Egyptian phone number starting with 01"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    marketingConsent: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

function RegisterFormContent() {
  const router = useRouter()
  const registerUser = useAuthStore((s) => s.register)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const [marketingConsentChecked, setMarketingConsentChecked] = useState(false)

  const onSubmit = async (data: RegisterFormValues) => {
    setError(null)
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone || undefined,
        marketingConsent: data.marketingConsent || false,
      })
      toast.success("We sent a verification code to your email.")
      const returnTo = new URLSearchParams(window.location.search).get("returnTo")
      const target = returnTo ? `/verify-account?returnTo=${encodeURIComponent(returnTo)}` : "/verify-account"
      router.push(target)
    } catch {
      setError("Registration could not be completed. Please try again.")
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
        <p className="mt-2 text-muted-foreground">Join opps and start ordering premium cookies.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" placeholder="John Doe" {...register("fullName")} />
          {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName.message}</p>}
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="your@email.com" {...register("email")} />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" placeholder="010xxxxxxx" {...register("phone")} />
          {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} placeholder="At least 8 characters" {...register("password")} className="pr-10" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Repeat your password"
              {...register("confirmPassword")}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="marketingConsent"
            checked={marketingConsentChecked}
            onCheckedChange={(checked) => {
              setMarketingConsentChecked(checked === true)
              setValue("marketingConsent", checked === true)
            }}
          />
          <Label htmlFor="marketingConsent" className="text-sm leading-relaxed text-muted-foreground cursor-pointer">
            I want to receive marketing emails about new products, offers, and updates.
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export function RegisterForm() {
  return (
    <GuestOnlyGuard>
      <RegisterFormContent />
    </GuestOnlyGuard>
  )
}
