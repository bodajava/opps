import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Category } from "@/lib/types"

interface CategoryCardProps {
  category: Category
  className?: string
}

function CategoryCard({ category, className }: CategoryCardProps) {
  return (
    <Link
      href={`/products?category=${category.slug}`}
      className={cn("group relative block overflow-hidden rounded-xl", className)}
    >
      <div className="relative aspect-[4/3]">
        {category.image ? (
          <Image
            src={category.image}
            alt={category.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <span className="text-4xl text-muted-foreground/30">{category.name[0]}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-lg font-semibold text-white">{category.name}</h3>
        {category.productCount !== undefined && category.productCount > 0 && (
          <p className="text-sm text-white/80">{category.productCount} products</p>
        )}
      </div>
    </Link>
  )
}

export { CategoryCard }
