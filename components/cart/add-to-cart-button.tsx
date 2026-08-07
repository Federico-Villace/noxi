"use client";

import { isSoldOut, type Product } from "@/core/catalog";
import { useCartStore } from "@/core/cart/infrastructure/cart-store";
import { useHydrated } from "@/lib/use-hydrated";

export function AddToCartButton({ product }: { product: Product }) {
  const add = useCartStore((state) => state.add);
  const inCart = useCartStore(
    (state) =>
      state.lines.find((line) => line.productId === product.id)?.quantity ?? 0,
  );
  const hydrated = useHydrated();

  if (isSoldOut(product)) {
    return (
      <button
        type="button"
        disabled
        className="label w-full border border-line bg-carbon py-4 text-silver/40"
      >
        Agotado
      </button>
    );
  }

  const maxed = hydrated && inCart >= product.stock;

  return (
    <button
      type="button"
      disabled={maxed}
      onClick={() => add(product)}
      className="label w-full border border-chrome bg-chrome py-4 text-void transition-colors hover:border-blood hover:bg-blood disabled:cursor-not-allowed disabled:border-line disabled:bg-carbon disabled:text-silver/40"
    >
      {maxed ? "Sin más stock" : "Agregar al carrito"}
    </button>
  );
}
