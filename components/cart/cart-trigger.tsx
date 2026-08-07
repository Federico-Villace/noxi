"use client";

import { useCartStore, useCartUnits } from "@/core/cart/infrastructure/cart-store";
import { useHydrated } from "@/lib/use-hydrated";

export function CartTrigger() {
  const open = useCartStore((state) => state.open);
  const units = useCartUnits();
  const hydrated = useHydrated();

  return (
    <button
      type="button"
      onClick={open}
      className="label flex items-center gap-2 text-chrome transition-colors hover:text-blood"
    >
      Carrito
      <span className="font-mono tabular-nums text-blood">
        [{hydrated ? units : 0}]
      </span>
    </button>
  );
}
