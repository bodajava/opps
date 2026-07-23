"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"
import { getRoleName, getSafeReturnPath } from "@/lib/auth-guards"
import type { ReactNode } from "react"

interface GuestOnlyGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

export function GuestOnlyGuard({ children, fallback }: GuestOnlyGuardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authStatus = useAuthStore((s) => s.authStatus)
  const user = useAuthStore((s) => s.user)
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (redirectedRef.current) return

    if (authStatus === "authenticated" && user) {
      redirectedRef.current = true
      const returnTo = searchParams.get("returnTo") || searchParams.get("redirect")
      const roleName = getRoleName(user)
      const safePath = getSafeReturnPath(returnTo, roleName)
      router.replace(safePath)
    }
    if (authStatus === "registration_pending_verification") {
      redirectedRef.current = true
      router.replace("/verify-account")
    }
  }, [authStatus, user, router, searchParams])

  if (authStatus === "hydrating" || authStatus === "checking") {
    if (fallback) return <>{fallback}</>
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (authStatus === "authenticated" || authStatus === "registration_pending_verification") {
    return null
  }

  return <>{children}</>
}
