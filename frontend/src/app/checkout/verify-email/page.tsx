"use client"

import { Suspense, useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { sendOTP, verifyOTP } from "@/lib/api/checkout"
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

const OTP_LENGTH = 6
const COOLDOWN_SECONDS = 60

function VerifyEmailForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get("email") || "")
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""))
  const [step, setStep] = useState<"idle" | "sending" | "sent" | "verifying" | "verified" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [cooldown, setCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const handleSendOTP = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address")
      return
    }
    setStep("sending")
    setErrorMessage("")
    try {
      await sendOTP(email, "checkout")
      setStep("sent")
      setCooldown(COOLDOWN_SECONDS)
      toast.success("OTP sent to your email")
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err) {
      setStep("error")
      setErrorMessage(err instanceof Error ? err.message : "Failed to send OTP")
      toast.error("Failed to send OTP")
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    const otpString = otp.join("")
    if (otpString.length !== OTP_LENGTH) {
      toast.error("Please enter the complete OTP")
      return
    }
    setStep("verifying")
    setErrorMessage("")
    try {
      const res = await verifyOTP(email, otpString, "checkout")
      if (res.data?.proofToken) {
        sessionStorage.setItem("checkout_verification_id", res.data.proofToken)
        sessionStorage.setItem("checkout_verified_email", email.toLowerCase().trim())
      }
      setStep("verified")
      toast.success("Email verified successfully!")
    } catch (err) {
      setStep("error")
      setErrorMessage(err instanceof Error ? err.message : "Invalid OTP")
      toast.error("Verification failed")
    }
  }

  if (step === "verified") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Email Verified!</h1>
        <p className="mt-2 text-muted-foreground">Your email has been successfully verified.</p>
        <Button asChild className="mt-6">
          <a href="/checkout">Continue to Checkout</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Checkout", href: "/checkout" },
          { label: "Verify Email" },
        ]}
        className="mb-6"
      />
      <div className="rounded-lg border p-6 space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Verify Your Email</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll send a one-time code to your email to verify your identity.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="flex gap-2">
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={step === "sent" || step === "verifying"}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleSendOTP}
              disabled={step === "sending" || step === "sent" || cooldown > 0}
            >
              {step === "sending" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : cooldown > 0 ? (
                `${cooldown}s`
              ) : step === "sent" ? (
                "Resend"
              ) : (
                "Send OTP"
              )}
            </Button>
          </div>
        </div>

        {(step === "sent" || step === "verifying") && (
          <>
            <div className="space-y-2">
              <Label>Enter OTP Code</Label>
              <div className="flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <Input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="h-12 w-12 text-center text-lg font-bold"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={handleVerify}
              disabled={step === "verifying" || otp.join("").length !== OTP_LENGTH}
            >
              {step === "verifying" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Didn&apos;t receive the code?{" "}
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={cooldown > 0}
                className="font-medium text-primary hover:underline disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
              </button>
            </div>
          </>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  )
}

function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-20 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>}>
      <VerifyEmailForm />
    </Suspense>
  )
}

export default VerifyEmailPage
