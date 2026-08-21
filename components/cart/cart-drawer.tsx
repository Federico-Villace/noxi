"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  useCartStore,
  useCartSubtotal,
  useCartUnits,
} from "@/core/cart/infrastructure/cart-store";
import { formatPrice } from "@/core/shared/domain/money";
import { useHydrated } from "@/lib/use-hydrated";
import { ProductMedia } from "@/components/catalog/product-media";
import { CheckoutButton } from "./checkout-button";

export function CartDrawer() {
  const { isOpen, close, lines, remove, setQuantity } = useCartStore();
  const subtotal = useCartSubtotal();
  const units = useCartUnits();
  const hydrated = useHydrated();

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  if (!hydrated) return null;

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        tabIndex={isOpen ? 0 : -1}
        aria-label="Cerrar carrito"
        onClick={close}
        className={`absolute inset-0 bg-void/80 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
      />

      <aside
        role="dialog"
        aria-modal={isOpen}
        aria-label="Carrito de compras"
        className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-line bg-void transition-transform duration-300 ease-out sm:w-[26rem] ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="label text-chrome">
            Carrito{" "}
            <span className="text-blood tabular-nums">[{units}]</span>
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="label text-silver transition-colors hover:text-blood"
          >
            Cerrar
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="h-px w-10 bg-blood" aria-hidden />
            <p className="label text-silver">El carrito está vacío</p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto">
            {lines.map((line) => (
              <li
                key={line.productId}
                className="flex gap-4 border-b border-line p-4"
              >
                <Link
                  href={`/producto/${line.slug}`}
                  onClick={close}
                  className="group relative aspect-square w-20 shrink-0 overflow-hidden bg-carbon"
                >
                  {/* Mismo componente que la grilla: un solo lugar donde vive
                      el fallback de imagen faltante. */}
                  <ProductMedia
                    src={line.image}
                    alt={line.name}
                    sku={line.productId}
                    sizes="80px"
                  />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <span className="label truncate text-chrome">
                      {line.name}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-silver">
                      {formatPrice(line.priceInCents * line.quantity)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center border border-line">
                      <button
                        type="button"
                        aria-label={`Quitar una unidad de ${line.name}`}
                        onClick={() =>
                          setQuantity(line.productId, line.quantity - 1)
                        }
                        className="grid h-8 w-8 place-items-center font-mono text-sm text-silver transition-colors hover:text-blood"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-mono text-xs tabular-nums text-chrome">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Agregar una unidad de ${line.name}`}
                        disabled={line.quantity >= line.maxStock}
                        onClick={() =>
                          setQuantity(line.productId, line.quantity + 1)
                        }
                        className="grid h-8 w-8 place-items-center font-mono text-sm text-silver transition-colors hover:text-blood disabled:cursor-not-allowed disabled:text-silver/25"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(line.productId)}
                      className="label text-silver/60 transition-colors hover:text-blood"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className="border-t border-line px-5 py-5">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="label text-silver">Subtotal</span>
            <span className="font-mono text-lg tabular-nums text-chrome">
              {formatPrice(subtotal)}
            </span>
          </div>

          <p className="label mb-4 text-silver/50">
            Envío a coordinar por Instagram
          </p>

          <CheckoutButton />

          {/*
            Salida directa. Con el carrito abierto sobre una ficha de producto,
            volver al drop eran dos interacciones —cerrar y después el logo—.
            Acá es una. Y de paso el carrito vacío deja de ser un callejón sin
            salida: antes decía "está vacío" y no ofrecía nada que hacer.
          */}
          <Link
            href="/"
            onClick={close}
            className="label mt-3 block w-full border border-line-strong py-4 text-center text-chrome transition-colors hover:border-blood hover:text-blood"
          >
            Volver al drop
          </Link>
        </footer>
      </aside>
    </div>
  );
}
