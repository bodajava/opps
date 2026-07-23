import { connection } from "next/server";
import { getCategories } from "@/lib/api/categories";
import { getProducts } from "@/lib/api/products";
import { isRecoverableApiError } from "@/lib/api-client";
import type { Category, Product } from "@/lib/types";
import { ProductsPageClient } from "./products-page-client";

export const metadata = {
  title: "All Products - opps",
  description: "Browse our full selection of handcrafted premium cookies.",
};

export default async function ProductsPage() {
  await connection();

  let categories: Category[] = [];
  let initialProducts: Product[] = [];
  let totalPages = 1;
  let total = 0;
  let isApiUnavailable = false;

  try {
    const catRes = await getCategories();
    if (catRes.success) categories = catRes.data;
  } catch (error) {
    if (!isRecoverableApiError(error)) throw error;
    isApiUnavailable = true;
  }

  try {
    const prodRes = await getProducts({ page: 1, limit: 12 });
    if (prodRes.success) {
      initialProducts = prodRes.data;
      totalPages = prodRes.meta.totalPages;
      total = prodRes.meta.total;
    }
  } catch (error) {
    if (!isRecoverableApiError(error)) throw error;
    isApiUnavailable = true;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">All Products</h1>
        <p className="mt-1 text-muted-foreground">
          Browse our full selection of handcrafted cookies.
        </p>
      </div>
      {isApiUnavailable && (
        <div role="alert" className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          Product data is temporarily unavailable. Please try again shortly.
        </div>
      )}
      <ProductsPageClient
        categories={categories}
        initialProducts={initialProducts}
        initialTotalPages={totalPages}
        initialTotal={total}
      />
    </div>
  );
}
