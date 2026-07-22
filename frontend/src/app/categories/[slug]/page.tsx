import { getCategoryBySlug } from "@/lib/api/categories";
import { getProducts } from "@/lib/api/products";
import { ProductGrid } from "@/components/product-grid";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import type { Category, Product } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const res = await getCategoryBySlug(slug);
    if (res.success) {
      return {
        title: `${res.data.name} - opps`,
        description: res.data.description || `Browse our ${res.data.name} collection.`,
      };
    }
  } catch {}
  return { title: "Category - opps" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let category: Category | null = null;
  let products: Product[] = [];
  let total = 0;

  try {
    const catRes = await getCategoryBySlug(slug);
    if (catRes.success) category = catRes.data;
  } catch {}

  if (category) {
    try {
      const prodRes = await getProducts({ category: category.id, page: 1, limit: 50 });
      if (prodRes.success) {
        products = prodRes.data;
        total = prodRes.meta.total;
      }
    } catch {}
  }

  if (!category) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Category Not Found</h1>
          <p className="mt-2 text-muted-foreground">The category you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Products", href: "/products" },
          { label: category.name },
        ]}
        className="mb-6"
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-muted-foreground">{category.description}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">{total} product{total !== 1 ? "s" : ""}</p>
      </div>
      <ProductGrid products={products} />
    </div>
  );
}
