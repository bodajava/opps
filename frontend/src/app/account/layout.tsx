import type { Metadata } from "next"
import AccountLayoutContent from "./account-layout-content"

export const metadata: Metadata = {
  title: "My Account - opps",
  description: "Manage your opps account.",
  robots: { index: false, follow: false },
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountLayoutContent>{children}</AccountLayoutContent>
}
