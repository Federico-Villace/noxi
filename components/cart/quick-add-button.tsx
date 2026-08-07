"use client";

import type { Product } from "@/core/catalog";
import { useCartStore } from "@/core/cart/infrastructure/cart-store";

export function QuickAddButton({ product }: { product: Product }) {
  const add = useCartStore((state) => state.add);

  return (
    <button
      type="button"
      onClick={() => add(product)}
      aria-label={`Agregar ${product.name} al carrito`}
      className="absolute right-0 top-0 z-30 grid h-11 w-11 place-items-center border-b border-l border-line bg-void/60 text-silver backdrop-blur-sm transition-colors hover:bg-blood hover:text-void"
    >
      <span aria-hidden className="font-mono text-base leading-none">
        +
      </span>
    </button>
  );
}
