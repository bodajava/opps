import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ProtectedRouteGuard } from "@/components/auth/protected-route-guard"

export const metadata: Metadata = {
  title: "Checkout - opps",
  robots: { index: false, follow: false },
}

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <ProtectedRouteGuard>{children}</ProtectedRouteGuard>
}
