import type { Metadata } from "next"
import { Suspense } from "react"
import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Sign In - opps",
  description: "Sign in to your opps account.",
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
