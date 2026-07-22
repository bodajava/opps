import { getProductBySlug, getProducts } from "@/lib/api/products";
import type { Product } from "@/lib/types";
import { ProductDetailsClient } from "./product-details-client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const res = await getProductBySlug(slug);
    if (res.success) {
      const product = res.data;
      return {
        title: product.seoTitle || `${product.name} - opps`,
        description: product.seoDescription || product.shortDescription || product.description,
        openGraph: {
          title: product.name,
          description: product.shortDescription || product.description,
          images: product.images?.[0] ? [{ url: product.images[0] }] : [],
        },
      };
    }
  } catch {}
  return { title: "Product - opps" };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let product: Product | null = null;
  let relatedProducts: Product[] = [];

  try {
    const res = await getProductBySlug(slug);
    if (res.success) product = res.data;
  } catch {}

  if (product) {
    try {
      const relRes = await getProducts({
        category: product.categoryId,
        limit: 4,
      });
      if (relRes.success) {
        relatedProducts = relRes.data.filter((p) => p.id !== product!.id).slice(0, 4);
      }
    } catch {}
  }

  if (!product) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Product Not Found</h1>
          <p className="mt-2 text-muted-foreground">The product you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  return <ProductDetailsClient product={product} relatedProducts={relatedProducts} />;
}
