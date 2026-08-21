"use client";

import { useEffect, useRef, useState } from "react";
import { useCartStore, useCartUnits } from "@/core/cart/infrastructure/cart-store";
import { useHydrated } from "@/lib/use-hydrated";

/** Lo que dura el destello. Suficiente para registrarlo, corto para no molestar. */
const DESTELLO_MS = 1400;

export function CartTrigger() {
  const open = useCartStore((state) => state.open);
  const lastAdded = useCartStore((state) => state.lastAdded);
  const units = useCartUnits();
  const hydrated = useHydrated();

  const [destello, setDestello] = useState(false);

  // Arranca en el tick actual, no en 0: si el componente se vuelve a montar
  // con algo ya agregado, no dispara un aviso de algo que pasó hace rato.
  const tickVisto = useRef(lastAdded?.tick ?? 0);

  useEffect(() => {
    const tick = lastAdded?.tick ?? 0;
    if (tick === tickVisto.current) return;

    tickVisto.current = tick;
    setDestello(true);

    const timer = setTimeout(() => setDestello(false), DESTELLO_MS);
    return () => clearTimeout(timer);
  }, [lastAdded]);

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={open}
        className={`label flex items-center gap-2 border px-2.5 py-1.5 transition-colors duration-200 ${
          destello
            ? "border-blood bg-blood text-void"
            : "border-transparent text-chrome hover:text-blood"
        }`}
      >
        Carrito
        <span
          className={`font-mono tabular-nums ${destello ? "text-void" : "text-blood"}`}
        >
          [{hydrated ? units : 0}]
        </span>
      </button>

      {/*
        El destello no existe para un lector de pantalla. Esto sí: anuncia la
        pieza sin robar el foco, que es lo que `polite` garantiza.
      */}
      <p aria-live="polite" className="sr-only">
        {lastAdded ? `${lastAdded.name} agregada al carrito` : ""}
      </p>
    </div>
  );
}
