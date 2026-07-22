import Link from "next/link";
import { HeroSection } from "@/components/hero-section";
import { FeaturesSection } from "@/components/features-section";
import { CategoryCard } from "@/components/category-card";
import { ProductGrid } from "@/components/product-grid";
import { OrderSteps } from "@/components/order-steps";
import { NewsletterSection } from "@/components/newsletter-section";
import { SectionHeader } from "@/components/section-header";
import { getCategories } from "@/lib/api/categories";
import { getFeaturedProducts } from "@/lib/api/products";
import type { Category, Product } from "@/lib/types";

export const revalidate = 3600;

export default async function HomePage() {
  let categories: Category[] = [];
  let featuredProducts: Product[] = [];

  try {
    const catRes = await getCategories();
    if (catRes.success) categories = catRes.data;
  } catch {}

  try {
    const prodRes = await getFeaturedProducts();
    if (prodRes.success) featuredProducts = prodRes.data;
  } catch {}

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
        </div>
      </section>

      <OrderSteps />
      <NewsletterSection />
    </>
  );
}
