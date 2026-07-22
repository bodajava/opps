import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ChevronRight, Home } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
  showHome?: boolean
}

function Breadcrumb({ items, className, showHome = true }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center text-sm text-muted-foreground", className)} aria-label="Breadcrumb">
      {showHome && (
        <>
          <Link
            href="/"
            className="hover:text-foreground transition-colors"
            aria-label="Home"
          >
            <Home className="h-4 w-4" />
          </Link>
          <ChevronRight className="mx-2 h-4 w-4" />
        </>
      )}
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1
        return (
          <React.Fragment key={`${item.label}-${item.href || idx}`}>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast ? "text-foreground font-medium" : "text-muted-foreground"
                )}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <ChevronRight className="mx-2 h-4 w-4" />
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

export { Breadcrumb }
export type { BreadcrumbItem }
