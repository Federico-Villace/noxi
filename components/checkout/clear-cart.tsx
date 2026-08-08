"use client";

import { useEffect } from "react";
import { useCartStore } from "@/core/cart/infrastructure/cart-store";

/** Vacía el carrito al aterrizar en la pantalla de pago aprobado. */
export function ClearCart() {
  const clear = useCartStore((state) => state.clear);

  useEffect(() => {
    clear();
  }, [clear]);

  return null;
}
