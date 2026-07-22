import { getCategories } from "@/lib/api/categories";
import { getProducts } from "@/lib/api/products";
import type { Category, Product } from "@/lib/types";
import { ProductsPageClient } from "./products-page-client";

export const metadata = {
  title: "All Products - opps",
  description: "Browse our full selection of handcrafted premium cookies.",
};

export default async function ProductsPage() {
  let categories: Category[] = [];
  let initialProducts: Product[] = [];
  let totalPages = 1;
  let total = 0;

  try {
    const catRes = await getCategories();
    if (catRes.success) categories = catRes.data;
  } catch {}

  try {
    const prodRes = await getProducts({ page: 1, limit: 12 });
    if (prodRes.success) {
      initialProducts = prodRes.data;
      totalPages = prodRes.meta.totalPages;
      total = prodRes.meta.total;
    }
  } catch {}

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">All Products</h1>
        <p className="mt-1 text-muted-foreground">
          Browse our full selection of handcrafted cookies.
        </p>
      </div>
      <ProductsPageClient
        categories={categories}
        initialProducts={initialProducts}
        initialTotalPages={totalPages}
        initialTotal={total}
      />
    </div>
  );
}
