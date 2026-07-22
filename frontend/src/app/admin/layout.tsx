import type { Metadata } from "next"
import AdminLayoutContent from "./admin-layout-content"

export const metadata: Metadata = {
  title: "Admin - opps",
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutContent>{children}</AdminLayoutContent>
}
