"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuthStore } from "@/store/auth-store"
import { getMyOrders } from "@/lib/api/orders"
import { formatDate, formatPrice } from "@/lib/utils"
import { apiClient, mapApiError } from "@/lib/api-client"
import type { Order, User as UserType } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import {
  Package,
  MapPin,
  ShoppingBag,
  ChevronRight,
  Calendar,
  Mail,
  Phone,
  User,
  Megaphone,
} from "lucide-react"
import { toast } from "sonner"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "secondary",
  processing: "default",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
  refunded: "secondary",
}

function getInitials(fullName: string) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "?";
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

function MarketingConsentCard({ user }: { user: UserType }) {
  const setUser = useAuthStore((s) => s.setUser)
  const [consent, setConsent] = useState(user.marketingConsent ?? false)
  const [saving, setSaving] = useState(false)

  const handleToggle = async (checked: boolean) => {
    setSaving(true)
    setConsent(checked)
    try {
      const { data } = await apiClient.patch<{ data: UserType }>(
        "/users/me/marketing-consent",
        { consent: checked },
      )
      setUser(data.data)
      toast.success(
        checked
          ? "You've been subscribed to marketing emails."
          : "You've been unsubscribed from marketing emails.",
      )
    } catch (err) {
      setConsent(!checked)
      const error = mapApiError(err)
      toast.error(error.message || "Failed to update preference")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-3">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Marketing Emails</CardTitle>
            <CardDescription>
              Receive updates about new products, offers, and promotions.
            </CardDescription>
          </div>
        </div>
        <Switch
          checked={consent}
          disabled={saving}
          onCheckedChange={handleToggle}
        />
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          {consent
            ? "You are currently subscribed to marketing emails."
            : "You are not subscribed to marketing emails."}
        </p>
      </CardContent>
    </Card>
  )
}

export default function AccountPage() {
  const user = useAuthStore((s) => s.user)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  useEffect(() => {
    getMyOrders()
      .then((res) => setRecentOrders(res.data.slice(0, 5)))
      .catch(() => {})
      .finally(() => setOrdersLoading(false))
  }, [])

  if (!user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <User className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-lg font-medium">Not signed in</p>
              <p className="text-sm text-muted-foreground">Sign in to view your account.</p>
            </div>
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-xl">
              {user.fullName}
            </CardTitle>
            <CardDescription className="mt-1 flex flex-col gap-1 sm:flex-row sm:gap-4">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </span>
              {user.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {user.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Joined {formatDate(user.createdAt)}
              </span>
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <MarketingConsentCard user={user} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/account/orders">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Order History</p>
                <p className="text-sm text-muted-foreground">View your past orders</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/account/addresses">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Saved Addresses</p>
                <p className="text-sm text-muted-foreground">Manage your delivery addresses</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Your last 5 orders</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/account/orders">
              View All
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No orders yet</p>
                <p className="text-sm text-muted-foreground">
                  Start shopping to see your orders here.
                </p>
              </div>
              <Button asChild>
                <Link href="/products">Browse Products</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.orderNumber}`}
                  className="flex items-center justify-between gap-4 py-3 hover:bg-muted/50 -mx-6 px-6 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      Order #{order.orderNumber}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)} &middot; {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusVariant[order.status] || "outline"}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                    <span className="whitespace-nowrap font-medium">
                      {formatPrice(order.total)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
