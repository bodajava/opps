import type { Metadata } from "next"
import { Suspense } from "react"
import { ResetPasswordForm } from "./reset-password-form"

export const metadata: Metadata = {
  title: "Reset Password - opps",
  description: "Reset your opps account password.",
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
