import type { Metadata } from "next"
import { getCategories } from "@/lib/api/categories"
import { CategoryCard } from "@/components/category-card"

export const metadata: Metadata = {
  title: "Cookie Categories - opps",
  description: "Browse premium cookie collections from opps.",
  alternates: { canonical: "/categories" },
}

export default async function CategoriesPage() {
  const response = await getCategories()
  const categories = response.data.filter((category) => category.isActive)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Cookie Categories</h1>
        <p className="mt-2 text-muted-foreground">Explore our handcrafted collections.</p>
      </div>
      {categories.length === 0 ? (
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
