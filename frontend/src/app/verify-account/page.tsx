import type { Metadata } from "next"
import { Suspense } from "react"
import { VerifyAccountForm } from "./verify-account-form"

export const metadata: Metadata = {
  title: "Verify your email - OPPS",
  description: "Enter your email verification code to finish creating your OPPS account.",
  robots: { index: false, follow: false },
}

export default function VerifyAccountPage() {
  return (
    <Suspense>
      <VerifyAccountForm />
    </Suspense>
  )
}
