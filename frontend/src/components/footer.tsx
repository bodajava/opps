import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mail, Phone, MapPin, Globe, Camera, Music2 } from "lucide-react"

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
]

const infoLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/returns", label: "Returns & Refunds" },
]

const socialLinks = [
  { icon: Camera, label: "Instagram", href: "#" },
  { icon: Globe, label: "Facebook", href: "#" },
  { icon: Music2, label: "TikTok", href: "#" },
]

const paymentIcons = ["Visa", "Mastercard", "Fawry", "Vodafone Cash"]

function Footer() {
  return (
    <footer className="bg-[#2D1810] text-[#FFF8F0]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="text-2xl font-bold tracking-tight">
              opps
            </Link>
            <p className="text-sm text-[#E8D5B7]/80">
              Handcrafted premium cookies made with love in Egypt. Every batch baked fresh, every
              order delivered with care.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5C3A2E] transition-colors hover:bg-[#C49A6C]"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#E8D5B7]/80 transition-colors hover:text-[#FFF8F0]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Information</h3>
            <ul className="space-y-2">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#E8D5B7]/80 transition-colors hover:text-[#FFF8F0]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Get in Touch</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-[#E8D5B7]/80">
                <Mail className="h-4 w-4 shrink-0 text-[#C49A6C]" />
                hello@opps-cookies.com
              </li>
              <li className="flex items-center gap-2 text-sm text-[#E8D5B7]/80">
                <Phone className="h-4 w-4 shrink-0 text-[#C49A6C]" />
                +20 100 000 0000
              </li>
              <li className="flex items-start gap-2 text-sm text-[#E8D5B7]/80">
                <MapPin className="h-4 w-4 shrink-0 text-[#C49A6C]" />
                Cairo, Egypt
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4 border-t border-[#5C3A2E] pt-8 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-xs text-[#E8D5B7]/60">
              We accept
            </p>
            <div className="flex items-center gap-2">
              {paymentIcons.map((icon) => (
                <span
                  key={icon}
                  className="rounded-md bg-[#5C3A2E] px-2.5 py-1 text-xs font-medium text-[#FFF8F0]/80"
                >
                  {icon}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Your email"
              className="h-9 border-[#5C3A2E] bg-[#5C3A2E]/50 text-sm text-[#FFF8F0] placeholder:text-[#E8D5B7]/40"
            />
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0"
            >
              Subscribe
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[#E8D5B7]/40">
          &copy; 2026 opps. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export { Footer }
