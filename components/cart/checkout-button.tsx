"use client";

import { useState, useTransition } from "react";
import { startCheckout } from "@/app/actions/checkout";
import { useCartStore } from "@/core/cart/infrastructure/cart-store";

export function CheckoutButton() {
  const lines = useCartStore((state) => state.lines);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const empty = lines.length === 0;

  const goToCheckout = () => {
    setError(null);

    startTransition(async () => {
      // Solo qué y cuánto. El precio lo pone el servidor, nunca el navegador.
      const result = await startCheckout(
        lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
      );

      if (result.ok) {
        window.location.href = result.redirectUrl;
        return;
      }

      setError(result.message);
    });
  };

  return (
    <>
      {error && (
        <p role="alert" className="label mb-3 text-blood">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={goToCheckout}
        disabled={empty || pending}
        className="label w-full border border-chrome bg-chrome py-4 text-void transition-colors hover:border-blood hover:bg-blood disabled:cursor-not-allowed disabled:border-line disabled:bg-carbon disabled:text-silver/40"
      >
        {pending ? "Redirigiendo…" : "Pagar con MercadoPago"}
      </button>
    </>
  );
}
