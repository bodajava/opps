import type { Metadata } from "next"
import { connection } from "next/server"
import { getCategories } from "@/lib/api/categories"
import { isRecoverableApiError } from "@/lib/api-client"
import { CategoryCard } from "@/components/category-card"
import type { Category } from "@/lib/types"

export const metadata: Metadata = {
  title: "Cookie Categories - opps",
  description: "Browse premium cookie collections from opps.",
  alternates: { canonical: "/categories" },
}

export default async function CategoriesPage() {
  await connection()

  let categories: Category[] = []
  let isApiUnavailable = false

  try {
    const response = await getCategories()
    categories = response.data.filter((category) => category.isActive)
  } catch (error) {
    if (!isRecoverableApiError(error)) {
      throw error
    }
    isApiUnavailable = true
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Cookie Categories</h1>
        <p className="mt-2 text-muted-foreground">Explore our handcrafted collections.</p>
      </div>
      {isApiUnavailable ? (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-8 text-center text-amber-950">
          Categories are temporarily unavailable. Please try again shortly.
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          No active categories are available yet.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}
    </div>
  )
}
