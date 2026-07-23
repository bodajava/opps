"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSafeReturnPath } from "@/lib/auth-guards"
import { resendRegistration } from "@/lib/api/auth"
import { useAuthStore } from "@/store/auth-store"

export function VerifyAccountForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pending = useAuthStore((state) => state.pendingRegistration)
  const authStatus = useAuthStore((state) => state.authStatus)
  const verifyRegistration = useAuthStore((state) => state.verifyRegistration)
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(pending?.resendAfterSeconds ?? 0)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (authStatus === "authenticated") router.replace("/")
    if (authStatus === "unauthenticated" && !pending) router.replace("/register")
  }, [authStatus, pending, router])

  useEffect(() => {
    if (secondsRemaining <= 0) return
    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [secondsRemaining])

  if (!pending) return null

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting || otp.length !== 6) return
    setError(null)
    setIsSubmitting(true)
    try {
      await verifyRegistration(otp)
      setVerified(true)
      toast.success("Your email is verified. Welcome to OPPS!")
      const returnTo = getSafeReturnPath(searchParams.get("returnTo"), "customer")
      window.setTimeout(() => router.replace(returnTo), 500)
    } catch {
      setError("We could not verify that code. It may be incorrect or expired.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resend = async () => {
    if (secondsRemaining > 0 || isResending) return
    setIsResending(true)
    setError(null)
    try {
      const response = await resendRegistration(pending.verificationFlowId)
      setSecondsRemaining(response.data.resendAfterSeconds)
      toast.success("A new verification code has been sent.")
    } catch {
      setError("We could not resend the code yet. Please wait and try again.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16">
      <div className="w-full rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent">
          {verified ? <CheckCircle2 className="h-7 w-7 text-primary" /> : <MailCheck className="h-7 w-7 text-primary" />}
        </div>
        <h1 className="mt-5 text-center text-2xl font-bold">Verify your email</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          We sent an Email Verification Code to <strong className="text-foreground">{pending.maskedDestination}</strong>.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <Label htmlFor="registration-otp">6-digit verification code</Label>
            <Input
              id="registration-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-2 h-14 text-center font-mono text-2xl tracking-[0.45em]"
              aria-describedby={error ? "verification-error" : undefined}
              disabled={isSubmitting || verified}
              autoFocus
            />
          </div>

          {error && (
            <p id="verification-error" role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={otp.length !== 6 || isSubmitting || verified}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {verified ? "Verified" : "Verify email"}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm">
          <button
            type="button"
            onClick={resend}
            disabled={secondsRemaining > 0 || isResending}
            className="font-medium text-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
          >
            {isResending ? "Sending…" : secondsRemaining > 0 ? `Resend code in ${secondsRemaining}s` : "Resend code"}
          </button>
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Never share this code with anyone. Didn&apos;t start this registration? You can safely ignore the email.
        </p>
        <div className="mt-5 border-t pt-5 text-center text-sm">
          <Link href="/register" className="text-muted-foreground hover:text-foreground">
            Change registration details
          </Link>
        </div>
      </div>
    </main>
  )
}
