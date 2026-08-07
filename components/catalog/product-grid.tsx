import type { Product } from "@/core/catalog";
import { ProductCard } from "./product-card";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 border-l border-t border-line md:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < 4}
        />
      ))}
    </div>
  );
}
