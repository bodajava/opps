import Link from "next/link";
import { connection } from "next/server";
import { HeroSection } from "@/components/hero-section";
import { FeaturesSection } from "@/components/features-section";
import { CategoryCard } from "@/components/category-card";
import { ProductGrid } from "@/components/product-grid";
import { OrderSteps } from "@/components/order-steps";
import { NewsletterSection } from "@/components/newsletter-section";
import { SectionHeader } from "@/components/section-header";
import { getCategories } from "@/lib/api/categories";
import { getFeaturedProducts } from "@/lib/api/products";
import { isRecoverableApiError } from "@/lib/api-client";
import type { Category, Product } from "@/lib/types";

export default async function HomePage() {
  await connection();

  let categories: Category[] = [];
  let featuredProducts: Product[] = [];
  let categoriesUnavailable = false;
  let productsUnavailable = false;

  try {
    const catRes = await getCategories();
    if (catRes.success) categories = catRes.data;
  } catch (error) {
    if (!isRecoverableApiError(error)) throw error;
    categoriesUnavailable = true;
  }

  try {
    const prodRes = await getFeaturedProducts();
    if (prodRes.success) featuredProducts = prodRes.data;
  } catch (error) {
    if (!isRecoverableApiError(error)) throw error;
    productsUnavailable = true;
  }

  return (
    <>
      <HeroSection />
      <FeaturesSection />

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeader
            title="Shop by Category"
            subtitle="Browse our curated cookie collections"
            className="mb-8"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.slice(0, 6).map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
          {categoriesUnavailable && (
            <p role="alert" className="mt-6 text-center text-sm text-muted-foreground">
              Categories are temporarily unavailable.
            </p>
          )}
        </div>
      </section>

      <section className="bg-muted py-16">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeader
            title="Featured Cookies"
            subtitle="Our most popular selections"
            action={<Link href="/products">View All</Link>}
            className="mb-8"
          />
          <ProductGrid products={featuredProducts} />
          {productsUnavailable && (
            <p role="alert" className="mt-6 text-center text-sm text-muted-foreground">
              Featured products are temporarily unavailable.
            </p>
          )}
        </div>
      </section>

      <OrderSteps />
      <NewsletterSection />
    </>
  );
}
