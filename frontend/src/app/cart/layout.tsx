import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ProtectedRouteGuard } from "@/components/auth/protected-route-guard"

export const metadata: Metadata = {
  title: "Cart - opps",
  robots: { index: false, follow: false },
}

export default function CartLayout({ children }: { children: ReactNode }) {
  return <ProtectedRouteGuard>{children}</ProtectedRouteGuard>
}
