"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resetPassword } from "@/lib/api/auth"
import { GuestOnlyGuard } from "@/components/auth/guest-only-guard"
import { Loader2, Eye, EyeOff, CheckCircle2, KeyRound } from "lucide-react"
import { toast } from "sonner"

const resetSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type ResetFormValues = z.infer<typeof resetSchema>

function ResetFormContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  })

  const onSubmit = async (data: ResetFormValues) => {
    if (!token) {
      setError("Invalid or missing reset token")
      return
    }
    setError(null)
    try {
      await resetPassword(token, data.password)
      setIsSuccess(true)
      toast.success("Password reset successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password")
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Invalid Link</h1>
        <p className="mt-2 text-muted-foreground">
          This password reset link is invalid or has expired.
        </p>
        <Button asChild className="mt-6">
          <Link href="/forgot-password">Request New Link</Link>
        </Button>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Password Reset!</h1>
        <p className="mt-2 text-muted-foreground">
          Your password has been successfully reset.
        </p>
        <Button asChild className="mt-6">
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Reset Password</h1>
        <p className="mt-2 text-muted-foreground">Enter your new password below.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              {...register("password")}
              className="pr-10"
            />
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
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repeat your new password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="mr-2 h-4 w-4" />
          )}
          Reset Password
        </Button>
      </form>
    </div>
  )
}

export function ResetPasswordForm() {
  return (
    <GuestOnlyGuard>
      <ResetFormContent />
    </GuestOnlyGuard>
  )
}
