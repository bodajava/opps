import type { Metadata } from "next"
import { Suspense } from "react"
import { RegisterForm } from "./register-form"

export const metadata: Metadata = {
  title: "Create Account - opps",
  description: "Create your opps account.",
  robots: { index: false, follow: false },
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
