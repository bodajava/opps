"use client"

import Link from "next/link"
import { useAuthStore } from "@/store/auth-store"
import { canAccessAdmin } from "@/lib/auth-guards"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
]

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

function MobileNav({ open, onClose }: MobileNavProps) {
  const { isAuthenticated, user, logout } = useAuthStore()

  const handleLinkClick = () => {
    onClose()
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-card shadow-xl transition-transform duration-300 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-4 py-4">
            <Link href="/" className="text-xl font-bold text-primary" onClick={handleLinkClick}>
              opps
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 space-y-1 px-2 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className="block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Separator />

          <div className="space-y-2 px-4 py-4">
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Hello, {user?.fullName?.split(" ")[0] || "User"}
                </div>
                <Link
                  href="/account"
                  onClick={handleLinkClick}
                  className="block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  My Account
                </Link>
                <Link
                  href="/account/orders"
                  onClick={handleLinkClick}
                  className="block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  My Orders
                </Link>
                {canAccessAdmin(user) && (
                  <Link
                    href="/admin"
                    onClick={handleLinkClick}
                    className="block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent text-primary"
                  >
                    Admin Dashboard
                  </Link>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start px-3"
                  onClick={() => {
                    logout()
                    handleLinkClick()
                  }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Button asChild variant="default" className="w-full">
                  <Link href="/login" onClick={handleLinkClick}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/register" onClick={handleLinkClick}>
                    Create Account
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export { MobileNav }
