import { cn } from "@/lib/utils"
import { Star, StarHalf } from "lucide-react"

interface StarRatingProps {
  rating: number
  count?: number
  showCount?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
}

function StarRating({ rating, count, showCount = false, size = "sm", className }: StarRatingProps) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75
  const roundedRating = rating - fullStars >= 0.75 ? fullStars + 1 : fullStars

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < roundedRating) {
            return (
              <Star
                key={i}
                className={cn(sizeClasses[size], "fill-amber-400 text-amber-400")}
              />
            )
          }
          if (i === roundedRating && hasHalf) {
            return (
              <StarHalf
                key={i}
                className={cn(sizeClasses[size], "fill-amber-400 text-amber-400")}
              />
            )
          }
          return (
            <Star
              key={i}
              className={cn(sizeClasses[size], "text-muted-foreground/30")}
            />
          )
        })}
      </div>
      {showCount && count !== undefined && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  )
}

export { StarRating }
