"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  User,
  Package,
  MapPin,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ProtectedRouteGuard } from "@/components/auth/protected-route-guard"

const navItems = [
  { href: "/account", label: "Profile Overview", icon: User },
  { href: "/account/orders", label: "Order History", icon: Package },
  { href: "/account/addresses", label: "Saved Addresses", icon: MapPin },
]

export default function AccountLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const sidebar = (
    <aside className="hidden lg:block">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/account"
              ? pathname === "/account"
              : pathname.startsWith(item.href)
          return (
            <Button
              key={item.href}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "justify-start gap-3 font-normal",
                isActive && "font-medium",
              )}
              asChild
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          )
        })}
      </nav>
    </aside>
  )

  const mobileNav = (
    <div className="lg:hidden">
      <nav className="mb-6 flex gap-1 overflow-x-auto pb-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/account"
              ? pathname === "/account"
              : pathname.startsWith(item.href)
          return (
            <Button
              key={item.href}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className="shrink-0 gap-2"
              asChild
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          )
        })}
      </nav>
    </div>
  )

  return (
    <ProtectedRouteGuard>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Account</h1>
        <Separator className="my-6" />
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
          {sidebar}
          {mobileNav}
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </ProtectedRouteGuard>
  )
}
