"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { forgotPassword } from "@/lib/api/auth"
import { GuestOnlyGuard } from "@/components/auth/guest-only-guard"
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

type ForgotFormValues = z.infer<typeof forgotSchema>

function ForgotPasswordContent() {
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data: ForgotFormValues) => {
    setError(null)
    try {
      await forgotPassword(data.email)
      setIsSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email")
    }
  }

  if (isSent) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Check Your Email</h1>
        <p className="mt-2 text-muted-foreground">
          If an account with that email exists, we&apos;ve sent password reset instructions.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Forgot Password?</h1>
        <p className="mt-2 text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          Send Reset Link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          <ArrowLeft className="mr-1 inline h-4 w-4" />
          Back to Login
        </Link>
      </p>
    </div>
  )
}

export function ForgotPasswordForm() {
  return (
    <GuestOnlyGuard>
      <ForgotPasswordContent />
    </GuestOnlyGuard>
  )
}
