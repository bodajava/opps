import { cn, formatPrice } from "@/lib/utils"

interface PriceDisplayProps {
  price: number
  salePrice?: number | null
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
}

const saleSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
}

function PriceDisplay({ price, salePrice, size = "md", className }: PriceDisplayProps) {
  if (salePrice !== undefined && salePrice !== null && salePrice < price) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className={cn("font-semibold text-destructive", sizeClasses[size])}>
          {formatPrice(salePrice)}
        </span>
        <span className={cn("text-muted-foreground line-through", saleSizeClasses[size])}>
          {formatPrice(price)}
        </span>
      </div>
    )
  }

  return (
    <span className={cn("font-semibold text-foreground", sizeClasses[size], className)}>
      {formatPrice(price)}
    </span>
  )
}

export { PriceDisplay }
