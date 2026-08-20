"use client";

import Link from "next/link";
import { useCartStore } from "@/core/cart/infrastructure/cart-store";

/**
 * Ya no llama a `startCheckout`: ahora lleva al formulario de datos.
 *
 * El checkout pasó a ser de dos pasos —datos, después pago— para que la orden
 * quede guardada con nombre y dirección ANTES de salir del sitio. Si se
 * abandona el pago, queda una venta a la que se puede escribir.
 */
export function CheckoutButton() {
  const lines = useCartStore((state) => state.lines);
  const close = useCartStore((state) => state.close);

  if (lines.length === 0) {
    return (
      <button
        type="button"
        disabled
        className="label w-full cursor-not-allowed border border-line bg-carbon py-4 text-silver/40"
      >
        Carrito vacío
      </button>
    );
  }

  return (
    <Link
      href="/checkout/datos"
      onClick={close}
      className="label block w-full border border-chrome bg-chrome py-4 text-center text-void transition-colors hover:border-blood hover:bg-blood"
    >
      Continuar
    </Link>
  );
}
