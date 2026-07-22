import type { Metadata } from "next"
import { Suspense } from "react"
import { ForgotPasswordForm } from "./forgot-password-form"

export const metadata: Metadata = {
  title: "Forgot Password - opps",
  description: "Reset your opps account password.",
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  )
}
