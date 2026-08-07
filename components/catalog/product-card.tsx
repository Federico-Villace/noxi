import Link from "next/link";
import { isLastUnits, isSoldOut, type Product } from "@/core/catalog";
import { formatPrice } from "@/core/shared/domain/money";
import { ProductMedia } from "./product-media";
import { QuickAddButton } from "@/components/cart/quick-add-button";

const GRID_SIZES = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw";

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const soldOut = isSoldOut(product);

  return (
    <article className="group relative border-b border-r border-line">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 border border-blood opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />

      <Link
        href={`/producto/${product.slug}`}
        className="block focus-visible:outline-none"
      >
        <div className="grain relative aspect-square overflow-hidden bg-void">
          <ProductMedia
            src={product.images[0]}
            alt={product.name}
            sku={product.id}
            sizes={GRID_SIZES}
            priority={priority}
          />

          {soldOut && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-void/70 backdrop-grayscale">
              {/* bg-void opaco: si no, el SKU del marco vacío se lee por detrás. */}
              <span className="label border border-line-strong bg-void px-3 py-2 text-silver">
                Agotado
              </span>
            </div>
          )}

          {!soldOut && isLastUnits(product) && (
            <span className="label absolute left-0 top-0 z-10 bg-blood px-2 py-1.5 text-void">
              Últimas {product.stock}
            </span>
          )}
        </div>

        {/* Apilado en mobile: nombre y precio en una fila de 195px se atropellan. */}
        <div className="flex flex-col gap-1 px-3 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 md:px-4">
          <h3 className="label truncate text-chrome">{product.name}</h3>
          <span
            className={`font-mono text-xs tabular-nums ${soldOut ? "text-silver/40 line-through" : "text-silver"}`}
          >
            {formatPrice(product.priceInCents)}
          </span>
        </div>
      </Link>

      {!soldOut && <QuickAddButton product={product} />}
    </article>
  );
}
