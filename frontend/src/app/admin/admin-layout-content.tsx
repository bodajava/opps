"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/store/auth-store"
import { apiClient } from "@/lib/api-client"
import { getRoleName, isAdminRole } from "@/lib/auth-guards"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tags,
  TicketPercent,
  Users,
  Warehouse,
  CreditCard,
  Truck,
  PiggyBank,
  BarChart3,
  FileText,
  Settings,
  ScrollText,
  Menu,
  X,
  Bell,
  LogOut,
  ChevronDown,
  Store,
  Send,
} from "lucide-react"
import { toast } from "sonner"

const sidebarItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/coupons", label: "Coupons", icon: TicketPercent },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/delivery-zones", label: "Delivery Zones", icon: Truck },
  { href: "/admin/financial", label: "Financial Planning", icon: PiggyBank },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/campaigns", label: "Campaigns", icon: Send },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
]

const rolePermissions: Record<string, string[]> = {
  super_admin: sidebarItems.map((i) => i.href),
  admin: sidebarItems.map((i) => i.href),
  manager: [
    "/admin",
    "/admin/products",
    "/admin/orders",
    "/admin/categories",
    "/admin/coupons",
    "/admin/customers",
    "/admin/inventory",
    "/admin/payments",
    "/admin/delivery-zones",
    "/admin/analytics",
    "/admin/reports",
  ],
  editor: ["/admin", "/admin/products", "/admin/orders", "/admin/categories", "/admin/inventory"],
  viewer: ["/admin", "/admin/analytics", "/admin/reports"],
}

function getBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean)
  const items = [{ label: "Admin", href: "/admin" }]
  let path = ""
  for (let i = 1; i < parts.length; i++) {
    path += `/${parts[i]}`
    const label = parts[i].charAt(0).toUpperCase() + parts[i].slice(1).replace(/-/g, " ")
    items.push({ label, href: i < parts.length - 1 ? path : "" })
  }
  return items
}

export default function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, authStatus, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: notifData } = useQuery({
    queryKey: ["admin-notifications-unread"],
    queryFn: async () => {
      const { data } = await apiClient.get("/notifications/unread-count")
      return data?.data?.count ?? 0
    },
    enabled: authStatus === "authenticated" && !!user && isAdminRole(getRoleName(user)),
    refetchInterval: 30000,
  })

  const redirectIfNeeded = useCallback(() => {
    if (authStatus === 'hydrating' || authStatus === 'checking') return;
    if (authStatus === 'unauthenticated') {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
      return;
    }
    if (authStatus === 'authenticated' && user) {
      const roleName = getRoleName(user);
      if (!isAdminRole(roleName)) {
        router.replace("/account");
        return;
      }
    }
  }, [authStatus, user, router, pathname]);

  useEffect(() => {
    redirectIfNeeded();
  }, [redirectIfNeeded]);

  if (authStatus === 'hydrating' || authStatus === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (authStatus === 'unauthenticated' || !user) return null

  if (authStatus === 'authenticated' && user) {
    const roleName = getRoleName(user);
    if (!isAdminRole(roleName)) return null;
  }

  const roleName = getRoleName(user);
  const allowedPaths = rolePermissions[roleName] || []
  const visibleItems = sidebarItems.filter((item) => allowedPaths.includes(item.href))

  const handleLogout = async () => {
    await logout()
    toast.success("Logged out successfully")
    router.push("/login")
  }

  const initials = user.fullName?.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase() || "?"

  return (
    <div className="flex h-screen bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Store className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">OPPS Admin</span>
        </div>

        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-1 px-2">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Breadcrumb items={getBreadcrumbs(pathname)} className="hidden sm:flex" />
          <div className="flex-1" />

          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {(notifData || 0) > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                {notifData || 0}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  {user.avatar ? <AvatarImage src={user.avatar} alt={user.fullName} /> : null}
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium leading-tight">
                    {user.fullName}
                  </p>
                   <p className="text-xs text-muted-foreground capitalize">{typeof user.role === 'string' ? user.role : user.role?.name}</p>
                </div>
                <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/">View Store</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account">My Account</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
